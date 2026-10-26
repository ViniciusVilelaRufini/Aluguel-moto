import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
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

/** Ids que o próprio fake emite (`fake-<tipo>-<uuid>`): só esses são reidratados depois de um reinício. */
const FAKE_ID = (kind: 'card' | 'tok' | 'pay') => new RegExp(`^fake-${kind}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`);
const FAKE_CARD_ID = FAKE_ID('card');
const FAKE_TOKEN_ID = FAKE_ID('tok');
const FAKE_PAYMENT_ID = FAKE_ID('pay');

type FakePayment = ProviderPayment & { cardFailsCharge?: boolean; amountUnknown?: boolean };

type Op = 'preAuthorize' | 'capture' | 'cancelPreAuthorization' | 'charge' | 'refund' | 'createPix' | 'cancelPix' | 'createSubscription';

/**
 * Gateway em memória para dev e testes (`PAYMENT_PROVIDER=fake`). Determinístico:
 * - token com `fail` (ex.: `tok_fail`) → cartão recusado no cadastro, exceto `..._fail_charge`,
 *   que cadastra e pré-autoriza mas recusa captura e cobrança (testa inadimplência de ponta a ponta);
 * - `failNext(op)` programa a próxima operação para falhar;
 * - a mesma `idempotencyKey` devolve o resultado da primeira chamada (como o `X-Idempotency-Key` do Mercado Pago);
 * - reinício da API (o estado é só memória): cartão (`fake-card-<uuid>`), token (`fake-tok-<uuid>`) e pré-autorização
 *   (`fake-pay-<uuid>`) emitidos antes e desconhecidos agora são reidratados como válidos (cartão aprovado; pré-autorização
 *   `authorized` com valor desconhecido, que aceita capturar o valor pedido) e registram `fake_payment_rehydrated`.
 *   Ids fora desse formato e cartões excluídos continuam "não encontrados".
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake' as const;
  private readonly logger = new Logger('FakePaymentProvider');
  private readonly payments = new Map<string, FakePayment>();
  private readonly cards = new Map<string, ProviderCard & { failsCharge: boolean }>();
  /** Cartões excluídos (LGPD): nunca reidratados. */
  private readonly deletedCards = new Set<string>();
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

  /** Dev/testes: o Pix venceu sem pagamento (o gateway o dá como falho). */
  simulatePixExpired(providerPaymentId: string): ProviderPayment {
    const p = this.mustGet(providerPaymentId);
    this.move(p, 'failed');
    p.failureReason = 'pix_expired';
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

  /** `asPreAuthorization`: só consulta/captura/cancelamento de pré-autorização reidratam um id desconhecido. */
  private mustGet(id: string, asPreAuthorization = false) {
    const p = this.payments.get(id) ?? (asPreAuthorization ? this.rehydratePreAuthorization(id) : undefined);
    if (!p) throw new PaymentProviderError(`Pagamento ${id} não encontrado no gateway.`, 404);
    return p;
  }

  /** Pré-autorização emitida antes de um reinício: volta `authorized` com valor desconhecido (a captura define o valor). */
  private rehydratePreAuthorization(id: string) {
    if (!FAKE_PAYMENT_ID.test(id)) return undefined;
    const p: FakePayment = { providerPaymentId: id, status: 'authorized', amountCents: 0, amountUnknown: true };
    this.payments.set(id, p);
    this.logger.warn({ msg: 'fake_payment_rehydrated', kind: 'payment', providerPaymentId: id });
    return p;
  }

  /** Cartão (pelo token ou pelo id) emitido antes de um reinício: volta como cartão aprovado (last4 desconhecido). */
  private findCard(input: { providerCardId?: string; cardToken?: string }) {
    const tokenCard = input.cardToken ? this.cardTokens.get(input.cardToken) : undefined;
    if (input.cardToken && tokenCard === undefined && !FAKE_TOKEN_ID.test(input.cardToken)) return undefined;
    const id = tokenCard ?? input.providerCardId ?? '';
    const known = this.cards.get(id);
    if (known) return known;
    if (!FAKE_CARD_ID.test(id) || this.deletedCards.has(id)) return undefined;
    const card = { providerCardId: id, brand: 'visa', last4: '', expMonth: 12, expYear: new Date().getUTCFullYear() + 4, failsCharge: false };
    this.cards.set(id, card);
    if (input.cardToken) this.cardTokens.set(input.cardToken, id);
    this.logger.warn({ msg: 'fake_payment_rehydrated', kind: 'card', providerCardId: id });
    return card;
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
      const card = this.findCard({ providerCardId: input.providerCardId });
      const failure = this.takeFailure('preAuthorize') ?? (card ? undefined : 'card_not_found');
      if (failure) return this.newPayment(input, 'failed', { failureReason: failure });
      const p = this.newPayment(input, 'authorized', card!.last4 ? { cardLast4: card!.last4 } : {});
      if (card!.failsCharge) this.payments.get(p.providerPaymentId)!.cardFailsCharge = true;
      return p;
    });
  }

  async capture(input: { providerPaymentId: string; amountCents: number; idempotencyKey: string }): Promise<ProviderPayment> {
    return this.once('capture', input.idempotencyKey, () => {
      const p = this.mustGet(input.providerPaymentId, true);
      if (p.status !== 'authorized') this.move(p, 'captured');
      if (p.amountUnknown) {
        p.amountCents = Math.max(p.amountCents, input.amountCents);
        delete p.amountUnknown;
      }
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
      const p = this.mustGet(input.providerPaymentId, true);
      this.move(p, 'canceled');
      return { ...p };
    });
  }

  async charge(input: CardPaymentInput): Promise<ProviderPayment> {
    return this.once('charge', input.idempotencyKey, () => {
      const card = this.findCard(input);
      const failure = this.takeFailure('charge') ?? (!card ? 'card_not_found' : card.failsCharge ? 'cc_rejected_insufficient_amount' : undefined);
      if (failure) return this.newPayment(input, 'failed', { failureReason: failure });
      return this.newPayment(input, 'paid', card!.last4 ? { cardLast4: card!.last4 } : {});
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
    return { ...this.mustGet(providerPaymentId, true) };
  }

  async createSubscription(input: Parameters<PaymentProvider['createSubscription']>[0]) {
    return this.once('createSubscription', input.idempotencyKey, () => {
      const card = this.findCard({ providerCardId: input.providerCardId });
      const failure = this.takeFailure('createSubscription') ?? (!card ? 'card_not_found' : card.failsCharge ? 'cc_rejected_insufficient_amount' : undefined);
      const id = `fake-sub-${randomUUID()}`;
      if (failure) return { providerSubscriptionId: id, status: 'failed' as const, failureReason: failure };
      this.subscriptions.set(id, 'active');
      const firstPayment = this.newPayment(input, 'paid', card!.last4 ? { cardLast4: card!.last4 } : {});
      return { providerSubscriptionId: id, status: 'active' as const, firstPayment };
    });
  }

  /** Teste (fix round 2): faz a próxima chamada de cancelamento da assinatura falhar (a API deixa pendente e refaz). */
  failNextCancelCall = false;

  async cancelSubscription(input: { providerSubscriptionId: string }): Promise<void> {
    if (this.failNextCancelCall) {
      this.failNextCancelCall = false;
      throw new Error('fake_gateway_unavailable');
    }
    if (this.subscriptions.has(input.providerSubscriptionId)) this.subscriptions.set(input.providerSubscriptionId, 'canceled');
  }

  /** Teste (Task 14): faz a próxima exclusão de cliente falhar (a API registra e o job refaz). */
  failNextDeleteCustomer = false;
  /** Clientes excluídos no gateway (LGPD). */
  readonly deletedCustomers = new Set<string>();

  async deleteCustomer(input: { providerCustomerId: string; providerCardIds: string[] }): Promise<void> {
    if (this.failNextDeleteCustomer) {
      this.failNextDeleteCustomer = false;
      throw new PaymentProviderError('fake_gateway_unavailable', 503);
    }
    for (const id of input.providerCardIds) {
      this.cards.delete(id);
      this.deletedCards.add(id);
    }
    this.deletedCustomers.add(input.providerCustomerId);
  }

  /** Datas da próxima cobrança por assinatura (o fake é a fonte da verdade nos testes). */
  private readonly nextCharges = new Map<string, Date>();
  /** Teste: faz a próxima chamada de pausa/retomada falhar. */
  failNextPauseCall = false;

  async setSubscriptionPaused(input: { providerSubscriptionId: string; paused: boolean; nextChargeAt?: Date }): Promise<void> {
    if (this.failNextPauseCall) {
      this.failNextPauseCall = false;
      throw new Error('fake_gateway_unavailable');
    }
    const current = this.subscriptions.get(input.providerSubscriptionId);
    if (current && current !== 'canceled') this.subscriptions.set(input.providerSubscriptionId, input.paused ? 'paused' : 'active');
    if (!input.paused && input.nextChargeAt) this.nextCharges.set(input.providerSubscriptionId, input.nextChargeAt);
  }

  subscriptionNextChargeAt(id: string): Date | undefined {
    return this.nextCharges.get(id);
  }

  verifyWebhook(input: { signature?: string; requestId?: string; dataId: string }): boolean {
    return verifyMercadoPagoSignature({ secret: this.webhookSecret, toleranceSeconds: this.webhookToleranceSeconds, ...input });
  }
}
