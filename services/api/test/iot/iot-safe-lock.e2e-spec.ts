import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { connect, type MqttClient } from 'mqtt';
import request from 'supertest';
import { IOT_GATEWAY, type IotGateway } from '../../src/ports/iot-gateway.port';
import { bootE2eApp, devToken } from '../helpers/e2e-app';

/**
 * Integração IoT (Task 4) contra o Mosquitto e o Postgres/Redis do docker compose, com o gateway real (IOT_MODE=local)
 * e o simulador (`services/iot-sim`) num processo separado, como um rastreador de verdade.
 *
 * Rode com DATABASE_URL/REDIS_URL do seu ambiente (fase 2: volti_iot e redis/1) depois de migrate + seed.
 */
const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const SIM_MAIN = resolve(__dirname, '../../../iot-sim/src/main.ts');
const TSX_CLI = require.resolve('tsx/cli');

// moto-0056: rota de Vila Madalena (56 % 5 = 1), que não cruza zonas de velocidade reduzida.
const LOCK_THING = 'moto-0056';
const LOCK_CODE = 'VLT-0056';
// moto-0057: telemetria publicada pelo teste (sem simulador).
const ZONE_THING = 'moto-0057';
const ZONE_CODE = 'VLT-0057';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until<T>(fn: () => Promise<T | undefined | null | false>, timeoutMs: number, what: string): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error(`Tempo esgotado esperando: ${what}`);
    await sleep(250);
  }
}

describe('IoT (integração com Mosquitto)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let redis: Redis;
  let observer: MqttClient;
  let sim: ChildProcess | undefined;
  let gateway: IotGateway;
  let admin: string;

  beforeAll(async () => {
    process.env.IOT_MODE = 'local';
    process.env.GEOFENCE_MODE = 'local';
    process.env.MQTT_URL = MQTT_URL;
    process.env.IOT_CONFIRM_WAIT_MS = '1000';
    redis = new Redis(process.env.REDIS_URL!);
    const vehicles = await new PrismaClient().vehicle.findMany({ where: { code: { in: [LOCK_CODE, ZONE_CODE] } }, select: { id: true } });
    for (const t of [LOCK_THING, ZONE_THING]) await redis.del(`iot:shadow:${t}`, `iot:live:${t}`);
    for (const v of vehicles) await redis.del(`geofence:inside:${v.id}`);
    ({ app, prisma } = await bootE2eApp());
    gateway = app.get(IOT_GATEWAY);
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
    observer = connect(MQTT_URL, { clientId: `iot-e2e-observer-${Date.now()}` });
    await new Promise<void>((ok, fail) => {
      observer.once('connect', () => ok());
      observer.once('error', fail);
    });
  });

  afterAll(async () => {
    sim?.kill();
    observer?.end(true);
    await app?.close();
    await prisma?.$disconnect();
    redis?.disconnect();
  });

  it('lock via API com a moto simulada andando: degraus 15 → 8 → 3 → 0, trava só abaixo de 3 km/h e termina confirmed com a moto parada', async () => {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { code: LOCK_CODE } });

    // Tudo que o servidor e o rastreador trocam sobre esta moto, em ordem.
    const timeline: Array<{ kind: 'delta' | 'reported' | 'telemetry'; at: number; body: any }> = [];
    await observer.subscribeAsync([`$aws/things/${LOCK_THING}/shadow/update/delta`, `$aws/things/${LOCK_THING}/shadow/update`, `motos/${LOCK_THING}/telemetria`]);
    observer.on('message', (topic, payload) => {
      const body = JSON.parse(payload.toString());
      const kind = topic.endsWith('/delta') ? 'delta' : topic.endsWith('/telemetria') ? 'telemetry' : 'reported';
      timeline.push({ kind, at: Date.now(), body });
    });

    sim = spawn(process.execPath, [TSX_CLI, SIM_MAIN], {
      env: {
        ...process.env,
        MQTT_URL,
        SIM_VEHICLES: '1',
        SIM_FIRST_VEHICLE: '56',
        SIM_RIDING_RATIO: '1',
        SIM_CRUISE_MIN_KMH: '25',
        SIM_CRUISE_MAX_KMH: '25',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // A moto conecta e passa a andar a 25 km/h (o gateway vê pela telemetria/reported).
    await until(async () => {
      const s = await gateway.getLiveState(LOCK_THING);
      return s && s.online && s.speedKmh >= 20 && !s.locked;
    }, 30_000, 'moto simulada andando');

    const res = await request(app.getHttpServer())
      .post(`/vehicles/${vehicle.id}/commands`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ type: 'lock', reason: 'Teste de integração do bloqueio seguro' })
      .expect(202);
    expect(res.body.status).toBe('in_progress');

    const confirmed = await until(async () => {
      const c = await prisma.vehicleCommand.findUnique({ where: { id: res.body.id } });
      return c && (c.status === 'confirmed' || c.status === 'failed') ? c : undefined;
    }, 60_000, 'comando confirmado');
    expect(confirmed.status).toBe('confirmed');

    const live = await gateway.getLiveState(LOCK_THING);
    expect(live).toEqual(expect.objectContaining({ locked: true, speedKmh: 0 }));

    // Degraus publicados pelo servidor e a trava por último.
    const deltas = timeline.filter((e) => e.kind === 'delta').map((e) => e.body.state);
    const limits = deltas.filter((d) => d.limite_kmh !== undefined).map((d) => d.limite_kmh);
    expect(limits).toEqual([15, 8, 3, 0]);
    const lockIdx = timeline.findIndex((e) => e.kind === 'delta' && e.body.state.travada === true);
    expect(lockIdx).toBeGreaterThan(-1);
    expect(deltas.filter((d) => d.travada === true)).toHaveLength(1);

    // Invariante: quando travada:true foi publicado, a última velocidade reportada pela moto era < 3 km/h.
    const before = timeline.slice(0, lockIdx).filter((e) => (e.kind === 'reported' && e.body.state?.reported?.velocidade_kmh !== undefined) || e.kind === 'telemetry');
    const last = before[before.length - 1];
    const lastSpeed = last.kind === 'telemetry' ? last.body.velocidade_kmh : last.body.state.reported.velocidade_kmh;
    expect(lastSpeed).toBeLessThan(3);

    // Cada degrau só depois do reported do anterior (com o intervalo de ~2 s).
    const stepTimes = timeline.filter((e) => e.kind === 'delta' && e.body.state.limite_kmh !== undefined).map((e) => e.at);
    for (let i = 1; i < stepTimes.length; i++) expect(stepTimes[i] - stepTimes[i - 1]).toBeGreaterThanOrEqual(1900);

    const vc = await prisma.vehicleCommand.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(vc.confirmedAt).not.toBeNull();
  }, 120_000);

  it('telemetria dentro do calçadão da Teodoro Sampaio → geofence ENTER (PostGIS) e comando de sistema speed_limit 6', async () => {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { code: ZONE_CODE } });
    const since = new Date();
    const publish = (lat: number, lng: number) =>
      observer.publishAsync(
        `motos/${ZONE_THING}/telemetria`,
        JSON.stringify({ lat, lng, velocidade_kmh: 10, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: new Date().toISOString() }),
      );
    await publish(-23.5550, -46.6700); // dentro da área de operação, fora das zonas reduzidas
    await sleep(500);
    await publish(-23.5633, -46.6849); // calçadão (6 km/h)
    const cmd = await until(
      () => prisma.vehicleCommand.findFirst({ where: { vehicleId: vehicle.id, type: 'speed_limit', createdAt: { gte: since } }, orderBy: { createdAt: 'desc' } }),
      15_000,
      'comando speed_limit da cerca',
    );
    expect((cmd.payload as any).speedLimitKmh).toBe(6);
    expect((cmd.payload as any).purpose).toBe('zone_speed_limit');
    expect(cmd.requestedByType).toBe('system');
    // Ninguém responde ao shadow nesta moto (só telemetria): o comando fica aguardando o reported.
    expect(['in_progress', 'pending']).toContain(cmd.status);
    const audit = await prisma.auditLog.findFirst({ where: { entityId: vehicle.id, action: 'vehicle.zone_speed_limit', createdAt: { gte: since } } });
    expect(audit).not.toBeNull();
  }, 30_000);
});
