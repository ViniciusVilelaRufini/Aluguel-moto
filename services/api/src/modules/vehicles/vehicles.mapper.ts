import type { Battery, Vehicle } from '@prisma/client';
import { compact, estimatedRangeKm, iso } from '../../common/util';
import { toBattery } from '../batteries/batteries.mapper';
import type { VehicleModelRef } from '../catalog/catalog.service';
import { computeServiceInfo, publicServiceInfo } from '../maintenance/service-due';

type VehicleLike = Pick<Vehicle, 'id' | 'code' | 'model' | 'status' | 'lat' | 'lng' | 'batteryPct'> & {
  vehicleModelId?: string | null;
  vehicleModel?: Pick<VehicleModelRef, 'categoryLabel' | 'pricePerMinuteCents'> | null;
  /** `nearby` (SQL cru) traz os campos do modelo achatados. */
  categoryLabel?: string | null;
  pricePerMinuteCents?: number | null;
};

/** Intervalo de revisão padrão (moto sem modelo no catálogo; `SERVICE_INTERVAL_KM`/`_HOURS`). */
export interface ServiceDefaults {
  km: number;
  hours: number;
}
export const DEFAULT_SERVICE: ServiceDefaults = { km: 1000, hours: 100 };

const modelFields = (v: VehicleLike) => ({
  vehicleModelId: v.vehicleModelId ?? undefined,
  categoryLabel: v.vehicleModel?.categoryLabel ?? v.categoryLabel ?? undefined,
  pricePerMinuteCents: v.vehicleModel?.pricePerMinuteCents ?? v.pricePerMinuteCents ?? undefined,
});

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
    ...modelFields(v),
  });
}

type VehicleRow = Vehicle & { tracker?: { id: string } | null; vehicleModel?: VehicleModelRef | null };

/** Situação da revisão (staff): intervalo do modelo ou o padrão. */
export function vehicleServiceInfo(v: Partial<VehicleRow>, defaults: ServiceDefaults = DEFAULT_SERVICE) {
  return computeServiceInfo({
    odometerKm: v.odometerKm ?? 0,
    usageHours: v.usageHours ?? 0,
    lastServiceOdometerKm: v.lastServiceOdometerKm ?? 0,
    lastServiceUsageHours: v.lastServiceUsageHours ?? 0,
    lastServiceAt: v.lastServiceAt ?? null,
    intervalKm: v.vehicleModel?.serviceIntervalKm ?? defaults.km,
    intervalHours: v.vehicleModel?.serviceIntervalHours ?? defaults.hours,
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Prisma → `Vehicle`. Clientes recebem só os campos públicos; staff recebe telemetria, rastreador, revisão e bateria. */
export function toVehicle(
  v: VehicleRow,
  opts: { staff: boolean; currentRentalId?: string; battery?: Battery | null; assignedSubscriptionId?: string; serviceDefaults?: ServiceDefaults; hideLocation?: boolean },
) {
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
    ...modelFields(v),
    address: v.addressLabel ?? undefined,
    addressUpdatedAt: iso(v.addressUpdatedAt),
  };
  // Fix round 1 (I5): moto em uso por outra pessoa — posição oculta para o cliente.
  if (!opts.staff && opts.hideLocation) return compact({ ...base, lat: 0, lng: 0, address: undefined, addressUpdatedAt: undefined, locationHidden: true });
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
    odometerKm: round1(v.odometerKm ?? 0),
    usageHours: round1(v.usageHours ?? 0),
    service: publicServiceInfo(vehicleServiceInfo(v, opts.serviceDefaults)),
    battery: opts.battery ? toBattery(opts.battery, v.code) : undefined,
    assignedSubscriptionId: opts.assignedSubscriptionId,
    createdAt: iso(v.createdAt),
    updatedAt: iso(v.updatedAt),
  });
}
