import type { Payment, Prisma } from '@prisma/client';
import { appendWalletEntry } from './wallet-ledger';

/**
 * Revisão da onda 2 (auditoria run-4): estorno TOTAL do pagamento do aluguel devolve os minutos de pacote consumidos no
 * fechamento (lançamento `minute_package` positivo com o `rentalId`). Estorno parcial não devolve minutos. Só com o
 * estorno confirmado: `Payment` `refunded` e nenhum pedido de estorno ainda `claimed`/`pending`. Idempotente: a devolução
 * existe uma vez por aluguel (verificada com o cliente travado). Devolve os minutos devolvidos (0 = nada a fazer).
 */
export async function returnRentalPackageMinutes(
  tx: Prisma.TransactionClient,
  payment: Pick<Payment, 'id' | 'kind' | 'rentalId' | 'customerId'>,
): Promise<number> {
  if (payment.kind !== 'rental' || !payment.rentalId) return 0;
  const current = await tx.payment.findUnique({ where: { id: payment.id }, select: { status: true } });
  if (current?.status !== 'refunded') return 0;
  if (await tx.paymentRefund.findFirst({ where: { paymentId: payment.id, status: { in: ['claimed', 'pending'] } }, select: { id: true } })) return 0;
  await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${payment.customerId}::uuid FOR NO KEY UPDATE`;
  const entries = await tx.walletEntry.findMany({ where: { rentalId: payment.rentalId, type: 'minute_package' }, select: { minutes: true } });
  if (entries.some((e) => (e.minutes ?? 0) > 0)) return 0;
  const consumed = -entries.reduce((acc, e) => acc + (e.minutes ?? 0), 0);
  if (consumed <= 0) return 0;
  await appendWalletEntry(tx, {
    customerId: payment.customerId, type: 'minute_package', amountCents: 0, minutes: consumed, rentalId: payment.rentalId, paymentId: payment.id,
    description: `Estorno do aluguel: ${consumed} min do pacote devolvidos`,
  });
  return consumed;
}
