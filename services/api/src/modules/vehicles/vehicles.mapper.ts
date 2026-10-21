import type { Vehicle } from '@prisma/client';
import { compact, estimatedRangeKm, iso } from '../../common/util';

type VehicleLike = Pick<Vehicle, 'id' | 'code' | 'model' | 'status' | 'lat' | 'lng' | 'batteryPct'>;

/** Prisma → `VehicleSummary`. */
export function toVehicleSummary(v: VehicleLike, distanceM?: number) {
  return compact({
    id: v.id,
    code: v.code,
    model: v.model,
    status: v.status,
    lat: v.lat,
    lng: v.lng,
    batteryPct: v.batteryPct,
    estimatedRangeKm: estimatedRangeKm(v.batteryPct),
    distanceM: distanceM === undefined ? undefined : Math.max(0, Math.round(distanceM)),
  });
}

/** Prisma → `Vehicle`. Clientes recebem só os campos públicos; staff recebe telemetria e rastreador. */
export function toVehicle(v: Vehicle & { tracker?: { id: string } | null }, opts: { staff: boolean; currentRentalId?: string }) {
  const base = {
    id: v.id,
    code: v.code,
    qrCode: v.qrCode ?? undefined,
    model: v.model,
    status: v.status,
    lat: v.lat,
    lng: v.lng,
    batteryPct: v.batteryPct,
    estimatedRangeKm: estimatedRangeKm(v.batteryPct),
    speedLimitKmh: v.speedLimitKmh,
  };
  if (!opts.staff) return compact(base);
  return compact({
    ...base,
    thingName: v.thingName,
    trackerId: v.tracker?.id,
    batterySerial: v.batterySerial ?? undefined,
    online: v.online,
    locked: v.locked,
    ignition: v.ignition,
    speedKmh: v.speedKmh ?? undefined,
    signal: v.signal ?? undefined,
    stolenMode: v.stolenMode,
    firmwareVersion: v.firmwareVersion ?? undefined,
    lastSeenAt: iso(v.lastSeenAt),
    currentRentalId: opts.currentRentalId,
    createdAt: iso(v.createdAt),
    updatedAt: iso(v.updatedAt),
  });
}
