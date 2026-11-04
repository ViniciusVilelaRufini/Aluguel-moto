import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { COUNTER_METHODS, type CounterMethod } from './counter-methods';

export interface CounterCloseInput {
  rentalId: string;
  customerId: string;
  depositId: string;
  /** Pré-pago do balcão; `null` só no recuo de dado inconsistente (o aluguel não tem pré-pago). */
  prepaidPaymentId: string | null;
  /** Total do fechamento já descontado o pré-pago (`breakdown.totalCents`), em centavos. */
  residualCents: number;
  method: CounterMethod;
}

/**
 * Fechamento do aluguel do balcão (pré-reserva/balcão, decisão 12): nunca usa o gateway.
 * - resíduo > 0 → `Payment` `rental` `pending` com o método do balcão (débito acertado no galpão), chave estável
 *   `counter-excess:<rentalId>` (repetição reaproveita), **sem** `depositId` (preflight C1: o abatimento da caução conta só
 *   pelo `debt_settlement`); ele vira o `rental.paymentId`;
 * - resíduo 0 → `rental.paymentId` fica o pré-pago;
 * - caução do balcão com valor 0 ainda `held` → `released` (não há o que devolver).
 * Chamado dentro da transação que fecha o aluguel (cliente travado), então não há corrida na chave.
 */
export async function recordCounterClose(db: Prisma.TransactionClient | PrismaService, input: CounterCloseInput): Promise<{ paymentId: string | null }> {
  let paymentId = input.prepaidPaymentId;
  if (input.residualCents > 0) {
    const idempotencyKey = `counter-excess:${input.rentalId}`;
    const existing = await db.payment.findUnique({ where: { idempotencyKey }, select: { id: true } });
    paymentId =
      existing?.id ??
      (
        await db.payment.create({
          data: {
            kind: 'rental', status: 'pending', method: input.method, amountCents: input.residualCents,
            rentalId: input.rentalId, customerId: input.customerId, idempotencyKey,
          },
        })
      ).id;
  }
  if (paymentId) await db.rental.update({ where: { id: input.rentalId }, data: { paymentId } });
  await db.deposit.updateMany({
    where: { id: input.depositId, status: 'held', amountCents: 0, method: { in: [...COUNTER_METHODS] } },
    data: { status: 'released' },
  });
  return { paymentId };
}
