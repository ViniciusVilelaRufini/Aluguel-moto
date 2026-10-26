import { Prisma } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from './enums';
import { conflict } from './problem';

/**
 * Regra única de "moto em uso por um cliente": aluguel aberto (`OPEN_RENTAL_STATUSES`) ou reserva ativa.
 * Consulta `Rental`/`Reservation` e nunca `vehicle.status`, que `onConnectivity` troca por `offline` quando o
 * rastreador cai no meio de um aluguel ou reserva.
 */
type InUseTx = Pick<Prisma.TransactionClient, 'rental' | 'reservation'>;

/** Revisão final item 6: moto com trava da equipe/sistema não volta a `free` (tarefa concluída ou mudança de status). */
export const VEHICLE_LOCKED_BACK_TO_FLEET = 'A moto está bloqueada pela equipe; libere-a antes de devolver à frota.';

/** Reserva que prende a moto: ativa ou em entrega no galpão (`handover`, entrega aberta). */
export const IN_USE_RESERVATION_STATUSES: Array<'active' | 'handover'> = ['active', 'handover'];

/** `true` se há aluguel aberto para a moto. */
export async function hasOpenRental(tx: Pick<Prisma.TransactionClient, 'rental'>, vehicleId: string): Promise<boolean> {
  const rental = await tx.rental.findFirst({ where: { vehicleId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
  return !!rental;
}

/** `409 vehicle-unavailable` se a moto tem aluguel aberto ou reserva ativa/em entrega, independentemente do status da moto. */
export async function assertVehicleNotInUse(tx: InUseTx, vehicleId: string): Promise<void> {
  const [rental, reservation] = await Promise.all([
    hasOpenRental(tx, vehicleId),
    tx.reservation.findFirst({ where: { vehicleId, status: { in: IN_USE_RESERVATION_STATUSES } }, select: { id: true } }),
  ]);
  if (rental || reservation) throw conflict('vehicle-unavailable', 'A moto está em uso por um cliente.');
}
