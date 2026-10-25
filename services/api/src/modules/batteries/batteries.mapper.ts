import type { Battery, BatteryMovement } from '@prisma/client';
import { compact } from '../../common/util';

/** Bateria carregada o suficiente para ir numa moto (estoque da van). */
export const CHARGED_PCT = 90;

/** Prisma → `Battery`. */
export function toBattery(b: Battery, vehicleCode?: string) {
  return compact({
    id: b.id,
    serial: b.serial,
    chargePct: b.chargePct,
    cycleCount: b.cycleCount,
    status: b.status,
    vehicleId: b.vehicleId ?? undefined,
    vehicleCode,
    holderId: b.holderId ?? undefined,
    stationId: b.stationId ?? undefined,
    depotId: b.depotId ?? undefined,
    updatedAt: b.updatedAt.toISOString(),
  });
}

/** Prisma → `BatteryMovement`. */
export function toBatteryMovement(m: BatteryMovement) {
  return compact({
    id: m.id,
    batteryId: m.batteryId,
    fromStatus: m.fromStatus ?? undefined,
    toStatus: m.toStatus,
    depotId: m.depotId ?? undefined,
    stationId: m.stationId ?? undefined,
    vehicleId: m.vehicleId ?? undefined,
    actorId: m.actorId,
    reason: m.reason ?? undefined,
    at: m.at.toISOString(),
  });
}
