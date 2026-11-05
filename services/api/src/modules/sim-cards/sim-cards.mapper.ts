import type { SimCard } from '@prisma/client';

export type SimCardSummaryRow = Pick<SimCard, 'id' | 'iccid' | 'msisdn' | 'carrier' | 'apn' | 'status'>;
export type SimCardWithVehicle = SimCardSummaryRow &
  Pick<SimCard, 'notes' | 'createdAt' | 'updatedAt'> & { tracker?: { vehicle?: { id: string; code: string } | null } | null };

/** `SimCardSummary` (usado em `Vehicle.simCard`); `null` quando a moto não tem chip. */
export function toSimCardSummary(s: SimCardSummaryRow | null | undefined) {
  if (!s) return null;
  return { id: s.id, iccid: s.iccid, msisdn: s.msisdn, carrier: s.carrier, apn: s.apn, status: s.status };
}

/** `SimCard` do contrato; `vehicleId`/`vehicleCode` = moto do rastreador vinculado. */
export function toSimCard(s: SimCardWithVehicle) {
  const vehicle = s.tracker?.vehicle ?? null;
  return {
    ...toSimCardSummary(s)!,
    notes: s.notes,
    vehicleId: vehicle?.id ?? null,
    vehicleCode: vehicle?.code ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
