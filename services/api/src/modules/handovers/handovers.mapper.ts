import type { Handover, Vehicle } from '@prisma/client';
import { compact } from '../../common/util';

export interface ChecklistItem {
  code: string;
  ok: boolean;
  note?: string;
}

/** Só o primeiro nome ("Entregue por <nome>"), nunca o nome completo. */
export function firstName(name?: string | null): string | undefined {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : undefined;
}

/** QA-23 (Task 14): motivo, data e autor do cancelamento (do AuditLog `handover.cancel`), só para staff. */
export interface HandoverCancelInfo {
  reason?: string;
  at: string;
  byName?: string;
}

/** Prisma → `Handover` do contrato. `photoUrls` (assinados) na mesma ordem de `photoKeys`. */
export function toHandover(
  h: Handover & { vehicle?: Pick<Vehicle, 'code'> | null },
  extras: { operatorFirstName?: string; photoUrls?: string[]; cancel?: HandoverCancelInfo } = {},
) {
  return compact({
    id: h.id,
    type: h.type,
    depotId: h.depotId,
    reservationId: h.reservationId ?? undefined,
    rentalId: h.rentalId ?? undefined,
    vehicleId: h.vehicleId,
    vehicleCode: h.vehicle?.code,
    operatorId: h.operatorId,
    operatorFirstName: extras.operatorFirstName,
    checklist: ((h.checklist ?? []) as unknown as ChecklistItem[]).map((i) => compact({ code: i.code, ok: i.ok, note: i.note })),
    photoKeys: h.photoKeys,
    photoUrls: extras.photoUrls,
    batteryPct: h.batteryPct,
    batterySerial: h.batterySerial ?? undefined,
    status: h.status,
    lastError: h.lastError ?? undefined,
    disputeReason: h.disputeReason ?? undefined,
    cancelReason: extras.cancel?.reason,
    canceledAt: extras.cancel?.at,
    canceledByName: extras.cancel?.byName,
    createdAt: h.createdAt.toISOString(),
    respondedAt: h.respondedAt?.toISOString(),
  });
}
