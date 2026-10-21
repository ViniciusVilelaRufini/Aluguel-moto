import type { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Sinal de revisão manual de pagamento (fix round 4): liquidação estacionada (erros repetidos, análise do gateway além
 * do prazo, estado inesperado) ou estorno em `needs_review`. Sempre em par: log estruturado `payment_needs_manual_review`
 * e evento interno `payment.needs-review`, para um consumidor de alerta ser ligado depois (proposta #15 em docs/decisoes.md).
 */
export const PAYMENT_NEEDS_REVIEW = 'payment.needs-review';

export interface PaymentNeedsReviewEvent {
  paymentId: string;
  rentalId?: string;
  reason: string;
}

export function signalNeedsReview(logger: Logger, events: EventEmitter2, ev: PaymentNeedsReviewEvent, extra: Record<string, unknown> = {}): void {
  logger.error({ msg: 'payment_needs_manual_review', ...ev, ...extra });
  events.emit(PAYMENT_NEEDS_REVIEW, ev);
}
