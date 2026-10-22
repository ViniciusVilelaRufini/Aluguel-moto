/**
 * Seed do contrato v2 (docs/decisoes.md, 2026-10-22) — São Paulo. Idempotente; chamado por `seed.ts`.
 * Catálogo Flash/Urban/Cargo (preço por minuto e foto placeholder no MinIO), estações de troca, odômetro/horas e
 * revisões, baterias (instaladas, na van do operador dev e carregando nas estações), cupom de boas-vindas, chave Pix e
 * código de indicação do cliente dev.
 */
import type { PrismaClient } from '@prisma/client';
import { deflateSync } from 'node:zlib';

const id = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const VEHICLE_MODELS = [
  { id: id('c0000000', 1), name: 'Volti Flash', slug: 'flash', categoryLabel: 'Urbana', description: 'Leve e ágil para a cidade.', pricePerMinuteCents: 79, serviceIntervalKm: 1000, serviceIntervalHours: 100, sortOrder: 1, color: [0x00, 0xb3, 0x7e] },
  { id: id('c0000000', 2), name: 'Volti Urban', slug: 'urban', categoryLabel: 'Assento duplo', description: 'Banco maior e mais conforto.', pricePerMinuteCents: 89, serviceIntervalKm: 1000, serviceIntervalHours: 100, sortOrder: 2, color: [0x1f, 0x6f, 0xeb] },
  { id: id('c0000000', 3), name: 'Volti Cargo', slug: 'cargo', categoryLabel: 'Com baú · entregas', description: 'Baú traseiro para entregas.', pricePerMinuteCents: 99, serviceIntervalKm: 800, serviceIntervalHours: 80, sortOrder: 3, color: [0xff, 0x7a, 0x1a] },
] as const;

export const SWAP_STATIONS = [
  { id: id('d0000000', 1), name: 'Estação Largo da Batata', address: 'Largo da Batata, 40 · Pinheiros, São Paulo', lat: -23.5672, lng: -46.6930, availableBatteries: 9, totalSlots: 12, openingHours: 'Todos os dias, 24 h', open24h: true },
  { id: id('d0000000', 2), name: 'Estação Metrô Vila Madalena', address: 'R. Heitor Penteado, 1800 · Sumarezinho, São Paulo', lat: -23.5462, lng: -46.6910, availableBatteries: 6, totalSlots: 10, openingHours: 'Seg a sáb, 6h às 23h', open24h: false },
  { id: id('d0000000', 3), name: 'Estação Benedito Calixto', address: 'R. Cardeal Arcoverde, 1400 · Pinheiros, São Paulo', lat: -23.5590, lng: -46.6820, availableBatteries: 4, totalSlots: 8, openingHours: 'Seg a sáb, 7h às 22h', open24h: false },
  { id: id('d0000000', 4), name: 'Estação Paulista–Consolação', address: 'Av. Paulista, 2200 · Bela Vista, São Paulo', lat: -23.5570, lng: -46.6612, availableBatteries: 11, totalSlots: 16, openingHours: 'Todos os dias, 24 h', open24h: true },
  { id: id('d0000000', 5), name: 'Estação Faria Lima', address: 'Av. Brig. Faria Lima, 1500 · Pinheiros, São Paulo', lat: -23.5735, lng: -46.6895, availableBatteries: 0, totalSlots: 8, openingHours: 'Seg a sex, 7h às 20h', open24h: false },
];

/** PNG sólido mínimo (placeholder da foto do modelo até a arte chegar). */
export function solidPng(width: number, height: number, [r, g, b]: readonly number[]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Pseudo-aleatório determinístico. */
function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Sobe as fotos placeholder para o bucket de catálogo do MinIO. Sem MinIO, o modelo fica sem foto (o seed segue). */
async function uploadPhotos(): Promise<Map<string, string>> {
  const keys = new Map<string, string>();
  try {
    const { loadConfig } = await import('../src/config/env');
    const { S3ObjectStorage } = await import('../src/adapters/storage/s3-object-storage');
    const cfg = loadConfig();
    const storage = new S3ObjectStorage(cfg);
    await storage.ensureBuckets([cfg.buckets.catalog]);
    for (const m of VEHICLE_MODELS) {
      const key = `catalog/${m.slug}.png`;
      await storage.putObject({ bucket: cfg.buckets.catalog, key, body: solidPng(480, 320, m.color), contentType: 'image/png' });
      keys.set(m.slug, key);
    }
  } catch (err) {
    console.warn(JSON.stringify({ msg: 'seed_catalog_photos_skipped', error: (err as Error).message }));
  }
  return keys;
}

export async function seedV2(prisma: PrismaClient): Promise<Record<string, number>> {
  // ── catálogo ──
  const photos = await uploadPhotos();
  for (const m of VEHICLE_MODELS) {
    const { color: _color, ...data } = m;
    const photoObjectKey = photos.get(m.slug);
    await prisma.vehicleModel.upsert({
      where: { id: m.id },
      create: { ...data, ...(photoObjectKey ? { photoObjectKey } : {}) },
      update: { name: m.name, categoryLabel: m.categoryLabel, pricePerMinuteCents: m.pricePerMinuteCents, serviceIntervalKm: m.serviceIntervalKm, serviceIntervalHours: m.serviceIntervalHours, active: true, ...(photoObjectKey ? { photoObjectKey } : {}) },
    });
  }

  // ── estações ──
  for (const s of SWAP_STATIONS) await prisma.swapStation.upsert({ where: { id: s.id }, create: s, update: { ...s, active: true } });

  // ── frota: modelo, odômetro/horas, revisão e bateria instalada (só as motos do seed, VLT-0001…0060) ──
  const next = rand(7);
  const vehicles = await prisma.vehicle.findMany({ where: { code: { startsWith: 'VLT-' } }, orderBy: { code: 'asc' } });
  for (const [i, v] of vehicles.entries()) {
    const m = VEHICLE_MODELS[i % 3];
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
  for (const [i, s] of SWAP_STATIONS.entries()) {
    for (let k = 1; k <= 2; k++) {
      const serial = `BT-S${i + 1}${String(k).padStart(3, '0')}`;
      await prisma.battery.upsert({
        where: { serial },
        create: { serial, chargePct: 100, cycleCount: 100 + k * 11, status: 'in_station', stationId: s.id },
        update: { status: 'in_station', stationId: s.id, holderId: null, vehicleId: null },
      });
    }
  }

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
