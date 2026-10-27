/**
 * Seed do contrato v2 (docs/decisoes.md, 2026-10-22) — São Paulo. Idempotente; chamado por `seed.ts`.
 * Catálogo de exemplo Urbana/Sport/Touring (`seed-catalog.ts`: preço por minuto e foto de exemplo baixada para o MinIO),
 * estações de troca, odômetro/horas e revisões, baterias (instaladas, na van do operador dev e carregando nas estações),
 * cupom de boas-vindas, chave Pix e código de indicação do cliente dev.
 */
import type { PrismaClient } from '@prisma/client';
import { CATALOG_EXAMPLES, modelForCode, seedCatalog, type FetchLike, type SeedCatalogDeps } from './seed-catalog';
import { alignStationBatteries } from './seed-stations';

const id = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Catálogo de exemplo (urbana com cesto, esportiva de 2 lugares, touring com baú): ver `seed-catalog.ts`. */
export const VEHICLE_MODELS = CATALOG_EXAMPLES;

export const SWAP_STATIONS = [
  { id: id('d0000000', 1), name: 'Estação Largo da Batata', address: 'Largo da Batata, 40 · Pinheiros, São Paulo', lat: -23.5672, lng: -46.6930, availableBatteries: 9, totalSlots: 12, openingHours: 'Todos os dias, 24 h', open24h: true },
  { id: id('d0000000', 2), name: 'Estação Metrô Vila Madalena', address: 'R. Heitor Penteado, 1800 · Sumarezinho, São Paulo', lat: -23.5462, lng: -46.6910, availableBatteries: 6, totalSlots: 10, openingHours: 'Seg a sáb, 6h às 23h', open24h: false },
  { id: id('d0000000', 3), name: 'Estação Benedito Calixto', address: 'R. Cardeal Arcoverde, 1400 · Pinheiros, São Paulo', lat: -23.5590, lng: -46.6820, availableBatteries: 4, totalSlots: 8, openingHours: 'Seg a sáb, 7h às 22h', open24h: false },
  { id: id('d0000000', 4), name: 'Estação Paulista–Consolação', address: 'Av. Paulista, 2200 · Bela Vista, São Paulo', lat: -23.5570, lng: -46.6612, availableBatteries: 11, totalSlots: 16, openingHours: 'Todos os dias, 24 h', open24h: true },
  { id: id('d0000000', 5), name: 'Estação Faria Lima', address: 'Av. Brig. Faria Lima, 1500 · Pinheiros, São Paulo', lat: -23.5735, lng: -46.6895, availableBatteries: 0, totalSlots: 8, openingHours: 'Seg a sex, 7h às 20h', open24h: false },
];

/** Pseudo-aleatório determinístico. */
function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}


/** Fotos de exemplo baixadas no seed para o bucket de catálogo do MinIO. Sem MinIO ou sem rede, o modelo fica sem foto. */
async function catalogDeps(): Promise<SeedCatalogDeps> {
  const fetchImpl = fetch as unknown as FetchLike;
  try {
    const { loadConfig } = await import('../src/config/env');
    const { S3ObjectStorage } = await import('../src/adapters/storage/s3-object-storage');
    const cfg = loadConfig();
    return { fetchImpl, storage: new S3ObjectStorage(cfg), bucket: cfg.buckets.catalog };
  } catch (err) {
    console.warn(JSON.stringify({ msg: 'seed_catalog_photos_skipped', error: (err as Error).message }));
    return { fetchImpl, storage: null, bucket: 'catalogo' };
  }
}

export async function seedV2(prisma: PrismaClient): Promise<Record<string, number>> {
  // ── catálogo ──
  await seedCatalog(prisma, await catalogDeps());

  // ── estações ──
  for (const s of SWAP_STATIONS) await prisma.swapStation.upsert({ where: { id: s.id }, create: s, update: { ...s, active: true } });

  // ── frota: modelo, odômetro/horas, revisão e bateria instalada (só as motos do seed, VLT-0001…0060) ──
  const next = rand(7);
  const vehicles = await prisma.vehicle.findMany({ where: { code: { startsWith: 'VLT-' } }, orderBy: { code: 'asc' } });
  for (const [i, v] of vehicles.entries()) {
    const m = modelForCode(v.code);
    const odometerKm = Math.round((150 + next() * 2400) * 10) / 10;
    // km desde a revisão entre 0 e 1,15 × intervalo: mistura de "em dia", "próxima" e "vencida".
    const kmSince = Math.min(odometerKm, Math.round(next() * m.serviceIntervalKm * 1.15 * 10) / 10);
    const usageHours = Math.round((odometerKm / 14) * 10) / 10;
    const hoursSince = Math.round((kmSince / 14) * 10) / 10;
    const serial = v.batterySerial ?? `BAT-${String(i + 1).padStart(5, '0')}`;
    await prisma.vehicle.update({
      where: { id: v.id },
      data: {
        vehicleModelId: m.id, model: m.name, batterySerial: serial, odometerKm, usageHours,
        lastServiceOdometerKm: Math.round((odometerKm - kmSince) * 10) / 10, lastServiceUsageHours: Math.max(0, Math.round((usageHours - hoursSince) * 10) / 10),
        lastServiceAt: new Date(Date.now() - Math.round(kmSince / 25) * 86400000),
      },
    });
    await prisma.battery.upsert({
      where: { serial },
      create: { serial, chargePct: v.batteryPct, cycleCount: 20 + Math.floor(next() * 480), status: 'in_vehicle', vehicleId: v.id },
      update: { status: 'in_vehicle', vehicleId: v.id, holderId: null, stationId: null, chargePct: v.batteryPct },
    });
  }

  // ── baterias na van do operador dev (campo) e carregando nas estações ──
  const campo = await prisma.staffUser.findUnique({ where: { email: 'campo@volti.dev' }, select: { id: true } });
  if (campo) {
    const van = [100, 100, 98, 95, 34, 12];
    for (const [i, pct] of van.entries()) {
      const serial = `BT-V${String(i + 1).padStart(4, '0')}`;
      await prisma.battery.upsert({
        where: { serial },
        create: { serial, chargePct: pct, cycleCount: 60 + i * 37, status: 'in_van', holderId: campo.id },
        update: { status: 'in_van', holderId: campo.id, vehicleId: null, stationId: null, chargePct: pct },
      });
    }
  }
  // Fix round 1 da Task 8.3: carregadas cadastradas em cada estação = `availableBatteries` (a API só libera bateria
  // cadastrada `in_station` nesta estação). Só cria as que faltam; nunca move bateria que já saiu da estação.
  await alignStationBatteries(prisma, SWAP_STATIONS.map((s) => s.id));

  // ── cupom de boas-vindas, chave Pix e código de indicação do cliente dev ──
  await prisma.coupon.upsert({
    where: { code: 'BEMVINDO10' },
    create: { code: 'BEMVINDO10', description: 'R$ 10 de desconto na primeira corrida', discountType: 'fixed', amountOffCents: 1000, maxRedemptionsPerCustomer: 1 },
    update: {},
  });
  await prisma.customer.updateMany({
    where: { cognitoSub: 'dev-cliente-aprovado' },
    data: { pixRefundKeyType: 'email', pixRefundKey: 'cliente.aprovado@volti.dev', referralCode: 'APROVADO7K' },
  });

  const [models, stations, batteries] = await Promise.all([prisma.vehicleModel.count(), prisma.swapStation.count(), prisma.battery.count()]);
  return { vehicleModels: models, swapStations: stations, batteries };
}
