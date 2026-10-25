import type { Battery, BatteryStatus, Prisma } from '@prisma/client';

/**
 * Histórico de movimentação das baterias (docs/decisoes.md, 2026-10-24): toda transição grava uma linha em
 * `BatteryMovement`, na mesma transação da mudança. Funções puras + `createMany`, para servir a qualquer módulo
 * (van, galpão, troca na tarefa de campo, troca na estação por QR) sem dependência de injeção.
 */
export interface MovementInput {
  batteryId: string;
  fromStatus: BatteryStatus | null;
  toStatus: BatteryStatus;
  depotId: string | null;
  stationId: string | null;
  vehicleId: string | null;
  actorId: string;
  reason: string | null;
}

type Prev = Pick<Battery, 'id' | 'status' | 'depotId' | 'stationId' | 'vehicleId'>;
interface Next {
  status: BatteryStatus;
  depotId?: string | null;
  stationId?: string | null;
  vehicleId?: string | null;
}

/**
 * Uma movimentação de `prev` (nulo = cadastro) para `next`. Galpão, estação e moto: o destino quando houver, senão a
 * origem (ex.: `charged → in_van` guarda o galpão de onde saiu; `in_vehicle → in_van` guarda a moto).
 */
export function movement(prev: Prev | null | undefined, next: Next, actorId: string, reason?: string | null, batteryId?: string): MovementInput {
  const id = prev?.id ?? batteryId;
  if (!id) throw new Error('movement: id da bateria ausente');
  return {
    batteryId: id,
    fromStatus: prev?.status ?? null,
    toStatus: next.status,
    depotId: next.depotId ?? prev?.depotId ?? null,
    stationId: next.stationId ?? prev?.stationId ?? null,
    vehicleId: next.vehicleId ?? prev?.vehicleId ?? null,
    actorId,
    reason: reason ?? null,
  };
}

export async function recordMovements(tx: Prisma.TransactionClient, items: MovementInput[]): Promise<void> {
  if (!items.length) return;
  await tx.batteryMovement.createMany({ data: items });
}

/** Galpões que perderam uma bateria `charged` nestas movimentações (para conferir o estoque mínimo depois do commit). */
export function depotsLeavingCharged(items: MovementInput[]): string[] {
  const ids = items.filter((m) => m.fromStatus === 'charged' && m.toStatus !== 'charged' && m.depotId).map((m) => m.depotId as string);
  return [...new Set(ids)];
}
