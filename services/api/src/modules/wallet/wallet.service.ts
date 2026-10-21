import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, type Payment } from '@prisma/client';
import { PageQuery, pageArgs, toPage } from '../../common/pagination';
import { badRequest, notFound, ProblemException, unprocessable } from '../../common/problem';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import type { TopUpDto, WalletAdjustmentDto } from '../payments/payments.dto';
import { toTopUp, toWalletEntry } from '../payments/payments.mapper';
import { PaymentStateService } from '../payments/payment-state.service';
import { ProviderCustomersService } from '../payments/provider-customers.service';
import { scheduleFakePixConfirmation } from '../payments/provider/fake-pix-autoconfirm';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/provider/payment-provider';
import { BILLING_OPTIONS, type BillingOptions } from '../payments/rental-billing.service';
import { appendWalletEntry, walletBalance } from './wallet-ledger';

/**
 * Carteira: créditos e pacotes de minutos em ledger **somente inserção** (`WalletEntry`); saldo = soma dos lançamentos.
 * Recargas cobradas pelo `PaymentProvider` (cartão na hora; Pix quando o webhook confirma). Nenhum endpoint edita saldo.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger('WalletService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly state: PaymentStateService,
    private readonly customers: ProviderCustomersService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
    @Inject(BILLING_OPTIONS) private readonly opts: BillingOptions,
  ) {}

  balance(customerId: string, tx: Prisma.TransactionClient = this.prisma) {
    return walletBalance(tx, customerId);
  }

  async get(customerId: string) {
    const b = await this.balance(customerId);
    return { balanceCents: b.balanceCents, minutesBalance: b.minutesBalance, updatedAt: b.updatedAt.toISOString() };
  }

  async packages() {
    const items = await this.prisma.minutePackage.findMany({ where: { active: true }, orderBy: { minutes: 'asc' } });
    return { items: items.map((p) => ({ id: p.id, name: p.name, minutes: p.minutes, priceCents: p.priceCents, active: p.active })) };
  }

  /** Único ponto de escrita do ledger (inserção). */
  append(tx: Prisma.TransactionClient, data: Omit<Prisma.WalletEntryUncheckedCreateInput, 'balanceAfterCents'>) {
    return appendWalletEntry(tx, data);
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
    return dto.method === 'pix' ? this.topUpPix(customerId, amountCents, dto.packageId, minutes) : this.topUpCard(customerId, amountCents, dto.packageId, minutes, dto.cardId);
  }

  private async topUpCard(customerId: string, amountCents: number, packageId: string | undefined, minutes: number | undefined, cardId?: string) {
    const card = await this.customers.card(customerId, cardId);
    if (!card) throw new ProblemException(402, 'card-not-found', 'Cadastre um cartão para recarregar.');
    const { topUp, payment } = await this.createPending(customerId, 'card', amountCents, packageId, minutes, card.last4);
    const providerCustomerId = await this.customers.ensureCustomer(customerId);
    const res = await this.provider.charge({
      providerCustomerId, providerCardId: card.providerCardId, amountCents, description: minutes ? `Pacote de ${minutes} minutos Volti` : 'Recarga Volti',
      idempotencyKey: `top-up:${topUp.id}`, externalReference: payment.id,
    });
    if (res.status !== 'paid') {
      await this.state.transition(payment.id, 'failed', { failureReason: res.failureReason ?? 'charge_failed', providerPaymentId: res.providerPaymentId || null });
      await this.prisma.topUp.update({ where: { id: topUp.id }, data: { status: 'failed' } });
      throw new ProblemException(402, 'payment-failed', 'Pagamento recusado. Tente outro cartão.');
    }
    const paid = await this.state.transition(payment.id, 'paid', { providerPaymentId: res.providerPaymentId });
    await this.onTopUpPayment(paid);
    return toTopUp((await this.prisma.topUp.findUnique({ where: { id: topUp.id } }))!);
  }

  private async topUpPix(customerId: string, amountCents: number, packageId: string | undefined, minutes: number | undefined) {
    const { topUp, payment } = await this.createPending(customerId, 'pix', amountCents, packageId, minutes);
    const res = await this.provider.createPix({
      amountCents, description: minutes ? `Pacote de ${minutes} minutos Volti` : 'Recarga Volti',
      expiresAt: new Date(Date.now() + this.opts.pixExpirationMinutes * 60_000), payerEmail: await this.customers.payerEmail(customerId),
      idempotencyKey: `top-up:${topUp.id}`, externalReference: payment.id,
    });
    await this.state.annotate(payment.id, { providerPaymentId: res.providerPaymentId });
    const updated = await this.prisma.topUp.update({ where: { id: topUp.id }, data: { pix: res.pix as unknown as Prisma.InputJsonValue } });
    scheduleFakePixConfirmation(this.provider, this.queue, res.providerPaymentId, this.opts.fakePixAutoConfirmSeconds);
    return toTopUp(updated);
  }

  private createPending(customerId: string, method: 'card' | 'pix', amountCents: number, packageId?: string, minutes?: number, cardLast4?: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data: { customerId, kind: 'top_up', method, status: 'pending', amountCents, cardLast4 } });
      const topUp = await tx.topUp.create({ data: { customerId, status: 'pending', method, amountCents, packageId, minutes, paymentId: payment.id } });
      return { topUp, payment };
    });
  }

  /** Pagamento da recarga mudou (cartão na hora ou webhook do Pix): pago → um lançamento só; falhou → recarga failed. */
  async onTopUpPayment(payment: Payment): Promise<void> {
    const topUp = await this.prisma.topUp.findFirst({ where: { paymentId: payment.id } });
    if (!topUp) return;
    if (payment.status === 'paid') {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.topUp.updateMany({ where: { id: topUp.id, status: 'pending' }, data: { status: 'paid' } });
        if (claimed.count === 0) return;
        await this.append(tx, {
          customerId: topUp.customerId,
          type: topUp.minutes ? 'minute_package' : 'top_up',
          amountCents: topUp.minutes ? 0 : topUp.amountCents,
          minutes: topUp.minutes ?? undefined,
          description: topUp.minutes ? `Pacote de ${topUp.minutes} minutos` : 'Recarga de créditos',
          paymentId: payment.id,
        });
      });
      this.logger.log({ msg: 'wallet_top_up_paid', topUpId: topUp.id });
    } else if (payment.status === 'failed') {
      await this.prisma.topUp.updateMany({ where: { id: topUp.id, status: 'pending' }, data: { status: payment.failureReason === 'pix_expired' ? 'expired' : 'failed' } });
    }
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
