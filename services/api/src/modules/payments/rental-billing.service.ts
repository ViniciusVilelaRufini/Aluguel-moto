import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Deposit, Payment, Prisma } from '@prisma/client';
import { DepositReleaseRequestedEvent, EV } from '../../common/events';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import type { PixCharge, RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { InsuranceService } from '../insurance/insurance.service';
import { canTransition, SETTLED_STATUSES } from './payment-state';
import { isUniqueViolation, PaymentStateService } from './payment-state.service';
import { ProviderCustomersService } from './provider-customers.service';
import { scheduleFakePixConfirmation } from './provider/fake-pix-autoconfirm';
import { PAYMENT_PROVIDER, type PaymentProvider, type ProviderPayment } from './provider/payment-provider';
import { ReceiptService } from './receipts/receipt.service';

export const DEPOSIT_CENTS = 5000;

export interface BillingOptions {
  pixExpirationMinutes: number;
  /** Só com `PAYMENT_PROVIDER=fake`: confirma sozinho o Pix depois de N segundos (0 desliga). */
  fakePixAutoConfirmSeconds: number;
}
export const BILLING_OPTIONS = Symbol('BILLING_OPTIONS');

type HoldInput = { customerId: string; rentalId: string; method: 'card' | 'pix'; idempotencyKey: string };
type HoldResult = { depositId: string; status: 'held' | 'awaiting_pix' | 'failed'; pix?: PixCharge };
type SettleResult = { paymentId: string; status: 'paid' | 'failed' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `RentalBillingPort` real (Task 5), sobre o `PaymentProvider`:
 * - **holdDeposit**: cartão → pré-autorização da caução (5000); Pix → cobrança com QR válida por 15 min.
 *   Chave `deposit:<customerId>:<Idempotency-Key>` (decisão #17): única em `Deposit` e `Payment`, repassada ao gateway.
 * - **settle**: chave `rental-settlement:<rentalId>`. Valor ≤ caução → captura parcial (o gateway libera o resto);
 *   valor > caução → cobra o total no cartão e cancela a pré-autorização; 0 → libera. Falha de captura/cobrança →
 *   `Payment` failed e cliente inadimplente.
 * - **isDelinquent**: `Customer.delinquent`.
 * - Consome `deposit.release-requested` (cancela a pré-autorização ou estorna o Pix).
 */
@Injectable()
export class RentalBillingService implements RentalBillingPort {
  private readonly logger = new Logger('RentalBillingService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly state: PaymentStateService,
    private readonly customers: ProviderCustomersService,
    private readonly insurance: InsuranceService,
    private readonly receipts: ReceiptService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
    @Inject(BILLING_OPTIONS) private readonly opts: BillingOptions,
  ) {}

  // ───────────────────────── caução ─────────────────────────

  async holdDeposit(input: HoldInput): Promise<HoldResult> {
    const existing = await this.prisma.deposit.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return this.depositResult(existing);
    const amountCents = await this.depositAmount();
    let payment: Payment;
    try {
      payment = await this.state.create({ customerId: input.customerId, rentalId: input.rentalId, kind: 'deposit', method: input.method, amountCents, idempotencyKey: input.idempotencyKey });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Outra chamada com a mesma chave está em andamento (ou caiu no meio): espera a caução aparecer; se não aparecer, retoma.
      const d = await this.waitForDeposit(input.idempotencyKey);
      if (d) return this.depositResult(d);
      payment = (await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } }))!;
    }
    return input.method === 'card' ? this.holdOnCard(payment, input, amountCents) : this.holdOnPix(payment, input, amountCents);
  }

  private async waitForDeposit(key: string): Promise<Deposit | null> {
    for (let i = 0; i < 100; i++) {
      const d = await this.prisma.deposit.findUnique({ where: { idempotencyKey: key } });
      if (d) return d;
      await sleep(50);
    }
    return null;
  }

  private async holdOnCard(payment: Payment, input: HoldInput, amountCents: number): Promise<HoldResult> {
    const card = await this.customers.card(input.customerId);
    if (!card) {
      await this.state.transition(payment.id, 'failed', { failureReason: 'card_not_found' });
      return this.depositResult(await this.createDeposit(payment, input, { status: 'failed', amountCents }));
    }
    const providerCustomerId = await this.customers.ensureCustomer(input.customerId);
    const res = await this.provider.preAuthorize({
      providerCustomerId, providerCardId: card.providerCardId, amountCents, description: 'Caução Volti', idempotencyKey: input.idempotencyKey, externalReference: payment.id,
    });
    if (res.status === 'authorized') {
      await this.state.transition(payment.id, 'authorized', { providerPaymentId: res.providerPaymentId, cardLast4: res.cardLast4 ?? card.last4 });
      return this.depositResult(await this.createDeposit(payment, input, { status: 'held', amountCents, cardId: card.id, providerReference: res.providerPaymentId }));
    }
    await this.state.transition(payment.id, 'failed', { failureReason: res.failureReason ?? 'preauthorization_failed', providerPaymentId: res.providerPaymentId || null, cardLast4: card.last4 });
    this.logger.warn({ msg: 'deposit_preauthorization_failed', paymentId: payment.id, reason: res.failureReason });
    return this.depositResult(await this.createDeposit(payment, input, { status: 'failed', amountCents, cardId: card.id }));
  }

  private async holdOnPix(payment: Payment, input: HoldInput, amountCents: number): Promise<HoldResult> {
    const expiresAt = new Date(Date.now() + this.opts.pixExpirationMinutes * 60_000);
    const res = await this.provider.createPix({
      amountCents, description: 'Caução Volti (Pix)', expiresAt, payerEmail: await this.customers.payerEmail(input.customerId), idempotencyKey: input.idempotencyKey, externalReference: payment.id,
    });
    await this.state.annotate(payment.id, { providerPaymentId: res.providerPaymentId });
    const deposit = await this.createDeposit(payment, input, { status: 'awaiting_pix', amountCents, pix: res.pix as unknown as Prisma.InputJsonValue, providerReference: res.providerPaymentId });
    scheduleFakePixConfirmation(this.provider, this.queue, res.providerPaymentId, this.opts.fakePixAutoConfirmSeconds);
    return this.depositResult(deposit);
  }

  private async createDeposit(payment: Payment, input: HoldInput, data: Pick<Prisma.DepositUncheckedCreateInput, 'status' | 'amountCents' | 'cardId' | 'providerReference' | 'pix'>) {
    return this.prisma.$transaction(async (tx) => {
      const d = await tx.deposit.create({ data: { customerId: input.customerId, rentalId: input.rentalId, method: input.method, idempotencyKey: input.idempotencyKey, ...data } });
      await tx.payment.update({ where: { id: payment.id }, data: { depositId: d.id } });
      return d;
    });
  }

  private depositResult(d: Deposit): HoldResult {
    const status = d.status === 'awaiting_pix' ? 'awaiting_pix' : d.status === 'failed' ? 'failed' : 'held';
    const pix = (d.pix as PixCharge | null) ?? undefined;
    return { depositId: d.id, status, ...(pix && status === 'awaiting_pix' ? { pix } : {}) };
  }

  private async depositAmount(): Promise<number> {
    const fee = await this.prisma.fee.findUnique({ where: { code: 'deposit' } });
    return fee?.active ? fee.amountCents : DEPOSIT_CENTS;
  }

  private depositPayment(depositId: string) {
    return this.prisma.payment.findFirst({ where: { depositId, kind: 'deposit' }, orderBy: { createdAt: 'asc' } });
  }

  /** Cancela a pré-autorização, cancela o Pix pendente ou estorna o Pix pago; caução → `released`. */
  private async releaseDeposit(deposit: Deposit, key: string): Promise<void> {
    if (deposit.status !== 'held' && deposit.status !== 'awaiting_pix') return;
    const dp = await this.depositPayment(deposit.id);
    if (dp?.providerPaymentId) {
      if (dp.status === 'authorized') {
        const r = await this.provider.cancelPreAuthorization({ providerPaymentId: dp.providerPaymentId, idempotencyKey: key });
        if (r.status === 'canceled') await this.state.transition(dp.id, 'canceled');
      } else if (dp.status === 'pending') {
        await this.provider.cancelPix({ providerPaymentId: dp.providerPaymentId, idempotencyKey: key });
        await this.state.transition(dp.id, 'failed', { failureReason: 'pix_canceled' });
      } else if (dp.status === 'paid') {
        const r = await this.provider.refund({ providerPaymentId: dp.providerPaymentId, idempotencyKey: key });
        await this.state.transition(dp.id, r.status, { refundedCents: r.refundedCents });
      }
    }
    await this.prisma.deposit.updateMany({ where: { id: deposit.id, status: { in: ['held', 'awaiting_pix'] } }, data: { status: 'released' } });
    this.logger.log({ msg: 'deposit_released', depositId: deposit.id });
  }

  private async captureDeposit(deposit: Deposit, dp: Payment, amountCents: number): Promise<void> {
    if (dp.status === 'authorized') await this.state.transition(dp.id, 'captured');
    await this.prisma.deposit.updateMany({ where: { id: deposit.id, status: 'held' }, data: { status: 'captured', capturedCents: amountCents } });
  }

  /** Caução que não virou aluguel (reserva expirada/cancelada, 409 no início): libera/estorna no gateway (decisão #16). */
  @OnEvent(EV.DEPOSIT_RELEASE_REQUESTED, { async: true, promisify: true })
  async onReleaseRequested(ev: DepositReleaseRequestedEvent): Promise<void> {
    try {
      const rentalStarted = await this.prisma.rental.findFirst({ where: { depositId: ev.depositId }, select: { id: true } });
      if (rentalStarted) return;
      const deposit = await this.prisma.deposit.findUnique({ where: { id: ev.depositId } });
      if (!deposit || deposit.customerId !== ev.customerId) return;
      await this.releaseDeposit(deposit, `deposit-release:${deposit.id}`);
    } catch (err) {
      this.logger.error({ msg: 'deposit_release_failed', depositId: ev.depositId, error: (err as Error).message });
    }
  }

  // ───────────────────────── liquidação ─────────────────────────

  async settle(input: { rentalId: string; amountCents: number; idempotencyKey: string }): Promise<SettleResult> {
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing && existing.status !== 'pending') return this.settleResult(existing);
    const rental = await this.prisma.rental.findUnique({ where: { id: input.rentalId }, select: { customerId: true, depositId: true, insurancePolicyId: true } });
    if (!rental) throw new Error('Aluguel não encontrado para liquidação.');
    let pay = existing;
    if (!pay) {
      try {
        pay = await this.state.create({ customerId: rental.customerId, rentalId: input.rentalId, depositId: rental.depositId, kind: 'rental', method: 'card', amountCents: input.amountCents, idempotencyKey: input.idempotencyKey });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        pay = (await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } }))!;
        if (pay.status !== 'pending') return this.settleResult(pay);
      }
    }
    return this.collect(pay, rental, input.idempotencyKey);
  }

  private settleResult(p: Payment): SettleResult {
    return { paymentId: p.id, status: SETTLED_STATUSES.includes(p.status) ? 'paid' : 'failed' };
  }

  private async collect(pay: Payment, rental: { customerId: string; depositId: string; insurancePolicyId: string | null }, key: string): Promise<SettleResult> {
    const amount = pay.amountCents;
    const deposit = await this.prisma.deposit.findUnique({ where: { id: rental.depositId } });
    const dp = deposit ? await this.depositPayment(deposit.id) : null;
    const held = deposit?.status === 'held' && dp?.providerPaymentId ? { deposit, dp } : null;

    if (amount === 0) {
      if (deposit) await this.releaseDeposit(deposit, `${key}:release`);
      return this.finishPaid(pay, rental, { method: deposit?.method ?? 'card' });
    }

    if (held && held.deposit.method === 'card') {
      const { deposit: d, dp: auth } = held;
      if (amount <= d.amountCents) {
        const cap = await this.provider.capture({ providerPaymentId: auth.providerPaymentId!, amountCents: amount, idempotencyKey: `${key}:capture` });
        if (cap.status !== 'captured') return this.finishFailed(pay, rental.customerId, cap.failureReason ?? 'capture_failed');
        await this.captureDeposit(d, auth, amount);
        return this.finishPaid(pay, rental, { method: 'card', providerPaymentId: auth.providerPaymentId, cardLast4: auth.cardLast4 });
      }
      const charged = await this.chargeCard(rental.customerId, amount, `${key}:charge`, pay.id);
      if (charged?.status === 'paid') {
        await this.releaseDeposit(d, `${key}:release`);
        return this.finishPaid(pay, rental, { method: 'card', providerPaymentId: charged.providerPaymentId, cardLast4: charged.cardLast4 });
      }
      // Cobrança recusada: a caução inteira é capturada como garantia; o restante fica em aberto (inadimplência).
      const cap = await this.provider.capture({ providerPaymentId: auth.providerPaymentId!, amountCents: d.amountCents, idempotencyKey: `${key}:capture-guarantee` });
      if (cap.status === 'captured') await this.captureDeposit(d, auth, d.amountCents);
      return this.finishFailed(pay, rental.customerId, charged?.failureReason ?? 'card_not_found');
    }

    if (held && held.deposit.method === 'pix' && SETTLED_STATUSES.includes(held.dp.status)) {
      const { deposit: d, dp: pixPay } = held;
      const kept = Math.min(amount, d.amountCents);
      const excess = d.amountCents - kept;
      if (excess > 0) {
        const r = await this.provider.refund({ providerPaymentId: pixPay.providerPaymentId!, amountCents: excess, idempotencyKey: `${key}:refund-excess` });
        await this.state.transition(pixPay.id, r.status, { refundedCents: r.refundedCents });
      }
      await this.prisma.deposit.updateMany({ where: { id: d.id, status: 'held' }, data: { status: 'captured', capturedCents: kept } });
      if (amount <= d.amountCents) return this.finishPaid(pay, rental, { method: 'pix', providerPaymentId: pixPay.providerPaymentId });
      const charged = await this.chargeCard(rental.customerId, amount - d.amountCents, `${key}:charge-remainder`, pay.id);
      if (charged?.status === 'paid') return this.finishPaid(pay, rental, { method: 'card', providerPaymentId: charged.providerPaymentId, cardLast4: charged.cardLast4 });
      return this.finishFailed(pay, rental.customerId, charged?.failureReason ?? 'card_not_found');
    }

    // Sem caução retida: cobra o total no cartão padrão.
    const charged = await this.chargeCard(rental.customerId, amount, `${key}:charge`, pay.id);
    if (charged?.status === 'paid') return this.finishPaid(pay, rental, { method: 'card', providerPaymentId: charged.providerPaymentId, cardLast4: charged.cardLast4 });
    return this.finishFailed(pay, rental.customerId, charged?.failureReason ?? 'card_not_found');
  }

  private async chargeCard(customerId: string, amountCents: number, idempotencyKey: string, externalReference: string): Promise<ProviderPayment | null> {
    const card = await this.customers.card(customerId);
    if (!card) return null;
    const providerCustomerId = await this.customers.ensureCustomer(customerId);
    const res = await this.provider.charge({ providerCustomerId, providerCardId: card.providerCardId, amountCents, description: 'Aluguel Volti', idempotencyKey, externalReference });
    return { ...res, cardLast4: res.cardLast4 ?? card.last4 };
  }

  private async finishPaid(pay: Payment, rental: { insurancePolicyId: string | null }, data: { method: 'card' | 'pix' | 'wallet'; providerPaymentId?: string | null; cardLast4?: string | null }): Promise<SettleResult> {
    await this.state.transition(pay.id, 'paid', { method: data.method, providerPaymentId: data.providerPaymentId ?? null, cardLast4: data.cardLast4 ?? null });
    this.logger.log({ msg: 'rental_settled', paymentId: pay.id, rentalId: pay.rentalId, amountCents: pay.amountCents });
    if (rental.insurancePolicyId) {
      await this.insurance.registerRemittance(rental.insurancePolicyId).catch((err) => this.logger.error({ msg: 'insurance_remittance_failed', paymentId: pay.id, error: (err as Error).message }));
    }
    await this.receipts.issueForPayment(pay.id).catch((err) => this.logger.error({ msg: 'receipt_failed', paymentId: pay.id, error: (err as Error).message }));
    return { paymentId: pay.id, status: 'paid' };
  }

  private async finishFailed(pay: Payment, customerId: string, reason: string): Promise<SettleResult> {
    // Inadimplente antes do 'failed': quem observar o pagamento falho já vê o cliente bloqueado.
    await this.markDelinquent(customerId, pay.id, reason);
    await this.state.transition(pay.id, 'failed', { failureReason: reason });
    return { paymentId: pay.id, status: 'failed' };
  }

  async markDelinquent(customerId: string, paymentId: string, reason: string): Promise<void> {
    await this.prisma.customer.update({ where: { id: customerId }, data: { delinquent: true } });
    this.logger.warn({ msg: 'customer_delinquent', paymentId, reason });
  }

  async isDelinquent(customerId: string): Promise<boolean> {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { delinquent: true } });
    return c?.delinquent === true;
  }

  /** Liquidações que ficaram `pending` (erro de rede/gateway) são retomadas com as mesmas chaves (sem cobrar duas vezes). */
  @Interval('payments-settlement-retry', 5 * 60_000)
  async retryJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.retryPendingSettlements(2 * 60_000).catch((err) => this.logger.error({ msg: 'settlement_retry_failed', error: (err as Error).message }));
  }

  async retryPendingSettlements(olderThanMs: number): Promise<void> {
    const pending = await this.prisma.payment.findMany({
      where: { kind: 'rental', status: 'pending', createdAt: { lte: new Date(Date.now() - olderThanMs) } },
      take: 50,
    });
    for (const p of pending) {
      if (!p.rentalId || !p.idempotencyKey) continue;
      await this.settle({ rentalId: p.rentalId, amountCents: p.amountCents, idempotencyKey: p.idempotencyKey })
        .catch((err) => this.logger.warn({ msg: 'settlement_retry_item_failed', paymentId: p.id, error: (err as Error).message }));
    }
  }

  // ───────────────────────── reconciliação (webhook) ─────────────────────────

  /**
   * Aplica o estado do pagamento no gateway ao `Payment` local (idempotente: mesmo estado → nada muda).
   * Pix de caução pago → caução `held`; Pix pago depois da caução liberada → estorno automático.
   */
  async applyProviderPayment(pp: ProviderPayment): Promise<{ payment: Payment; changed: boolean } | null> {
    let local = pp.externalReference && UUID.test(pp.externalReference) ? await this.prisma.payment.findUnique({ where: { id: pp.externalReference } }) : null;
    if (!local && pp.providerPaymentId) {
      local = await this.prisma.payment.findFirst({ where: { providerPaymentId: pp.providerPaymentId }, orderBy: { createdAt: 'asc' } });
    }
    if (!local) return null;
    // Pix que expirou/foi cancelado no gateway antes de ser pago: localmente é pending → failed.
    if (pp.status === 'canceled' && local.status === 'pending') pp = { ...pp, status: 'failed', failureReason: pp.failureReason ?? 'pix_expired' };
    if (local.status === pp.status) return { payment: local, changed: false };

    if (canTransition(local.status, pp.status)) {
      const updated = await this.state.transition(local.id, pp.status, {
        providerPaymentId: local.providerPaymentId ?? pp.providerPaymentId,
        ...(pp.refundedCents !== undefined ? { refundedCents: pp.refundedCents } : {}),
        ...(pp.status === 'failed' && pp.failureReason ? { failureReason: pp.failureReason } : {}),
      });
      if (updated.kind === 'deposit' && updated.depositId) await this.onDepositPaymentChanged(updated);
      return { payment: updated, changed: true };
    }

    if (pp.status === 'paid' && local.kind === 'deposit' && local.method === 'pix' && local.status === 'failed') {
      await this.lateRefund(local);
      return { payment: local, changed: false };
    }
    this.logger.warn({ msg: 'payment_transition_ignored', paymentId: local.id, from: local.status, to: pp.status });
    return { payment: local, changed: false };
  }

  private async onDepositPaymentChanged(p: Payment): Promise<void> {
    if (p.status === 'paid') {
      const r = await this.prisma.deposit.updateMany({ where: { id: p.depositId!, status: 'awaiting_pix' }, data: { status: 'held' } });
      if (r.count === 0) {
        const d = await this.prisma.deposit.findUnique({ where: { id: p.depositId! } });
        if (d?.status === 'released') await this.lateRefund(p);
      } else {
        this.logger.log({ msg: 'deposit_pix_paid', depositId: p.depositId });
      }
    } else if (p.status === 'failed') {
      await this.prisma.deposit.updateMany({ where: { id: p.depositId!, status: 'awaiting_pix' }, data: { status: 'failed' } });
    }
  }

  /** Pix pago depois que a caução foi liberada (reserva expirou etc.): devolve o dinheiro. */
  private async lateRefund(p: Payment): Promise<void> {
    if (!p.providerPaymentId) return;
    const r = await this.provider.refund({ providerPaymentId: p.providerPaymentId, idempotencyKey: `late-pix-refund:${p.id}` });
    if (p.status === 'paid') await this.state.transition(p.id, r.status, { refundedCents: r.refundedCents });
    else await this.state.annotate(p.id, { failureReason: 'pix_paid_after_release_refunded', refundedCents: r.refundedCents });
    this.logger.log({ msg: 'deposit_late_pix_refunded', paymentId: p.id });
  }
}
