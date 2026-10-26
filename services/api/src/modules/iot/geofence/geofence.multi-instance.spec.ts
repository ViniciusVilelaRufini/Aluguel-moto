import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemoryRedisStore } from '../../../redis/redis-store';
import { BaseIotGateway } from '../base-iot-gateway';
import { FakeClock } from '../clock';
import { LiveStateStore } from '../live-state.store';
import type { DesiredState, IotTransport, MomentaryCommand } from '../shadow-transport';
import type { GeofenceEngine, ZoneRef } from './geofence-engine';
import { GeofenceCommander, GeofenceService, RentalLookup } from './geofence.service';

/**
 * Auditoria, item 1: o limite da zona vale em todas as tasks da API (estado no Redis), não só na que avaliou a posição.
 * Cada "task" = um `GeofenceService` + `LiveStateStore` próprios sobre o mesmo Redis.
 */

const OPERATION: ZoneRef = { id: 'z-op', type: 'operation', speedLimitKmh: null };
const PEDESTRIAN: ZoneRef = { id: 'z-ped', type: 'reduced_speed', speedLimitKmh: 6 };
const BIKE_LANE: ZoneRef = { id: 'z-bike', type: 'reduced_speed', speedLimitKmh: 20 };

class FakeEngine implements GeofenceEngine {
  zones: ZoneRef[] = [];
  readonly queried: Array<{ lat: number; lng: number }> = [];
  async containing(lat: number, lng: number) {
    this.queried.push({ lat, lng });
    return this.zones;
  }
  async updatePosition() {}
  async sync() {}
  async syncAll() {}
}

class FakeTransport implements IotTransport {
  readonly desired: Array<{ thingName: string; desired: DesiredState }> = [];
  async updateDesired(thingName: string, desired: DesiredState) {
    this.desired.push({ thingName, desired });
  }
  async publishCommand(_thingName: string, _command: MomentaryCommand) {}
  async start() {}
  async stop() {}
}

class TestGateway extends BaseIotGateway {}

const T = 'moto-0001';
const V = { vehicleId: 'veh-1', thingName: T };
const pos = (ts = '2026-10-21T15:00:00.000Z') => ({ ...V, lat: -23.56, lng: -46.69, ts });

function cluster() {
  const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
  const redis = new MemoryRedisStore();
  const engine = new FakeEngine();
  const rentals: jest.Mocked<RentalLookup> = { openRentalId: jest.fn().mockResolvedValue('rent-1'), trackingRentalId: jest.fn().mockResolvedValue('rent-1'), invalidate: jest.fn() };
  const task = () => {
    const events = new EventEmitter2();
    const live = new LiveStateStore(redis, clock);
    const commander: jest.Mocked<GeofenceCommander> = { setSpeedLimit: jest.fn().mockResolvedValue(undefined), safeLock: jest.fn().mockResolvedValue(undefined) };
    const geofence = new GeofenceService(engine, commander, rentals, events, clock, redis, { outOfAreaLockMinutes: 5 }, undefined, live);
    const transport = new FakeTransport();
    // Moto offline (sem telemetria neste processo): os comandos voltam `pending` na hora, depois de gravar o desired.
    const gw = new TestGateway(transport, live, clock, events, { confirmWaitMs: 1_000, commandTimeoutMs: 30_000 });
    gw.setLimitResolver((thing) => geofence.effectiveLimit(thing));
    return { events, live, commander, geofence, transport, gw };
  };
  return { clock, redis, engine, rentals, task };
}

describe('Limite de zona compartilhado entre tasks (auditoria, item 1)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('(a) B avalia a posição numa zona de 6; unlock servido por A publica limite_kmh 6 (não 32)', async () => {
    const c = cluster();
    const a = c.task();
    const b = c.task();
    c.engine.zones = [OPERATION, PEDESTRIAN];
    await b.geofence.onPosition(pos());
    expect(b.commander.setSpeedLimit).toHaveBeenCalledWith('veh-1', 6, expect.objectContaining({ purpose: 'zone_speed_limit' }));
    expect(JSON.parse((await c.redis.get('geofence:inside:veh-1'))!)).toEqual(expect.objectContaining({ appliedLimit: 6 }));

    const out = await a.gw.unlock({ commandId: 'c1', thingName: T });
    expect(out.status).toBe('pending');
    expect(a.transport.desired).toEqual([{ thingName: T, desired: { travada: false, limite_kmh: 6 } }]);
    expect(await a.geofence.effectiveLimit(T)).toBe(6);
  });

  it('(b) mesmo cenário: limite manual 32 servido por A é recusado (invalid_limit) e nada é publicado', async () => {
    const c = cluster();
    const a = c.task();
    const b = c.task();
    c.engine.zones = [OPERATION, PEDESTRIAN];
    await b.geofence.onPosition(pos());
    expect(await a.gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 32)).toEqual({ commandId: 'c1', status: 'failed', reason: 'invalid_limit' });
    expect(a.transport.desired).toEqual([]);
  });

  it('(c) depois de um unlock que publicou 32 dentro da zona de 6, a próxima posição em B reenvia 6 (uma vez)', async () => {
    const c = cluster();
    const a = c.task();
    const b = c.task();
    // O comando de zona de B vai pelo próprio gateway (grava o desired), como o `CommandsGeofenceCommander` em produção.
    b.commander.setSpeedLimit.mockImplementation(async (_veh, kmh) => {
      await b.gw.setSpeedLimit({ commandId: `zone-${kmh}-${b.commander.setSpeedLimit.mock.calls.length}`, thingName: T }, kmh);
    });
    c.engine.zones = [OPERATION, PEDESTRIAN];
    await b.geofence.onPosition(pos());
    expect(b.commander.setSpeedLimit).toHaveBeenCalledTimes(1);

    // Unlock publicado com 32 (resolver antigo/sem estado: ex. task de uma versão anterior durante o deploy).
    a.gw.setLimitResolver(async () => 32);
    await a.gw.unlock({ commandId: 'c-unlock', thingName: T });
    expect(a.transport.desired[a.transport.desired.length - 1].desired).toEqual({ travada: false, limite_kmh: 32 });

    await b.geofence.onPosition(pos('2026-10-21T15:00:05.000Z'));
    expect(b.commander.setSpeedLimit).toHaveBeenCalledTimes(2);
    expect(b.commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 6, expect.objectContaining({ purpose: 'zone_speed_limit' }));
    expect(b.transport.desired[b.transport.desired.length - 1].desired).toEqual({ limite_kmh: 6 });

    // Desired de novo igual à zona: sem reenvio a cada posição.
    await b.geofence.onPosition(pos('2026-10-21T15:00:10.000Z'));
    expect(b.commander.setSpeedLimit).toHaveBeenCalledTimes(2);
  });

  it('limite manual abaixo da zona (10 numa ciclovia de 20) não é desfeito pelo geofence', async () => {
    const c = cluster();
    const a = c.task();
    const b = c.task();
    c.engine.zones = [OPERATION, BIKE_LANE];
    await b.geofence.onPosition(pos());
    expect(b.commander.setSpeedLimit).toHaveBeenCalledTimes(1);
    expect((await a.gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 10)).status).toBe('pending');
    await b.geofence.onPosition(pos('2026-10-21T15:00:05.000Z'));
    expect(b.commander.setSpeedLimit).toHaveBeenCalledTimes(1);
  });

  it('sem estado persistido: avalia a última posição conhecida (estado ao vivo) contra as zonas', async () => {
    const c = cluster();
    const b = c.task();
    const a = c.task();
    // B recebeu a telemetria (estado ao vivo no Redis), mas o geofence ainda não gravou estado da moto.
    await b.live.applyTelemetry(T, { lat: -23.5, lng: -46.6, velocidade_kmh: 0, bateria_pct: 80, travada: true, ignicao: false, sinal: 4, timestamp: '2026-10-21T15:00:00Z' });
    c.engine.zones = [OPERATION, BIKE_LANE, PEDESTRIAN];
    expect(await a.geofence.effectiveLimit(T)).toBe(6);
    expect(c.engine.queried).toEqual([{ lat: -23.5, lng: -46.6 }]);
  });

  it('sem estado e sem posição alguma → 32 (teto legal) e log zone_limit_unknown', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const c = cluster();
    const a = c.task();
    c.engine.zones = [OPERATION, PEDESTRIAN];
    expect(await a.geofence.effectiveLimit(T)).toBe(32);
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ msg: 'zone_limit_unknown', thingName: T }));
  });

  it('erro no Redis ao ler o estado → cai para a posição conhecida (nunca acima do limite da zona)', async () => {
    const c = cluster();
    const a = c.task();
    c.engine.zones = [OPERATION, PEDESTRIAN];
    await a.geofence.onPosition(pos());
    const realGet = c.redis.get.bind(c.redis);
    c.redis.get = async (k: string) => {
      if (k.startsWith('geofence:')) throw new Error('redis fora');
      return realGet(k);
    };
    const b = c.task();
    await b.live.applyTelemetry(T, { lat: -23.56, lng: -46.69, velocidade_kmh: 0, bateria_pct: 80, travada: true, ignicao: false, sinal: 4, timestamp: '2026-10-21T15:00:00Z' });
    expect(await b.geofence.effectiveLimit(T)).toBe(6);
  });

  it('zone.changed reavaliado numa task vale para o unlock servido por outra (ciclovia 20 → 6)', async () => {
    const c = cluster();
    const parked = [{ vehicleId: 'veh-1', thingName: T, lat: -23.56, lng: -46.69 }];
    const events = new EventEmitter2();
    const live = new LiveStateStore(c.redis, c.clock);
    const commander: jest.Mocked<GeofenceCommander> = { setSpeedLimit: jest.fn().mockResolvedValue(undefined), safeLock: jest.fn().mockResolvedValue(undefined) };
    const positions = { vehiclesInZone: jest.fn().mockResolvedValue(parked) };
    const b = new GeofenceService(c.engine, commander, c.rentals, events, c.clock, c.redis, { outOfAreaLockMinutes: 5 }, positions, live);
    const a = c.task();
    c.engine.zones = [OPERATION, BIKE_LANE];
    await b.onPosition(pos());
    expect(await a.geofence.effectiveLimit(T)).toBe(20);
    c.engine.zones = [OPERATION, { ...BIKE_LANE, speedLimitKmh: 6 }];
    await b.onZoneChanged({ zoneId: 'z-bike', action: 'updated', type: 'reduced_speed', speedLimitKmh: 6, active: true });
    expect(commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 6, expect.anything());
    await a.gw.unlock({ commandId: 'c1', thingName: T });
    expect(a.transport.desired[a.transport.desired.length - 1].desired).toEqual({ travada: false, limite_kmh: 6 });
  });
  describe('revisão 1', () => {
    it('saindo da zona de 6 (comando de zona aguardando o gateway) publica 32: o teto QA-01 já vê o estado novo', async () => {
      const c = cluster();
      const b = c.task();
      const outcomes: string[] = [];
      b.commander.setSpeedLimit.mockImplementation(async (_veh, kmh) => {
        outcomes.push((await b.gw.setSpeedLimit({ commandId: `zone-${b.commander.setSpeedLimit.mock.calls.length}`, thingName: T }, kmh)).status);
      });
      c.engine.zones = [OPERATION, PEDESTRIAN];
      await b.geofence.onPosition(pos());
      c.engine.zones = [OPERATION];
      await b.geofence.onPosition(pos('2026-10-21T15:00:05.000Z'));
      expect(b.commander.setSpeedLimit).toHaveBeenLastCalledWith('veh-1', 32, expect.anything());
      expect(outcomes).toEqual(['pending', 'pending']);
      expect(b.transport.desired.map((d) => d.desired)).toEqual([{ limite_kmh: 6 }, { limite_kmh: 32 }]);
    });

    it('SET do estado falhando ao sair da zona de 6: o processo usa o limite novo da memória e publica 20', async () => {
      const c = cluster();
      const b = c.task();
      const outcomes: string[] = [];
      b.commander.setSpeedLimit.mockImplementation(async (_veh, kmh) => {
        outcomes.push((await b.gw.setSpeedLimit({ commandId: `zone-${b.commander.setSpeedLimit.mock.calls.length}`, thingName: T }, kmh)).status);
      });
      c.engine.zones = [OPERATION, PEDESTRIAN];
      await b.geofence.onPosition(pos());
      const realSet = c.redis.set.bind(c.redis);
      c.redis.set = async (k: string, v: string, ttl?: number) => {
        if (k.startsWith('geofence:inside:')) throw new Error('redis fora');
        return realSet(k, v, ttl);
      };
      c.engine.zones = [OPERATION, BIKE_LANE];
      await b.geofence.onPosition(pos('2026-10-21T15:00:05.000Z'));
      expect(outcomes).toEqual(['pending', 'pending']);
      expect(b.transport.desired[b.transport.desired.length - 1].desired).toEqual({ limite_kmh: 20 });
      expect(await b.geofence.effectiveLimit(T)).toBe(20);
    });

    it('posição conhecida e motor de cercas fora → falha fechada (0, log zone_limit_engine_failed); a próxima posição manda o limite real', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const c = cluster();
      const b = c.task();
      const a = c.task();
      await b.live.applyTelemetry(T, { lat: -23.5, lng: -46.6, velocidade_kmh: 0, bateria_pct: 80, travada: true, ignicao: false, sinal: 4, timestamp: '2026-10-21T15:00:00Z' });
      const realContaining = c.engine.containing.bind(c.engine);
      c.engine.containing = async () => {
        throw new Error('postgis fora');
      };
      expect(await a.geofence.effectiveLimit(T)).toBe(0);
      expect(warn).toHaveBeenCalledWith(expect.objectContaining({ msg: 'zone_limit_engine_failed', thingName: T, limit: 0 }));
      expect(warn).not.toHaveBeenCalledWith(expect.objectContaining({ msg: 'zone_limit_unknown' }));
      // Moto online (telemetria acima): a chamada espera o reported até `confirmWaitMs`.
      const u = a.gw.unlock({ commandId: 'c1', thingName: T });
      await c.clock.advance(1_000);
      expect((await u).status).toBe('in_progress');
      expect(a.transport.desired[0].desired).toEqual({ travada: false, limite_kmh: 0 });

      // Motor de volta, moto fora de zonas de velocidade reduzida: outra task manda o limite real (32).
      c.engine.containing = realContaining;
      c.engine.zones = [OPERATION];
      await b.geofence.onPosition(pos());
      expect(b.commander.setSpeedLimit).toHaveBeenCalledWith('veh-1', 32, expect.objectContaining({ purpose: 'zone_speed_limit' }));
    });
  });
});
