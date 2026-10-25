import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CommandOutcome } from '../../ports/iot-gateway.port';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { LiveStateStore } from './live-state.store';
import { SafeLockService, type SafeLockVehicleState } from './safe-lock.service';
import { RedisSafeLockStore } from './safe-lock.store';
import type { DesiredState, ShadowTransport } from './shadow-transport';

/**
 * Lacunas T5: o estado da rampa no Redis (aqui `MemoryRedisStore`, mesma serialização JSON) compartilhado por duas instâncias.
 * Invariante físico em todos os cenários: `travada: true` só é publicado com a última velocidade reportada < 3 km/h.
 */
const T = 'moto-0001';
const T0 = Date.parse('2026-10-24T12:00:00Z');

/** Moto simulada: guarda a velocidade real e detecta qualquer violação do invariante, de qualquer instância. */
class Bike {
  speed = 25;
  readonly desired: Array<{ from: string; d: DesiredState }> = [];
  readonly violations: number[] = [];
  transport(from: string): ShadowTransport {
    return {
      updateDesired: async (_t, d) => {
        if (d.travada === true && this.speed >= 3) this.violations.push(this.speed);
        this.desired.push({ from, d });
      },
      publishCommand: async () => undefined,
    };
  }
  limits() {
    return this.desired.filter((x) => x.d.limite_kmh !== undefined).map((x) => x.d.limite_kmh);
  }
  locked() {
    return this.desired.some((x) => x.d.travada === true);
  }
}

function instance(name: string, redis: MemoryRedisStore, bike: Bike, clock = new FakeClock(T0), probe?: (t: string) => Promise<SafeLockVehicleState | null>) {
  const outcomes: CommandOutcome[] = [];
  const held: string[] = [];
  const store = new RedisSafeLockStore(redis);
  const svc = new SafeLockService(clock, bike.transport(name), (o) => outcomes.push(o), { store, probe, onHeld: (t) => held.push(t) });
  return { svc, clock, outcomes, store, held };
}

const moving = (speedKmh: number | null): SafeLockVehicleState => ({ speedKmh, speedLimitKmh: 32, locked: false, online: true });

describe('Bloqueio seguro com estado compartilhado (várias instâncias)', () => {
  it('rampa começada na instância A avança e trava com a telemetria processada pela instância B', async () => {
    const redis = new MemoryRedisStore();
    const bike = new Bike();
    const clock = new FakeClock(T0);
    const a = instance('a', redis, bike, clock);
    const b = instance('b', redis, bike, clock);

    await a.svc.start({ commandId: 'cmd-1', thingName: T }, moving(25));
    expect(bike.limits()).toEqual([15]);
    expect(await b.svc.isActiveAnywhere(T)).toBe(true);

    // O ack do degrau chega na instância B: o próximo degrau sai 2 s depois, publicado por B.
    bike.speed = 18;
    await b.svc.onReported(T, { limite_kmh: 15, velocidade_kmh: 18 });
    await clock.advance(2_000);
    expect(bike.desired.map((x) => [x.from, x.d.limite_kmh])).toEqual([
      ['a', 15],
      ['b', 8],
    ]);

    // Ainda andando: B não trava.
    bike.speed = 9;
    await b.svc.onSpeed(T, 9);
    expect(bike.locked()).toBe(false);

    // Parou (< 3) — telemetria processada em B: trava; a confirmação chega em A e encerra o comando.
    bike.speed = 1;
    await b.svc.onSpeed(T, 1);
    expect(bike.locked()).toBe(true);
    await a.svc.onReported(T, { travada: true });
    expect([...a.outcomes, ...b.outcomes]).toEqual([{ commandId: 'cmd-1', status: 'confirmed' }]);
    expect(await a.svc.isActiveAnywhere(T)).toBe(false);
    expect(bike.violations).toEqual([]);
  });

  it('deploy no meio da rampa: a instância nova continua pela varredura (degrau vencido e prazo de 120 s)', async () => {
    const redis = new MemoryRedisStore();
    const bike = new Bike();
    const a = instance('a', redis, bike, new FakeClock(T0));
    await a.svc.start({ commandId: 'cmd-1', thingName: T }, moving(25));
    await a.svc.onReported(T, { limite_kmh: 15 });
    // A morre (o relógio dela nunca mais anda: timers perdidos). B sobe 5 s depois.
    const b = instance('b', redis, bike, new FakeClock(T0 + 5_000));
    await b.svc.sweep();
    expect(bike.limits()).toEqual([15, 8]); // degrau vencido cumprido por B
    expect(b.svc.isActive(T)).toBe(true); // B passou a acompanhar a rampa
    // Moto não para: prazo de 120 s desde o início (T0) → did_not_stop; fix 3: segue no degrau publicado (nunca 0 de uma vez).
    await b.clock.advance(114_999);
    await b.svc.sweep();
    expect(b.outcomes).toEqual([]);
    await b.clock.advance(1);
    await b.svc.sweep();
    expect(b.outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'did_not_stop' }]);
    expect(bike.limits()).toEqual([15, 8]);
    expect(bike.locked()).toBe(false);
  });

  it('falha segura: estado perdido no Redis → nunca trava sem estado; a varredura acha a órfã e retoma a rampa gradual (sem limite 0 de uma vez), hold e failed', async () => {
    const redis = new MemoryRedisStore();
    const bike = new Bike();
    const clock = new FakeClock(T0);
    const a = instance('a', redis, bike, clock);
    const b = instance('b', redis, bike, clock);
    await a.svc.start({ commandId: 'cmd-1', thingName: T }, moving(25));
    await redis.del('iot:safe-lock:moto-0001'); // expulsão/failover: o estado some, o índice (hash) fica
    bike.speed = 0;
    await b.svc.onSpeed(T, 0);
    await b.svc.onReported(T, { limite_kmh: 15, velocidade_kmh: 0 });
    expect(bike.locked()).toBe(false); // sem estado, nada de travada
    await b.svc.sweep();
    await a.svc.sweep();
    await clock.advance(130_000);
    expect(bike.locked()).toBe(false);
    expect(bike.limits()).toEqual([15, 8]); // retomada a partir do 15 que a rampa perdida impunha; nunca 0
    expect(b.held).toEqual([T]);
    expect([...a.outcomes, ...b.outcomes]).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'timeout' }]);
    const index = await redis.hgetall('iot:safe-lock:index');
    expect(Object.keys(index)).toEqual([T]); // a rampa retomada (outro rampId) — a órfã foi tratada uma vez só
    // Velocidade fresca < 3 → a rampa retomada trava.
    await b.svc.onSpeed(T, 0);
    expect(bike.locked()).toBe(true);
    expect(bike.violations).toEqual([]);
  });

  it('órfã na fase locking (travada:true publicado, estado perdido) sem velocidade fresca → travada:false e rampa gradual (nunca limite 0 de uma vez)', async () => {
    const redis = new MemoryRedisStore();
    const bike = new Bike();
    const clock = new FakeClock(T0);
    const a = instance('a', redis, bike, clock);
    bike.speed = 0;
    await a.svc.start({ commandId: 'cmd-1', thingName: T }, moving(0));
    expect(bike.locked()).toBe(true);
    await redis.del('iot:safe-lock:moto-0001');
    const b = instance('b', redis, bike, new FakeClock(T0 + 5_000));
    await b.svc.sweep();
    expect(bike.desired.slice(-2).map((x) => x.d)).toEqual([{ travada: false }, { limite_kmh: 15 }]);
    expect(b.outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'timeout' }]);
  });

  it('estado da rampa gravado sem TTL (não é expulso por volatile-*)', async () => {
    const redis = new MemoryRedisStore();
    const setSpy = jest.spyOn(redis, 'set');
    const a = instance('a', redis, new Bike());
    await a.svc.start({ commandId: 'cmd-1', thingName: T }, moving(25));
    for (const call of setSpy.mock.calls.filter((c) => c[0] === 'iot:safe-lock:moto-0001')) expect(call[2]).toBeUndefined();
  });

  it('falha segura: Redis fora do ar → a telemetria não trava (erro propaga, nada publicado)', async () => {
    const redis = new MemoryRedisStore();
    const bike = new Bike();
    const clock = new FakeClock(T0);
    const a = instance('a', redis, bike, clock);
    const b = instance('b', redis, bike, clock);
    await a.svc.start({ commandId: 'cmd-1', thingName: T }, moving(25));
    jest.spyOn(redis, 'get').mockRejectedValue(new Error('ECONNREFUSED'));
    bike.speed = 0;
    await expect(b.svc.onSpeed(T, 0)).rejects.toThrow(/ECONNREFUSED/);
    await expect(b.svc.isActiveAnywhere(T)).rejects.toThrow(); // o gateway recusa mudar o limite (falha fechada)
    expect(bike.locked()).toBe(false);
  });

  it('rampa pendente (moto offline em A) começa pela varredura de B quando o estado relido mostra a moto online', async () => {
    const redis = new MemoryRedisStore();
    const bike = new Bike();
    const clock = new FakeClock(T0);
    const a = instance('a', redis, bike, clock);
    let online = false;
    const b = instance('b', redis, bike, clock, async () => ({ speedKmh: null, speedLimitKmh: 32, locked: false, online }));
    const res = await a.svc.start({ commandId: 'cmd-1', thingName: T }, { speedKmh: 20, speedLimitKmh: 32, locked: false, online: false });
    expect(res).toEqual({ commandId: 'cmd-1', status: 'pending', reason: 'offline' });
    await b.svc.sweep();
    expect(bike.desired).toEqual([]);
    online = true; // outra instância viu a reconexão
    await b.svc.sweep();
    expect(bike.limits()).toEqual([15]); // velocidade desconhecida = em movimento: rampa, nunca trava direto
    expect(bike.locked()).toBe(false);
  });

  it('segundo lock em outra instância entra na mesma rampa e recebe o mesmo desfecho', async () => {
    const redis = new MemoryRedisStore();
    const bike = new Bike();
    const clock = new FakeClock(T0);
    const a = instance('a', redis, bike, clock);
    const b = instance('b', redis, bike, clock);
    await a.svc.start({ commandId: 'cmd-1', thingName: T }, moving(25));
    const second = await b.svc.start({ commandId: 'cmd-2', thingName: T }, moving(25));
    expect(second.status).toBe('in_progress');
    expect(bike.limits()).toEqual([15]);
    bike.speed = 0;
    await a.svc.onSpeed(T, 0);
    await b.svc.onReported(T, { travada: true });
    expect(b.outcomes).toEqual([
      { commandId: 'cmd-1', status: 'confirmed' },
      { commandId: 'cmd-2', status: 'confirmed' },
    ]);
    expect(bike.violations).toEqual([]);
  });

  it('unlock (cancel) processado em B encerra a rampa de A: timers de A não publicam mais degraus', async () => {
    const redis = new MemoryRedisStore();
    const bike = new Bike();
    const clock = new FakeClock(T0);
    const a = instance('a', redis, bike, clock);
    const b = instance('b', redis, bike, clock);
    await a.svc.start({ commandId: 'cmd-1', thingName: T }, moving(25));
    await a.svc.onReported(T, { limite_kmh: 15 }); // A agenda o degrau 8
    await b.svc.cancel(T);
    await clock.advance(200_000);
    expect(bike.limits()).toEqual([15]);
    expect(b.outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed' }]);
    expect(a.outcomes).toEqual([]);
  });

  it('gateway: limite de zona (6) publicado pela instância A é o teto da rampa de um lock pedido na instância B (nunca sobe para 15)', async () => {
    class GW extends BaseIotGateway {}
    const redis = new MemoryRedisStore();
    const bike = new Bike();
    const clock = new FakeClock(T0);
    const shadow = () => ({ ...bike.transport('x'), start: async () => undefined, stop: async () => undefined });
    const opts = { confirmWaitMs: 10, commandTimeoutMs: 30_000, safeLockStore: new RedisSafeLockStore(redis) };
    const gwA = new GW(shadow(), new LiveStateStore(redis, clock), clock, new EventEmitter2(), opts);
    const gwB = new GW(shadow(), new LiveStateStore(redis, clock), clock, new EventEmitter2(), { ...opts, safeLockStore: new RedisSafeLockStore(redis) });
    await gwA.live.setOnline(T, true);
    const zone = gwA.setSpeedLimit({ commandId: 'zona', thingName: T }, 6);
    await clock.advance(20);
    await zone;
    await gwB.live.applyReported(T, { travada: false }); // destravada, online (reported via MQTT)
    const lock = gwB.lock({ commandId: 'lock', thingName: T });
    await clock.advance(20);
    await lock;
    expect(bike.limits()).toEqual([6, 6]); // o desired da zona e o 1º degrau da rampa
    expect(bike.locked()).toBe(false);
  });
});
