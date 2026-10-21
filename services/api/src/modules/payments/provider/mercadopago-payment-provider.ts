import type { PixCharge } from '../../../ports/rental-billing.port';
import type { PaymentStatus } from '../payment-state';
import { verifyMercadoPagoSignature } from './mercadopago-signature';
import {
  CardDeclinedError,
  type CardPaymentInput,
  type PaymentProvider,
  PaymentProviderError,
  type ProviderCard,
  RefundRejectedError,
  type ProviderPayment,
} from './payment-provider';

export interface MercadoPagoConfig {
  /** `MERCADOPAGO_ACCESS_TOKEN` (Secrets Manager na AWS). */
  accessToken: string;
  /** `MERCADOPAGO_WEBHOOK_SECRET`. */
  webhookSecret?: string;
  /** `MERCADOPAGO_API_BASE_URL` (padrão `https://api.mercadopago.com`). */
  baseUrl?: string;
  timeoutMs?: number;
  /** `MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS` (padrão 300). */
  webhookToleranceSeconds?: number;
}

interface MpPayment {
  id: number | string;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  transaction_amount_refunded?: number;
  captured?: boolean;
  capture?: boolean;
  external_reference?: string;
  card?: { last_four_digits?: string };
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
  date_of_expiration?: string;
}

const toReais = (cents: number) => Math.round(cents) / 100;
const toCents = (reais: number | undefined) => Math.round((reais ?? 0) * 100);

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Mercado Pago respondeu ${status}`);
  }
}

/**
 * Adaptador do Mercado Pago via REST (`fetch`, sem SDK). Mapeamento de status:
 * pending/in_process/in_mediation → pending; authorized → authorized; approved → paid (ou captured, se veio de pré-autorização,
 * ou partially_refunded, se `status_detail` indicar); rejected → failed; cancelled → canceled; refunded/charged_back → refunded.
 *
 * Cartão salvo: cada pagamento gera um token a partir do `card_id` (`POST /v1/card_tokens`).
 */
export class MercadoPagoPaymentProvider implements PaymentProvider {
  readonly name = 'mercadopago' as const;
  private readonly baseUrl: string;

  constructor(private readonly cfg: MercadoPagoConfig) {
    if (!cfg.accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado (PAYMENT_PROVIDER=mercadopago).');
    this.baseUrl = (cfg.baseUrl ?? 'https://api.mercadopago.com').replace(/\/$/, '');
  }

  private async request<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.cfg.accessToken}`, Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 15_000),
      });
    } catch (err) {
      throw new PaymentProviderError(`Falha de rede com o Mercado Pago: ${(err as Error).name}`);
    }
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      /* corpo não JSON */
    }
    if (!res.ok) throw new HttpError(res.status, parsed);
    return parsed as T;
  }

  /** 5xx/rede viram `PaymentProviderError`; 4xx ficam com quem chamou decidir. */
  private rethrow(err: unknown, op: string): never {
    if (err instanceof HttpError) throw new PaymentProviderError(`Mercado Pago: ${op} falhou (${err.status}).`, err.status);
    throw err;
  }

  private map(p: MpPayment, hint?: 'captured'): ProviderPayment {
    const out: ProviderPayment = {
      providerPaymentId: String(p.id),
      status: this.mapStatus(p, hint),
      amountCents: toCents(p.transaction_amount),
    };
    if (p.card?.last_four_digits) out.cardLast4 = p.card.last_four_digits;
    if (p.external_reference) out.externalReference = p.external_reference;
    if (p.transaction_amount_refunded) out.refundedCents = toCents(p.transaction_amount_refunded);
    if (out.status === 'failed' && p.status_detail) out.failureReason = p.status_detail;
    const tx = p.point_of_interaction?.transaction_data;
    if (tx?.qr_code) {
      out.pix = { chargeId: String(p.id), qrCodeBase64: tx.qr_code_base64 ?? '', copyPaste: tx.qr_code, expiresAt: p.date_of_expiration ?? '' };
    }
    return out;
  }

  private mapStatus(p: MpPayment, hint?: 'captured'): PaymentStatus {
    switch (p.status) {
      case 'pending':
      case 'in_process':
      case 'in_mediation':
        return 'pending';
      case 'authorized':
        return 'authorized';
      case 'approved':
        if (p.status_detail === 'partially_refunded') return 'partially_refunded';
        return hint === 'captured' || p.capture === false ? 'captured' : 'paid';
      case 'cancelled':
        return 'canceled';
      case 'refunded':
      case 'charged_back':
        return 'refunded';
      default:
        return 'failed';
    }
  }

  async createCustomer(input: { customerId: string; email: string }) {
    try {
      const found = await this.request<{ results?: Array<{ id: string }> }>('GET', `/v1/customers/search?email=${encodeURIComponent(input.email)}`);
      if (found.results?.[0]?.id) return { providerCustomerId: String(found.results[0].id) };
      const created = await this.request<{ id: string }>('POST', '/v1/customers', { email: input.email });
      return { providerCustomerId: String(created.id) };
    } catch (err) {
      this.rethrow(err, 'createCustomer');
    }
  }

  async attachCard(input: { providerCustomerId: string; cardToken: string }): Promise<ProviderCard> {
    try {
      const c = await this.request<{ id: string; last_four_digits: string; expiration_month: number; expiration_year: number; payment_method?: { id?: string } }>(
        'POST',
        `/v1/customers/${encodeURIComponent(input.providerCustomerId)}/cards`,
        { token: input.cardToken },
      );
      return { providerCardId: String(c.id), brand: c.payment_method?.id ?? 'unknown', last4: c.last_four_digits, expMonth: c.expiration_month, expYear: c.expiration_year };
    } catch (err) {
      if (err instanceof HttpError && err.status >= 400 && err.status < 500) throw new CardDeclinedError('Cartão recusado pelo Mercado Pago.');
      this.rethrow(err, 'attachCard');
    }
  }

  private async savedCardToken(providerCustomerId: string, providerCardId: string): Promise<string> {
    const t = await this.request<{ id: string }>('POST', '/v1/card_tokens', { card_id: providerCardId, customer_id: providerCustomerId });
    return t.id;
  }

  async createCardToken(input: { providerCustomerId: string; providerCardId: string }): Promise<{ cardToken: string }> {
    try {
      return { cardToken: await this.savedCardToken(input.providerCustomerId, input.providerCardId) };
    } catch (err) {
      this.rethrow(err, 'createCardToken');
    }
  }

  async searchPayments(input: { externalReference: string }): Promise<ProviderPayment[]> {
    try {
      const r = await this.request<{ results?: MpPayment[] }>(
        'GET',
        `/v1/payments/search?external_reference=${encodeURIComponent(input.externalReference)}&sort=date_created&criteria=desc`,
      );
      return (r.results ?? []).map((p) => this.map(p));
    } catch (err) {
      this.rethrow(err, 'searchPayments');
    }
  }

  /**
   * Pré-autorização: 4xx vira `failed` (a caução não é retida e o aluguel não começa; uma eventual autorização fantasma expira no
   * gateway). Cobrança: só `rejected` é recusa; qualquer erro HTTP/timeout é resultado desconhecido e lança.
   */
  private async cardPayment(input: CardPaymentInput, capture: boolean): Promise<ProviderPayment> {
    try {
      const token = input.cardToken ?? (await this.savedCardToken(input.providerCustomerId, input.providerCardId));
      const p = await this.request<MpPayment>(
        'POST',
        '/v1/payments',
        {
          transaction_amount: toReais(input.amountCents),
          token,
          installments: 1,
          capture,
          description: input.description,
          external_reference: input.externalReference,
          payer: { type: 'customer', id: input.providerCustomerId },
        },
        input.idempotencyKey,
      );
      return this.map(p);
    } catch (err) {
      if (!capture && err instanceof HttpError && err.status >= 400 && err.status < 500) {
        return { providerPaymentId: '', status: 'failed', amountCents: input.amountCents, failureReason: `http_${err.status}`, externalReference: input.externalReference };
      }
      this.rethrow(err, capture ? 'charge' : 'preAuthorize');
    }
  }

  preAuthorize(input: CardPaymentInput): Promise<ProviderPayment> {
    return this.cardPayment(input, false);
  }

  charge(input: CardPaymentInput): Promise<ProviderPayment> {
    return this.cardPayment(input, true);
  }

  async capture(input: { providerPaymentId: string; amountCents: number; idempotencyKey: string }): Promise<ProviderPayment> {
    try {
      const p = await this.request<MpPayment>('PUT', `/v1/payments/${encodeURIComponent(input.providerPaymentId)}`, { capture: true, transaction_amount: toReais(input.amountCents) }, input.idempotencyKey);
      const mapped = this.map(p, 'captured');
      if (mapped.status === 'captured') mapped.capturedCents = input.amountCents;
      return mapped;
    } catch (err) {
      // 4xx pode ser 'já capturado' ou chave repetida: resultado desconhecido (quem chama reconcilia com getPayment).
      this.rethrow(err, 'capture');
    }
  }

  async cancelPreAuthorization(input: { providerPaymentId: string; idempotencyKey: string }): Promise<ProviderPayment> {
    try {
      const p = await this.request<MpPayment>('PUT', `/v1/payments/${encodeURIComponent(input.providerPaymentId)}`, { status: 'cancelled' }, input.idempotencyKey);
      return this.map(p);
    } catch (err) {
      this.rethrow(err, 'cancelPreAuthorization');
    }
  }

  async cancelPix(input: { providerPaymentId: string; idempotencyKey: string }): Promise<ProviderPayment> {
    const p = await this.cancelPreAuthorization(input);
    // Pix cancelado antes do pagamento: localmente é `failed` (pending → failed).
    return p.status === 'canceled' ? { ...p, status: 'failed', failureReason: 'pix_canceled' } : p;
  }

  async refund(input: { providerPaymentId: string; amountCents?: number; idempotencyKey: string }) {
    try {
      const id = encodeURIComponent(input.providerPaymentId);
      const r = await this.request<{ id: number | string }>('POST', `/v1/payments/${id}/refunds`, input.amountCents === undefined ? {} : { amount: toReais(input.amountCents) }, input.idempotencyKey);
      const p = await this.request<MpPayment>('GET', `/v1/payments/${id}`);
      const status = this.mapStatus(p) === 'refunded' ? ('refunded' as const) : ('partially_refunded' as const);
      return { providerRefundId: String(r.id), refundedCents: toCents(p.transaction_amount_refunded), status };
    } catch (err) {
      if (err instanceof HttpError && (err.status === 400 || err.status === 404)) throw new RefundRejectedError(`Mercado Pago recusou o estorno (${err.status}).`, err.status);
      this.rethrow(err, 'refund');
    }
  }

  async createPix(input: { amountCents: number; description: string; expiresAt: Date; payerEmail: string; idempotencyKey: string; externalReference: string }) {
    try {
      const p = await this.request<MpPayment>(
        'POST',
        '/v1/payments',
        {
          transaction_amount: toReais(input.amountCents),
          payment_method_id: 'pix',
          description: input.description,
          external_reference: input.externalReference,
          date_of_expiration: input.expiresAt.toISOString(),
          payer: { email: input.payerEmail },
        },
        input.idempotencyKey,
      );
      const mapped = this.map(p);
      const pix: PixCharge = {
        chargeId: mapped.providerPaymentId,
        qrCodeBase64: mapped.pix?.qrCodeBase64 ?? '',
        copyPaste: mapped.pix?.copyPaste ?? '',
        expiresAt: input.expiresAt.toISOString(),
      };
      return { ...mapped, pix };
    } catch (err) {
      this.rethrow(err, 'createPix');
    }
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    try {
      return this.map(await this.request<MpPayment>('GET', `/v1/payments/${encodeURIComponent(providerPaymentId)}`));
    } catch (err) {
      this.rethrow(err, 'getPayment');
    }
  }

  async createSubscription(input: {
    providerCustomerId: string;
    providerCardId: string;
    payerEmail: string;
    planCode: 'weekly' | 'monthly';
    amountCents: number;
    idempotencyKey: string;
    externalReference: string;
  }) {
    try {
      const token = await this.savedCardToken(input.providerCustomerId, input.providerCardId);
      const s = await this.request<{ id: string; status: string }>(
        'POST',
        '/preapproval',
        {
          reason: input.planCode === 'weekly' ? 'Volti semanal' : 'Volti mensal',
          external_reference: input.externalReference,
          payer_email: input.payerEmail,
          card_token_id: token,
          status: 'authorized',
          auto_recurring: {
            frequency: input.planCode === 'weekly' ? 7 : 1,
            frequency_type: input.planCode === 'weekly' ? 'days' : 'months',
            transaction_amount: toReais(input.amountCents),
            currency_id: 'BRL',
          },
        },
        input.idempotencyKey,
      );
      return { providerSubscriptionId: String(s.id), status: s.status === 'authorized' ? ('active' as const) : ('failed' as const) };
    } catch (err) {
      if (err instanceof HttpError && err.status >= 400 && err.status < 500) {
        return { providerSubscriptionId: '', status: 'failed' as const, failureReason: `http_${err.status}` };
      }
      this.rethrow(err, 'createSubscription');
    }
  }

  async cancelSubscription(input: { providerSubscriptionId: string }): Promise<void> {
    try {
      await this.request('PUT', `/preapproval/${encodeURIComponent(input.providerSubscriptionId)}`, { status: 'cancelled' });
    } catch (err) {
      this.rethrow(err, 'cancelSubscription');
    }
  }

  verifyWebhook(input: { signature?: string; requestId?: string; dataId: string }): boolean {
    return verifyMercadoPagoSignature({ secret: this.cfg.webhookSecret, toleranceSeconds: this.cfg.webhookToleranceSeconds, ...input });
  }
}
