import type { Battery, BatteryMovement } from '@prisma/client';
import { compact } from '../../common/util';

/** Bateria carregada o suficiente para ir numa moto (estoque da van). */
export const CHARGED_PCT = 90;

/**
 * Prisma → `Battery`. `vehicleBatteryKnown: false` (moto sem leitura de bateria, ex.: J16) com a bateria instalada → `chargeKnown:
 * false`: o `chargePct` é o último valor gravado, não leitura (painel de bancada, P2-7).
 */
export function toBattery(b: Battery, vehicleCode?: string, vehicleBatteryKnown?: boolean) {
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
    chargeKnown: b.status === 'in_vehicle' && vehicleBatteryKnown === false ? false : undefined,
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
