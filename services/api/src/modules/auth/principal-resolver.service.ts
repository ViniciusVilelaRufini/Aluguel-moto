import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
      const customer = await this.upsertCustomer(token);
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

  /**
   * QA-08: primeiro acesso com requisições paralelas (o app abre várias telas juntas) disputava o upsert e respondia 409.
   * O upsert do Prisma não é atômico: em violação de unicidade, relê o cadastro criado pela requisição concorrente.
   */
  private async upsertCustomer(token: VerifiedToken): Promise<{ id: string; status: string }> {
    const where = { cognitoSub: token.sub };
    const select = { id: true, status: true } as const;
    try {
      return await this.prisma.customer.upsert({
        where,
        create: { cognitoSub: token.sub, email: token.email || `${token.sub}@sem-email.volti.invalid` },
        update: {},
        select,
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      return this.prisma.customer.findUniqueOrThrow({ where, select });
    }
  }

  invalidate(): void {
    this.cache.clear();
  }
}
