/**
 * Seed da retirada em galpão (docs/decisoes.md, 2026-10-22): o galpão de São Paulo e o vínculo de um lote fixo de motos.
 * Idempotente: upsert atômico do galpão pelo nome (único); só as motos de `DEPOT_CODES` ficam nele.
 */
import type { PrismaClient } from '@prisma/client';

export const DEPOT_PINHEIROS = {
  name: 'Galpão Volti — Pinheiros',
  address: 'Rua dos Pinheiros, 870 · Pinheiros, São Paulo',
  district: 'Pinheiros',
  lat: -23.5654,
  lng: -46.6847,
  timezone: 'America/Sao_Paulo',
  // weekday 0 = domingo … 6 = sábado; domingo ausente = fechado.
  openingHours: [
    { weekday: 1, opensAt: '07:00', closesAt: '20:00' },
    { weekday: 2, opensAt: '07:00', closesAt: '20:00' },
    { weekday: 3, opensAt: '07:00', closesAt: '20:00' },
    { weekday: 4, opensAt: '07:00', closesAt: '20:00' },
    { weekday: 5, opensAt: '07:00', closesAt: '20:00' },
    { weekday: 6, opensAt: '08:00', closesAt: '18:00' },
  ],
  pickupNowWindowMinutes: 120,
  maxScheduleDays: 7,
  scheduledGraceMinutes: 30,
} as const;

const code = (n: number) => `VLT-${String(n).padStart(4, '0')}`;

/**
 * Motos que os e2e usam no fluxo de rua (ou pelo thingName, `moto-0058`/`moto-0059`): nunca vão para o galpão.
 * As de `VLT-0001`…`VLT-0006` ficam nas zonas de devolução.
 */
export const E2E_RESERVED_CODES: readonly string[] = [
  ...Array.from({ length: 6 }, (_, i) => code(i + 1)),
  'VLT-0003', 'VLT-0040', 'VLT-0056', 'VLT-0057', 'VLT-0058', 'VLT-0059', 'VLT-0060',
];

/** Lote do galpão: `VLT-0011`…`VLT-0030`, sem as reservadas aos e2e. */
export const DEPOT_CODES: readonly string[] = Array.from({ length: 20 }, (_, i) => code(i + 11)).filter((c) => !E2E_RESERVED_CODES.includes(c));

export async function seedDepot(prisma: PrismaClient): Promise<{ depotId: string; depotVehicles: number }> {
  const data = { ...DEPOT_PINHEIROS, openingHours: [...DEPOT_PINHEIROS.openingHours], active: true };
  const depot = await prisma.depot.upsert({ where: { name: DEPOT_PINHEIROS.name }, create: data, update: data });
  const codes = [...DEPOT_CODES];

  // Fora do lote: desvincula (repara bancos semeados antes, quando todas as motos livres iam para o galpão). As
  // coordenadas originais já foram regravadas pelo seed principal, que roda antes.
  await prisma.vehicle.updateMany({ where: { depotId: depot.id, code: { notIn: codes } }, data: { depotId: null } });
  // Lote: motos livres sem galpão (ou já neste) ficam nele, nas coordenadas do galpão.
  await prisma.vehicle.updateMany({
    where: { code: { in: codes }, status: 'free', OR: [{ depotId: null }, { depotId: depot.id }] },
    data: { depotId: depot.id, lat: depot.lat, lng: depot.lng },
  });

  const depotVehicles = await prisma.vehicle.count({ where: { depotId: depot.id } });
  return { depotId: depot.id, depotVehicles };
}
