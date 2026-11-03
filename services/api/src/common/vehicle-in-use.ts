import { Prisma } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from './enums';
import { conflict } from './problem';
import { RELAY_LOCK_PREFIX } from '../modules/iot/relay-lock.store';
import { SAFE_LOCK_PREFIX } from '../modules/iot/safe-lock.store';
import type { RedisStore } from '../redis/redis-store';

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

/** `true` se há reserva ativa ou em entrega (`IN_USE_RESERVATION_STATUSES`) para a moto. */
export async function hasInUseReservation(tx: Pick<Prisma.TransactionClient, 'reservation'>, vehicleId: string): Promise<boolean> {
  const reservation = await tx.reservation.findFirst({ where: { vehicleId, status: { in: IN_USE_RESERVATION_STATUSES } }, select: { id: true } });
  return !!reservation;
}

/** `409 vehicle-unavailable` se a moto tem aluguel aberto ou reserva ativa/em entrega, independentemente do status da moto. */
export async function assertVehicleNotInUse(tx: InUseTx, vehicleId: string): Promise<void> {
  const [rental, reservation] = await Promise.all([hasOpenRental(tx, vehicleId), hasInUseReservation(tx, vehicleId)]);
  if (rental || reservation) throw conflict('vehicle-unavailable', 'A moto está em uso por um cliente.');
}

/**
 * N5: trava em andamento na API para o thing (rampa `speed_control` em `iot:safe-lock:*` ou trava só relé em
 * `iot:relay-lock:*`, estado ou só a entrada do índice — órfã à espera da varredura). Devolve o tipo da trava ou `null`.
 * Erro de leitura propaga (falha fechada). Usado pelo provisionamento e pela troca de `thingName` no painel.
 */
export async function pendingLockKind(redis: Pick<RedisStore, 'exists' | 'hgetall'>, thingName: string): Promise<string | null> {
  for (const [prefix, what] of [
    [SAFE_LOCK_PREFIX, 'rampa de bloqueio speed_control'],
    [RELAY_LOCK_PREFIX, 'trava só relé'],
  ] as const) {
    if ((await redis.exists(`${prefix}:${thingName}`)) || (await redis.hgetall(`${prefix}:index`))[thingName] !== undefined) return what;
  }
  return null;
}
