import type { Deposit, Payment, PaymentMethod, PrismaClient } from '@prisma/client';
import { isCounterMethod } from '../counter-methods';
import { SETTLED_STATUSES } from '../payment-state';

/**
 * Situação do pagamento de um aluguel encerrado (R2-01), vista pelo recibo (`GET /rentals/{id}/receipt`) e pelo PDF:
 * - `paid`: recebido (cobrança aprovada, caução/carteira cobriram tudo ou dívida quitada pelo cliente/financeiro);
 * - `pending`: dívida em aberto que o cliente paga no app (`POST /payments/{id}/retry`) ou, no excedente do aluguel do
 *   balcão, acertada no galpão; `amountDueCents` > 0;
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
  /** Saldo devedor quando `pending` (o mesmo `outstandingCents` do pagamento: DelinquencyService.outstandingMap). */
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

/** Soma das quitações (parciais) pagas de uma dívida — o balcão quita em partes (`debt_settlement` `paid`). */
async function settledCents(prisma: Db, debtId: string): Promise<number> {
  const parts = await prisma.payment.findMany({ where: { kind: 'debt_settlement', status: 'paid', settlesPaymentId: debtId }, select: { amountCents: true } });
  return (parts ?? []).reduce((a, p) => a + p.amountCents, 0);
}

export async function receiptPaymentInfo(prisma: Db, rental: { depositId: string | null }, payment: Payment | null): Promise<ReceiptPaymentInfo> {
  const deposit = rental.depositId ? await prisma.deposit.findUnique({ where: { id: rental.depositId } }) : null;
  const { used, released } = depositUse(deposit);
  const extras = { ...(used > 0 ? { depositUsedCents: used } : {}), ...(released !== undefined ? { depositReleasedCents: released } : {}) };
  // Excedente do aluguel do balcão: `pending` com método de balcão, acertado no galpão (nunca pelo gateway).
  if (payment && payment.status === 'pending' && isCounterMethod(payment.method)) {
    if (payment.debtSettledAt) return { status: 'paid', ...extras };
    // Mesmo cálculo do `outstandingCents` (DelinquencyService.outstandingMap): sem caução no débito de balcão.
    const due = Math.max(0, payment.amountCents - (payment.walletCents ?? 0) - (await settledCents(prisma, payment.id)));
    return due > 0 ? { status: 'pending', amountDueCents: due, ...extras } : { status: 'paid', ...extras };
  }
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
    // Mesmo cálculo do `outstandingCents` (DelinquencyService.outstandingMap): bruto − carteira − caução capturada − quitações pagas.
    const guarantee = payment.kind === 'rental' && !isCounterMethod(payment.method) ? used : 0;
    const due = Math.max(0, payment.amountCents - (payment.walletCents ?? 0) - guarantee - (await settledCents(prisma, payment.id)));
    return due > 0 ? { status: 'pending', amountDueCents: due, ...extras } : { status: 'paid', ...extras };
  }
  // canceled: não houve cobrança (não acontece na liquidação de aluguel); nada a pagar.
  return { status: 'paid', ...extras };
}
