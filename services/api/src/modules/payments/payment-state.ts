import type { PaymentStatus as PrismaPaymentStatus } from '@prisma/client';

export type PaymentStatus = `${PrismaPaymentStatus}`;

/**
 * Máquina de estados de `Payment` (docs/pagamentos.md).
 * - Cartão (caução): pending → authorized → captured | canceled.
 * - Cobrança direta e Pix: pending → paid.
 * - Estorno: paid | captured → refunded | partially_refunded; parcial → parcial | total.
 * - Falha: só de estados não terminais (pending, authorized) → failed.
 */
export const PAYMENT_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  pending: ['authorized', 'paid', 'failed'],
  authorized: ['captured', 'canceled', 'failed'],
  captured: ['refunded', 'partially_refunded'],
  paid: ['refunded', 'partially_refunded'],
  partially_refunded: ['partially_refunded', 'refunded'],
  canceled: [],
  refunded: [],
  failed: [],
};

export class InvalidPaymentTransitionError extends Error {
  constructor(
    readonly from: PaymentStatus,
    readonly to: PaymentStatus,
  ) {
    super(`Transição de pagamento inválida: ${from} → ${to}`);
  }
}

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransition(from, to)) throw new InvalidPaymentTransitionError(from, to);
}

/** Estados em que o dinheiro foi efetivamente recebido (contam como "pago" para a porta). */
export const SETTLED_STATUSES: readonly PaymentStatus[] = ['paid', 'captured', 'partially_refunded', 'refunded'];
