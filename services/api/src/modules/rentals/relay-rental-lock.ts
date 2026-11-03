import type { TrackerControlMode } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * Auditoria run-4: regras do aluguel com rastreador só relé (`relay_only`) compartilhadas entre o fim (`RentalEndService`) e
 * a pausa (`RentalsService`).
 */
type Db = Pick<PrismaService, 'tracker' | 'vehicleCommand' | 'rental' | 'vehicle' | 'rentalEvent'>;

/** Modo de controle do rastreador da moto (sem rastreador cadastrado = `speed_control`, o padrão). */
export async function controlModeOf(prisma: Pick<PrismaService, 'tracker'>, vehicleId: string): Promise<TrackerControlMode> {
  const tracker = await prisma.tracker.findUnique({ where: { vehicleId }, select: { controlMode: true } });
  return tracker?.controlMode ?? 'speed_control';
}

/** Último `lock` do aluguel com o propósito dado (retentativas e trava em curso compartilham o desfecho). */
export function latestRentalLock(prisma: Pick<PrismaService, 'vehicleCommand'>, rentalId: string, vehicleId: string, purpose: 'rental_end' | 'rental_pause') {
  return prisma.vehicleCommand.findFirst({
    where: { vehicleId, type: 'lock', AND: [{ payload: { path: ['rentalId'], equals: rentalId } }, { payload: { path: ['purpose'], equals: purpose } }] },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true, status: true, statusReason: true },
  });
}

/**
 * Só `did_not_stop` prova que o relé não cortou (a moto não parou e nada foi enviado). `timeout` vem da fase de corte
 * (`travada: true` já gravado, só a confirmação atrasou) ou de um estado perdido: a moto pode estar travada — o aluguel fica
 * como está e a trava é pedida de novo.
 */
export const LOCK_NOT_CUT_REASON = 'did_not_stop';

/** `data.reason` do evento `resumed` gravado quando a trava de fim/pausa terminou `did_not_stop` e o aluguel voltou a `active`. */
export const REVERT_REASON = { rental_end: 'end_lock_failed', rental_pause: 'pause_lock_failed' } as const;

/**
 * Defesa (auditoria run-4): a trava de fim/pausa confirmou tarde com o aluguel já `active` (voltou depois de um
 * `did_not_stop`) — a moto está travada; o aluguel passa a `paused` (cobra pausa) e o cliente retoma pelo app. Não destrava
 * nem encerra sozinho. Só `relay_only`, só o último lock do propósito e só se este comando reverteu o aluguel.
 */
export async function pauseAfterLateLock(prisma: Db, rental: { id: string; vehicleId: string }, commandId: string, purpose: 'rental_end' | 'rental_pause'): Promise<{ vehicleMoved: boolean } | null> {
  if ((await controlModeOf(prisma, rental.vehicleId)) !== 'relay_only') return null;
  const latest = await latestRentalLock(prisma, rental.id, rental.vehicleId, purpose);
  if (!latest || latest.id !== commandId || latest.status !== 'confirmed') return null;
  // Só o aluguel revertido por ESTE comando (evento `resumed` com o `commandId`). No caminho normal da pausa com a moto já
  // travada o gateway confirma na hora e o `command.changed` chega antes de o `pause()` gravar `paused`; e um `resume` do
  // cliente entre a confirmação e este listener destrava a moto — nos dois casos não há esse evento e nada muda.
  const reverted = await prisma.rentalEvent.findFirst({
    where: {
      rentalId: rental.id,
      type: 'resumed',
      AND: [{ data: { path: ['commandId'], equals: commandId } }, { data: { path: ['reason'], equals: REVERT_REASON[purpose] } }],
    },
    select: { id: true },
  });
  if (!reverted) return null;
  const moved = await prisma.rental.updateMany({ where: { id: rental.id, status: 'active' }, data: { status: 'paused', pausedAt: new Date() } });
  if (moved.count !== 1) return null;
  const vehicle = await prisma.vehicle.updateMany({ where: { id: rental.vehicleId, status: 'rented' }, data: { status: 'paused' } });
  await prisma.rentalEvent.create({
    data: { rentalId: rental.id, type: 'paused', actorType: 'system', message: 'A moto foi travada; retome pelo app para seguir.', data: { reason: 'late_lock_confirmed', purpose, commandId } },
  });
  return { vehicleMoved: vehicle.count === 1 };
}
