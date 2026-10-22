import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { VerifiedToken } from '../../ports/auth-verifier.port';
import type { Principal } from './principal';
import { ProblemException } from '../../common/problem';

/** Login do staff gravado no máximo a cada 5 min (o staff é resolvido a cada requisição). */
const STAFF_LOGIN_TOUCH_MS = 5 * 60_000;

/**
 * Mapeia o token para o cadastro local (cria o cliente no primeiro acesso). Clientes: cache curto em memória.
 * Staff (QA-04): sem cache e grupos efetivos = cadastro ∩ token — o painel é a fonte; tirar um grupo no `PATCH /staff/{id}`
 * vale na requisição seguinte, em qualquer instância, mesmo com o token antigo ainda trazendo o grupo.
 */
@Injectable()
export class PrincipalResolver {
  private readonly cache = new Map<string, { principal: Principal; at: number }>();
  private static readonly TTL_MS = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async resolve(token: VerifiedToken): Promise<Principal> {
    if (token.pool === 'staff') return this.resolveStaff(token);
    const cacheKey = `${token.pool}:${token.sub}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < PrincipalResolver.TTL_MS) return hit.principal;

    const customer = await this.upsertCustomer(token);
    if (customer.status === 'deleted') throw new ProblemException(401, 'unauthorized', 'Conta excluída.');
    const principal: Principal = { pool: 'customer', sub: token.sub, email: token.email, groups: [], userId: customer.id, customerId: customer.id };
    this.cache.set(cacheKey, { principal, at: Date.now() });
    return principal;
  }

  /**
   * Staff: lido do banco a cada requisição. O token não regrava mais `StaffUser.groups` (antes o `PATCH` era desfeito na
   * requisição seguinte do próprio usuário). Primeiro acesso de um usuário do pool sem cadastro: criado com os grupos do token.
   */
  private async resolveStaff(token: VerifiedToken): Promise<Principal> {
    const select = { id: true, active: true, groups: true, cognitoSub: true, lastLoginAt: true } as const;
    const existing = await this.prisma.staffUser.findFirst({
      where: { OR: [{ cognitoSub: token.sub }, ...(token.email ? [{ email: token.email }] : [])] },
      select,
    });
    if (!existing) {
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
      return { pool: 'staff', sub: token.sub, email: token.email, groups: [...token.groups], userId: created.id, staffId: created.id };
    }
    if (!existing.active) throw new ProblemException(403, 'forbidden', 'Usuário interno desativado.');
    const now = Date.now();
    if (existing.cognitoSub !== token.sub || !existing.lastLoginAt || now - existing.lastLoginAt.getTime() > STAFF_LOGIN_TOUCH_MS) {
      await this.prisma.staffUser.update({ where: { id: existing.id }, data: { cognitoSub: token.sub, lastLoginAt: new Date(now) } });
    }
    const groups = existing.groups.filter((g) => token.groups.includes(g));
    return { pool: 'staff', sub: token.sub, email: token.email, groups, userId: existing.id, staffId: existing.id };
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
