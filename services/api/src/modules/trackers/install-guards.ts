/**
 * Checagens compartilhadas antes de mexer no rastreador de uma moto (instalar/trocar/remover pelo painel e o
 * `provision-gt06`/`provision-tracker` da CLI). Trocar o rastreador com cliente na moto ou trava em andamento deixaria o
 * aluguel/trava falando com o aparelho errado (perda da trava remota no meio do uso).
 */
import type { CommandStatus, Prisma } from '@prisma/client';
import { conflict } from '../../common/problem';
import { hasInUseReservation, hasOpenRental, pendingLockKind } from '../../common/vehicle-in-use';
import type { RedisStore } from '../../redis/redis-store';
import { ENGINE_COMMAND_IN_FLIGHT_MS } from '../tracker-console/tracker-console.service';

type InUseTx = Pick<Prisma.TransactionClient, 'rental' | 'reservation'>;
type GuardTx = InUseTx & Pick<Prisma.TransactionClient, 'vehicleCommand'>;
type LockRedis = Pick<RedisStore, 'exists' | 'hgetall'>;

const IN_FLIGHT_COMMAND: CommandStatus[] = ['pending', 'in_progress'];

/** Aluguel aberto (conferido primeiro; a reserva só é consultada sem aluguel) ou reserva ativa/em entrega. */
export async function vehicleInUseReason(tx: InUseTx, vehicleId: string): Promise<'rental' | 'reservation' | null> {
  if (await hasOpenRental(tx, vehicleId)) return 'rental';
  if (await hasInUseReservation(tx, vehicleId)) return 'reservation';
  return null;
}

/** Primeiro thing com trava em andamento no Redis da API (`pendingLockKind`). Erro de leitura propaga (falha fechada). */
export async function pendingLockOn(redis: LockRedis, thingNames: string[]): Promise<{ thingName: string; kind: string } | null> {
  for (const thingName of thingNames) {
    const kind = await pendingLockKind(redis, thingName);
    if (kind) return { thingName, kind };
  }
  return null;
}

/** `lock`/`unlock` ainda não final criado nos últimos `ENGINE_COMMAND_IN_FLIGHT_MS` (linha antiga presa não bloqueia). */
export async function engineCommandInFlight(tx: Pick<Prisma.TransactionClient, 'vehicleCommand'>, vehicleId: string, now = Date.now()): Promise<boolean> {
  const cmd = await tx.vehicleCommand.findFirst({
    where: { vehicleId, type: { in: ['lock', 'unlock'] }, status: { in: IN_FLIGHT_COMMAND }, createdAt: { gte: new Date(now - ENGINE_COMMAND_IN_FLIGHT_MS) } },
    select: { id: true },
  });
  return !!cmd;
}

export const TRACKER_CHANGE_RENTAL = 'A moto está com um aluguel aberto; instale, troque ou remova o rastreador depois do fim do aluguel.';
export const TRACKER_CHANGE_RESERVATION = 'A moto tem uma reserva ativa ou em entrega; instale, troque ou remova o rastreador com a moto livre.';
export const TRACKER_CHANGE_ENGINE = 'Há um bloqueio/desbloqueio em andamento nesta moto; espere terminar para mexer no rastreador.';
export const TRACKER_CHANGE_LOCK = 'A moto tem uma trava em andamento; espere a trava terminar para mexer no rastreador.';

/**
 * Recusa (409 `vehicle-unavailable`) instalar/trocar/remover o rastreador com aluguel aberto, reserva em uso, `lock`/`unlock`
 * em andamento ou trava em andamento no Redis em qualquer um dos `thingNames` envolvidos. Chame dentro da transação.
 */
export async function assertVehicleFreeForTrackerChange(tx: GuardTx, redis: LockRedis, vehicleId: string, thingNames: string[], now = Date.now()): Promise<void> {
  const inUse = await vehicleInUseReason(tx, vehicleId);
  if (inUse === 'rental') throw conflict('vehicle-unavailable', TRACKER_CHANGE_RENTAL);
  if (inUse === 'reservation') throw conflict('vehicle-unavailable', TRACKER_CHANGE_RESERVATION);
  if (await engineCommandInFlight(tx, vehicleId, now)) throw conflict('vehicle-unavailable', TRACKER_CHANGE_ENGINE);
  if (await pendingLockOn(redis, [...new Set(thingNames)])) throw conflict('vehicle-unavailable', TRACKER_CHANGE_LOCK);
}
