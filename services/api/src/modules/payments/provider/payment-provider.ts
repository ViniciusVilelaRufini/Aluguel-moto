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
  /** Token do cartão salvo criado antes (`createCardToken`) e reusado em todas as chamadas do mesmo passo. */
  cardToken?: string;
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
  /** Token de pagamento a partir do cartão salvo (guardado pelo chamador para reusar na repetição do mesmo passo). */
  createCardToken(input: { providerCustomerId: string; providerCardId: string }): Promise<{ cardToken: string }>;
  /** Pagamentos com a referência externa dada (reconciliação de cobranças de resultado desconhecido). */
  searchPayments(input: { externalReference: string }): Promise<ProviderPayment[]>;
  /** Pré-autorização (caução): `authorized` ou `failed`. */
  preAuthorize(input: CardPaymentInput): Promise<ProviderPayment>;
  /**
   * Captura total ou parcial de uma pré-autorização; o restante é liberado pelo gateway.
   * `failed` só para recusa genuína; erro HTTP, timeout etc. → `PaymentProviderError` (resultado desconhecido).
   */
  capture(input: { providerPaymentId: string; amountCents: number; idempotencyKey: string }): Promise<ProviderPayment>;
  cancelPreAuthorization(input: { providerPaymentId: string; idempotencyKey: string }): Promise<ProviderPayment>;
  /** Cobrança direta: `paid` ou `failed` (recusa genuína); resultado desconhecido → `PaymentProviderError`. */
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

/**
 * Erro do gateway com **resultado desconhecido** (rede, timeout, 4xx/5xx inesperado): a operação pode ou não ter acontecido.
 * Quem chama não pode tratar como recusa; deve reconciliar (`getPayment`/`searchPayments`) e repetir com a mesma chave.
 */
export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
  }
}

/** O gateway recusou o estorno de forma definitiva (ex.: valor acima do disponível). Pode desfazer a reserva local. */
export class RefundRejectedError extends PaymentProviderError {}
