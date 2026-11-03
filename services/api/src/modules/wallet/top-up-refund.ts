import type { Payment, Prisma, TopUp } from '@prisma/client';
import { appendWalletEntry, walletBalance } from './wallet-ledger';

/** Falta de saldo para tirar o estorno da recarga da carteira (o crédito já foi usado): vira revisão do financeiro. */
export interface TopUpReversal {
  debitedCents: number;
  removedMinutes: number;
  shortfallCents: number;
  shortfallMinutes: number;
}

/** Minutos do pacote correspondentes a `refundedCents` estornados (proporcional, para baixo; estorno total = todos). */
function minutesFor(topUp: Pick<TopUp, 'minutes' | 'amountCents'>, refundedCents: number): number {
  const minutes = topUp.minutes ?? 0;
  if (topUp.amountCents <= 0 || refundedCents >= topUp.amountCents) return minutes;
  return Math.floor((minutes * refundedCents) / topUp.amountCents);
}

/**
 * Auditoria run-4 onda 2: estorno (parcial ou total) de uma recarga já creditada tira o crédito correspondente da
 * carteira. Idempotente por pagamento + total estornado: o claim condicional de `TopUp.reversedCents` (valor lido → total
 * estornado) garante um débito por incremento. Recarga em reais: lançamento `top_up` negativo de
 * `min(incremento, saldo)`; pacote: `minute_package` com os minutos proporcionais (até o saldo de minutos). O que faltar
 * volta em `shortfall*` para o chamador sinalizar revisão. `null` = nada a fazer.
 */
export async function reverseTopUpRefund(
  tx: Prisma.TransactionClient,
  payment: Pick<Payment, 'id' | 'customerId' | 'refundedCents'>,
): Promise<TopUpReversal | null> {
  const topUp = await tx.topUp.findFirst({ where: { paymentId: payment.id } });
  // Só recarga creditada: pendente/falha nunca entrou na carteira.
  if (!topUp || topUp.status !== 'paid') return null;
  const target = Math.min(payment.refundedCents, topUp.amountCents);
  const prev = topUp.reversedCents ?? 0;
  if (target <= prev) return null;
  const claimed = await tx.topUp.updateMany({ where: { id: topUp.id, reversedCents: prev }, data: { reversedCents: target } });
  if (claimed.count !== 1) return null;
  // Trava o cliente antes de ler o saldo (o mesmo lock de `appendWalletEntry`).
  await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${topUp.customerId}::uuid FOR NO KEY UPDATE`;
  const balance = await walletBalance(tx, topUp.customerId);
  const out: TopUpReversal = { debitedCents: 0, removedMinutes: 0, shortfallCents: 0, shortfallMinutes: 0 };
  if (topUp.minutes) {
    const due = minutesFor(topUp, target) - minutesFor(topUp, prev);
    out.removedMinutes = Math.min(due, balance.minutesBalance);
    out.shortfallMinutes = due - out.removedMinutes;
    if (out.removedMinutes > 0) {
      await appendWalletEntry(tx, {
        customerId: topUp.customerId, type: 'minute_package', amountCents: 0, minutes: -out.removedMinutes, paymentId: payment.id,
        description: `Estorno do pacote: ${out.removedMinutes} min retirados`,
      });
    }
  } else {
    const due = target - prev;
    out.debitedCents = Math.min(due, Math.max(0, balance.balanceCents));
    out.shortfallCents = due - out.debitedCents;
    if (out.debitedCents > 0) {
      await appendWalletEntry(tx, {
        customerId: topUp.customerId, type: 'top_up', amountCents: -out.debitedCents, paymentId: payment.id,
        description: 'Estorno da recarga',
      });
    }
  }
  return out;
}

/** A carteira ainda tem o crédito que um estorno de `amountCents` desta recarga vai tirar? (pré-checagem do estorno pelo admin) */
export async function topUpRefundFits(tx: Prisma.TransactionClient, payment: Pick<Payment, 'id' | 'customerId' | 'refundedCents'>, amountCents: number): Promise<boolean> {
  const topUp = await tx.topUp.findFirst({ where: { paymentId: payment.id } });
  if (!topUp || topUp.status !== 'paid') return true;
  const target = Math.min(payment.refundedCents + amountCents, topUp.amountCents);
  // Conta também o já estornado e ainda não tirado da carteira (estorno anterior em aberto).
  const prev = topUp.reversedCents ?? 0;
  const balance = await walletBalance(tx, topUp.customerId);
  if (topUp.minutes) return minutesFor(topUp, target) - minutesFor(topUp, prev) <= balance.minutesBalance;
  return target - prev <= Math.max(0, balance.balanceCents);
}
