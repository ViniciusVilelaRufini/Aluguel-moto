import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import type { GeofenceEngine, ZoneRef } from './geofence/geofence-engine';
import { GeofenceService, type GeofenceCommander, type RentalLookup } from './geofence/geofence.service';
import { LiveStateStore } from './live-state.store';
import { RedisSafeLockStore } from './safe-lock.store';
import type { DesiredState, IotTransport } from './shadow-transport';
import { TelemetryService } from './telemetry.service';

/**
 * Lacunas T5 — fix 1 (revisão I1): com o Redis fora do ar, falhar fechado vale para **subir** limite ou travar sem estado;
 * para **reduzir** seria falhar aberto. Os limites de zona (6/20) continuam sendo aplicados, como antes da T5.
 */
const T = 'moto-0001';
const T0 = Date.parse('2026-10-24T12:00:00Z');
const OPERATION: ZoneRef = { id: 'z-op', type: 'operation', speedLimitKmh: null };
const PEDESTRIAN: ZoneRef = { id: 'z-ped', type: 'reduced_speed', speedLimitKmh: 6 };
const tel = (speed: number, at: number) => ({ lat: -23.56, lng: -46.69, velocidade_kmh: speed, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: new Date(at).toISOString() });

/** "Redis" que pode cair: toda operação rejeita enquanto `down`. */
function flakyRedis() {
  const redis = new MemoryRedisStore();
  const state = { down: false };
  for (const m of ['get', 'set', 'del', 'exists', 'hset', 'hgetall', 'setNx', 'delIfEquals', 'sadd', 'srem', 'smembers', 'setWithIndex', 'delWithIndex', 'pexpireIfEquals'] as const) {
    const real = (redis[m] as (...a: unknown[]) => Promise<unknown>).bind(redis);
    (redis as unknown as Record<string, unknown>)[m] = (...a: unknown[]) => (state.down ? Promise.reject(new Error('ECONNREFUSED')) : real(...a));
  }
  return { redis, state };
}

class FakeTransport implements IotTransport {
  desired: DesiredState[] = [];
  speed = 25;
  violations: number[] = [];
  async updateDesired(_t: string, d: DesiredState) {
    if (d.travada === true && this.speed >= 3) this.violations.push(this.speed);
    this.desired.push(d);
  }
  async publishCommand() {}
  async start() {}
  async stop() {}
  limits() {
    return this.desired.filter((d) => d.limite_kmh !== undefined).map((d) => d.limite_kmh);
  }
}
class GW extends BaseIotGateway {}

describe('Redis fora do ar: limites de zona continuam valendo (fix 1, I1)', () => {
  it('telemetria: erro da rampa compartilhada não aborta o trajeto nem a avaliação das cercas', async () => {
    const { redis, state } = flakyRedis();
    const clock = new FakeClock(T0);
    const live = new LiveStateStore(redis, clock, undefined, 0);
    const gw = new GW(new FakeTransport(), live, clock, new EventEmitter2(), { confirmWaitMs: 10, commandTimeoutMs: 30_000, safeLockStore: new RedisSafeLockStore(redis) });
    const geofence = { onPosition: jest.fn().mockResolvedValue(undefined) };
    const trackPoint = { create: jest.fn().mockResolvedValue({}) };
    const svc = new TelemetryService(
      gw,
      geofence,
      { openRentalId: async () => 'r1', trackingRentalId: async () => 'r1', invalidate: () => undefined },
      { vehicle: { findUnique: async () => ({ id: 'v1' }) }, trackPoint } as never,
      new EventEmitter2(),
      clock,
      { trackRetentionDays: 90 },
    );
    await svc.telemetry(T, tel(12, clock.now())); // abre a conexão
    await clock.advance(5_000);
    state.down = true;
    const onSpeed = jest.spyOn(gw, 'onSpeed');
    await svc.telemetry(T, tel(12, clock.now()));
    expect(onSpeed).toHaveBeenCalled();
    await expect(onSpeed.mock.results[0].value).rejects.toThrow(/ECONNREFUSED/);
    expect(geofence.onPosition).toHaveBeenCalledTimes(2); // a cerca viu a posição mesmo com a rampa falhando
    expect(trackPoint.create).toHaveBeenCalledTimes(2);
  });

  it('cercas: lock da moto indisponível → avalia com o estado local e manda o limite 6 ao entrar no calçadão', async () => {
    const { redis, state } = flakyRedis();
    const engine: GeofenceEngine = { containing: jest.fn(), updatePosition: async () => undefined, sync: async () => undefined, syncAll: async () => undefined };
    const commander: jest.Mocked<GeofenceCommander> = { setSpeedLimit: jest.fn().mockResolvedValue(undefined), safeLock: jest.fn().mockResolvedValue(undefined) };
    const rentals: RentalLookup = { openRentalId: async () => 'r1', trackingRentalId: async () => 'r1', invalidate: () => undefined };
    const svc = new GeofenceService(engine, commander, rentals, new EventEmitter2(), new FakeClock(T0), redis, { outOfAreaLockMinutes: 5 });
    const pos = { vehicleId: 'v1', thingName: T, lat: -23.56, lng: -46.69, ts: new Date(T0).toISOString() };
    (engine.containing as jest.Mock).mockResolvedValue([OPERATION]);
    await svc.onPosition(pos);
    state.down = true;
    (engine.containing as jest.Mock).mockResolvedValue([OPERATION, PEDESTRIAN]);
    await svc.onPosition(pos);
    expect(commander.setSpeedLimit).toHaveBeenLastCalledWith('v1', 6, expect.objectContaining({ purpose: 'zone_speed_limit' }));
    expect(await svc.effectiveLimit(T)).toBe(6); // teto do unlock/manual pela cópia local
  });

  it('gateway: estado compartilhado ilegível → redução de limite passa e é publicada; subida acima do teto conhecido é recusada', async () => {
    const { redis, state } = flakyRedis();
    const clock = new FakeClock(T0);
    const transport = new FakeTransport();
    const live = new LiveStateStore(redis, clock);
    const gw = new GW(transport, live, clock, new EventEmitter2(), { confirmWaitMs: 10, commandTimeoutMs: 30_000, safeLockStore: new RedisSafeLockStore(redis) });
    await live.applyReported(T, { travada: false, limite_kmh: 20 });
    state.down = true;
    const red = gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 6);
    await clock.advance(20);
    expect((await red).status).not.toBe('failed');
    expect(transport.desired).toEqual([{ limite_kmh: 6 }]);
    expect((await gw.setSpeedLimit({ commandId: 'c2', thingName: T }, 32)).status).toBe('failed');
    expect(transport.desired).toEqual([{ limite_kmh: 6 }]);
  });

  it('gateway: lock com o Redis fora reduz a potência pela rampa local e só trava abaixo de 3 km/h', async () => {
    const { redis, state } = flakyRedis();
    const clock = new FakeClock(T0);
    const transport = new FakeTransport();
    const live = new LiveStateStore(redis, clock, undefined, 0);
    const gw = new GW(transport, live, clock, new EventEmitter2(), { confirmWaitMs: 10, commandTimeoutMs: 30_000, safeLockStore: new RedisSafeLockStore(redis) });
    await live.applyTelemetry(T, tel(25, clock.now()));
    state.down = true;
    const p = gw.lock({ commandId: 'lock', thingName: T });
    await clock.advance(20);
    expect((await p).status).toBe('in_progress');
    expect(transport.limits()).toEqual([15]);
    expect(transport.desired.some((d) => d.travada === true)).toBe(false);
    transport.speed = 1;
    await gw.onSpeed(T, 1).catch(() => undefined); // a rampa compartilhada falha; a local trava
    expect(transport.desired.some((d) => d.travada === true)).toBe(true);
    expect(transport.violations).toEqual([]);
  });
});
