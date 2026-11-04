import type { Battery, TrackerControlMode, Vehicle } from '@prisma/client';
import { compact, estimatedRangeKm, iso } from '../../common/util';
import { toBattery } from '../batteries/batteries.mapper';
import type { VehicleModelRef } from '../catalog/catalog.service';
import { computeServiceInfo, publicServiceInfo } from '../maintenance/service-due';
import { DEFAULT_OFFLINE_AFTER_MS } from '../iot/live-state.store';

type VehicleLike = Pick<Vehicle, 'id' | 'code' | 'model' | 'status' | 'lat' | 'lng' | 'batteryPct'> & {
  /** Ausente (`select` sem o campo) = conhecida. */
  batteryKnown?: boolean;
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
  // Bancada do J16: sem leitura da bateria, `batteryPct`/`estimatedRangeKm` vêm 0 (como em `Vehicle`).
  const batteryKnown = v.batteryKnown !== false;
  const batteryPct = batteryKnown ? v.batteryPct : 0;
  return compact({
    id: v.id,
    code: v.code,
    model: v.model,
    status: v.status,
    lat: v.lat,
    lng: v.lng,
    batteryPct,
    estimatedRangeKm: estimatedRangeKm(batteryPct),
    batteryKnown,
    distanceM: distanceM === undefined ? undefined : Math.max(0, Math.round(distanceM)),
    ...modelFields(v),
  });
}

type VehicleRow = Omit<Vehicle, 'batteryKnown'> & {
  /** Ausente (linha antiga, `select` parcial) = conhecida. */
  batteryKnown?: boolean;
  tracker?: { id: string; controlMode?: TrackerControlMode; firmwareVersion?: string | null } | null;
  vehicleModel?: VehicleModelRef | null;
};

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

/** Janela do "online": a mesma da vigia de inatividade do módulo IoT (`IOT_OFFLINE_AFTER_MS`, padrão 180 s). */
export function onlineWindowMs(env: Record<string, string | undefined> = process.env): number {
  const v = Number(env.IOT_OFFLINE_AFTER_MS);
  return env.IOT_OFFLINE_AFTER_MS && Number.isFinite(v) && v > 0 ? v : DEFAULT_OFFLINE_AFTER_MS;
}

/**
 * `online` exibido: o rastreador mandou notícia (telemetria/heartbeat → `lastSeenAt`) dentro da janela e não caiu. O
 * `online` do banco nasce `true` (padrão da coluna) e só a presença/vigia o desliga — moto que nunca teve rastreador
 * conectado (ou cujo rastreador sumiu sem a vigia perceber, ex.: API reiniciada) não aparece como online.
 */
export function trackerOnline(v: Pick<Vehicle, 'online' | 'lastSeenAt'>, now = Date.now(), windowMs = onlineWindowMs()): boolean {
  if (!v.online || !v.lastSeenAt) return false;
  const seen = new Date(v.lastSeenAt).getTime();
  return Number.isFinite(seen) && now - seen < windowMs;
}

/** Prisma → `Vehicle`. Clientes recebem só os campos públicos; staff recebe telemetria, rastreador, revisão e bateria. */
export function toVehicle(
  v: VehicleRow,
  opts: {
    staff: boolean;
    currentRentalId?: string;
    battery?: Battery | null;
    assignedSubscriptionId?: string;
    serviceDefaults?: ServiceDefaults;
    hideLocation?: boolean;
    /** Relógio do cálculo de `online` (testes). */
    now?: number;
  },
) {
  // Bancada do J16: sem leitura da bateria, `batteryPct`/`estimatedRangeKm` vêm 0 (contrato: não exibir como nível).
  const batteryKnown = v.batteryKnown !== false;
  const batteryPct = batteryKnown ? v.batteryPct : 0;
  const base = {
    id: v.id,
    code: v.code,
    qrCode: v.qrCode ?? undefined,
    model: v.model,
    status: v.status,
    lat: v.lat,
    lng: v.lng,
    batteryPct,
    estimatedRangeKm: estimatedRangeKm(batteryPct),
    batteryKnown,
    speedLimitKmh: v.speedLimitKmh,
    ...modelFields(v),
    depotId: v.depotId ?? undefined,
  };
  // Endereço da posição atual ou `null` (nunca o de outro lugar; contrato: `Vehicle.address`). `compact` tira nulos: vai depois.
  const address = { address: v.addressLabel ?? null, addressUpdatedAt: v.addressLabel ? (iso(v.addressUpdatedAt) ?? null) : null };
  // Fix round 1 (I5): moto em uso por outra pessoa — posição oculta para o cliente (endereço ausente).
  if (!opts.staff && opts.hideLocation) return compact({ ...base, lat: 0, lng: 0, address: undefined as string | undefined, addressUpdatedAt: undefined as string | undefined, locationHidden: true });
  if (!opts.staff) return { ...compact(base), ...address };
  const staffView = compact({
    ...base,
    thingName: v.thingName,
    trackerId: v.tracker?.id,
    trackerControlMode: v.tracker?.controlMode ?? 'speed_control',
    batterySerial: v.batterySerial ?? undefined,
    online: trackerOnline(v, opts.now ?? Date.now()),
    locked: v.locked,
    ignition: v.ignition,
    speedKmh: v.speedKmh ?? undefined,
    signal: v.signal ?? undefined,
    stolenMode: v.stolenMode,
    // Versão do rastreador vinculado (provisionamento); sem ela, a gravada na moto.
    firmwareVersion: v.tracker?.firmwareVersion ?? v.firmwareVersion ?? undefined,
    lastSeenAt: iso(v.lastSeenAt),
    // Hora da medição de lat/lng: o heartbeat avança `lastSeenAt` sem posição nova (J16 sem GPS válido).
    positionAt: iso(v.positionAt),
    currentRentalId: opts.currentRentalId,
    odometerKm: round1(v.odometerKm ?? 0),
    usageHours: round1(v.usageHours ?? 0),
    service: publicServiceInfo(vehicleServiceInfo(v, opts.serviceDefaults)),
    battery: opts.battery ? toBattery(opts.battery, v.code, batteryKnown) : undefined,
    assignedSubscriptionId: opts.assignedSubscriptionId,
    createdAt: iso(v.createdAt),
    updatedAt: iso(v.updatedAt),
  });
  return { ...staffView, ...address };
}
