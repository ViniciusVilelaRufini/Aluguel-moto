import type { Prisma } from '@prisma/client';

/** Saldo = soma do ledger. */
export async function walletBalance(tx: Prisma.TransactionClient, customerId: string) {
  const agg = await tx.walletEntry.aggregate({ where: { customerId }, _sum: { amountCents: true, minutes: true }, _max: { createdAt: true } });
  return { balanceCents: agg._sum.amountCents ?? 0, minutesBalance: Math.max(0, agg._sum.minutes ?? 0), updatedAt: agg._max.createdAt ?? new Date() };
}

/**
 * Único ponto de escrita do ledger da carteira: só inserção (nunca update/delete). Auditoria run-4: trava a linha do
 * cliente (`FOR UPDATE`, até o fim da transação de quem chama) antes de somar o saldo, para dois lançamentos simultâneos
 * não gravarem o mesmo `balanceAfterCents` (o saldo em si é sempre a soma do ledger; isto corrige a exibição).
 */
export async function appendWalletEntry(tx: Prisma.TransactionClient, data: Omit<Prisma.WalletEntryUncheckedCreateInput, 'balanceAfterCents'>) {
  await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${data.customerId}::uuid FOR UPDATE`;
  const { balanceCents } = await walletBalance(tx, data.customerId);
  return tx.walletEntry.create({ data: { ...data, balanceAfterCents: balanceCents + data.amountCents } });
}

/**
 * Saldo em centavos que pode abater um fechamento (R2-01): soma do ledger, nunca negativa. Tolerante a um cliente Prisma
 * de teste que devolve `undefined`: sem agregado, não há saldo.
 */
export async function walletCentsAvailable(tx: Prisma.TransactionClient, customerId: string): Promise<number> {
  const agg = await tx.walletEntry.aggregate({ where: { customerId }, _sum: { amountCents: true } });
  return Math.max(0, agg?._sum?.amountCents ?? 0);
}
