import type { StationSwap } from '@prisma/client';
import { compact, iso } from '../../common/util';

/** Prisma → `StationSwap` do contrato. Sem posição (LGPD): só a distância da validação, e só para o staff. */
export function toStationSwap(s: StationSwap, opts: { staff: boolean }) {
  return compact({
    id: s.id,
    stationId: s.stationId,
    rentalId: s.rentalId,
    vehicleId: s.vehicleId,
    status: s.status,
    endReason: s.endReason ?? undefined,
    slotNumber: s.slotNumber ?? undefined,
    feeCents: s.feeCents,
    expiresAt: s.expiresAt.toISOString(),
    returnedSerial: s.returnedSerial ?? undefined,
    returnedPct: s.returnedPct ?? undefined,
    releasedSerial: s.releasedSerial ?? undefined,
    distanceM: opts.staff ? s.distanceM : undefined,
    customerId: opts.staff ? s.customerId : undefined,
    completedAt: iso(s.completedAt),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  });
}
