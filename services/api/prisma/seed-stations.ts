/**
 * Seed: estoque cadastrado das estações de troca (fix round 1 da Task 8.3, 2026-10-26). A API só libera bateria cadastrada
 * `in_station` e carregada na estação (`serialHint`); o contador `availableBatteries` precisa bater com essas linhas, senão
 * a partir da 3ª troca a estação não tem o que liberar. Idempotente e seguro de rodar de novo no banco do dev: cria só as
 * que faltam (séries determinísticas `BT-S<estação><nnn>`, pulando as já usadas) e, com mais linhas que o contador, sobe o
 * contador. Nunca apaga nem move bateria existente.
 */
import type { PrismaClient } from '@prisma/client';
import { CHARGED_PCT } from '../src/modules/batteries/batteries.mapper';

export interface StationCounter {
  /** Posição da estação na lista do seed (vira o dígito da série). */
  index: number;
  id: string;
  availableBatteries: number;
}

export interface StationBatteryPlan {
  creates: Array<{ serial: string; stationId: string }>;
  counters: Array<{ stationId: string; availableBatteries: number }>;
}

export const stationBatterySerial = (index: number, k: number) => `BT-S${index + 1}${String(k).padStart(3, '0')}`;

/** Plano puro: `inStock` = carregadas `in_station` por estação; `existingSerials` = séries já cadastradas (qualquer lugar). */
export function planStationBatteries(stations: StationCounter[], inStock: Map<string, number>, existingSerials: Set<string>): StationBatteryPlan {
  const plan: StationBatteryPlan = { creates: [], counters: [] };
  const taken = new Set(existingSerials);
  for (const s of stations) {
    const have = inStock.get(s.id) ?? 0;
    if (have > s.availableBatteries) {
      plan.counters.push({ stationId: s.id, availableBatteries: have });
      continue;
    }
    let missing = s.availableBatteries - have;
    for (let k = 1; missing > 0; k++) {
      const serial = stationBatterySerial(s.index, k);
      if (taken.has(serial)) continue;
      taken.add(serial);
      plan.creates.push({ serial, stationId: s.id });
      missing--;
    }
  }
  return plan;
}

/** Lê o banco (estações na ordem de `stationIds`), aplica o plano e devolve quantas baterias criou. */
export async function alignStationBatteries(prisma: PrismaClient, stationIds: string[]): Promise<number> {
  const rows = await prisma.swapStation.findMany({ where: { id: { in: stationIds } }, select: { id: true, availableBatteries: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const stations: StationCounter[] = stationIds.flatMap((id, index) => {
    const r = byId.get(id);
    return r ? [{ index, id, availableBatteries: r.availableBatteries }] : [];
  });
  const groups = await prisma.battery.groupBy({
    by: ['stationId'],
    where: { stationId: { in: stationIds }, status: 'in_station', chargePct: { gte: CHARGED_PCT } },
    _count: { _all: true },
  });
  const inStock = new Map(groups.filter((g) => g.stationId).map((g) => [g.stationId as string, g._count._all]));
  const existing = await prisma.battery.findMany({ where: { serial: { startsWith: 'BT-S' } }, select: { serial: true } });
  const plan = planStationBatteries(stations, inStock, new Set(existing.map((b) => b.serial)));
  if (plan.creates.length) {
    await prisma.battery.createMany({
      data: plan.creates.map((c) => ({ serial: c.serial, chargePct: 100, cycleCount: 0, status: 'in_station' as const, stationId: c.stationId })),
      skipDuplicates: true,
    });
  }
  for (const c of plan.counters) await prisma.swapStation.update({ where: { id: c.stationId }, data: { availableBatteries: c.availableBatteries } });
  return plan.creates.length;
}
