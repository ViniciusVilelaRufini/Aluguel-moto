/**
 * Seed de desenvolvimento — São Paulo (Pinheiros, Vila Madalena, Av. Paulista). Idempotente (upsert).
 * Rodar: `pnpm --filter api prisma db seed`.
 */
import { PrismaClient, type StaffGroup } from '@prisma/client';
import { seedV2 } from './seed-v2';

const prisma = new PrismaClient();

type Ring = Array<[number, number]>; // [lng, lat]

/** Quadrado de `halfM` metros em volta de um ponto (anel fechado). */
function square(lat: number, lng: number, halfM: number): Ring {
  const dLat = halfM / 111_320;
  const dLng = halfM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
}

/** Faixa estreita ao longo de um segmento (ciclovia). */
function corridor(a: [number, number], b: [number, number], halfM: number): Ring {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const kx = 111_320 * Math.cos((lat1 * Math.PI) / 180);
  const dx = (lng2 - lng1) * kx;
  const dy = (lat2 - lat1) * 111_320;
  const len = Math.hypot(dx, dy);
  const ox = (-dy / len) * halfM;
  const oy = (dx / len) * halfM;
  const p = (lat: number, lng: number, sx: number, sy: number): [number, number] => [lng + sx / kx, lat + sy / 111_320];
  const r: Ring = [p(lat1, lng1, ox, oy), p(lat2, lng2, ox, oy), p(lat2, lng2, -ox, -oy), p(lat1, lng1, -ox, -oy)];
  return [...r, r[0]];
}

const id = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Área de operação: Pinheiros, Vila Madalena e Av. Paulista.
const OPERATION: Ring = [
  [-46.7060, -23.5760],
  [-46.6880, -23.5800],
  [-46.6620, -23.5700],
  [-46.6450, -23.5640],
  [-46.6440, -23.5540],
  [-46.6620, -23.5480],
  [-46.6850, -23.5390],
  [-46.7000, -23.5420],
  [-46.7080, -23.5560],
  [-46.7060, -23.5760],
];

export const RETURN_ZONES = [
  { name: 'Devolução — Largo da Batata', lat: -23.5667, lng: -46.6935 },
  { name: 'Devolução — Praça Benedito Calixto', lat: -23.5585, lng: -46.6815 },
  { name: 'Devolução — Metrô Vila Madalena', lat: -23.5465, lng: -46.6905 },
  { name: 'Devolução — MASP (Av. Paulista)', lat: -23.5614, lng: -46.6559 },
  { name: 'Devolução — Metrô Consolação', lat: -23.5578, lng: -46.6608 },
  { name: 'Devolução — Metrô Fradique Coutinho', lat: -23.5661, lng: -46.6845 },
];

const ZONES = [
  { id: id('a0000000', 1), name: 'Área de operação — Pinheiros, Vila Madalena e Paulista', type: 'operation' as const, ring: OPERATION },
  ...RETURN_ZONES.map((z, i) => ({ id: id('a0000000', 10 + i), name: z.name, type: 'return' as const, ring: square(z.lat, z.lng, 90) })),
  {
    id: id('a0000000', 30),
    name: 'Proibida — Parque Ibirapuera',
    type: 'forbidden' as const,
    ring: [[-46.6640, -23.5810], [-46.6500, -23.5820], [-46.6480, -23.5930], [-46.6620, -23.5950], [-46.6680, -23.5880], [-46.6640, -23.5810]] as Ring,
  },
  { id: id('a0000000', 40), name: 'Calçadão — Rua Teodoro Sampaio (pedestres)', type: 'reduced_speed' as const, speedLimitKmh: 6, ring: corridor([-23.5612, -46.6828], [-23.5655, -46.6870], 15) },
  { id: id('a0000000', 41), name: 'Ciclovia da Av. Faria Lima', type: 'reduced_speed' as const, speedLimitKmh: 20, ring: corridor([-23.5662, -46.6942], [-23.5772, -46.6872], 8) },
];

const PLANS = [
  { code: 'minute' as const, name: 'Por minuto', unit: 'minute' as const, unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, recurring: false },
  { code: 'hour' as const, name: 'Por hora', unit: 'hour' as const, unlockFeeCents: 0, unitPriceCents: 2900, pausePerMinuteCents: 0, recurring: false },
  { code: 'day' as const, name: 'Diária', unit: 'day' as const, unlockFeeCents: 0, unitPriceCents: 8900, pausePerMinuteCents: 0, recurring: false },
  { code: 'weekly' as const, name: 'Semanal', unit: 'week' as const, unlockFeeCents: 0, unitPriceCents: 24900, pausePerMinuteCents: 0, recurring: true },
  { code: 'monthly' as const, name: 'Mensal', unit: 'month' as const, unlockFeeCents: 0, unitPriceCents: 79900, pausePerMinuteCents: 0, recurring: true },
];

const STAFF: Array<{ sub: string; email: string; name: string; groups: StaffGroup[] }> = [
  { sub: 'dev-admin', email: 'admin@volti.dev', name: 'Admin Dev', groups: ['admin'] },
  { sub: 'dev-operacao', email: 'operacao@volti.dev', name: 'Operação Dev', groups: ['operacao'] },
  { sub: 'dev-financeiro', email: 'financeiro@volti.dev', name: 'Financeiro Dev', groups: ['financeiro'] },
  { sub: 'dev-suporte', email: 'suporte@volti.dev', name: 'Suporte Dev', groups: ['suporte'] },
  { sub: 'dev-campo', email: 'campo@volti.dev', name: 'Campo Dev', groups: ['campo'] },
];

/** Pseudo-aleatório determinístico (posições estáveis entre execuções). */
function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

async function main(): Promise<void> {
  // ── zonas ──
  for (const z of ZONES) {
    const geometry = { type: 'Polygon', coordinates: [z.ring] };
    const speedLimitKmh = 'speedLimitKmh' in z ? z.speedLimitKmh : null;
    await prisma.zone.upsert({
      where: { id: z.id },
      create: { id: z.id, name: z.name, type: z.type, speedLimitKmh, geometry },
      update: { name: z.name, type: z.type, speedLimitKmh, geometry, active: true, deletedAt: null },
    });
    await prisma.$executeRaw`UPDATE "Zone" SET "geom" = ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326) WHERE "id" = ${z.id}::uuid`;
  }

  // ── motos (VLT-0001…0060); as 6 primeiras ficam dentro das zonas de devolução ──
  const next = rand(42);
  for (let i = 1; i <= 60; i++) {
    const code = `VLT-${String(i).padStart(4, '0')}`;
    const thingName = `moto-${String(i).padStart(4, '0')}`;
    let lat: number;
    let lng: number;
    if (i <= RETURN_ZONES.length) {
      ({ lat, lng } = RETURN_ZONES[i - 1]);
    } else {
      do {
        lat = -23.580 + next() * 0.041;
        lng = -46.708 + next() * 0.064;
      } while (!pointInRing(lng, lat, OPERATION));
    }
    const batteryPct = i <= RETURN_ZONES.length ? 95 : 15 + Math.floor(next() * 85);
    const vehicle = await prisma.vehicle.upsert({
      where: { code },
      create: { code, thingName, model: 'Volti S1', qrCode: `volti://v/${code}`, lat, lng, batteryPct, status: 'free', batterySerial: `BAT-${String(i).padStart(5, '0')}` },
      update: { thingName, lat, lng },
    });
    await prisma.tracker.upsert({
      where: { thingName },
      create: { thingName, vehicleId: vehicle.id, firmwareVersion: '1.0.0' },
      update: { vehicleId: vehicle.id },
    });
  }

  // ── preços, taxas, seguro, pacotes, cupom ──
  for (const p of PLANS) {
    const existing = await prisma.pricingPlan.findFirst({ where: { code: p.code, active: true } });
    if (existing) await prisma.pricingPlan.update({ where: { id: existing.id }, data: p });
    else await prisma.pricingPlan.create({ data: { ...p, active: true } });
  }
  const fees = [
    { code: 'deposit', name: 'Caução', description: 'Pré-autorização no cartão ou Pix.', amountCents: 5000, system: true },
    { code: 'force_end_outside_return_zone', name: 'Encerramento fora da zona de devolução', description: 'Cobrada no encerramento forçado (só admin).', amountCents: 1500, system: true },
  ];
  for (const f of fees) await prisma.fee.upsert({ where: { code: f.code }, create: f, update: { amountCents: f.amountCents, system: true, active: true } });
  const coverages = [
    { coverage: 'basic' as const, name: 'Básico', description: 'Obrigatório. Danos a terceiros e acidentes pessoais.', premiumCents: 200, mandatory: true, items: [{ code: 'third_party', description: 'Danos a terceiros', limitCents: 1_000_000 }, { code: 'personal_accident', description: 'Acidentes pessoais', limitCents: 2_000_000 }] },
    { coverage: 'full' as const, name: 'Completo', description: 'Básico + danos à moto e furto.', premiumCents: 600, mandatory: false, items: [{ code: 'third_party', description: 'Danos a terceiros', limitCents: 2_000_000 }, { code: 'personal_accident', description: 'Acidentes pessoais', limitCents: 4_000_000 }, { code: 'vehicle_damage', description: 'Danos à moto' }, { code: 'theft', description: 'Furto' }] },
  ];
  for (const c of coverages) await prisma.insuranceCoverageConfig.upsert({ where: { coverage: c.coverage }, create: c, update: { premiumCents: c.premiumCents, mandatory: c.mandatory, active: true } });
  const packages = [
    { id: id('b0000000', 1), name: '60 minutos', minutes: 60, priceCents: 3990 },
    { id: id('b0000000', 2), name: '150 minutos', minutes: 150, priceCents: 8990 },
  ];
  for (const p of packages) await prisma.minutePackage.upsert({ where: { id: p.id }, create: p, update: p });
  await prisma.coupon.upsert({
    where: { code: 'VOLTI20' },
    create: { code: 'VOLTI20', description: '20% de desconto no tempo', discountType: 'percent', percentOff: 20, maxRedemptionsPerCustomer: 3 },
    update: {},
  });

  // ── usuários dev (o `sub` é o mesmo do POST /dev/token) ──
  for (const s of STAFF) {
    await prisma.staffUser.upsert({ where: { email: s.email }, create: { cognitoSub: s.sub, email: s.email, name: s.name, groups: s.groups, mfaEnabled: true }, update: { cognitoSub: s.sub, groups: s.groups, active: true } });
  }
  const now = new Date();
  await prisma.customer.upsert({
    where: { cognitoSub: 'dev-cliente-aprovado' },
    create: {
      cognitoSub: 'dev-cliente-aprovado', email: 'cliente.aprovado@volti.dev', name: 'Cliente Aprovado', phone: '+5511990000001', cpf: '52998224725',
      birthDate: new Date('1992-03-15T00:00:00Z'), kycStatus: 'approved', kycSubmittedAt: now, kycReviewedAt: now, termsVersion: '2026-10',
      termsAccepted: true, termsAcceptedAt: now, locationConsent: true, locationConsentUpdatedAt: now, consentsUpdatedAt: now,
    },
    update: { kycStatus: 'approved', status: 'active', delinquent: false, locationConsent: true, termsAccepted: true },
  });
  await prisma.customer.upsert({
    where: { cognitoSub: 'dev-cliente-pendente' },
    create: {
      cognitoSub: 'dev-cliente-pendente', email: 'cliente.pendente@volti.dev', name: 'Cliente Pendente', phone: '+5511990000002', cpf: '11144477735',
      birthDate: new Date('1998-08-20T00:00:00Z'), kycStatus: 'pending', kycSubmittedAt: now, termsVersion: '2026-10', termsAccepted: true,
      termsAcceptedAt: now, locationConsent: true, locationConsentUpdatedAt: now, consentsUpdatedAt: now,
    },
    update: { kycStatus: 'pending' },
  });

  // ── contrato v2: catálogo, estações, odômetro/revisões, baterias, cupom e indicação ──
  const v2 = await seedV2(prisma);

  const counts = await Promise.all([prisma.vehicle.count(), prisma.zone.count(), prisma.pricingPlan.count({ where: { active: true } }), prisma.staffUser.count(), prisma.customer.count()]);
  console.log(JSON.stringify({ msg: 'seed_done', vehicles: counts[0], zones: counts[1], plans: counts[2], staff: counts[3], customers: counts[4], ...v2 }));
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
