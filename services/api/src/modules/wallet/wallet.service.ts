import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PageQuery, pageArgs, toPage } from '../../common/pagination';
import { badRequest, notFound, ProblemException, unprocessable } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import type { TopUpDto, WalletAdjustmentDto } from '../payments/payments.dto';
import { toTopUp, toWalletEntry } from '../payments/payments.mapper';

/**
 * Carteira (ledger somente inserção; saldo = soma dos lançamentos). Implementação provisória da Task 3 —
 * a Task 5 integra a cobrança real das recargas pelo `PaymentProvider`.
 */
@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async balance(customerId: string, tx: Prisma.TransactionClient = this.prisma) {
    const agg = await tx.walletEntry.aggregate({ where: { customerId }, _sum: { amountCents: true, minutes: true }, _max: { createdAt: true } });
    return { balanceCents: agg._sum.amountCents ?? 0, minutesBalance: Math.max(0, agg._sum.minutes ?? 0), updatedAt: agg._max.createdAt ?? new Date() };
  }

  async get(customerId: string) {
    const b = await this.balance(customerId);
    return { balanceCents: b.balanceCents, minutesBalance: b.minutesBalance, updatedAt: b.updatedAt.toISOString() };
  }

  async packages() {
    const items = await this.prisma.minutePackage.findMany({ where: { active: true }, orderBy: { minutes: 'asc' } });
    return { items: items.map((p) => ({ id: p.id, name: p.name, minutes: p.minutes, priceCents: p.priceCents, active: p.active })) };
  }

  private async append(tx: Prisma.TransactionClient, data: Omit<Prisma.WalletEntryUncheckedCreateInput, 'balanceAfterCents'>) {
    const { balanceCents } = await this.balance(data.customerId, tx);
    return tx.walletEntry.create({ data: { ...data, balanceAfterCents: balanceCents + data.amountCents } });
  }

  async topUp(customerId: string, dto: TopUpDto) {
    if ((dto.amountCents === undefined) === (dto.packageId === undefined)) {
      throw badRequest('Informe amountCents ou packageId (um dos dois).', [{ field: 'amountCents', message: 'exatamente um entre amountCents e packageId' }]);
    }
    let amountCents = dto.amountCents ?? 0;
    let minutes: number | undefined;
    if (dto.packageId) {
      const pkg = await this.prisma.minutePackage.findUnique({ where: { id: dto.packageId } });
      if (!pkg || !pkg.active) throw notFound('Pacote não encontrado.');
      amountCents = pkg.priceCents;
      minutes = pkg.minutes;
    }
    if (dto.method === 'pix') {
      const pix = { chargeId: `stub-pix-${randomUUID()}`, qrCodeBase64: 'iVBORw0KGgo=', copyPaste: `00020126stub${randomUUID()}`, expiresAt: new Date(Date.now() + 15 * 60000).toISOString() };
      const t = await this.prisma.topUp.create({ data: { customerId, status: 'pending', method: 'pix', amountCents, packageId: dto.packageId, minutes, pix } });
      return toTopUp(t);
    }
    const card = dto.cardId
      ? await this.prisma.paymentCard.findFirst({ where: { id: dto.cardId, customerId, deletedAt: null } })
      : await this.prisma.paymentCard.findFirst({ where: { customerId, isDefault: true, deletedAt: null } });
    if (!card) throw new ProblemException(402, 'card-not-found', 'Cadastre um cartão para recarregar.');
    const t = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data: { customerId, kind: 'top_up', method: 'card', status: 'paid', amountCents, cardLast4: card.last4 } });
      const topUp = await tx.topUp.create({ data: { customerId, status: 'paid', method: 'card', amountCents, packageId: dto.packageId, minutes, paymentId: payment.id } });
      await this.append(tx, {
        customerId,
        type: minutes ? 'minute_package' : 'top_up',
        amountCents: minutes ? 0 : amountCents,
        minutes,
        description: minutes ? `Pacote de ${minutes} minutos` : 'Recarga de créditos',
        paymentId: payment.id,
      });
      return topUp;
    });
    return toTopUp(t);
  }

  async getTopUp(customerId: string, id: string) {
    const t = await this.prisma.topUp.findUnique({ where: { id } });
    if (!t || t.customerId !== customerId) throw notFound('Recarga não encontrada.');
    return toTopUp(t);
  }

  async ledger(customerId: string, q: PageQuery) {
    const rows = await this.prisma.walletEntry.findMany({ where: { customerId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, toWalletEntry);
  }

  async adjust(actor: Principal, customerId: string, dto: WalletAdjustmentDto) {
    if (dto.amountCents === 0) throw unprocessable('validation-error', 'O ajuste não pode ser zero.');
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) throw notFound('Cliente não encontrado.');
    const entry = await this.prisma.$transaction(async (tx) => {
      const e = await this.append(tx, { customerId, type: 'adjustment', amountCents: dto.amountCents, description: dto.reason, createdById: actor.userId });
      await this.audit.record({ actor, action: 'wallet.adjustment', entityType: 'Customer', entityId: customerId, reason: dto.reason, metadata: { amountCents: dto.amountCents, entryId: e.id } }, tx as any);
      return e;
    });
    return toWalletEntry(entry);
  }
}
