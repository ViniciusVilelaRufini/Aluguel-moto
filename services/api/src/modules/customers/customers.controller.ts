import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { currentSubscriptionWhere } from '../../common/fixed-vehicle';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Prisma, type Customer, type RestrictionEntry } from '@prisma/client';
import { KYC_STATUSES, type KycStatus } from '../../common/enums';
import { PageQuery, pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, hasGroup, isAdmin, Principal, StaffOnly } from '../auth/principal';
import { DelinquencyService } from '../payments/delinquency.service';
import { walletBalance } from '../wallet/wallet-ledger';
import { toCustomer } from './customers.mapper';

class ListCustomersQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsIn(['active', 'blocked', 'deleted']) status?: 'active' | 'blocked' | 'deleted';
  @IsOptional() @IsIn(KYC_STATUSES) kycStatus?: KycStatus;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() delinquent?: boolean;
}
class CustomerBlockDto {
  @IsString() @MinLength(3) @MaxLength(500) reason: string;
  @IsOptional() @IsBoolean() addToRestrictionList?: boolean;
}
class ReasonDto {
  @IsString() @MinLength(3) @MaxLength(500) reason: string;
}
class RestrictionCreateDto {
  @Matches(/^\d{11}$/) cpf: string;
  @IsString() @MinLength(3) @MaxLength(500) reason: string;
}

/** Gestão de clientes (CPF completo só para admin) e lista de restrição. */
@Controller()
export class CustomersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly delinquency: DelinquencyService,
  ) {}

  private async restrictedSet(cpfs: Array<string | null>): Promise<Set<string>> {
    const list = cpfs.filter((c): c is string => !!c);
    if (!list.length) return new Set();
    const rows = await this.prisma.restrictionEntry.findMany({ where: { cpf: { in: list } }, select: { cpf: true } });
    return new Set(rows.map((r) => r.cpf));
  }

  private async stats(customerId: string) {
    const [count, spent, disputes, last] = await Promise.all([
      this.prisma.rental.count({ where: { customerId } }),
      this.prisma.payment.aggregate({ where: { customerId, status: { in: ['paid', 'captured', 'partially_refunded'] } }, _sum: { amountCents: true, refundedCents: true } }),
      this.prisma.dispute.count({ where: { customerId, status: { in: ['open', 'under_review'] } } }),
      this.prisma.rental.findFirst({ where: { customerId }, orderBy: { startedAt: 'desc' }, select: { startedAt: true } }),
    ]);
    return {
      rentalsCount: count,
      totalSpentCents: Math.max(0, (spent._sum.amountCents ?? 0) - (spent._sum.refundedCents ?? 0)),
      openDisputes: disputes,
      ...(last ? { lastRentalAt: last.startedAt.toISOString() } : {}),
    };
  }

  /**
   * Painel de bancada (L2): as mesmas estatísticas de `stats`, em lote para a página da lista (3 consultas agrupadas). Aluguel em
   * andamento conta (a contagem é de todos os aluguéis do cliente, como na ficha).
   */
  private async statsMany(ids: string[]): Promise<Map<string, Awaited<ReturnType<CustomersController['stats']>>>> {
    if (!ids.length) return new Map();
    const where = { customerId: { in: ids } };
    const [rentals, spent, disputes] = await Promise.all([
      this.prisma.rental.groupBy({ by: ['customerId'], where, _count: { _all: true }, _max: { startedAt: true } }),
      this.prisma.payment.groupBy({ by: ['customerId'], where: { ...where, status: { in: ['paid', 'captured', 'partially_refunded'] } }, _sum: { amountCents: true, refundedCents: true } }),
      this.prisma.dispute.groupBy({ by: ['customerId'], where: { ...where, status: { in: ['open', 'under_review'] } }, _count: { _all: true } }),
    ]);
    const r = new Map((rentals ?? []).map((x) => [x.customerId, x]));
    const p = new Map((spent ?? []).map((x) => [x.customerId, x]));
    const d = new Map((disputes ?? []).map((x) => [x.customerId, x]));
    return new Map(
      ids.map((id) => {
        const last = r.get(id)?._max?.startedAt;
        const sum = p.get(id)?._sum;
        return [
          id,
          {
            rentalsCount: (r.get(id)?._count as { _all?: number } | undefined)?._all ?? 0,
            totalSpentCents: Math.max(0, (sum?.amountCents ?? 0) - (sum?.refundedCents ?? 0)),
            openDisputes: (d.get(id)?._count as { _all?: number } | undefined)?._all ?? 0,
            ...(last ? { lastRentalAt: last.toISOString() } : {}),
          },
        ];
      }),
    );
  }

  private async full(c: Customer, user: Principal) {
    const restricted = (await this.restrictedSet([c.cpf])).size > 0;
    const activeSubscription = await this.prisma.subscription.findFirst({ where: { customerId: c.id, ...currentSubscriptionWhere() }, select: { id: true, planCode: true } });
    // Task 14 (QA-04): saldo da carteira e dívida só para quem ajusta carteira / registra quitação.
    const money = hasGroup(user, 'admin', 'financeiro')
      ? { walletBalanceCents: (await walletBalance(this.prisma, c.id)).balanceCents, debtCents: await this.delinquency.debtCents(c.id) }
      : undefined;
    return toCustomer(c, { fullCpf: isAdmin(user), fullPixKey: hasGroup(user, 'admin', 'financeiro'), restricted, stats: await this.stats(c.id), activeSubscription, money });
  }

  @Get('customers')
  @StaffOnly('admin', 'suporte', 'financeiro')
  async list(@Query() q: ListCustomersQuery, @CurrentUser() u: Principal) {
    const where: Prisma.CustomerWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.kycStatus) where.kycStatus = q.kycStatus;
    if (q.delinquent !== undefined) where.delinquent = q.delinquent;
    if (q.q) {
      const digits = q.q.replace(/\D/g, '');
      where.OR = [
        { name: { contains: q.q, mode: 'insensitive' } },
        { email: { contains: q.q, mode: 'insensitive' } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
        // CPF: admin busca por trecho; os demais só por igualdade com os 11 dígitos (sem enumerar CPFs por prefixo).
        ...(isAdmin(u) ? (digits.length >= 4 ? [{ cpf: { contains: digits } }] : []) : digits.length === 11 ? [{ cpf: digits }] : []),
      ];
    }
    const rows = await this.prisma.customer.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    const restricted = await this.restrictedSet(rows.map((r) => r.cpf));
    const subs = await this.prisma.subscription.findMany({ where: { customerId: { in: rows.map((r) => r.id) }, ...currentSubscriptionWhere() }, select: { id: true, planCode: true, customerId: true } });
    const subBy = new Map(subs.map((x) => [x.customerId, x]));
    const stats = await this.statsMany(rows.slice(0, q.limit ?? 20).map((r) => r.id));
    return toPage(rows, q, (c) =>
      toCustomer(c, { fullCpf: isAdmin(u), fullPixKey: hasGroup(u, 'admin', 'financeiro'), restricted: !!c.cpf && restricted.has(c.cpf), activeSubscription: subBy.get(c.id), stats: stats.get(c.id) }),
    );
  }

  @Get('customer-restrictions')
  @StaffOnly('admin', 'suporte')
  async listRestrictions(@Query() q: PageQuery, @CurrentUser() u: Principal) {
    const rows = await this.prisma.restrictionEntry.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, (r) => ({
      id: r.id, cpf: isAdmin(u) ? r.cpf : `***.${r.cpf.slice(3, 6)}.${r.cpf.slice(6, 9)}-**`, reason: r.reason,
      ...(r.createdById ? { createdById: r.createdById } : {}), createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * Auditoria run-4: incluir o CPF bloqueia, na mesma transação, as contas ativas com esse CPF (o gate de elegibilidade
   * também consulta a lista). CPF já na lista, inclusive em corrida (P2002) → 409.
   */
  @Post('customer-restrictions')
  @StaffOnly('admin', 'suporte')
  async addRestriction(@Body() dto: RestrictionCreateDto, @CurrentUser() u: Principal) {
    const duplicate = () => conflict('conflict', 'CPF já está na lista de restrição.');
    if (await this.prisma.restrictionEntry.findUnique({ where: { cpf: dto.cpf } })) throw duplicate();
    let r: RestrictionEntry;
    try {
      r = await this.prisma.$transaction(async (tx) => {
        const created = await tx.restrictionEntry.create({ data: { cpf: dto.cpf, reason: dto.reason, createdById: u.userId } });
        await tx.customer.updateMany({ where: { cpf: dto.cpf, status: 'active' }, data: { status: 'blocked', blockedReason: dto.reason, blockedAt: new Date() } });
        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw duplicate();
      throw err;
    }
    await this.audit.record({ actor: u, action: 'restriction.add', entityType: 'RestrictionEntry', entityId: r.id, reason: dto.reason });
    return { id: r.id, cpf: isAdmin(u) ? r.cpf : `***.${r.cpf.slice(3, 6)}.${r.cpf.slice(6, 9)}-**`, reason: r.reason, createdById: u.userId, createdAt: r.createdAt.toISOString() };
  }

  @Delete('customer-restrictions/:id')
  @HttpCode(204)
  @StaffOnly('admin')
  async removeRestriction(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal): Promise<void> {
    if (!(await this.prisma.restrictionEntry.findUnique({ where: { id } }))) throw notFound('Registro não encontrado.');
    await this.prisma.restrictionEntry.delete({ where: { id } });
    await this.audit.record({ actor: u, action: 'restriction.remove', entityType: 'RestrictionEntry', entityId: id });
  }

  @Get('customers/:id')
  @StaffOnly('admin', 'suporte', 'financeiro')
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw notFound('Cliente não encontrado.');
    return this.full(c, u);
  }

  /** Impede novas reservas e aluguéis (o aluguel em andamento continua). */
  @Post('customers/:id/block')
  @HttpCode(200)
  @StaffOnly('admin', 'suporte')
  async block(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CustomerBlockDto, @CurrentUser() u: Principal) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw notFound('Cliente não encontrado.');
    if (c.status !== 'active') throw conflict('conflict', 'A conta não está ativa.');
    const updated = await this.prisma.$transaction(async (tx) => {
      // Auditoria run-4: condicional ao status lido (bloqueio/desbloqueio concorrentes → 409).
      const res = await tx.customer.updateMany({ where: { id, status: 'active' }, data: { status: 'blocked', blockedReason: dto.reason, blockedAt: new Date() } });
      if (res.count !== 1) throw conflict('conflict', 'A conta não está ativa.');
      const upd = await tx.customer.findUniqueOrThrow({ where: { id } });
      if (dto.addToRestrictionList && c.cpf) {
        await tx.restrictionEntry.upsert({ where: { cpf: c.cpf }, create: { cpf: c.cpf, reason: dto.reason, createdById: u.userId }, update: {} });
      }
      await this.audit.record({ actor: u, action: 'customer.block', entityType: 'Customer', entityId: id, reason: dto.reason, metadata: { addToRestrictionList: !!dto.addToRestrictionList } }, tx as any);
      return upd;
    });
    return this.full(updated, u);
  }

  /** Task 14: o financeiro registra a quitação da inadimplência paga fora do app (AuditLog com o motivo). */
  @Post('customers/:id/delinquency/clear')
  @HttpCode(200)
  @StaffOnly('admin', 'financeiro')
  async clearDelinquency(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto, @CurrentUser() u: Principal) {
    await this.delinquency.clearManually(u, id, dto.reason.trim());
    return this.full((await this.prisma.customer.findUnique({ where: { id } }))!, u);
  }

  @Post('customers/:id/unblock')
  @HttpCode(200)
  @StaffOnly('admin', 'suporte')
  async unblock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto, @CurrentUser() u: Principal) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw notFound('Cliente não encontrado.');
    if (c.status !== 'blocked') throw conflict('conflict', 'A conta não está bloqueada.');
    // Auditoria run-4: CPF na lista de restrição mantém a conta bloqueada (tire o CPF da lista antes).
    if (c.cpf && (await this.prisma.restrictionEntry.findUnique({ where: { cpf: c.cpf }, select: { id: true } }))) {
      throw conflict('conflict', 'O CPF desta conta está na lista de restrição. Remova-o da lista antes de desbloquear.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.customer.updateMany({ where: { id, status: 'blocked' }, data: { status: 'active', blockedReason: null, blockedAt: null } });
      if (res.count !== 1) throw conflict('conflict', 'A conta não está bloqueada.');
      const upd = await tx.customer.findUniqueOrThrow({ where: { id } });
      await this.audit.record({ actor: u, action: 'customer.unblock', entityType: 'Customer', entityId: id, reason: dto.reason }, tx as any);
      return upd;
    });
    return this.full(updated, u);
  }
}
