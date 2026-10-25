import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import type { GeofenceEngine, ZoneRef } from './geofence/geofence-engine';
import { GeofenceService } from './geofence/geofence.service';
import { LiveStateStore } from './live-state.store';
import { SafeLockService } from './safe-lock.service';
import { RedisSafeLockStore, type SafeLockStore } from './safe-lock.store';
import type { DesiredState, IotTransport, ReportedState } from './shadow-transport';
import { rampSteps } from './speed-limit';

/**
 * Lacunas T5 — fix 2 (re-revisão N1/I1 + segurança): nenhuma cópia por instância do desired decide teto. Duas instâncias da API,
 * um Redis (que pode cair) e um shadow de verdade (o documento do IoT Core, lido direto quando o Redis não responde).
 */
const T = 'moto-0001';
const T0 = Date.parse('2026-10-24T12:00:00Z');
const tel = (speed: number, at: number) => ({ lat: -23.56, lng: -46.69, velocidade_kmh: speed, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: new Date(at).toISOString() });

function flakyRedis() {
  const redis = new MemoryRedisStore();
  const state = { down: false };
  for (const m of ['get', 'set', 'del', 'exists', 'hset', 'hgetall', 'setNx', 'delIfEquals', 'sadd', 'srem', 'smembers', 'setWithIndex', 'delWithIndex', 'pexpireIfEquals'] as const) {
    const real = (redis[m] as (...a: unknown[]) => Promise<unknown>).bind(redis);
    (redis as unknown as Record<string, unknown>)[m] = (...a: unknown[]) => (state.down ? Promise.reject(new Error('ECONNREFUSED')) : real(...a));
  }
  return { redis, state };
}

/** Shadow compartilhado (o do IoT Core) + a moto: registra tudo que qualquer instância publica e qualquer violação. */
class Shadow {
  desired: DesiredState = {};
  reported: ReportedState = {};
  speed = 25;
  published: Array<{ from: string; d: DesiredState }> = [];
  violations: string[] = [];
  transport(from: string): IotTransport {
    return {
      updateDesired: async (_t, d) => {
        if (d.travada === true && this.speed >= 3) this.violations.push(`travada a ${this.speed}`);
        if (d.limite_kmh !== undefined && d.limite_kmh < 3 && this.speed >= 3 && this.lastLimit() !== 3) this.violations.push(`limite ${d.limite_kmh} a ${this.speed} sem passar pelo 3`);
        this.published.push({ from, d });
        this.desired = { ...this.desired, ...d };
      },
      publishCommand: async () => undefined,
      start: async () => undefined,
      stop: async () => undefined,
      readShadow: async () => ({ desired: { ...this.desired }, reported: { ...this.reported } }),
    };
  }
  lastLimit() {
    const l = this.published.filter((p) => p.d.limite_kmh !== undefined);
    return l.length ? l[l.length - 1].d.limite_kmh : undefined;
  }
  limitsFrom(from: string) {
    return this.published.filter((p) => p.from === from && p.d.limite_kmh !== undefined).map((p) => p.d.limite_kmh);
  }
}

class GW extends BaseIotGateway {}

function cluster() {
  const { redis, state } = flakyRedis();
  const clock = new FakeClock(T0);
  const shadow = new Shadow();
  const make = (name: string) => {
    const live = new LiveStateStore(redis, clock, undefined, 0);
    const gw = new GW(shadow.transport(name), live, clock, new EventEmitter2(), { confirmWaitMs: 10, commandTimeoutMs: 30_000, safeLockStore: new RedisSafeLockStore(redis) });
    return { gw, live };
  };
  return { redis, state, clock, shadow, a: make('a'), b: make('b') };
}

/** A recebe a telemetria (velocidade fresca) e faz uma rampa terminar em 0 (did_not_stop → limite 0 segurado). */
async function rampEndsAtZeroOnA(c: ReturnType<typeof cluster>) {
  await c.a.live.applyTelemetry(T, tel(25, c.clock.now()));
  const p = c.a.gw.lock({ commandId: 'lock-1', thingName: T });
  await c.clock.advance(20);
  await p;
  await c.clock.advance(120_000);
  expect(c.shadow.lastLimit()).toBe(0);
  // O did_not_stop (120 s sem parar) segura o limite em 0 por desenho (hold confirmado); não é o que este arquivo verifica.
  c.shadow.violations = [];
  // Próximo aluguel destravado pela instância B (Redis e shadow em 32, hold solto).
  const u = c.b.gw.unlock({ commandId: 'unlock', thingName: T });
  await c.clock.advance(20);
  await u;
  expect(c.shadow.desired).toMatchObject({ travada: false, limite_kmh: 32 });
}

describe('Teto do limite sem cópia por instância (fix 2)', () => {
  it('SEGURANÇA: rampa terminou em 0 em A, B destravou; lock em A com a moto a 25 km/h começa em 15 (nunca limite 0 andando)', async () => {
    const c = cluster();
    await rampEndsAtZeroOnA(c);
    c.shadow.published = [];
    await c.a.live.applyTelemetry(T, tel(25, c.clock.now()));
    const p = c.a.gw.lock({ commandId: 'lock-2', thingName: T });
    await c.clock.advance(20);
    await p;
    expect(c.shadow.limitsFrom('a')).toEqual([15]);
    expect(c.shadow.violations).toEqual([]);
  });

  it('SEGURANÇA, Redis fora: mesmo cenário — teto pelo documento do shadow (32), hold ilegível não vira 0 → começa em 15', async () => {
    const c = cluster();
    await rampEndsAtZeroOnA(c);
    c.shadow.published = [];
    await c.a.live.applyTelemetry(T, tel(25, c.clock.now()));
    c.state.down = true;
    const p = c.a.gw.lock({ commandId: 'lock-2', thingName: T });
    await c.clock.advance(20);
    await p;
    expect(c.shadow.limitsFrom('a')).toEqual([15]); // rampa local (degradada), primeiro degrau pela velocidade
    expect(c.shadow.violations).toEqual([]);
  });

  it('I1, Redis fora: A publicou 6, B subiu para 32; A aceita a redução para 20 (ciclovia) — teto confirmado pelo shadow', async () => {
    const c = cluster();
    await c.a.live.applyReported(T, { travada: false, limite_kmh: 32 });
    const z1 = c.a.gw.setSpeedLimit({ commandId: 'z6', thingName: T }, 6);
    await c.clock.advance(20);
    await z1;
    const z2 = c.b.gw.setSpeedLimit({ commandId: 'z32', thingName: T }, 32);
    await c.clock.advance(20);
    await z2;
    c.state.down = true;
    const z3 = c.a.gw.setSpeedLimit({ commandId: 'z20', thingName: T }, 20);
    await c.clock.advance(20);
    expect((await z3).status).not.toBe('failed');
    expect(c.shadow.desired.limite_kmh).toBe(20);
  });

  it('I1, Redis fora: depois de rampa em 0 em A e unlock em B, A aceita reduções (não fica preso no teto 0)', async () => {
    const c = cluster();
    await rampEndsAtZeroOnA(c);
    c.state.down = true;
    const z = c.a.gw.setSpeedLimit({ commandId: 'z20', thingName: T }, 20);
    await c.clock.advance(20);
    expect((await z).status).not.toBe('failed');
    expect(c.shadow.desired.limite_kmh).toBe(20);
  });

  it('teto confirmado velho em 0 sem hold (ex.: shadow resetado por fora) → a rampa começa em 3, nunca em 0', async () => {
    const c = cluster();
    await c.redis.set(`iot:desired-limit:${T}`, '0');
    await c.a.live.applyTelemetry(T, tel(25, c.clock.now()));
    const p = c.a.gw.lock({ commandId: 'lock', thingName: T });
    await c.clock.advance(20);
    await p;
    expect(c.shadow.limitsFrom('a')[0]).toBe(3);
    expect(c.shadow.violations).toEqual([]);
  });

  it('rampSteps: começa pela velocidade medida, teto nunca abaixo de 3, só hold confirmado começa em 0', () => {
    expect(rampSteps(25, 32, false)).toEqual([15, 8, 3, 0]);
    expect(rampSteps(null, 32, false)).toEqual([15, 8, 3, 0]);
    expect(rampSteps(5, 32, false)).toEqual([8, 3, 0]);
    expect(rampSteps(3, 32, false)).toEqual([8, 3, 0]);
    expect(rampSteps(25, 6, false)).toEqual([6, 3, 0]);
    expect(rampSteps(25, 0, false)).toEqual([3, 0]);
    expect(rampSteps(25, 0, true)).toEqual([0]);
  });
});

describe('Órfã do índice tratada uma vez só (fix 2, N2)', () => {
  function orphanSetup() {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(T0);
    const shadow = new Shadow();
    const outcomes: unknown[] = [];
    const make = (name: string, store: SafeLockStore = new RedisSafeLockStore(redis)) =>
      new SafeLockService(clock, shadow.transport(name), (o) => outcomes.push(o), { store });
    return { redis, clock, shadow, outcomes, make };
  }

  it('duas varreduras concorrentes → uma reversão e um desfecho failed', async () => {
    const s = orphanSetup();
    const a = s.make('a');
    const b = s.make('b');
    await a.start({ commandId: 'c1', thingName: T }, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await s.redis.del(`iot:safe-lock:${T}`);
    s.shadow.published = [];
    await Promise.all([a.sweep(), b.sweep()]);
    expect(s.shadow.published.filter((p) => p.d.travada === false)).toHaveLength(1);
    expect(s.outcomes).toEqual([{ commandId: 'c1', status: 'failed', reason: 'timeout' }]);
  });

  it('lock novo começa e termina entre o scan e a reversão → nada é desfeito', async () => {
    const s = orphanSetup();
    const real = new RedisSafeLockStore(s.redis);
    const snap: { stale?: Awaited<ReturnType<SafeLockStore['scan']>> } = {};
    const store: SafeLockStore = Object.assign(Object.create(real), { scan: async () => snap.stale ?? real.scan() });
    const a = s.make('a');
    await a.start({ commandId: 'old', thingName: T }, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await s.redis.del(`iot:safe-lock:${T}`);
    snap.stale = await real.scan(); // a varredura de B listou a órfã…
    expect(snap.stale.orphans).toHaveLength(1);
    // …mas antes de ela pegar o lock, um lock novo trava direto (parada) e confirma.
    s.shadow.speed = 0;
    const c = s.make('c');
    await c.start({ commandId: 'new', thingName: T }, { speedKmh: 0, speedLimitKmh: 32, locked: false, online: true });
    await c.onReported(T, { travada: true });
    s.shadow.published = [];
    const b = s.make('b', store);
    await b.sweep();
    expect(s.shadow.published).toEqual([]); // nada de travada:false sobre a moto recém-travada
    expect(s.outcomes).toEqual([{ commandId: 'new', status: 'confirmed' }]);
  });
});

describe('Unlock depois de falha do Redis: zona reavaliada pela posição (fix 2, N3)', () => {
  const PED: ZoneRef = { id: 'ped', type: 'reduced_speed', speedLimitKmh: 6 };
  it('geofence:limit velho (32) no Redis, moto dentro do calçadão → o unlock publica 6', async () => {
    const redis = new MemoryRedisStore();
    const clock = new FakeClock(T0);
    const engine: GeofenceEngine = { containing: async () => [PED], updatePosition: async () => undefined, sync: async () => undefined, syncAll: async () => undefined };
    const geofence = new GeofenceService(
      engine,
      { setSpeedLimit: async () => undefined, safeLock: async () => undefined },
      { openRentalId: async () => 'r1', trackingRentalId: async () => 'r1', invalidate: () => undefined },
      new EventEmitter2(),
      clock,
      redis,
      { outOfAreaLockMinutes: 5 },
    );
    await redis.set(`geofence:limit:${T}`, '32'); // escrita perdida durante a queda: valor de antes
    expect(await geofence.effectiveLimit(T)).toBe(32);
    const shadow = new Shadow();
    const live = new LiveStateStore(redis, clock);
    const gw = new GW(shadow.transport('a'), live, clock, new EventEmitter2(), { confirmWaitMs: 10, commandTimeoutMs: 30_000 });
    gw.setLimitResolver((t, pos) => geofence.verifiedLimit(t, pos));
    await live.applyTelemetry(T, tel(0, clock.now()));
    const u = gw.unlock({ commandId: 'u', thingName: T });
    await clock.advance(20);
    await u;
    expect(shadow.desired).toMatchObject({ travada: false, limite_kmh: 6 });
  });
});
