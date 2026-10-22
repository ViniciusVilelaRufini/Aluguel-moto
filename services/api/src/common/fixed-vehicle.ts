import { Prisma } from '@prisma/client';
import { conflict } from './problem';

/**
 * Fix round 1 (C1/I3): regra única da moto fixa. Uma moto é exclusiva de um assinante só enquanto a assinatura está aberta
 * (ativa ou pausada) **e** com período vigente. Usada em reserva, início de aluguel, `nearby` e na ficha.
 */
type SubTx = Pick<Prisma.TransactionClient, 'subscription'>;

export const currentSubscriptionWhere = (now: Date = new Date()): Prisma.SubscriptionWhereInput => ({
  status: { in: ['active', 'paused'] },
  currentPeriodEnd: { gt: now },
});

/** Assinante que tem a moto como fixa agora (ou `null`). */
export async function fixedVehicleOwner(tx: SubTx, vehicleId: string, now: Date = new Date()): Promise<{ id: string; customerId: string } | null> {
  return tx.subscription.findFirst({ where: { assignedVehicleId: vehicleId, ...currentSubscriptionWhere(now) }, select: { id: true, customerId: true } });
}

/** `409 vehicle-unavailable` se a moto é fixa de outro cliente com período vigente. */
export async function assertNotFixedForOther(tx: SubTx, vehicleId: string, customerId: string, now: Date = new Date()): Promise<void> {
  const owner = await fixedVehicleOwner(tx, vehicleId, now);
  if (owner && owner.customerId !== customerId) throw conflict('vehicle-unavailable', 'Esta moto é a moto fixa de outro plano.');
}

/** Filtro SQL (alias `v` para "Vehicle") que esconde motos fixas de outros clientes. */
export const notFixedForOtherSql = (customerId: string) => Prisma.sql`NOT EXISTS (
  SELECT 1 FROM "Subscription" s
  WHERE s."assignedVehicleId" = v."id" AND s."status" IN ('active', 'paused') AND s."currentPeriodEnd" > now()
    AND s."customerId" <> ${customerId}::uuid)`;
