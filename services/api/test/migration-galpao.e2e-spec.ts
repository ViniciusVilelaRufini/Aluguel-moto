import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Retirada em galpão (Task 2): as migrações do galpão são só aditivas. Aplicadas sobre um banco que já rodou as
 * anteriores, com uma moto e uma reserva no formato antigo, as linhas continuam válidas (campos novos nulos), os
 * valores novos de enum existem e o índice parcial barra duas chegadas no galpão abertas para o mesmo aluguel.
 */
const GALPAO_FIRST = '20261023085900';
const API_DIR = join(__dirname, '..');
const MIGRATIONS = join(API_DIR, 'prisma', 'migrations');
const PRISMA_CLI = require.resolve('prisma/build/index.js');

function withDb(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

function deploy(schemaPath: string, url: string): void {
  execFileSync(process.execPath, [PRISMA_CLI, 'migrate', 'deploy', '--schema', schemaPath], { cwd: API_DIR, env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
}

function copyMigrations(dir: string, keep: (name: string) => boolean): void {
  for (const m of readdirSync(MIGRATIONS).filter((n) => /^\d{14}_/.test(n) && keep(n))) {
    cpSync(join(MIGRATIONS, m), join(dir, 'migrations', m), { recursive: true });
  }
}

describe('Migração do galpão sobre dados antigos', () => {
  const baseUrl = process.env.DATABASE_URL!;
  const dbName = `volti_migtest_galpao_${Date.now()}`;
  const url = withDb(baseUrl, dbName);
  const admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
  let db: PrismaClient;
  let dir: string;
  const customerId = randomUUID();
  const vehicleId = randomUUID();
  const reservationId = randomUUID();

  beforeAll(async () => {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    dir = mkdtempSync(join(tmpdir(), 'volti-migtest-galpao-'));
    copyFileSync(join(API_DIR, 'prisma', 'schema.prisma'), join(dir, 'schema.prisma'));
    mkdirSync(join(dir, 'migrations'));
    writeFileSync(join(dir, 'migrations', 'migration_lock.toml'), 'provider = "postgresql"\n');
    copyMigrations(dir, (n) => n < GALPAO_FIRST);
    deploy(join(dir, 'schema.prisma'), url);
    db = new PrismaClient({ datasources: { db: { url } } });

    // Formato antigo: sem depotId nem campos de retirada.
    await db.$executeRawUnsafe(`INSERT INTO "Customer" ("id", "cognitoSub", "email", "updatedAt") VALUES ($1::uuid, $2, $3, now())`, customerId, `legacy-${customerId}`, `${customerId}@example.com`);
    await db.$executeRawUnsafe(`INSERT INTO "Vehicle" ("id", "code", "model", "thingName", "status", "updatedAt") VALUES ($1::uuid, 'VLT-9101', 'Volti S1', 'moto-legacy-galpao', 'reserved', now())`, vehicleId);
    await db.$executeRawUnsafe(
      `INSERT INTO "Reservation" ("id", "customerId", "vehicleId", "status", "expiresAt", "updatedAt") VALUES ($1::uuid, $2::uuid, $3::uuid, 'active', now() + interval '15 minutes', now())`,
      reservationId, customerId, vehicleId,
    );

    copyMigrations(dir, (n) => n >= GALPAO_FIRST);
    deploy(join(dir, 'schema.prisma'), url);
  }, 180_000);

  afterAll(async () => {
    await db?.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => undefined);
    await admin.$disconnect();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('mantém a moto e a reserva antigas válidas, com os campos novos nulos', async () => {
    const vehicle = await db.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    expect(vehicle.depotId).toBeNull();
    expect(vehicle.status).toBe('reserved');
    const reservation = await db.reservation.findUniqueOrThrow({ where: { id: reservationId } });
    expect(reservation).toMatchObject({ status: 'active', depotId: null, pickupMode: null, pickupAt: null, planCode: null, coverage: null, depositMethod: null, cardId: null, couponCode: null, reminderSentAt: null });
  });

  it('adiciona os valores novos de enum', async () => {
    const rows = await db.$queryRawUnsafe<Array<{ typname: string; enumlabel: string }>>(
      `SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname IN ('VehicleStatus', 'ReservationStatus', 'PickupMode', 'HandoverType', 'HandoverStatus')`,
    );
    const labels = (t: string) => rows.filter((r) => r.typname === t).map((r) => r.enumlabel);
    expect(labels('VehicleStatus')).toContain('awaiting_pickup');
    expect(labels('ReservationStatus')).toContain('handover');
    expect(labels('PickupMode')).toEqual(['now', 'scheduled']);
    expect(labels('HandoverType')).toEqual(['pickup', 'return_depot']);
    expect(labels('HandoverStatus')).toEqual(['pending_customer', 'accepted', 'disputed', 'canceled']);
  });

  it('cria o galpão com os padrões e barra duas chegadas abertas para o mesmo aluguel', async () => {
    const depot = await db.depot.create({ data: { name: 'Galpão teste', address: 'Rua X, 1', lat: -23.56, lng: -46.68, openingHours: [{ weekday: 1, opensAt: '07:00', closesAt: '20:00' }] } });
    expect(depot).toMatchObject({ timezone: 'America/Sao_Paulo', pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30, active: true, swapStationId: null });

    // Reserva de galpão em entrega aberta: um cliente/uma moto continuam com uma reserva aberta só.
    await db.reservation.update({ where: { id: reservationId }, data: { status: 'handover', depotId: depot.id, pickupMode: 'now', planCode: 'day', coverage: 'basic', depositMethod: 'pix' } });
    await expect(
      db.$executeRawUnsafe(`INSERT INTO "Reservation" ("id", "customerId", "vehicleId", "status", "expiresAt", "updatedAt") VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'active', now(), now())`, customerId, vehicleId),
    ).rejects.toThrow(/23505/);

    const rentalId = randomUUID();
    const base = { type: 'return_depot' as const, depotId: depot.id, rentalId, vehicleId, operatorId: randomUUID(), checklist: [{ code: 'freios', ok: true }], photoKeys: [], batteryPct: 80 };
    const first = await db.handover.create({ data: base });
    expect(first).toMatchObject({ status: 'pending_customer', reservationId: null, disputeReason: null, lastError: null, respondedAt: null });
    await expect(db.handover.create({ data: base })).rejects.toMatchObject({ code: 'P2002' });

    // Cancelada não conta: pode registrar outra chegada.
    await db.handover.update({ where: { id: first.id }, data: { status: 'canceled' } });
    await expect(db.handover.create({ data: base })).resolves.toMatchObject({ status: 'pending_customer' });

    // Uma entrega de saída por reserva.
    const pickup = { type: 'pickup' as const, depotId: depot.id, reservationId, vehicleId, operatorId: randomUUID(), checklist: [], photoKeys: ['handovers/a.jpg'], batteryPct: 90 };
    await db.handover.create({ data: pickup });
    await expect(db.handover.create({ data: pickup })).rejects.toMatchObject({ code: 'P2002' });

    const idx = await db.$queryRawUnsafe<Array<{ indexname: string }>>(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`);
    expect(idx.map((i) => i.indexname)).toEqual(expect.arrayContaining(['Handover_one_open_return_per_rental', 'Handover_depotId_status_idx', 'Vehicle_depotId_status_idx']));
  });
});
