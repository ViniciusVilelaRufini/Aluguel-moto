/**
 * Seed da retirada em galpão (docs/decisoes.md, 2026-10-22): o galpão de São Paulo e o vínculo das motos.
 * Idempotente: upsert do galpão pelo nome; motos `free` sem galpão passam a ficar nele, nas coordenadas do galpão.
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

export async function seedDepot(prisma: PrismaClient): Promise<{ depotId: string; depotVehicles: number }> {
  const data = { ...DEPOT_PINHEIROS, openingHours: [...DEPOT_PINHEIROS.openingHours], active: true };
  const existing = await prisma.depot.findFirst({ where: { name: DEPOT_PINHEIROS.name }, orderBy: { createdAt: 'asc' } });
  const depot = existing ? await prisma.depot.update({ where: { id: existing.id }, data }) : await prisma.depot.create({ data });

  const position = { lat: depot.lat, lng: depot.lng };
  // Motos livres sem galpão vão para este galpão.
  await prisma.vehicle.updateMany({ where: { status: 'free', depotId: null }, data: { depotId: depot.id, ...position } });
  // O seed principal reposiciona as motos a cada execução: as livres deste galpão voltam para as coordenadas dele.
  await prisma.vehicle.updateMany({ where: { status: 'free', depotId: depot.id }, data: position });

  const depotVehicles = await prisma.vehicle.count({ where: { depotId: depot.id } });
  return { depotId: depot.id, depotVehicles };
}
