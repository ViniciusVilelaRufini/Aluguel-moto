import type { PixCharge } from '../../../ports/rental-billing.port';
import type { PaymentStatus } from '../payment-state';

/**
 * Gateway de pagamento (prompt do agente 4). Implementações: `FakePaymentProvider` (dev/testes) e
 * `MercadoPagoPaymentProvider` (REST), escolhidas por `PAYMENT_PROVIDER=fake|mercadopago`.
 *
 * Regras: valores em centavos; o backend só vê tokens do gateway (nunca número/CVV);
 * toda operação que movimenta dinheiro recebe `idempotencyKey`, repassada ao gateway (`X-Idempotency-Key`).
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export type ProviderName = 'fake' | 'mercadopago';

export interface ProviderPayment {
  providerPaymentId: string;
  status: PaymentStatus;
  amountCents: number;
  capturedCents?: number;
  refundedCents?: number;
  failureReason?: string;
  cardLast4?: string;
  /** Referência externa enviada na criação (o `Payment.id` local ou `subscription:<id>`). */
  externalReference?: string;
  pix?: PixCharge;
}

export interface ProviderCard {
  providerCardId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface CardPaymentInput {
  providerCustomerId: string;
  providerCardId: string;
  amountCents: number;
  description: string;
  idempotencyKey: string;
  externalReference: string;
}

export interface PaymentProvider {
  readonly name: ProviderName;
  createCustomer(input: { customerId: string; email: string }): Promise<{ providerCustomerId: string }>;
  /** Cartão tokenizado no app pelo SDK do gateway. Recusa → `CardDeclinedError`. */
  attachCard(input: { providerCustomerId: string; cardToken: string }): Promise<ProviderCard>;
  /** Pré-autorização (caução): `authorized` ou `failed`. */
  preAuthorize(input: CardPaymentInput): Promise<ProviderPayment>;
  /** Captura total ou parcial de uma pré-autorização; o restante é liberado pelo gateway. */
  capture(input: { providerPaymentId: string; amountCents: number; idempotencyKey: string }): Promise<ProviderPayment>;
  cancelPreAuthorization(input: { providerPaymentId: string; idempotencyKey: string }): Promise<ProviderPayment>;
  /** Cobrança direta: `paid` ou `failed`. */
  charge(input: CardPaymentInput): Promise<ProviderPayment>;
  refund(input: { providerPaymentId: string; amountCents?: number; idempotencyKey: string }): Promise<{ providerRefundId: string; refundedCents: number; status: 'refunded' | 'partially_refunded' }>;
  /** Pix com QR e copia e cola, válido até `expiresAt`. Nasce `pending`. */
  createPix(input: { amountCents: number; description: string; expiresAt: Date; payerEmail: string; idempotencyKey: string; externalReference: string }): Promise<ProviderPayment & { pix: PixCharge }>;
  /** Cancela um Pix ainda não pago. */
  cancelPix(input: { providerPaymentId: string; idempotencyKey: string }): Promise<ProviderPayment>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  /** Assinatura recorrente (semanal ou mensal) no cartão. */
  createSubscription(input: {
    providerCustomerId: string;
    providerCardId: string;
    payerEmail: string;
    planCode: 'weekly' | 'monthly';
    amountCents: number;
    idempotencyKey: string;
    externalReference: string;
  }): Promise<{ providerSubscriptionId: string; status: 'active' | 'failed'; failureReason?: string; /** Primeira cobrança, quando o gateway a devolve na hora (o fake devolve; o Mercado Pago avisa por webhook). */ firstPayment?: ProviderPayment }>;
  cancelSubscription(input: { providerSubscriptionId: string }): Promise<void>;
  /** Valida a assinatura do webhook (`x-signature` do Mercado Pago). */
  verifyWebhook(input: { signature?: string; requestId?: string; dataId: string }): boolean;
}

/** Cartão recusado ao cadastrar (token inválido, emissor recusou). */
export class CardDeclinedError extends Error {}

/** Erro do gateway (rede, 4xx/5xx inesperado, operação inválida no estado atual do pagamento). */
export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
  }
}
