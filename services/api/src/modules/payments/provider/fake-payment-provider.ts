import { randomUUID } from 'node:crypto';
import type { PixCharge } from '../../../ports/rental-billing.port';
import { assertTransition, InvalidPaymentTransitionError, type PaymentStatus } from '../payment-state';
import { verifyMercadoPagoSignature } from './mercadopago-signature';
import {
  CardDeclinedError,
  type CardPaymentInput,
  type PaymentProvider,
  PaymentProviderError,
  RefundRejectedError,
  type ProviderCard,
  type ProviderPayment,
} from './payment-provider';

/** PNG 1×1 (o QR do Pix fake). */
const QR_PLACEHOLDER = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

type Op = 'preAuthorize' | 'capture' | 'cancelPreAuthorization' | 'charge' | 'refund' | 'createPix' | 'cancelPix' | 'createSubscription';

/**
 * Gateway em memória para dev e testes (`PAYMENT_PROVIDER=fake`). Determinístico:
 * - token com `fail` (ex.: `tok_fail`) → cartão recusado no cadastro, exceto `..._fail_charge`,
 *   que cadastra e pré-autoriza mas recusa captura e cobrança (testa inadimplência de ponta a ponta);
 * - `failNext(op)` programa a próxima operação para falhar;
 * - a mesma `idempotencyKey` devolve o resultado da primeira chamada (como o `X-Idempotency-Key` do Mercado Pago).
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake' as const;
  private readonly payments = new Map<string, ProviderPayment & { cardFailsCharge?: boolean }>();
  private readonly cards = new Map<string, ProviderCard & { failsCharge: boolean }>();
  private readonly cardTokens = new Map<string, string>();
  private readonly subscriptions = new Map<string, 'active' | 'paused' | 'canceled'>();
  private readonly idem = new Map<string, unknown>();
  private readonly failures = new Map<Op, string>();
  private readonly counts = new Map<Op, number>();

  constructor(
    private readonly webhookSecret?: string,
    private readonly webhookToleranceSeconds?: number,
  ) {}

  /** Número de operações efetivamente executadas (sem contar repetições idempotentes). */
  operations(op: Op): number {
    return this.counts.get(op) ?? 0;
  }

  failNext(op: Op, reason = 'cc_rejected_other_reason'): void {
    this.failures.set(op, reason);
  }

  /** Dev/testes: o cliente pagou o Pix. */
  simulatePixPaid(providerPaymentId: string): ProviderPayment {
    const p = this.mustGet(providerPaymentId);
    this.move(p, 'paid');
    return { ...p };
  }

  subscriptionStatus(id: string): 'active' | 'paused' | 'canceled' | undefined {
    return this.subscriptions.get(id);
  }

  private async once<T>(op: Op, key: string, fn: () => T): Promise<T> {
    const k = `${op}:${key}`;
    if (this.idem.has(k)) return structuredClone(this.idem.get(k) as T);
    this.counts.set(op, this.operations(op) + 1);
    const result = fn();
    this.idem.set(k, structuredClone(result));
    return result;
  }

  private takeFailure(op: Op): string | undefined {
    const f = this.failures.get(op);
    if (f) this.failures.delete(op);
    return f;
  }

  private mustGet(id: string) {
    const p = this.payments.get(id);
    if (!p) throw new PaymentProviderError(`Pagamento ${id} não encontrado no gateway.`, 404);
    return p;
  }

  private move(p: ProviderPayment, to: PaymentStatus): void {
    try {
      assertTransition(p.status, to);
    } catch (e) {
      if (e instanceof InvalidPaymentTransitionError) throw new PaymentProviderError(e.message, 400);
      throw e;
    }
    p.status = to;
  }

  async createCustomer(_input: { customerId: string; email: string }) {
    return { providerCustomerId: `fake-cus-${randomUUID()}` };
  }

  async attachCard(input: { providerCustomerId: string; cardToken: string }): Promise<ProviderCard> {
    const failsCharge = input.cardToken.includes('fail_charge');
    if (input.cardToken.includes('fail') && !failsCharge) throw new CardDeclinedError('Cartão recusado pelo emissor.');
    const digits = input.cardToken.replace(/\D/g, '');
    const brand = /master/i.test(input.cardToken) ? 'master' : 'visa';
    const card = { providerCardId: `fake-card-${randomUUID()}`, brand, last4: digits.length >= 4 ? digits.slice(-4) : '4242', expMonth: 12, expYear: new Date().getUTCFullYear() + 4, failsCharge };
    this.cards.set(card.providerCardId, card);
    const { failsCharge: _f, ...out } = card;
    return out;
  }

  private newPayment(input: { amountCents: number; externalReference: string }, status: PaymentStatus, extra: Partial<ProviderPayment> = {}): ProviderPayment {
    const p: ProviderPayment = { providerPaymentId: `fake-pay-${randomUUID()}`, status, amountCents: input.amountCents, externalReference: input.externalReference, ...extra };
    this.payments.set(p.providerPaymentId, p);
    return { ...p };
  }

  async createCardToken(input: { providerCustomerId: string; providerCardId: string }) {
    const cardToken = `fake-tok-${randomUUID()}`;
    this.cardTokens.set(cardToken, input.providerCardId);
    return { cardToken };
  }

  async searchPayments(input: { externalReference: string }): Promise<ProviderPayment[]> {
    return [...this.payments.values()].filter((p) => p.externalReference === input.externalReference).map((p) => ({ ...p }));
  }

  async preAuthorize(input: CardPaymentInput): Promise<ProviderPayment> {
    return this.once('preAuthorize', input.idempotencyKey, () => {
      const card = this.cards.get(input.providerCardId);
      const failure = this.takeFailure('preAuthorize') ?? (card ? undefined : 'card_not_found');
      if (failure) return this.newPayment(input, 'failed', { failureReason: failure });
      const p = this.newPayment(input, 'authorized', { cardLast4: card!.last4 });
      if (card!.failsCharge) this.payments.get(p.providerPaymentId)!.cardFailsCharge = true;
      return p;
    });
  }

  async capture(input: { providerPaymentId: string; amountCents: number; idempotencyKey: string }): Promise<ProviderPayment> {
    return this.once('capture', input.idempotencyKey, () => {
      const p = this.mustGet(input.providerPaymentId);
      if (p.status !== 'authorized') this.move(p, 'captured');
      if (input.amountCents > p.amountCents) throw new PaymentProviderError('Captura acima do valor autorizado.', 400);
      const failure = this.takeFailure('capture') ?? (p.cardFailsCharge ? 'cc_rejected_insufficient_amount' : undefined);
      if (failure) return { ...p, status: 'failed' as const, failureReason: failure };
      this.move(p, 'captured');
      p.capturedCents = input.amountCents;
      return { ...p };
    });
  }

  async cancelPreAuthorization(input: { providerPaymentId: string; idempotencyKey: string }): Promise<ProviderPayment> {
    return this.once('cancelPreAuthorization', input.idempotencyKey, () => {
      const p = this.mustGet(input.providerPaymentId);
      this.move(p, 'canceled');
      return { ...p };
    });
  }

  async charge(input: CardPaymentInput): Promise<ProviderPayment> {
    return this.once('charge', input.idempotencyKey, () => {
      const card = this.cards.get(input.cardToken ? (this.cardTokens.get(input.cardToken) ?? '') : input.providerCardId);
      const failure = this.takeFailure('charge') ?? (!card ? 'card_not_found' : card.failsCharge ? 'cc_rejected_insufficient_amount' : undefined);
      if (failure) return this.newPayment(input, 'failed', { failureReason: failure });
      return this.newPayment(input, 'paid', { cardLast4: card!.last4 });
    });
  }

  async refund(input: { providerPaymentId: string; amountCents?: number; idempotencyKey: string }) {
    return this.once('refund', input.idempotencyKey, () => {
      const p = this.mustGet(input.providerPaymentId);
      const base = p.status === 'captured' ? (p.capturedCents ?? p.amountCents) : p.amountCents;
      const already = p.refundedCents ?? 0;
      const amount = input.amountCents ?? base - already;
      if (amount <= 0 || already + amount > base) throw new RefundRejectedError('Estorno acima do disponível.', 400);
      const total = already + amount;
      const status = total >= base ? ('refunded' as const) : ('partially_refunded' as const);
      this.move(p, status);
      p.refundedCents = total;
      return { providerRefundId: `fake-ref-${randomUUID()}`, refundedCents: total, status };
    });
  }

  async createPix(input: { amountCents: number; description: string; expiresAt: Date; payerEmail: string; idempotencyKey: string; externalReference: string }) {
    return this.once('createPix', input.idempotencyKey, () => {
      const pix: PixCharge = {
        chargeId: '',
        qrCodeBase64: QR_PLACEHOLDER,
        copyPaste: `00020126580014br.gov.bcb.pix0136${randomUUID()}5204000053039865406${(input.amountCents / 100).toFixed(2)}5802BR5905VOLTI6009SAO PAULO62070503***6304ABCD`,
        expiresAt: input.expiresAt.toISOString(),
      };
      const p = this.newPayment(input, 'pending');
      pix.chargeId = p.providerPaymentId;
      this.payments.get(p.providerPaymentId)!.pix = pix;
      return { ...p, pix };
    });
  }

  async cancelPix(input: { providerPaymentId: string; idempotencyKey: string }): Promise<ProviderPayment> {
    return this.once('cancelPix', input.idempotencyKey, () => {
      const p = this.mustGet(input.providerPaymentId);
      this.move(p, 'failed');
      p.failureReason = 'pix_canceled';
      return { ...p };
    });
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    return { ...this.mustGet(providerPaymentId) };
  }

  async createSubscription(input: Parameters<PaymentProvider['createSubscription']>[0]) {
    return this.once('createSubscription', input.idempotencyKey, () => {
      const card = this.cards.get(input.providerCardId);
      const failure = this.takeFailure('createSubscription') ?? (!card ? 'card_not_found' : card.failsCharge ? 'cc_rejected_insufficient_amount' : undefined);
      const id = `fake-sub-${randomUUID()}`;
      if (failure) return { providerSubscriptionId: id, status: 'failed' as const, failureReason: failure };
      this.subscriptions.set(id, 'active');
      const firstPayment = this.newPayment(input, 'paid', { cardLast4: card!.last4 });
      return { providerSubscriptionId: id, status: 'active' as const, firstPayment };
    });
  }

  async cancelSubscription(input: { providerSubscriptionId: string }): Promise<void> {
    if (this.subscriptions.has(input.providerSubscriptionId)) this.subscriptions.set(input.providerSubscriptionId, 'canceled');
  }

  async setSubscriptionPaused(input: { providerSubscriptionId: string; paused: boolean }): Promise<void> {
    const current = this.subscriptions.get(input.providerSubscriptionId);
    if (current && current !== 'canceled') this.subscriptions.set(input.providerSubscriptionId, input.paused ? 'paused' : 'active');
  }

  verifyWebhook(input: { signature?: string; requestId?: string; dataId: string }): boolean {
    return verifyMercadoPagoSignature({ secret: this.webhookSecret, toleranceSeconds: this.webhookToleranceSeconds, ...input });
  }
}
