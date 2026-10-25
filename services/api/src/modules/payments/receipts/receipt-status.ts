import type { Deposit, Payment, PaymentMethod, PrismaClient } from '@prisma/client';
import { SETTLED_STATUSES } from '../payment-state';

/**
 * Situação do pagamento de um aluguel encerrado (R2-01), vista pelo recibo (`GET /rentals/{id}/receipt`) e pelo PDF:
 * - `paid`: recebido (cobrança aprovada, caução/carteira cobriram tudo ou dívida quitada pelo cliente/financeiro);
 * - `pending`: dívida em aberto que o cliente paga no app (`POST /payments/{id}/retry`), `amountDueCents` > 0;
 * - `processing`: liquidação ainda em andamento no gateway (retentativa ou análise): nada a pagar por enquanto.
 */
export type ReceiptPaymentStatus = 'paid' | 'pending' | 'processing';

export interface ReceiptPaymentInfo {
  status: ReceiptPaymentStatus;
  /** Forma do que foi recebido (ausente enquanto não pago e na quitação manual). */
  method?: PaymentMethod;
  cardLast4?: string;
  /** Parte da caução usada para abater o valor (caução capturada). */
  depositUsedCents?: number;
  /** Parte da caução devolvida/liberada ao cliente depois do fechamento. */
  depositReleasedCents?: number;
  /** Saldo devedor quando `pending` (bruto − carteira − caução usada; o mesmo `outstandingCents` do pagamento). */
  amountDueCents?: number;
}

type Db = Pick<PrismaClient, 'deposit' | 'payment'>;

/** Caução usada (capturada) e devolvida de um aluguel encerrado. */
export function depositUse(deposit: Pick<Deposit, 'status' | 'amountCents' | 'capturedCents'> | null): { used: number; released?: number } {
  if (!deposit) return { used: 0 };
  const used = deposit.status === 'captured' ? Math.max(0, deposit.capturedCents ?? 0) : 0;
  const closed = deposit.status === 'captured' || deposit.status === 'released';
  return { used, ...(closed ? { released: Math.max(0, deposit.amountCents - used) } : {}) };
}

export async function receiptPaymentInfo(prisma: Db, rental: { depositId: string | null }, payment: Payment | null): Promise<ReceiptPaymentInfo> {
  const deposit = rental.depositId ? await prisma.deposit.findUnique({ where: { id: rental.depositId } }) : null;
  const { used, released } = depositUse(deposit);
  const extras = { ...(used > 0 ? { depositUsedCents: used } : {}), ...(released !== undefined ? { depositReleasedCents: released } : {}) };
  if (!payment || payment.status === 'pending' || payment.status === 'authorized') return { status: 'processing', ...extras };
  if (SETTLED_STATUSES.includes(payment.status)) {
    return { status: 'paid', method: payment.method, ...(payment.cardLast4 ? { cardLast4: payment.cardLast4 } : {}), ...extras };
  }
  if (payment.status === 'failed') {
    if (payment.debtSettledAt) {
      if (payment.debtSettlement !== 'payment') return { status: 'paid', ...extras };
      // Quitada pelo cliente: a forma é a da quitação paga (inclusive a paga depois de virar `failed` aqui).
      const settlement = await prisma.payment.findFirst({
        where: { kind: 'debt_settlement', settlesPaymentId: payment.id, OR: [{ status: { in: [...SETTLED_STATUSES] } }, { failureReason: 'paid_after_failed' }] },
        orderBy: { createdAt: 'desc' },
      });
      return { status: 'paid', ...(settlement ? { method: settlement.method, ...(settlement.cardLast4 ? { cardLast4: settlement.cardLast4 } : {}) } : {}), ...extras };
    }
    // Mesmo cálculo do `outstandingCents` (DelinquencyService.outstandingMap): bruto − carteira − caução capturada.
    const due = Math.max(0, payment.amountCents - (payment.walletCents ?? 0) - used);
    return due > 0 ? { status: 'pending', amountDueCents: due, ...extras } : { status: 'paid', ...extras };
  }
  // canceled: não houve cobrança (não acontece na liquidação de aluguel); nada a pagar.
  return { status: 'paid', ...extras };
}
