/**
 * Precedência da trava exibida (bancada do J16, revisão final): a trava dita pelo rastreador (`reported`: status/heartbeat,
 * resposta `RELAY x OK`, comando confirmado) vence a da telemetria por `REPORTED_LOCK_PRECEDENCE_MS`, porque a ponte GT06 manda
 * `travada: false` na telemetria quando o bit de corte está velho (> 90 s), com comando pendente ou depois de reabrir o socket.
 *
 * Uma regra só, usada pela escrita condicional no banco (`VehiclesService.syncTrackerState`, `CommandsService`) e pelo overlay do
 * Redis no GET/frota (`withLiveState`): GET, banco e `vehicle.state` nunca divergem.
 */

/** 90 s = validade do bit de corte na ponte; com o heartbeat de 60 s o reported se renova antes disso. */
export const REPORTED_LOCK_PRECEDENCE_MS = 90_000;

export interface StoredLock {
  lockedAt?: Date | null;
  lockedFromReport?: boolean | null;
}

/** Trava sem origem do rastreador (telemetria, ou o Redis, que guarda a última de qualquer fonte) medida em `at` substitui a gravada? */
export function telemetryLockWins(stored: StoredLock, at: number): boolean {
  if (!stored.lockedAt) return true;
  const t = stored.lockedAt.getTime();
  return stored.lockedFromReport ? at - t > REPORTED_LOCK_PRECEDENCE_MS : at >= t;
}

/** `where` do Prisma equivalente a `telemetryLockWins` (escrita condicional, vale entre instâncias). */
export function telemetryLockWhere(at: Date) {
  return {
    OR: [
      { lockedAt: null },
      { lockedFromReport: false, lockedAt: { lte: at } },
      { lockedFromReport: true, lockedAt: { lt: new Date(at.getTime() - REPORTED_LOCK_PRECEDENCE_MS) } },
    ],
  };
}

/** Reported (ou comando confirmado) medido em `at` vale se a trava gravada não for mais nova que ele, de qualquer origem. */
export function reportedLockWhere(at: Date) {
  return { OR: [{ lockedAt: null }, { lockedAt: { lte: at } }] };
}
