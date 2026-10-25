import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, GeofenceTransitionEvent } from '../../../common/events';
import { MemoryRedisStore } from '../../../redis/redis-store';
import { FakeClock } from '../clock';
import type { GeofenceEngine, ZoneRef } from './geofence-engine';
import { GeofenceCommander, GeofenceService, RentalLookup } from './geofence.service';

/** Lacunas T5: duas instâncias da API com o mesmo Redis processando posições da mesma moto. */
const OPERATION: ZoneRef = { id: 'z-op', type: 'operation', speedLimitKmh: null };
const PEDESTRIAN: ZoneRef = { id: 'z-ped', type: 'reduced_speed', speedLimitKmh: 6 };
const T0 = Date.parse('2026-10-24T12:00:00Z');
const V = { vehicleId: 'veh-1', thingName: 'moto-0001' };
const pos = () => ({ ...V, lat: -23.56, lng: -46.69, ts: new Date(T0).toISOString() });

class Engine implements GeofenceEngine {
  zones: ZoneRef[] = [];
  async containing() {
    return this.zones;
  }
  async updatePosition() {}
  async sync() {}
  async syncAll() {}
}

function cluster() {
  const redis = new MemoryRedisStore();
  const engine = new Engine(); // mesma geometria (PostGIS/Amazon Location) para as duas
  const events = new EventEmitter2();
  const transitions: GeofenceTransitionEvent[] = [];
  events.on(EV.GEOFENCE_TRANSITION, (e: GeofenceTransitionEvent) => transitions.push(e));
  const commander: jest.Mocked<GeofenceCommander> = { setSpeedLimit: jest.fn().mockResolvedValue(undefined), safeLock: jest.fn().mockResolvedValue(undefined) };
  const rentals: jest.Mocked<RentalLookup> = { openRentalId: jest.fn().mockResolvedValue('rent-1'), trackingRentalId: jest.fn().mockResolvedValue('rent-1'), invalidate: jest.fn() };
  const make = (clock = new FakeClock(T0)) => ({ clock, svc: new GeofenceService(engine, commander, rentals, events, clock, redis, { outOfAreaLockMinutes: 5 }) });
  return { redis, engine, transitions, commander, rentals, make };
}

describe('GeofenceService com várias instâncias (estado e prazos no Redis)', () => {
  it('posições alternando entre instâncias: uma transição e um comando de limite só, e o limite em vigor visto por todas', async () => {
    const c = cluster();
    const a = c.make();
    const b = c.make();
    c.engine.zones = [OPERATION];
    await a.svc.onPosition(pos());
    c.engine.zones = [OPERATION, PEDESTRIAN];
    await a.svc.onPosition(pos());
    await b.svc.onPosition(pos());
    await a.svc.onPosition(pos());
    expect(c.transitions.filter((t) => t.zoneId === 'z-ped')).toHaveLength(1);
    expect(c.commander.setSpeedLimit).toHaveBeenCalledTimes(1);
    expect(c.commander.setSpeedLimit).toHaveBeenCalledWith('veh-1', 6, expect.anything());
    // Unlock/teto manual processado em B usa o limite da zona (6), não 32.
    expect(await b.svc.effectiveLimit('moto-0001')).toBe(6);
    // Saída processada em B: EXIT uma vez e volta a 32.
    c.engine.zones = [OPERATION];
    await b.svc.onPosition(pos());
    await a.svc.onPosition(pos());
    expect(c.transitions.filter((t) => t.zoneId === 'z-ped' && t.transition === 'EXIT')).toHaveLength(1);
    expect(c.commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 32, expect.anything());
    expect(await a.svc.effectiveLimit('moto-0001')).toBe(32);
  });

  it('fora da área armado em A; a volta para a área é processada em B → o timer de A não bloqueia', async () => {
    const c = cluster();
    const clock = new FakeClock(T0);
    const a = c.make(clock);
    const b = c.make(clock);
    c.engine.zones = [OPERATION];
    await a.svc.onPosition(pos());
    c.engine.zones = [];
    await a.svc.onPosition(pos()); // arma em A
    await clock.advance(2 * 60_000);
    c.engine.zones = [OPERATION];
    await b.svc.onPosition(pos()); // voltou (B)
    await clock.advance(10 * 60_000);
    await a.svc.sweepOutOfArea();
    await b.svc.sweepOutOfArea();
    expect(c.commander.safeLock).not.toHaveBeenCalled();
  });

  it('saiu de novo depois de voltar (posições em instâncias diferentes): prazo novo de 5 min, não o antigo', async () => {
    const c = cluster();
    const clock = new FakeClock(T0);
    const a = c.make(clock);
    const b = c.make(clock);
    c.engine.zones = [];
    await a.svc.onPosition(pos()); // fora (A): prazo T0+5min
    await clock.advance(3 * 60_000);
    c.engine.zones = [OPERATION];
    await b.svc.onPosition(pos()); // voltou (B)
    c.engine.zones = [];
    await b.svc.onPosition(pos()); // saiu de novo (B) em T0+3min → prazo T0+8min
    await clock.advance(4 * 60_000); // T0+7min
    expect(c.commander.safeLock).not.toHaveBeenCalled();
    await clock.advance(60_000); // T0+8min
    expect(c.commander.safeLock).toHaveBeenCalledTimes(1);
  });

  it('deploy: a instância que armou morre; a varredura de outra cumpre o prazo uma vez só (a chave do prazo é consumida)', async () => {
    const c = cluster();
    const a = c.make(new FakeClock(T0));
    c.engine.zones = [];
    await a.svc.onPosition(pos()); // arma; A morre (relógio parado, timer perdido)
    const b = c.make(new FakeClock(T0 + 5 * 60_000));
    const d = c.make(new FakeClock(T0 + 5 * 60_000));
    await Promise.all([b.svc.sweepOutOfArea(), d.svc.sweepOutOfArea()]);
    await b.svc.sweepOutOfArea();
    expect(c.commander.safeLock).toHaveBeenCalledTimes(1);
    expect(c.commander.safeLock).toHaveBeenCalledWith('veh-1', expect.objectContaining({ rentalId: 'rent-1', purpose: 'out_of_area' }));
    expect(await c.redis.smembers('geofence:out-of-area:index')).toEqual([]);
  });

  it('aluguel encerrado processado em outra instância desarma o prazo de A', async () => {
    const c = cluster();
    const clock = new FakeClock(T0);
    const a = c.make(clock);
    const b = c.make(clock);
    c.engine.zones = [];
    await a.svc.onPosition(pos());
    await b.svc.onRentalEnded('veh-1');
    await clock.advance(10 * 60_000);
    await b.svc.sweepOutOfArea();
    expect(c.commander.safeLock).not.toHaveBeenCalled();
  });
});
