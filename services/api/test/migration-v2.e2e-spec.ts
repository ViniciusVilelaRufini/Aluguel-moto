import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Fix round 1 (C1/M1): as migrações do contrato v2 aplicam sobre um banco que já rodou as anteriores (as da `main`), com
 * dados legados — inclusive assinaturas "ativas" duplicadas para o mesmo cliente (banco antigo sem o índice parcial),
 * cancelamento agendado vencido, assinatura sem renovação há dias e bateria ligada a moto.
 */
const V2_FIRST = '20261022100000';
const API_DIR = join(__dirname, '..');
const PRISMA_CLI = require.resolve('prisma/build/index.js');

function withDb(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

function deploy(schemaPath: string, url: string): void {
  execFileSync(process.execPath, [PRISMA_CLI, 'migrate', 'deploy', '--schema', schemaPath], { cwd: API_DIR, env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
}

describe('Migração do contrato v2 sobre dados legados', () => {
  const baseUrl = process.env.DATABASE_URL!;
  const dbName = `volti_migtest_${Date.now()}`;
  const url = withDb(baseUrl, dbName);
  const admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
  let db: PrismaClient;
  let dir: string;

  beforeAll(async () => {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    dir = mkdtempSync(join(tmpdir(), 'volti-migtest-'));
    copyFileSync(join(API_DIR, 'prisma', 'schema.prisma'), join(dir, 'schema.prisma'));
    mkdirSync(join(dir, 'migrations'));
    writeFileSync(join(dir, 'migrations', 'migration_lock.toml'), 'provider = "postgresql"\n');
    for (const m of readdirSync(join(API_DIR, 'prisma', 'migrations')).filter((n) => /^\d{14}_/.test(n) && n < V2_FIRST)) {
      cpSync(join(API_DIR, 'prisma', 'migrations', m), join(dir, 'migrations', m), { recursive: true });
    }
    deploy(join(dir, 'schema.prisma'), url);
    db = new PrismaClient({ datasources: { db: { url } } });
  }, 180_000);

  afterAll(async () => {
    await db?.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => undefined);
    await admin.$disconnect();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('aplica limpo, mantém só a assinatura aberta mais nova por cliente e fecha as vencidas', async () => {
    // Banco legado: sem o índice parcial antigo, então há duas "ativas" para o mesmo cliente.
    await db.$executeRawUnsafe('DROP INDEX IF EXISTS "Subscription_one_active_per_customer"');
    const [a, b] = [randomUUID(), randomUUID()];
    for (const id of [a, b]) {
      await db.$executeRawUnsafe(`INSERT INTO "Customer" ("id", "cognitoSub", "email", "updatedAt") VALUES ($1::uuid, $2, $3, now())`, id, `legacy-${id}`, `${id}@example.com`);
    }
    const sub = (customerId: string, createdAtOffsetDays: number, endOffsetDays: number, cancelAtPeriodEnd = false) => {
      const id = randomUUID();
      return db
        .$executeRawUnsafe(
          `INSERT INTO "Subscription" ("id", "customerId", "planCode", "status", "priceCents", "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "createdAt", "updatedAt")
           VALUES ($1::uuid, $2::uuid, 'weekly', 'active', 24900, now() - interval '7 days', now() + ($3 || ' days')::interval, $4, now() + ($5 || ' days')::interval, now())`,
          id, customerId, String(endOffsetDays), cancelAtPeriodEnd, String(createdAtOffsetDays),
        )
        .then(() => id);
    };
    const older = await sub(a, -20, 3);
    const newer = await sub(a, -1, 6);
    const canceledLate = await sub(a, -30, -1, true);
    const stale = await sub(b, -40, -10);
    const vehicleId = randomUUID();
    await db.$executeRawUnsafe(`INSERT INTO "Vehicle" ("id", "code", "model", "thingName", "updatedAt") VALUES ($1::uuid, 'VLT-9001', 'Volti S1', 'moto-legacy', now())`, vehicleId);
    await db.$executeRawUnsafe(`INSERT INTO "Battery" ("id", "serial", "vehicleId", "updatedAt") VALUES (gen_random_uuid(), 'BAT-LEGACY', $1::uuid, now())`, vehicleId);

    // Agora as migrações do v2.
    for (const m of readdirSync(join(API_DIR, 'prisma', 'migrations')).filter((n) => /^\d{14}_/.test(n) && n >= V2_FIRST)) {
      cpSync(join(API_DIR, 'prisma', 'migrations', m), join(dir, 'migrations', m), { recursive: true });
    }
    expect(() => deploy(join(dir, 'schema.prisma'), url)).not.toThrow();

    const rows = await db.$queryRawUnsafe<Array<{ id: string; status: string }>>(`SELECT "id"::text, "status"::text FROM "Subscription"`);
    const status = new Map(rows.map((r) => [r.id, r.status]));
    expect(status.get(newer)).toBe('active');
    expect(status.get(older)).toBe('canceled');
    expect(status.get(canceledLate)).toBe('canceled');
    expect(status.get(stale)).toBe('expired');
    const battery = await db.$queryRawUnsafe<Array<{ status: string }>>(`SELECT "status"::text FROM "Battery" WHERE "serial" = 'BAT-LEGACY'`);
    expect(battery[0].status).toBe('in_vehicle');
    const idx = await db.$queryRawUnsafe<Array<{ indexname: string }>>(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`);
    const names = idx.map((i) => i.indexname);
    expect(names).toEqual(expect.arrayContaining(['Subscription_one_open_per_customer', 'Subscription_one_open_per_vehicle', 'Customer_cpfHash_idx']));
    // O índice novo barra uma segunda assinatura aberta para o mesmo cliente.
    await expect(sub(a, 0, 7)).rejects.toThrow();
  }, 180_000);
});
