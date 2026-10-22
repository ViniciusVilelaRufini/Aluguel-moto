import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, GeofenceTransitionEvent } from '../../../common/events';
import { MemoryRedisStore } from '../../../redis/redis-store';
import { FakeClock } from '../clock';
import type { GeofenceEngine, ZoneRef } from './geofence-engine';
import { GeofenceCommander, GeofenceService, RentalLookup } from './geofence.service';

const OPERATION: ZoneRef = { id: 'z-op', type: 'operation', speedLimitKmh: null };
const PEDESTRIAN: ZoneRef = { id: 'z-ped', type: 'reduced_speed', speedLimitKmh: 6 };
const OPERATION_B: ZoneRef = { id: 'z-op-b', type: 'operation', speedLimitKmh: null };
const BIKE_LANE: ZoneRef = { id: 'z-bike', type: 'reduced_speed', speedLimitKmh: 20 };

class FakeEngine implements GeofenceEngine {
  zones: ZoneRef[] = [];
  synced: unknown[] = [];
  positions: unknown[] = [];
  async containing() {
    return this.zones;
  }
  async updatePosition(thingName: string, lat: number, lng: number) {
    this.positions.push({ thingName, lat, lng });
  }
  async sync(ev: unknown) {
    this.synced.push(ev);
  }
  async syncAll() {}
}

const V = { vehicleId: 'veh-1', thingName: 'moto-0001' };
const pos = (ts = '2026-10-21T15:00:00.000Z') => ({ ...V, lat: -23.56, lng: -46.69, ts });

function setup(opts: { rentalId?: string | null } = {}) {
  const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
  const engine = new FakeEngine();
  const events = new EventEmitter2();
  const transitions: GeofenceTransitionEvent[] = [];
  events.on(EV.GEOFENCE_TRANSITION, (e: GeofenceTransitionEvent) => transitions.push(e));
  const commander: jest.Mocked<GeofenceCommander> = { setSpeedLimit: jest.fn().mockResolvedValue(undefined), safeLock: jest.fn().mockResolvedValue(undefined) };
  const rentalId = opts.rentalId === undefined ? 'rent-1' : opts.rentalId;
  const rentals: jest.Mocked<RentalLookup> = { openRentalId: jest.fn().mockResolvedValue(rentalId ?? undefined), invalidate: jest.fn() };
  const svc = new GeofenceService(engine, commander, rentals, events, clock, new MemoryRedisStore(), { outOfAreaLockMinutes: 5 });
  return { clock, engine, events, transitions, commander, rentals, svc };
}

describe('GeofenceService', () => {
  it('ENTER em reduced_speed de 6 → geofence.transition e setSpeedLimit(6)', async () => {
    const { svc, engine, transitions, commander } = setup();
    engine.zones = [OPERATION];
    await svc.onPosition(pos());
    commander.setSpeedLimit.mockClear();
    engine.zones = [OPERATION, PEDESTRIAN];
    await svc.onPosition(pos('2026-10-21T15:00:05.000Z'));
    expect(transitions[transitions.length - 1]).toEqual({
      vehicleId: 'veh-1', rentalId: 'rent-1', zoneId: 'z-ped', zoneType: 'reduced_speed', speedLimitKmh: 6, transition: 'ENTER', ts: '2026-10-21T15:00:05.000Z',
    });
    expect(commander.setSpeedLimit).toHaveBeenCalledWith('veh-1', 6, expect.objectContaining({ rentalId: 'rent-1' }));
  });

  it('EXIT de reduced_speed → volta para 32', async () => {
    const { svc, engine, commander } = setup();
    engine.zones = [OPERATION, PEDESTRIAN];
    await svc.onPosition(pos());
    engine.zones = [OPERATION];
    await svc.onPosition(pos());
    expect(commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 32, expect.anything());
  });

  it('EXIT de uma zona com outra ainda contendo a moto → limite da zona restante (menor entre elas)', async () => {
    const { svc, engine, commander } = setup();
    engine.zones = [OPERATION, BIKE_LANE, PEDESTRIAN];
    await svc.onPosition(pos());
    expect(commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 6, expect.anything());
    engine.zones = [OPERATION, BIKE_LANE];
    await svc.onPosition(pos());
    expect(commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 20, expect.anything());
    expect(svc.effectiveLimit('moto-0001')).toBe(20);
  });

  it('sem mudança de zona não reenviar limite', async () => {
    const { svc, engine, commander } = setup();
    engine.zones = [OPERATION, PEDESTRIAN];
    await svc.onPosition(pos());
    await svc.onPosition(pos());
    await svc.onPosition(pos());
    expect(commander.setSpeedLimit).toHaveBeenCalledTimes(1);
  });

  it('EXIT de operation com aluguel → transição imediata e bloqueio seguro após 5 min', async () => {
    const { svc, engine, clock, transitions, commander } = setup();
    engine.zones = [OPERATION];
    await svc.onPosition(pos());
    engine.zones = [];
    await svc.onPosition(pos());
    expect(transitions[transitions.length - 1]).toEqual(expect.objectContaining({ zoneId: 'z-op', zoneType: 'operation', transition: 'EXIT', rentalId: 'rent-1' }));
    await clock.advance(4 * 60_000 + 59_999);
    expect(commander.safeLock).not.toHaveBeenCalled();
    await clock.advance(1);
    expect(commander.safeLock).toHaveBeenCalledWith('veh-1', expect.objectContaining({ rentalId: 'rent-1', purpose: 'out_of_area' }));
  });

  it('volta para a área antes de 5 min → bloqueio cancelado', async () => {
    const { svc, engine, clock, commander } = setup();
    engine.zones = [OPERATION];
    await svc.onPosition(pos());
    engine.zones = [];
    await svc.onPosition(pos());
    await clock.advance(3 * 60_000);
    engine.zones = [OPERATION];
    await svc.onPosition(pos());
    await clock.advance(10 * 60_000);
    expect(commander.safeLock).not.toHaveBeenCalled();
  });

  it('aluguel encerrado antes dos 5 min → não bloqueia', async () => {
    const { svc, engine, clock, commander, rentals } = setup();
    engine.zones = [OPERATION];
    await svc.onPosition(pos());
    engine.zones = [];
    await svc.onPosition(pos());
    rentals.openRentalId.mockResolvedValue(undefined);
    await clock.advance(5 * 60_000);
    expect(commander.safeLock).not.toHaveBeenCalled();
  });

  it('EXIT de operation sem aluguel → transição sem rentalId e sem bloqueio', async () => {
    const { svc, engine, clock, transitions, commander } = setup({ rentalId: null });
    engine.zones = [OPERATION];
    await svc.onPosition(pos());
    engine.zones = [];
    await svc.onPosition(pos());
    expect(transitions[transitions.length - 1]).toEqual(expect.objectContaining({ zoneType: 'operation', transition: 'EXIT' }));
    expect(transitions[transitions.length - 1].rentalId).toBeUndefined();
    await clock.advance(10 * 60_000);
    expect(commander.safeLock).not.toHaveBeenCalled();
  });

  it('estado das zonas persiste (reinício não reemite ENTER)', async () => {
    const redis = new MemoryRedisStore();
    const a = setup();
    const svcA = new GeofenceService(a.engine, a.commander, a.rentals, a.events, a.clock, redis, { outOfAreaLockMinutes: 5 });
    a.engine.zones = [OPERATION];
    await svcA.onPosition(pos());
    const before = a.transitions.length;
    const svcB = new GeofenceService(a.engine, a.commander, a.rentals, a.events, a.clock, redis, { outOfAreaLockMinutes: 5 });
    await svcB.onPosition(pos());
    expect(a.transitions.length).toBe(before);
  });

  it('zone.changed → engine.sync', async () => {
    const { svc, engine } = setup();
    await svc.onZoneChanged({ zoneId: 'z-ped', action: 'updated' });
    expect(engine.synced).toEqual([{ zoneId: 'z-ped', action: 'updated' }]);
  });

  describe('QA-03: limite da cerca editado com a moto dentro', () => {
    const BIKE_AS_PED: ZoneRef = { id: 'z-bike', type: 'reduced_speed', speedLimitKmh: 6 };
    const parked = [{ vehicleId: 'veh-1', thingName: 'moto-0001', lat: -23.56, lng: -46.69 }];

    it('mesma zona com limite novo (20 → 6) → a próxima posição reenvia 6', async () => {
      const { svc, engine, commander } = setup();
      engine.zones = [OPERATION, BIKE_LANE];
      await svc.onPosition(pos());
      expect(commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 20, expect.anything());
      engine.zones = [OPERATION, BIKE_AS_PED];
      await svc.onPosition(pos('2026-10-21T15:00:05.000Z'));
      expect(commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 6, expect.objectContaining({ purpose: 'zone_speed_limit' }));
      expect(svc.effectiveLimit('moto-0001')).toBe(6);
      await svc.onPosition(pos('2026-10-21T15:00:10.000Z'));
      expect(commander.setSpeedLimit).toHaveBeenCalledTimes(2);
    });

    it('zone.changed reavalia na hora as motos dentro da zona (sem esperar posição nova)', async () => {
      const a = setup();
      const positions = { vehiclesInZone: jest.fn().mockResolvedValue(parked) };
      const svc = new GeofenceService(a.engine, a.commander, a.rentals, a.events, a.clock, new MemoryRedisStore(), { outOfAreaLockMinutes: 5 }, positions);
      a.engine.zones = [OPERATION, BIKE_LANE];
      await svc.onPosition(pos());
      a.engine.zones = [OPERATION, BIKE_AS_PED];
      await svc.onZoneChanged({ zoneId: 'z-bike', action: 'updated', type: 'reduced_speed', speedLimitKmh: 6, active: true });
      expect(positions.vehiclesInZone).toHaveBeenCalledWith('z-bike');
      expect(a.commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 6, expect.objectContaining({ purpose: 'zone_speed_limit' }));
      expect(svc.effectiveLimit('moto-0001')).toBe(6);
    });

    it('zone.changed também reavalia motos que o processo já viu dentro da zona (geometria encolheu → volta a 32)', async () => {
      const a = setup();
      const positions = { vehiclesInZone: jest.fn().mockResolvedValue([]) };
      const svc = new GeofenceService(a.engine, a.commander, a.rentals, a.events, a.clock, new MemoryRedisStore(), { outOfAreaLockMinutes: 5 }, positions);
      a.engine.zones = [OPERATION, PEDESTRIAN];
      await svc.onPosition(pos());
      a.engine.zones = [OPERATION];
      await svc.onZoneChanged({ zoneId: 'z-ped', action: 'updated', type: 'reduced_speed', speedLimitKmh: 6, active: true });
      expect(a.commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 32, expect.anything());
    });

    it('zona nova cobrindo uma moto parada → menor limite das zonas, nunca acima de 32', async () => {
      const a = setup();
      const positions = { vehiclesInZone: jest.fn().mockResolvedValue(parked) };
      const svc = new GeofenceService(a.engine, a.commander, a.rentals, a.events, a.clock, new MemoryRedisStore(), { outOfAreaLockMinutes: 5 }, positions);
      a.engine.zones = [OPERATION];
      await svc.onPosition(pos());
      a.engine.zones = [OPERATION, BIKE_LANE, PEDESTRIAN];
      await svc.onZoneChanged({ zoneId: 'z-ped', action: 'created', type: 'reduced_speed', speedLimitKmh: 6, active: true });
      expect(a.commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 6, expect.anything());
      for (const [, kmh] of a.commander.setSpeedLimit.mock.calls) expect(kmh).toBeLessThanOrEqual(32);
    });
  });

  it('repassa a posição ao engine (tracker)', async () => {
    const { svc, engine } = setup();
    await svc.onPosition(pos());
    expect(engine.positions).toEqual([{ thingName: 'moto-0001', lat: -23.56, lng: -46.69 }]);
  });

  describe('fora da área (revisão)', () => {
    it('reinício da API: o bloqueio de 5 min é rearmado pelo prazo persistido (não recomeça nem se perde)', async () => {
      const redis = new MemoryRedisStore();
      const a = setup();
      const svcA = new GeofenceService(a.engine, a.commander, a.rentals, a.events, a.clock, redis, { outOfAreaLockMinutes: 5 });
      a.engine.zones = [OPERATION];
      await svcA.onPosition(pos());
      a.engine.zones = [];
      await svcA.onPosition(pos());
      await a.clock.advance(3 * 60_000);
      svcA.stop(); // processo morre
      const b = setup();
      const svcB = new GeofenceService(b.engine, b.commander, b.rentals, b.events, b.clock, redis, { outOfAreaLockMinutes: 5 });
      await b.clock.advance(3 * 60_000); // relógio do novo processo (b começa em 15:00; prazo era 15:05)
      b.engine.zones = [];
      await svcB.onPosition(pos());
      await b.clock.advance(1_999);
      expect(b.commander.safeLock).not.toHaveBeenCalled();
      await b.clock.advance(2 * 60_000);
      expect(b.commander.safeLock).toHaveBeenCalledWith('veh-1', expect.objectContaining({ purpose: 'out_of_area' }));
    });

    it('primeira posição já fora da área com aluguel → arma o bloqueio de 5 min', async () => {
      const { svc, engine, clock, commander } = setup();
      engine.zones = [];
      await svc.onPosition(pos());
      await clock.advance(5 * 60_000);
      expect(commander.safeLock).toHaveBeenCalledWith('veh-1', expect.objectContaining({ rentalId: 'rent-1', purpose: 'out_of_area' }));
    });

    it('aluguel começa com a moto já fora da área → arma na próxima posição', async () => {
      const { svc, engine, clock, commander, rentals } = setup({ rentalId: null });
      engine.zones = [];
      await svc.onPosition(pos());
      rentals.openRentalId.mockResolvedValue('rent-2');
      await svc.onPosition(pos());
      await clock.advance(5 * 60_000);
      expect(commander.safeLock).toHaveBeenCalledWith('veh-1', expect.objectContaining({ rentalId: 'rent-2' }));
    });

    it('sair de uma zona operation continuando dentro de outra não é "fora da área": sem EXIT, sem bloqueio', async () => {
      const { svc, engine, clock, transitions, commander } = setup();
      engine.zones = [OPERATION, OPERATION_B];
      await svc.onPosition(pos());
      const before = transitions.length;
      engine.zones = [OPERATION_B];
      await svc.onPosition(pos());
      expect(transitions.slice(before).filter((t) => t.zoneType === 'operation')).toEqual([]);
      await clock.advance(10 * 60_000);
      expect(commander.safeLock).not.toHaveBeenCalled();
      engine.zones = [];
      await svc.onPosition(pos());
      expect(transitions[transitions.length - 1]).toEqual(expect.objectContaining({ zoneId: 'z-op-b', zoneType: 'operation', transition: 'EXIT' }));
    });
  });

  describe('fora da área (revisão 2)', () => {
    it('aluguel A termina fora da área; aluguel B sai da área → B tem os 5 min inteiros', async () => {
      const { svc, engine, clock, commander, rentals } = setup();
      engine.zones = [];
      await svc.onPosition(pos()); // A fora: arma
      await clock.advance(3 * 60_000);
      rentals.openRentalId.mockResolvedValue(undefined);
      await svc.onRentalEnded('veh-1');
      await clock.advance(60_000);
      rentals.openRentalId.mockResolvedValue('rent-B');
      await svc.onPosition(pos());
      await clock.advance(5 * 60_000 - 1);
      expect(commander.safeLock).not.toHaveBeenCalled();
      await clock.advance(1);
      expect(commander.safeLock).toHaveBeenCalledWith('veh-1', expect.objectContaining({ rentalId: 'rent-B' }));
    });

    it('sem evento de fim: rentalId diferente do armado → rearma com prazo novo (o de A não vale para B)', async () => {
      const redis = new MemoryRedisStore();
      const a = setup();
      const svcA = new GeofenceService(a.engine, a.commander, a.rentals, a.events, a.clock, redis, { outOfAreaLockMinutes: 5 });
      a.engine.zones = [];
      await svcA.onPosition(pos());
      svcA.stop();
      const b = setup({ rentalId: 'rent-B' });
      const svcB = new GeofenceService(b.engine, b.commander, b.rentals, b.events, b.clock, redis, { outOfAreaLockMinutes: 5 });
      await b.clock.advance(4 * 60_000);
      b.engine.zones = [];
      await svcB.onPosition(pos());
      await b.clock.advance(4 * 60_000);
      expect(b.commander.safeLock).not.toHaveBeenCalled();
      await b.clock.advance(60_000);
      expect(b.commander.safeLock).toHaveBeenCalledWith('veh-1', expect.objectContaining({ rentalId: 'rent-B' }));
    });

    it('prazo persistido guarda o rentalId e tem TTL', async () => {
      const redis = new MemoryRedisStore();
      const setSpy = jest.spyOn(redis, 'set');
      const a = setup();
      const svcA = new GeofenceService(a.engine, a.commander, a.rentals, a.events, a.clock, redis, { outOfAreaLockMinutes: 5 });
      a.engine.zones = [];
      await svcA.onPosition(pos());
      const call = setSpy.mock.calls.find((c) => c[0] === 'geofence:out-of-area:veh-1')!;
      expect(JSON.parse(call[1])).toEqual({ rentalId: 'rent-1', deadline: Date.parse('2026-10-21T15:05:00Z') });
      expect(call[2]).toBeGreaterThan(5 * 60_000);
      svcA.stop();
    });

    it('duas zonas operation sobrepostas deixadas na mesma posição → um único EXIT', async () => {
      const { svc, engine, transitions } = setup();
      engine.zones = [OPERATION, OPERATION_B];
      await svc.onPosition(pos());
      const before = transitions.length;
      engine.zones = [];
      await svc.onPosition(pos());
      expect(transitions.slice(before).filter((t) => t.zoneType === 'operation' && t.transition === 'EXIT')).toHaveLength(1);
    });
  });

  it('moto parada fora da área sem aluguel e sem nada armado: não faz DEL no Redis a cada posição', async () => {
    const redis = new MemoryRedisStore();
    const delSpy = jest.spyOn(redis, 'del');
    const a = setup({ rentalId: null });
    const svc = new GeofenceService(a.engine, a.commander, a.rentals, a.events, a.clock, redis, { outOfAreaLockMinutes: 5 });
    a.engine.zones = [];
    for (let i = 0; i < 10; i++) await svc.onPosition(pos());
    expect(delSpy.mock.calls.filter((c) => String(c[0]).startsWith('geofence:out-of-area:')).length).toBeLessThanOrEqual(1);
  });
});
