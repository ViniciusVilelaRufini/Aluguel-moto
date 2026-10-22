import type { Depot, Reservation, Vehicle } from '@prisma/client';
import { compact, iso } from '../../common/util';
import { toVehicleSummary } from '../vehicles/vehicles.mapper';
import type { OpeningHours } from './depot-rules';

/** Prisma → `Depot`. `distanceM` só quando o chamador mandou `lat`/`lng`. */
export function toDepot(d: Depot, opts: { availableVehicleCount: number; distanceM?: number }) {
  return compact({
    id: d.id,
    name: d.name,
    address: d.address,
    district: d.district ?? undefined,
    lat: d.lat,
    lng: d.lng,
    timezone: d.timezone,
    openingHours: (d.openingHours as OpeningHours).map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt })),
    pickupNowWindowMinutes: d.pickupNowWindowMinutes,
    maxScheduleDays: d.maxScheduleDays,
    scheduledGraceMinutes: d.scheduledGraceMinutes,
    swapStationId: d.swapStationId ?? undefined,
    active: d.active,
    availableVehicleCount: opts.availableVehicleCount,
    distanceM: opts.distanceM === undefined ? undefined : Math.max(0, Math.round(opts.distanceM)),
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  });
}

export type DepotDto = ReturnType<typeof toDepot>;

export type DepotPickupRow = Reservation & {
  customer: { name: string | null };
  vehicle?: Vehicle | null;
  handovers?: { id: string }[];
};

const firstName = (name: string | null | undefined): string | undefined => name?.trim().split(/\s+/)[0] || undefined;

/**
 * Prisma → item da agenda (`Reservation`). Campos escolhidos um a um: do cliente só o primeiro nome; nunca `pickupCode`,
 * `customerId`, cartão ou cupom.
 */
export function toDepotPickup(r: DepotPickupRow) {
  return compact({
    id: r.id,
    vehicleId: r.vehicleId,
    vehicle: r.vehicle ? toVehicleSummary(r.vehicle) : undefined,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    depotId: r.depotId ?? undefined,
    pickupMode: r.pickupMode ?? undefined,
    pickupAt: iso(r.pickupAt),
    planCode: r.planCode ?? undefined,
    coverage: r.coverage ?? undefined,
    depositMethod: r.depositMethod ?? undefined,
    handoverId: r.handovers?.[0]?.id,
    customerFirstName: firstName(r.customer?.name),
  });
}
