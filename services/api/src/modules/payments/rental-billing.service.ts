import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import type { Deposit, Payment, Prisma, SettlementProgress } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DepositReleaseRequestedEvent, EV } from '../../common/events';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import type { PixCharge, RentalBillingPort } from '../../ports/rental-billing.port';
import { PrismaService } from '../../prisma/prisma.service';
import { InsuranceService } from '../insurance/insurance.service';
import { signalNeedsReview } from './payment-review';
import { canTransition, SETTLED_STATUSES } from './payment-state';
import { DEPOSIT_FAILED, type DepositFailedEvent } from './deposit-events';
import { isUniqueViolation, PaymentStateService } from './payment-state.service';
import { ProviderCustomersService } from './provider-customers.service';
import { scheduleFakePixConfirmation } from './provider/fake-pix-autoconfirm';
import { PAYMENT_PROVIDER, type PaymentProvider, PaymentProviderError, type ProviderPayment } from './provider/payment-provider';
import { ReceiptService } from './receipts/receipt.service';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';

export const DEPOSIT_CENTS = 5000;

export interface BillingOptions {
  pixExpirationMinutes: number;
  /** Só com `PAYMENT_PROVIDER=fake`: confirma sozinho o Pix depois de N segundos (0 desliga). */
  fakePixAutoConfirmSeconds: number;
  /** Dias que uma cobrança/captura pode ficar em análise no gateway antes de a liquidação ser estacionada (`PAYMENT_REVIEW_MAX_DAYS`). */
  reviewMaxDays?: number;
  /** Relógio (injetável nos testes). */
  now?: () => Date;
}
export const BILLING_OPTIONS = Symbol('BILLING_OPTIONS');
export const DEFAULT_REVIEW_MAX_DAYS = 7;

type HoldInput = { customerId: string; rentalId: string; method: 'card' | 'pix'; idempotencyKey: string; cardId?: string };
type HoldResult = { depositId: string; status: 'held' | 'awaiting_pix' | 'failed'; pix?: PixCharge };
type SettleResult = { paymentId: string; status: 'paid' | 'failed' };

export const MAX_COLLECTION_ATTEMPTS = 3;
export const MAX_RELEASE_ATTEMPTS = 20;
/** Execuções com erro/resultado ambíguo até estacionar a liquidação para revisão manual. */
export const MAX_ERROR_RUNS = 5;
const SETTLEMENT_LEASE_MS = 2 * 60_000;

type SettlementPlan = 'zero' | 'card_capture' | 'card_charge' | 'pix_keep' | 'pix_keep_charge' | 'charge_only';
interface SettlementSteps {
  captureStarted?: boolean;
  chargeStarted?: boolean;
  /** Cobrança em análise no gateway (id): o passo espera, sem nova cobrança. */
  chargeInReview?: string | null;
  /** Início da análise da cobrança (ISO); some quando a análise termina. Passado `reviewMaxDays`, a liquidação é estacionada. */
  chargeInReviewSince?: string | null;
  /** Início da análise de uma captura (parcial do `card_capture` ou garantia do `card_charge`). */
  captureInReviewSince?: string | null;
  /** Captura da caução como garantia em análise no gateway (última tentativa do `card_charge`): nunca cancelar enquanto isso. */
  guaranteeCaptureInReview?: boolean | null;
  /** Token do cartão por tentativa (gravado antes da chamada, reusado na repetição do mesmo passo). */
  chargeTokens?: Record<string, string>;
  release?: boolean;
  capture?: boolean;
  refundExcess?: boolean;
  depositKept?: boolean;
  charge?: { providerPaymentId: string; cardLast4: string | null };
}
interface StepContext {
  pay: Payment;
  steps: SettlementSteps;
  save: (patch: SettlementSteps) => Promise<void>;
  attempt: number;
  attemptKey: (base: string) => string;
  customerId: string;
}
type SettleRental = { customerId: string; depositId: string; insurancePolicyId: string | null };
/** Resultado de um passo de cobrança: pagamento do gateway, `null` (sem cartão) ou "pare aqui" com a resposta da porta. */
type StepOutcome = ProviderPayment | null | { stop: SettleResult };
const isStop = (o: StepOutcome): o is { stop: SettleResult } => !!o && 'stop' in o;
/** Recusa genuína do gateway para um pagamento visto em análise (Mercado Pago: `rejected` → failed, `cancelled` → canceled). */
const DECLINED_STATUSES: readonly string[] = ['failed', 'canceled'];
type ReviewKind = 'charge' | 'capture';

export class DepositReleaseNotConfirmedError extends Error {}
export class SettlementInProgressError extends Error {
  constructor(paymentId: string) {
    super(`Liquidação ${paymentId} em andamento em outro executor.`);
  }
}

/** Parte do pagamento ainda a cobrar na caução/gateway (bruto − carteira). */
export const collectible = (p: Pick<Payment, 'amountCents' | 'walletCents'>): number => Math.max(0, p.amountCents - (p.walletCents ?? 0));

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
    private readonly events: EventEmitter2,
    @Inject(BILLING_OPTIONS) private readonly opts: BillingOptions,
  ) {}

  private now(): Date {
    return this.opts.now?.() ?? new Date();
  }

  private reviewMaxMs(): number {
    return (this.opts.reviewMaxDays ?? DEFAULT_REVIEW_MAX_DAYS) * 24 * 60 * 60_000;
  }

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
    const card = await this.customers.card(input.customerId, input.cardId);
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
    // Fix round 1 (QA-21): só `held` é caução retida. Uma caução já liberada/capturada (repetição com a mesma chave depois
    // de um 409) nunca volta como `held`, senão um aluguel começaria sem garantia.
    const status = d.status === 'awaiting_pix' ? 'awaiting_pix' : d.status === 'held' ? 'held' : 'failed';
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

  /**
   * Libera a caução no gateway: cancela a pré-autorização, cancela o Pix pendente ou estorna o Pix pago.
   * Só marca `released` com confirmação do gateway (pagamento da caução em estado final de liberação);
   * sem confirmação, lança `DepositReleaseNotConfirmedError` e o estado fica como está (retentado depois).
   */
  private async releaseDeposit(deposit: Deposit, key: string): Promise<void> {
    if (deposit.status !== 'held' && deposit.status !== 'awaiting_pix') return;
    let dp = await this.depositPayment(deposit.id);
    if (dp?.providerPaymentId) {
      const ppid = dp.providerPaymentId;
      // Resultado desconhecido na chamada (timeout, 4xx de repetição): o estado no gateway decide.
      const orReconcile = async <T extends { status: string; refundedCents?: number }>(call: () => Promise<T>): Promise<{ status: string; refundedCents?: number }> => {
        try {
          return await call();
        } catch (err) {
          if (!(err instanceof PaymentProviderError)) throw err;
          const pp = await this.provider.getPayment(ppid);
          if (!['canceled', 'failed', 'refunded'].includes(pp.status)) throw err;
          return pp;
        }
      };
      if (dp.status === 'authorized') {
        const r = await orReconcile(() => this.provider.cancelPreAuthorization({ providerPaymentId: ppid, idempotencyKey: key }));
        if (r.status === 'canceled') dp = await this.state.transition(dp.id, 'canceled');
      } else if (dp.status === 'pending') {
        const r = await orReconcile(() => this.provider.cancelPix({ providerPaymentId: ppid, idempotencyKey: key }));
        if (r.status === 'failed' || r.status === 'canceled') dp = await this.state.transition(dp.id, 'failed', { failureReason: 'pix_canceled' });
      } else if (dp.status === 'paid' || dp.status === 'partially_refunded') {
        const r = await orReconcile(() => this.provider.refund({ providerPaymentId: ppid, idempotencyKey: key }));
        if (r.status === 'refunded') dp = await this.state.transition(dp.id, 'refunded', { refundedCents: r.refundedCents ?? dp.amountCents });
      }
      if (!['canceled', 'failed', 'refunded'].includes(dp.status)) {
        throw new DepositReleaseNotConfirmedError(`O gateway não confirmou a liberação da caução ${deposit.id} (pagamento ${dp.status}).`);
      }
    }
    await this.prisma.deposit.updateMany({ where: { id: deposit.id, status: { in: ['held', 'awaiting_pix'] } }, data: { status: 'released' } });
    this.logger.log({ msg: 'deposit_released', depositId: deposit.id });
  }

  private async captureDeposit(deposit: Deposit, dp: Payment, amountCents: number): Promise<void> {
    // Relê o status: um webhook do Payment da caução pode ter registrado `captured` entre a chamada ao gateway e este ponto.
    const fresh = (await this.prisma.payment.findUnique({ where: { id: dp.id } })) ?? dp;
    if (fresh.status === 'authorized') await this.state.transition(dp.id, 'captured');
    try {
      await this.prisma.paymentCapture.create({ data: { paymentId: dp.id, capturedCents: amountCents } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
    await this.prisma.deposit.updateMany({ where: { id: deposit.id, status: 'held' }, data: { status: 'captured', capturedCents: amountCents } });
  }

  /** Caução que não virou aluguel (reserva expirada/cancelada, 409 no início): libera/estorna no gateway (decisão #16). */
  @OnEvent(EV.DEPOSIT_RELEASE_REQUESTED, { async: true, promisify: true })
  async onReleaseRequested(ev: DepositReleaseRequestedEvent): Promise<void> {
    try {
      const deposit = await this.prisma.deposit.findUnique({ where: { id: ev.depositId } });
      if (!deposit || deposit.customerId !== ev.customerId) return;
      if (await this.prisma.rental.findFirst({ where: { depositId: ev.depositId }, select: { id: true } })) return;
      await this.prisma.depositRelease.upsert({ where: { depositId: deposit.id }, create: { depositId: deposit.id, reason: ev.reason }, update: {} });
      await this.attemptRelease(deposit.id);
    } catch (err) {
      this.logger.error({ msg: 'deposit_release_failed', depositId: ev.depositId, error: (err as Error).message });
    }
  }

  private async attemptRelease(depositId: string): Promise<void> {
    const req = await this.prisma.depositRelease.findUnique({ where: { depositId } });
    if (!req || req.confirmedAt) return;
    try {
      if (await this.prisma.rental.findFirst({ where: { depositId }, select: { id: true } })) {
        await this.prisma.depositRelease.update({ where: { depositId }, data: { confirmedAt: new Date(), lastError: 'rental_started' } });
        return;
      }
      const deposit = await this.prisma.deposit.findUnique({ where: { id: depositId } });
      if (deposit) await this.releaseDeposit(deposit, `deposit-release:${depositId}`);
      await this.prisma.depositRelease.update({ where: { depositId }, data: { confirmedAt: new Date() } });
    } catch (err) {
      await this.prisma.depositRelease.update({ where: { depositId }, data: { attempts: { increment: 1 }, lastError: (err as Error).message.slice(0, 500) } });
      this.logger.warn({ msg: 'deposit_release_pending', depositId, error: (err as Error).message });
    }
  }

  @Interval('payments-deposit-release-retry', 5 * 60_000)
  @ExclusiveJob('payments-deposit-release-retry', jobLockTtl(5 * 60_000))
  async releaseRetryJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.retryDepositReleases().catch((err) => this.logger.error({ msg: 'deposit_release_retry_failed', error: (err as Error).message }));
  }

  async retryDepositReleases(): Promise<void> {
    const pending = await this.prisma.depositRelease.findMany({ where: { confirmedAt: null, attempts: { lt: MAX_RELEASE_ATTEMPTS } }, take: 50 });
    for (const r of pending) await this.attemptRelease(r.depositId);
  }

  // ───────────────────────── liquidação ─────────────────────────

  /**
   * Liquidação retomável e sem cobrança dupla:
   * - o **plano** (qual caminho cobrar) é decidido uma vez, na primeira execução, e gravado em `SettlementProgress`;
   *   repetições nunca o recalculam a partir do estado atual da caução;
   * - cada passo no gateway usa uma chave estável (`<chave>:<passo>`, e `:a<n>` a partir da 2ª tentativa de cobrança),
   *   e o passo concluído é gravado antes do próximo;
   * - só um executor por vez (lease com dono e validade em `SettlementProgress`).
   * Falha de captura/cobrança: cliente inadimplente na hora, a liquidação fica `pending` e o job retenta até
   * `MAX_COLLECTION_ATTEMPTS`; na última, cancela a pré-autorização (captura) ou captura a caução como garantia
   * (cobrança acima da caução) e o pagamento vira `failed`.
   */
  async settle(input: { rentalId: string; amountCents: number; idempotencyKey: string; walletCents?: number }): Promise<SettleResult> {
    return this.runSettlement(input, false);
  }

  private async runSettlement(input: { rentalId: string; amountCents: number; idempotencyKey: string; walletCents?: number }, retry: boolean): Promise<SettleResult> {
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing && existing.status !== 'pending') return this.settleResult(existing);
    const rental = await this.prisma.rental.findUnique({ where: { id: input.rentalId }, select: { customerId: true, depositId: true, insurancePolicyId: true } });
    if (!rental) throw new Error('Aluguel não encontrado para liquidação.');
    let pay = existing;
    if (!pay) {
      try {
        // Task 16 (fix round 1): o Payment registra o bruto; `walletCents` é a parte já paga pela carteira no fechamento.
        const walletCents = Math.max(0, input.walletCents ?? 0);
        pay = await this.state.create({ customerId: rental.customerId, rentalId: input.rentalId, depositId: rental.depositId, kind: 'rental', method: 'card', amountCents: input.amountCents + walletCents, walletCents, idempotencyKey: input.idempotencyKey });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        pay = (await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } }))!;
        if (pay.status !== 'pending') return this.settleResult(pay);
      }
    }
    let progress = await this.ensureProgress(pay, rental.depositId);
    // Estacionada para revisão manual: ninguém chama o gateway de novo automaticamente.
    if (progress.parkedAt) return { paymentId: pay.id, status: 'failed' };
    // Cobrança já recusada: só o job retenta; a porta devolve `failed` sem chamar o gateway.
    if (progress.attempts > 0 && !retry) return { paymentId: pay.id, status: 'failed' };

    const owner = randomUUID();
    const now = new Date();
    const claimed = await this.prisma.settlementProgress.updateMany({
      where: { paymentId: pay.id, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
      data: { leaseOwner: owner, leaseUntil: new Date(now.getTime() + SETTLEMENT_LEASE_MS) },
    });
    if (claimed.count === 0) return this.awaitOtherRunner(pay.id, retry);
    try {
      progress = (await this.prisma.settlementProgress.findUnique({ where: { paymentId: pay.id } }))!;
      const current = (await this.prisma.payment.findUnique({ where: { id: pay.id } }))!;
      if (current.status !== 'pending') return this.settleResult(current);
      try {
        return await this.execute(current, progress, rental, input.idempotencyKey);
      } catch (err) {
        try {
          await this.recordErrorRun(current, err as Error);
        } catch (recordErr) {
          this.logger.error({ msg: 'settlement_error_run_not_recorded', paymentId: pay.id, error: (recordErr as Error).message, original: (err as Error).message });
        }
        throw err;
      }
    } finally {
      await this.prisma.settlementProgress.updateMany({ where: { paymentId: pay.id, leaseOwner: owner }, data: { leaseOwner: null, leaseUntil: null } });
    }
  }

  /**
   * Erro ou resultado desconhecido do gateway: não conta como tentativa de cobrança (mesma chave na próxima execução).
   * Depois de `MAX_ERROR_RUNS` execuções assim, a liquidação é estacionada (`parkedAt`) para revisão manual.
   */
  private async recordErrorRun(pay: Payment, err: Error): Promise<void> {
    const current = await this.prisma.settlementProgress.findUnique({ where: { paymentId: pay.id }, select: { errorRuns: true } });
    const errorRuns = (current?.errorRuns ?? 0) + 1;
    const park = errorRuns >= MAX_ERROR_RUNS;
    const reason = err.message.slice(0, 500);
    await this.prisma.settlementProgress.update({
      where: { paymentId: pay.id },
      data: { errorRuns, lastFailure: reason, ...(park ? { parkedAt: this.now(), parkedReason: reason } : {}) },
    });
    if (park) this.signalReview(pay, reason, { errorRuns });
  }

  /** Estaciona a liquidação para revisão manual: o job, a porta e o webhook param de chamar o gateway; o operador é avisado. */
  private async park(pay: Payment, reason: string): Promise<SettleResult> {
    await this.prisma.settlementProgress.update({ where: { paymentId: pay.id }, data: { parkedAt: this.now(), parkedReason: reason.slice(0, 500) } });
    this.signalReview(pay, reason);
    return { paymentId: pay.id, status: 'failed' };
  }

  private signalReview(pay: Payment, reason: string, extra: Record<string, unknown> = {}): void {
    signalNeedsReview(this.logger, this.events, { paymentId: pay.id, ...(pay.rentalId ? { rentalId: pay.rentalId } : {}), reason }, extra);
  }

  /** Outro executor tem o lease: a chamada da porta espera o resultado; o job só pula. */
  private async awaitOtherRunner(paymentId: string, retry: boolean): Promise<SettleResult> {
    if (retry) throw new SettlementInProgressError(paymentId);
    for (let i = 0; i < 300; i++) {
      const p = (await this.prisma.payment.findUnique({ where: { id: paymentId } }))!;
      if (p.status !== 'pending') return this.settleResult(p);
      const prog = await this.prisma.settlementProgress.findUnique({ where: { paymentId } });
      if (!prog?.leaseUntil) {
        // O outro executor terminou sem liquidar: cobrança recusada (aguarda o job) ou erro do gateway (o job retoma).
        if (prog && prog.attempts > 0) return { paymentId, status: 'failed' };
        throw new SettlementInProgressError(paymentId);
      }
      await sleep(50);
    }
    throw new SettlementInProgressError(paymentId);
  }

  private async ensureProgress(pay: Payment, depositId: string) {
    const found = await this.prisma.settlementProgress.findUnique({ where: { paymentId: pay.id } });
    if (found) return found;
    const deposit = await this.prisma.deposit.findUnique({ where: { id: depositId } });
    const dp = deposit ? await this.depositPayment(deposit.id) : null;
    const plan = this.choosePlan(collectible(pay), deposit, dp);
    try {
      return await this.prisma.settlementProgress.create({ data: { paymentId: pay.id, plan, depositId: deposit?.id ?? null } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      return (await this.prisma.settlementProgress.findUnique({ where: { paymentId: pay.id } }))!;
    }
  }

  private choosePlan(amount: number, deposit: Deposit | null, dp: Payment | null): SettlementPlan {
    if (amount === 0) return 'zero';
    if (deposit?.status === 'held' && deposit.method === 'card' && dp?.status === 'authorized' && dp.providerPaymentId) {
      return amount <= deposit.amountCents ? 'card_capture' : 'card_charge';
    }
    if (deposit?.status === 'held' && deposit.method === 'pix' && dp?.providerPaymentId && SETTLED_STATUSES.includes(dp.status)) {
      return amount <= deposit.amountCents ? 'pix_keep' : 'pix_keep_charge';
    }
    return 'charge_only';
  }

  private settleResult(p: Payment): SettleResult {
    return { paymentId: p.id, status: SETTLED_STATUSES.includes(p.status) ? 'paid' : 'failed' };
  }

  private async execute(pay: Payment, progress: SettlementProgress, rental: SettleRental, key: string): Promise<SettleResult> {
    const steps: SettlementSteps = { ...((progress.steps as SettlementSteps | null) ?? {}) };
    const save = async (patch: SettlementSteps) => {
      Object.assign(steps, patch);
      // Passo concluído/gravado: a contagem de execuções com erro recomeça.
      await this.prisma.settlementProgress.update({ where: { paymentId: pay.id }, data: { steps: { ...steps } as Prisma.InputJsonValue, errorRuns: 0 } });
    };
    // Só o que falta cobrar (bruto − carteira) passa pela caução/cartão.
    const amount = collectible(pay);
    const plan = progress.plan as SettlementPlan;
    const deposit = progress.depositId ? await this.prisma.deposit.findUnique({ where: { id: progress.depositId } }) : null;
    const dp = deposit ? await this.depositPayment(deposit.id) : null;
    const attempt = progress.attempts;
    const attemptKey = (base: string) => (attempt === 0 ? base : `${base}:a${attempt}`);
    const ctx: StepContext = { pay, steps, save, attempt, attemptKey, customerId: rental.customerId };

    if (plan === 'zero') {
      if (!steps.release && deposit) await this.releaseDeposit(deposit, `${key}:release`);
      if (!steps.release) await save({ release: true });
      // R2-01: a carteira cobriu tudo no fechamento → o pagamento é da carteira.
      return this.finishPaid(pay, rental, { method: pay.walletCents > 0 ? 'wallet' : (deposit?.method ?? 'card') });
    }

    if (plan === 'card_capture') {
      const paidByCapture = () => this.finishPaid(pay, rental, { method: 'card', providerPaymentId: dp!.providerPaymentId, cardLast4: dp!.cardLast4 });
      if (!steps.capture) {
        // Já tentou capturar antes (queda, resposta ambígua ou captura em análise): o gateway diz o que aconteceu antes de qualquer nova chamada.
        if (steps.captureStarted) {
          const seen = await this.reconcileCapture(ctx, progress, deposit!, dp!);
          if (seen === 'captured') return paidByCapture();
          if (seen !== 'authorized') return seen;
        }
        if (!steps.captureStarted) await save({ captureStarted: true });
        const cap = await this.provider.capture({ providerPaymentId: dp!.providerPaymentId!, amountCents: amount, idempotencyKey: attemptKey(`${key}:capture`) });
        // Captura em análise: não é recusa; a próxima execução confere pelo getPayment (nunca cancela enquanto isso).
        if (cap.status === 'pending') return this.awaitingReview(ctx, 'capture');
        if (cap.status !== 'captured') {
          return this.collectionFailed(pay, progress, rental.customerId, cap.failureReason ?? 'capture_failed', {
            onFinal: async () => {
              // Antes de cancelar, confere: se a captura entrou, a liquidação está paga; se está em análise, espera.
              const seen = await this.reconcileCapture(ctx, progress, deposit!, dp!);
              if (seen === 'captured') return paidByCapture();
              if (seen !== 'authorized') return seen;
              await this.releaseDeposit((await this.prisma.deposit.findUnique({ where: { id: deposit!.id } }))!, `${key}:release-after-failure`);
            },
          });
        }
        await this.captureDeposit(deposit!, dp!, cap.capturedCents ?? amount);
        await save({ capture: true, captureInReviewSince: null });
      }
      return paidByCapture();
    }

    if (plan === 'card_charge') {
      // Garantia em análise no gateway: só consulta; nunca cobra nem cancela a pré-autorização.
      if (steps.guaranteeCaptureInReview) return this.resolveGuaranteeCapture(ctx, progress, deposit!);
      if (!steps.charge) {
        const charged = await this.chargeStep(ctx, `${key}:charge`, amount);
        if (isStop(charged)) return charged.stop;
        if (charged?.status !== 'paid') {
          return this.collectionFailed(pay, progress, rental.customerId, charged?.failureReason ?? 'card_not_found', {
            final: !charged,
            // Última tentativa: a caução inteira é capturada como garantia; o restante fica como inadimplência.
            onFinal: async () => this.captureGuarantee(ctx, deposit!.id, `${key}:capture-guarantee`, `${key}:release-after-failure`),
          });
        }
      }
      if (!steps.release) {
        await this.releaseDeposit((await this.prisma.deposit.findUnique({ where: { id: deposit!.id } }))!, `${key}:release`);
        await save({ release: true });
      }
      return this.finishPaid(pay, rental, { method: 'card', providerPaymentId: steps.charge!.providerPaymentId, cardLast4: steps.charge!.cardLast4 });
    }

    if (plan === 'pix_keep' || plan === 'pix_keep_charge') {
      const kept = Math.min(amount, deposit!.amountCents);
      const excess = deposit!.amountCents - kept;
      if (excess > 0 && !steps.refundExcess) {
        const r = await this.provider.refund({ providerPaymentId: dp!.providerPaymentId!, amountCents: excess, idempotencyKey: `${key}:refund-excess` });
        const fresh = (await this.prisma.payment.findUnique({ where: { id: dp!.id } }))!;
        if (fresh.status !== r.status || fresh.refundedCents !== r.refundedCents) await this.state.transition(dp!.id, r.status, { refundedCents: r.refundedCents });
        await save({ refundExcess: true });
      }
      if (!steps.depositKept) {
        await this.prisma.deposit.updateMany({ where: { id: deposit!.id, status: 'held' }, data: { status: 'captured', capturedCents: kept } });
        await save({ depositKept: true });
      }
      if (plan === 'pix_keep') return this.finishPaid(pay, rental, { method: 'pix', providerPaymentId: dp!.providerPaymentId });
    }

    // pix_keep_charge (restante) ou charge_only (total) no cartão padrão.
    const due = plan === 'pix_keep_charge' ? amount - deposit!.amountCents : amount;
    const base = plan === 'pix_keep_charge' ? `${key}:charge-remainder` : `${key}:charge`;
    if (!steps.charge) {
      const charged = await this.chargeStep(ctx, base, due);
      if (isStop(charged)) return charged.stop;
      if (charged?.status !== 'paid') return this.collectionFailed(pay, progress, rental.customerId, charged?.failureReason ?? 'card_not_found', { final: !charged });
    }
    return this.finishPaid(pay, rental, { method: 'card', providerPaymentId: steps.charge!.providerPaymentId, cardLast4: steps.charge!.cardLast4 });
  }

  /**
   * Confere a pré-autorização no gateway antes de qualquer nova chamada:
   * - `captured` → grava o passo e devolve `'captured'`;
   * - `authorized` → ainda dá para capturar (devolve `'authorized'`);
   * - `pending` (captura em análise) → espera;
   * - recusada/cancelada → a pré-autorização morreu: nada a capturar nem a cancelar; falha definitiva da cobrança;
   * - qualquer outro estado → estacionada para revisão.
   * Um `SettleResult` significa "pare aqui e responda isto".
   */
  private async reconcileCapture(ctx: StepContext, progress: SettlementProgress, deposit: Deposit, dp: Payment): Promise<'captured' | 'authorized' | SettleResult> {
    const pp = await this.provider.getPayment(dp.providerPaymentId!);
    if (pp.status === 'captured') {
      const freshDp = (await this.prisma.payment.findUnique({ where: { id: dp.id } }))!;
      await this.captureDeposit((await this.prisma.deposit.findUnique({ where: { id: deposit.id } }))!, freshDp, pp.capturedCents ?? pp.amountCents);
      await ctx.save({ capture: true, captureInReviewSince: null });
      this.logger.warn({ msg: 'settlement_capture_reconciled', paymentId: dp.id });
      return 'captured';
    }
    if (pp.status === 'authorized') return 'authorized';
    if (pp.status === 'pending') return this.awaitingReview(ctx, 'capture');
    if (DECLINED_STATUSES.includes(pp.status)) {
      const reason = pp.failureReason ?? 'capture_rejected_after_review';
      return this.collectionFailed(ctx.pay, progress, ctx.customerId, reason, { final: true, onFinal: () => this.voidDeadPreAuth(deposit.id, pp.status, reason) });
    }
    return this.park(ctx.pay, `preauthorization_unexpected_status:${pp.status}`);
  }

  /**
   * A pré-autorização deixou de existir no gateway (captura recusada depois da análise, autorização cancelada/expirada):
   * não há o que capturar nem cancelar. Registra no Payment da caução e libera a caução localmente.
   */
  private async voidDeadPreAuth(depositId: string, gatewayStatus: string, reason: string): Promise<void> {
    const dp = await this.depositPayment(depositId);
    if (dp?.status === 'authorized') await this.state.transition(dp.id, gatewayStatus === 'canceled' ? 'canceled' : 'failed', { failureReason: reason });
    await this.prisma.deposit.updateMany({ where: { id: depositId, status: 'held' }, data: { status: 'released' } });
    this.logger.warn({ msg: 'deposit_preauthorization_void', depositId, gatewayStatus, reason });
  }

  /**
   * Cobrança de um passo com resultado desconhecido tratado com segurança:
   * - cobrança **em análise** (`pending` no gateway: pending/in_process/in_mediation) não é recusa: o passo espera
   *   (`chargeInReview`) e cada execução só consulta `getPayment` pelo id, sem cobrar de novo; aprovada → passo concluído;
   *   recusada → conta como uma recusa;
   * - se o passo já foi tentado, procura no gateway (referência externa = `Payment.id`, mesmo valor) um pagamento aprovado
   *   ou em análise antes de qualquer nova cobrança;
   * - o token do cartão é criado uma vez por tentativa e guardado antes da chamada (o corpo da repetição é idêntico);
   * - recusa genuína volta como `failed`; erro/timeout lança (não conta tentativa, mesma chave na próxima execução).
   */
  private async chargeStep(ctx: StepContext, base: string, due: number): Promise<StepOutcome> {
    const { pay, steps, save, attempt } = ctx;
    if (steps.chargeInReview) {
      const pp = await this.provider.getPayment(steps.chargeInReview);
      if (pp.status === 'pending') return { stop: await this.awaitingReview(ctx, 'charge') };
      if (pp.status === 'paid') {
        await save({ chargeInReview: null, chargeInReviewSince: null, charge: { providerPaymentId: pp.providerPaymentId, cardLast4: pp.cardLast4 ?? null } });
        return pp;
      }
      if (DECLINED_STATUSES.includes(pp.status)) {
        await save({ chargeInReview: null, chargeInReviewSince: null });
        return { ...pp, status: 'failed', failureReason: pp.failureReason ?? 'charge_rejected_after_review' };
      }
      // Estornado, contestado, autorizado...: nem aprovado nem recusado. Nunca cobrar de novo em cima disso: revisão manual.
      return { stop: await this.park(pay, `charge_in_review_unexpected_status:${pp.status}`) };
    }
    if (steps.chargeStarted) {
      const found = (await this.provider.searchPayments({ externalReference: pay.id })).filter((p) => p.amountCents === due);
      const paid = found.find((p) => p.status === 'paid');
      if (paid) {
        await save({ charge: { providerPaymentId: paid.providerPaymentId, cardLast4: paid.cardLast4 ?? null } });
        this.logger.warn({ msg: 'settlement_charge_reconciled', paymentId: pay.id });
        return paid;
      }
      const reviewing = found.find((p) => p.status === 'pending');
      if (reviewing) {
        await save({ chargeInReview: reviewing.providerPaymentId });
        return { stop: await this.awaitingReview(ctx, 'charge') };
      }
    }
    const card = await this.customers.card(ctx.customerId);
    if (!card) return null;
    const providerCustomerId = await this.customers.ensureCustomer(ctx.customerId);
    let cardToken = steps.chargeTokens?.[String(attempt)];
    if (!cardToken) {
      cardToken = (await this.provider.createCardToken({ providerCustomerId, providerCardId: card.providerCardId })).cardToken;
      await save({ chargeStarted: true, chargeTokens: { ...(steps.chargeTokens ?? {}), [String(attempt)]: cardToken } });
    }
    const res = await this.provider.charge({
      providerCustomerId, providerCardId: card.providerCardId, cardToken, amountCents: due, description: 'Aluguel Volti', idempotencyKey: ctx.attemptKey(base), externalReference: pay.id,
    });
    const out = { ...res, cardLast4: res.cardLast4 ?? card.last4 };
    if (out.status === 'paid') await save({ charge: { providerPaymentId: out.providerPaymentId, cardLast4: out.cardLast4 ?? null } });
    if (out.status === 'pending') {
      await save({ chargeInReview: out.providerPaymentId });
      return { stop: await this.awaitingReview(ctx, 'charge') };
    }
    return out;
  }

  /**
   * Cobrança/captura em análise no gateway: nada falhou e nada é cobrado de novo; o job (ou o webhook) confere depois.
   * O início da análise fica gravado (`chargeInReviewSince`/`captureInReviewSince`); passado `reviewMaxDays`
   * (`PAYMENT_REVIEW_MAX_DAYS`, padrão 7), a liquidação é estacionada com motivo `review_timeout` e o operador é avisado.
   */
  private async awaitingReview(ctx: StepContext, kind: ReviewKind): Promise<SettleResult> {
    const now = this.now();
    const current = kind === 'charge' ? ctx.steps.chargeInReviewSince : ctx.steps.captureInReviewSince;
    if (!current) await ctx.save(kind === 'charge' ? { chargeInReviewSince: now.toISOString() } : { captureInReviewSince: now.toISOString() });
    const sinceIso = kind === 'charge' ? ctx.steps.chargeInReviewSince! : ctx.steps.captureInReviewSince!;
    if (now.getTime() - new Date(sinceIso).getTime() >= this.reviewMaxMs()) {
      this.logger.warn({ msg: 'settlement_review_timeout', paymentId: ctx.pay.id, kind, since: sinceIso });
      return this.park(ctx.pay, 'review_timeout');
    }
    this.logger.log({ msg: 'settlement_awaiting_gateway_review', paymentId: ctx.pay.id, kind });
    return { paymentId: ctx.pay.id, status: 'failed' };
  }

  /**
   * Garantia (última tentativa do `card_charge`): captura a caução inteira, conferindo antes no gateway.
   * - captura em análise (`pending`) → **não cancela**: grava `guaranteeCaptureInReview` e devolve `'awaiting'`
   *   (o job e o webhook resolvem em `resolveGuaranteeCapture`);
   * - recusada ou pré-autorização já morta → libera (sem cancelar o que não existe);
   * - estado inesperado → estacionada.
   */
  private async captureGuarantee(ctx: StepContext, depositId: string, captureKey: string, releaseKey: string): Promise<SettleResult | 'awaiting' | void> {
    const d = (await this.prisma.deposit.findUnique({ where: { id: depositId } }))!;
    const auth = (await this.depositPayment(d.id))!;
    if (d.status !== 'held' || auth.status !== 'authorized') return;
    const awaiting = async () => {
      await ctx.save({ guaranteeCaptureInReview: true, captureInReviewSince: ctx.steps.captureInReviewSince ?? this.now().toISOString() });
      this.logger.log({ msg: 'settlement_guarantee_capture_in_review', paymentId: ctx.pay.id, depositId });
      return 'awaiting' as const;
    };
    const pp = await this.provider.getPayment(auth.providerPaymentId!);
    if (pp.status === 'captured') return this.captureDeposit(d, auth, pp.capturedCents ?? d.amountCents);
    if (pp.status === 'pending') return awaiting();
    if (DECLINED_STATUSES.includes(pp.status)) return this.voidDeadPreAuth(d.id, pp.status, pp.failureReason ?? 'preauthorization_void');
    if (pp.status !== 'authorized') return this.park(ctx.pay, `preauthorization_unexpected_status:${pp.status}`);
    const cap = await this.provider.capture({ providerPaymentId: auth.providerPaymentId!, amountCents: d.amountCents, idempotencyKey: captureKey });
    if (cap.status === 'captured') await this.captureDeposit(d, auth, d.amountCents);
    else if (cap.status === 'pending') return awaiting();
    else await this.releaseDeposit(d, releaseKey);
  }

  /**
   * Garantia em análise: só consulta o gateway (nunca cobra nem cancela).
   * Aprovada → caução capturada e a liquidação termina `failed` (a dívida restante continua como inadimplência);
   * recusada/cancelada → pré-autorização morta: caução liberada localmente e `failed`; em análise → espera (com prazo);
   * qualquer outro estado → estacionada.
   */
  private async resolveGuaranteeCapture(ctx: StepContext, progress: SettlementProgress, deposit: Deposit): Promise<SettleResult> {
    const { pay, save } = ctx;
    const d = (await this.prisma.deposit.findUnique({ where: { id: deposit.id } }))!;
    const auth = (await this.depositPayment(d.id))!;
    const pp = await this.provider.getPayment(auth.providerPaymentId!);
    if (pp.status === 'pending') return this.awaitingReview(ctx, 'capture');
    if (pp.status === 'captured') await this.captureDeposit(d, auth, pp.capturedCents ?? d.amountCents);
    else if (DECLINED_STATUSES.includes(pp.status)) await this.voidDeadPreAuth(d.id, pp.status, pp.failureReason ?? 'guarantee_capture_rejected');
    else return this.park(pay, `guarantee_capture_unexpected_status:${pp.status}`);
    await save({ guaranteeCaptureInReview: null, captureInReviewSince: null });
    await this.state.transition(pay.id, 'failed', { failureReason: progress.lastFailure ?? 'charge_failed' });
    await this.markFinished(pay.id);
    this.logger.warn({ msg: 'settlement_guarantee_resolved', paymentId: pay.id, depositId: d.id, gatewayStatus: pp.status });
    return { paymentId: pay.id, status: 'failed' };
  }

  /** Liquidação concluída (paga ou falha definitiva): o registro sai da fila do job. */
  private async markFinished(paymentId: string): Promise<void> {
    await this.prisma.settlementProgress.updateMany({ where: { paymentId, finishedAt: null }, data: { finishedAt: this.now() } });
  }

  private async finishPaid(pay: Payment, rental: { customerId: string; insurancePolicyId: string | null }, data: { method: 'card' | 'pix' | 'wallet'; providerPaymentId?: string | null; cardLast4?: string | null }): Promise<SettleResult> {
    await this.state.transition(pay.id, 'paid', { method: data.method, providerPaymentId: data.providerPaymentId ?? null, cardLast4: data.cardLast4 ?? null, failureReason: null });
    await this.markFinished(pay.id);
    this.logger.log({ msg: 'rental_settled', paymentId: pay.id, rentalId: pay.rentalId, amountCents: pay.amountCents });
    await this.clearDelinquencyIfSettled(rental.customerId);
    if (rental.insurancePolicyId) {
      await this.insurance.registerRemittance(rental.insurancePolicyId).catch((err) => this.logger.error({ msg: 'insurance_remittance_failed', paymentId: pay.id, error: (err as Error).message }));
    }
    await this.receipts.issueForPayment(pay.id).catch((err) => this.logger.error({ msg: 'receipt_failed', paymentId: pay.id, error: (err as Error).message }));
    return { paymentId: pay.id, status: 'paid' };
  }

  /**
   * Recusa **genuína** (o gateway respondeu e recusou): inadimplente já; retentativa pelo job até o limite; na última,
   * `onFinal` (que pode concluir como pago, se a conferência no gateway mostrar que entrou) e `failed`.
   */
  private async collectionFailed(pay: Payment, progress: SettlementProgress, customerId: string, reason: string, opts: { final?: boolean; onFinal?: () => Promise<SettleResult | 'awaiting' | void> } = {}): Promise<SettleResult> {
    const attempts = progress.attempts + 1;
    await this.markDelinquent(customerId, pay.id, reason);
    if (opts.final || attempts >= MAX_COLLECTION_ATTEMPTS) {
      if (opts.onFinal) {
        const settled = await opts.onFinal();
        if (settled === 'awaiting') {
          // Garantia em análise: a cobrança já esgotou as tentativas, mas o desfecho da caução ainda vem do gateway.
          await this.prisma.settlementProgress.update({ where: { paymentId: pay.id }, data: { attempts, lastFailure: reason } });
          await this.state.annotate(pay.id, { failureReason: reason });
          return { paymentId: pay.id, status: 'failed' };
        }
        if (settled) return settled;
      }
      await this.prisma.settlementProgress.update({ where: { paymentId: pay.id }, data: { attempts, lastFailure: reason } });
      await this.state.transition(pay.id, 'failed', { failureReason: reason });
      await this.markFinished(pay.id);
      return { paymentId: pay.id, status: 'failed' };
    }
    await this.prisma.settlementProgress.update({ where: { paymentId: pay.id }, data: { attempts, lastFailure: reason } });
    await this.state.annotate(pay.id, { failureReason: reason });
    return { paymentId: pay.id, status: 'failed' };
  }

  async markDelinquent(customerId: string, paymentId: string, reason: string): Promise<void> {
    await this.prisma.customer.update({ where: { id: customerId }, data: { delinquent: true } });
    this.logger.warn({ msg: 'customer_delinquent', paymentId, reason });
  }

  /**
   * Dívida quitada (cobrança retentada com sucesso ou quitação do cliente, Task 14): sai da inadimplência se não houver
   * outra em aberto (`failed` sem `debtSettledAt`) nem liquidação ainda retentando.
   */
  async clearDelinquencyIfSettled(customerId: string): Promise<void> {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { delinquent: true } });
    if (!c?.delinquent) return;
    const failed = await this.prisma.payment.count({ where: { customerId, kind: { in: ['rental', 'subscription'] }, status: 'failed', debtSettledAt: null } });
    if (failed > 0) return;
    const pendingIds = (await this.prisma.payment.findMany({ where: { customerId, kind: 'rental', status: 'pending' }, select: { id: true } })).map((p) => p.id);
    const retrying = pendingIds.length ? await this.prisma.settlementProgress.count({ where: { paymentId: { in: pendingIds }, attempts: { gt: 0 } } }) : 0;
    if (retrying > 0) return;
    await this.prisma.customer.update({ where: { id: customerId }, data: { delinquent: false } });
    this.logger.log({ msg: 'customer_delinquency_cleared' });
  }

  /** Flag `delinquent` **ou** dívida em aberto (R2-01: uma dívida sem a flag, por qualquer caminho, também impede alugar). */
  async isDelinquent(customerId: string): Promise<boolean> {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { delinquent: true } });
    if (c?.delinquent === true) return true;
    const open = await this.prisma.payment.count({ where: { customerId, kind: { in: ['rental', 'subscription'] }, status: 'failed', debtSettledAt: null } });
    return open > 0;
  }

  /** Liquidações `pending` (erro do gateway ou cobrança recusada) são retomadas pelo plano gravado, sem cobrar duas vezes. */
  @Interval('payments-settlement-retry', 5 * 60_000)
  @ExclusiveJob('payments-settlement-retry', jobLockTtl(5 * 60_000))
  async retryJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.retryPendingSettlements(2 * 60_000).catch((err) => this.logger.error({ msg: 'settlement_retry_failed', error: (err as Error).message }));
  }

  /**
   * Lê as liquidações pelo próprio registro do motor (`SettlementProgress`): não estacionadas, sem lease válido e sem
   * movimento há `olderThanMs`, as mais antigas primeiro (`updatedAt` crescente). Pagamentos `pending` que caíram antes
   * de ganhar o registro (janela mínima) entram por uma segunda consulta.
   */
  async retryPendingSettlements(olderThanMs: number): Promise<void> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - olderThanMs);
    const progress = await this.prisma.settlementProgress.findMany({
      where: { parkedAt: null, finishedAt: null, updatedAt: { lte: cutoff }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });
    const seen = new Set(progress.map((p) => p.paymentId));
    const candidates: Payment[] = [];
    for (const prog of progress) {
      const p = await this.prisma.payment.findUnique({ where: { id: prog.paymentId } });
      if (p?.status === 'pending') candidates.push(p);
      // Liquidação já concluída sem o carimbo (queda entre a transição e o registro): fecha o registro para sair da fila.
      else if (p) await this.markFinished(p.id);
    }
    const orphans = await this.prisma.payment.findMany({ where: { kind: 'rental', status: 'pending', createdAt: { lte: cutoff } }, orderBy: { updatedAt: 'asc' }, take: 50 });
    const withProgress = new Set((await this.prisma.settlementProgress.findMany({ where: { paymentId: { in: orphans.map((p) => p.id) } }, select: { paymentId: true } })).map((p) => p.paymentId));
    for (const p of orphans) if (!seen.has(p.id) && !withProgress.has(p.id)) candidates.push(p);
    for (const p of candidates) {
      if (!p.rentalId || !p.idempotencyKey) continue;
      await this.runSettlement({ rentalId: p.rentalId, amountCents: p.amountCents, idempotencyKey: p.idempotencyKey }, true)
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
    // Liquidação de aluguel ainda em andamento: o webhook nunca muda o Payment direto (pularia liberação da caução,
    // retentativas, onFinal, recibo e o estacionamento). Só dispara o motor se ele está esperando exatamente este pagamento.
    if (local.kind === 'rental' && local.status === 'pending') {
      await this.nudgeSettlement(local, pp);
      return { payment: (await this.prisma.payment.findUnique({ where: { id: local.id } }))!, changed: false };
    }
    const result = await this.applyToLocal(local, pp);
    // Payment de caução no cartão: se uma liquidação está esperando uma captura em análise (parcial ou garantia), o motor roda.
    if (local.kind === 'deposit' && local.method === 'card' && local.depositId) await this.nudgeDepositSettlement(local);
    return result;
  }

  private async applyToLocal(local: Payment, pp: ProviderPayment): Promise<{ payment: Payment; changed: boolean }> {
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

  private async nudgeSettlement(local: Payment, pp: ProviderPayment): Promise<void> {
    const progress = await this.prisma.settlementProgress.findUnique({ where: { paymentId: local.id } });
    if (!progress || progress.parkedAt || !local.rentalId || !local.idempotencyKey) return;
    const steps = (progress.steps as SettlementSteps | null) ?? {};
    const waitingThis = steps.chargeInReview === pp.providerPaymentId || this.waitingCapture(steps);
    if (!waitingThis) {
      this.logger.log({ msg: 'settlement_webhook_ignored', paymentId: local.id, status: pp.status });
      return;
    }
    await this.runSettlement({ rentalId: local.rentalId, amountCents: local.amountCents, idempotencyKey: local.idempotencyKey }, true)
      .catch((err) => this.logger.warn({ msg: 'settlement_nudge_failed', paymentId: local.id, error: (err as Error).message }));
  }

  private waitingCapture(steps: SettlementSteps): boolean {
    return (!!steps.captureStarted && !steps.capture) || !!steps.guaranteeCaptureInReview;
  }

  /** Webhook do Payment da caução: acorda a liquidação do aluguel que espera a captura (parcial ou garantia) dessa caução. */
  private async nudgeDepositSettlement(depositPay: Payment): Promise<void> {
    if (!depositPay.rentalId) return;
    const pay = await this.prisma.payment.findFirst({ where: { rentalId: depositPay.rentalId, kind: 'rental', status: 'pending' }, orderBy: { createdAt: 'asc' } });
    if (!pay?.idempotencyKey || !pay.rentalId) return;
    const progress = await this.prisma.settlementProgress.findUnique({ where: { paymentId: pay.id } });
    if (!progress || progress.parkedAt || progress.depositId !== depositPay.depositId) return;
    if (!this.waitingCapture((progress.steps as SettlementSteps | null) ?? {})) return;
    await this.runSettlement({ rentalId: pay.rentalId, amountCents: pay.amountCents, idempotencyKey: pay.idempotencyKey }, true)
      .catch((err) => this.logger.warn({ msg: 'settlement_nudge_failed', paymentId: pay.id, error: (err as Error).message }));
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
      const r = await this.prisma.deposit.updateMany({ where: { id: p.depositId!, status: 'awaiting_pix' }, data: { status: 'failed' } });
      if (r.count === 1) {
        const ev: DepositFailedEvent = { depositId: p.depositId!, customerId: p.customerId };
        await this.events.emitAsync(DEPOSIT_FAILED, ev).catch((err) => this.logger.error({ msg: 'deposit_failed_handler_error', depositId: p.depositId, error: (err as Error).message }));
      }
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
