import type { VehicleCommand } from '@prisma/client';
import { compact, iso } from '../../common/util';

export interface CommandPayload {
  speedLimitKmh?: number;
  on?: boolean;
  rentalId?: string;
  fieldTaskId?: string;
  purpose?: string;
}

/** Prisma → schema `VehicleCommand` do contrato. */
export function toVehicleCommand(c: VehicleCommand) {
  const payload = (c.payload ?? {}) as CommandPayload;
  return compact({
    id: c.id,
    vehicleId: c.vehicleId,
    type: c.type,
    status: c.status,
    statusReason: c.statusReason ?? undefined,
    reason: c.reason,
    speedLimitKmh: payload.speedLimitKmh,
    on: payload.on,
    requestedById: c.requestedById ?? undefined,
    requestedByName: c.requestedByName ?? undefined,
    requestedByType: c.requestedByType,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    confirmedAt: iso(c.confirmedAt),
  });
}
