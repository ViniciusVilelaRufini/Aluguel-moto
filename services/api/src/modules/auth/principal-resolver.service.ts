import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { VerifiedToken } from '../../ports/auth-verifier.port';
import type { Principal } from './principal';
import { ProblemException } from '../../common/problem';

/** Mapeia o token para o cadastro local (cria o cliente no primeiro acesso; sincroniza o staff). Cache curto em memória. */
@Injectable()
export class PrincipalResolver {
  private readonly cache = new Map<string, { principal: Principal; at: number }>();
  private static readonly TTL_MS = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async resolve(token: VerifiedToken): Promise<Principal> {
    const cacheKey = `${token.pool}:${token.sub}:${token.groups.join(',')}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < PrincipalResolver.TTL_MS) return hit.principal;

    let principal: Principal;
    if (token.pool === 'customer') {
      const customer = await this.prisma.customer.upsert({
        where: { cognitoSub: token.sub },
        create: { cognitoSub: token.sub, email: token.email || `${token.sub}@sem-email.volti.invalid` },
        update: {},
        select: { id: true, status: true },
      });
      if (customer.status === 'deleted') throw new ProblemException(401, 'unauthorized', 'Conta excluída.');
      principal = { pool: 'customer', sub: token.sub, email: token.email, groups: [], userId: customer.id, customerId: customer.id };
    } else {
      const existing = await this.prisma.staffUser.findFirst({
        where: { OR: [{ cognitoSub: token.sub }, ...(token.email ? [{ email: token.email }] : [])] },
        select: { id: true, active: true },
      });
      let staffId: string;
      if (existing) {
        if (!existing.active) throw new ProblemException(403, 'forbidden', 'Usuário interno desativado.');
        await this.prisma.staffUser.update({
          where: { id: existing.id },
          data: { cognitoSub: token.sub, groups: token.groups, lastLoginAt: new Date() },
        });
        staffId = existing.id;
      } else {
        const created = await this.prisma.staffUser.create({
          data: {
            cognitoSub: token.sub,
            email: token.email || `${token.sub}@staff.volti.invalid`,
            name: token.email ? token.email.split('@')[0] : token.sub,
            groups: token.groups,
            lastLoginAt: new Date(),
          },
          select: { id: true },
        });
        staffId = created.id;
      }
      principal = { pool: 'staff', sub: token.sub, email: token.email, groups: token.groups, userId: staffId, staffId };
    }
    this.cache.set(cacheKey, { principal, at: Date.now() });
    return principal;
  }

  invalidate(): void {
    this.cache.clear();
  }
}
