import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, type ZoneSpeedExceededEvent } from '../../../common/events';
import { MemoryRedisStore } from '../../../redis/redis-store';
import { ZoneSpeedMonitor } from './zone-speed-monitor';

const AT0 = Date.parse('2026-10-27T12:00:00Z');

function setup(mode: 'relay_only' | 'speed_control' = 'relay_only', limit = 6) {
  const events = new EventEmitter2();
  const got: ZoneSpeedExceededEvent[] = [];
  events.on(EV.ZONE_SPEED_EXCEEDED, (e: ZoneSpeedExceededEvent) => got.push(e));
  const modes = { byVehicle: jest.fn().mockResolvedValue(mode), invalidate: jest.fn() };
  const limits = { storedLimit: jest.fn().mockResolvedValue(limit as number | null) };
  const rentals = { openRentalId: jest.fn().mockResolvedValue('rent-1') };
  const monitor = new ZoneSpeedMonitor(modes, limits, new MemoryRedisStore(), events, rentals);
  const sample = (kmh: number, sec: number) => monitor.onSample({ vehicleId: 'veh-1', thingName: 'moto-0901', speedKmh: kmh, measuredAt: AT0 + sec * 1000 });
  return { got, sample, limits };
}

describe('ZoneSpeedMonitor (spec GT06 §10)', () => {
  it('acima do limite por mais de 5 s → um alerta por episódio; voltar ao limite encerra o episódio', async () => {
    const s = setup();
    await s.sample(10, 0);
    await s.sample(11, 3);
    await s.sample(12, 5);
    expect(s.got).toEqual([]);
    await s.sample(12, 6);
    expect(s.got).toEqual([{ vehicleId: 'veh-1', rentalId: 'rent-1', speedLimitKmh: 6, speedKmh: 12, ts: '2026-10-27T12:00:06.000Z' }]);
    await s.sample(14, 12);
    expect(s.got).toHaveLength(1);
    await s.sample(6, 15); // igual ao limite: dentro
    await s.sample(10, 16);
    await s.sample(10, 22);
    expect(s.got).toHaveLength(2);
  });

  it('amostra mais velha que o início do episódio é ignorada', async () => {
    const s = setup();
    await s.sample(10, 10);
    await s.sample(10, 2);
    await s.sample(10, 15);
    expect(s.got).toEqual([]);
    await s.sample(10, 16);
    expect(s.got).toHaveLength(1);
  });

  it('speed_control e fora de zona (limite 32) nunca alertam', async () => {
    const a = setup('speed_control');
    await a.sample(20, 0);
    await a.sample(20, 10);
    expect(a.got).toEqual([]);
    expect(a.limits.storedLimit).not.toHaveBeenCalled();
    const b = setup('relay_only', 32);
    await b.sample(35, 0);
    await b.sample(35, 10);
    expect(b.got).toEqual([]);
  });

  it('sair da zona no meio do episódio (limite 32) encerra: ao voltar, os 5 s recomeçam', async () => {
    const s = setup();
    await s.sample(10, 0);
    s.limits.storedLimit.mockResolvedValue(32);
    await s.sample(10, 3);
    s.limits.storedLimit.mockResolvedValue(6);
    await s.sample(10, 4);
    await s.sample(10, 8);
    expect(s.got).toEqual([]);
    await s.sample(10, 10);
    expect(s.got).toHaveLength(1);
  });

  it('limite 20 → 6 no meio do episódio reinicia o episódio com o limite novo', async () => {
    const s = setup('relay_only', 20);
    await s.sample(25, 0);
    s.limits.storedLimit.mockResolvedValue(6);
    await s.sample(25, 3);
    await s.sample(25, 7);
    expect(s.got).toEqual([]);
    await s.sample(25, 9);
    expect(s.got).toEqual([expect.objectContaining({ speedLimitKmh: 6, speedKmh: 25 })]);
  });

  it('limite desconhecido (motor fora, nada gravado): não alerta', async () => {
    const s = setup('relay_only', null as never);
    await s.sample(30, 0);
    await s.sample(30, 20);
    expect(s.got).toEqual([]);
  });

  it('Redis fora: o erro é engolido e nada alerta', async () => {
    const events = new EventEmitter2();
    const got: unknown[] = [];
    events.on(EV.ZONE_SPEED_EXCEEDED, (e) => got.push(e));
    const boom = jest.fn().mockRejectedValue(new Error('redis fora'));
    const redis = { get: boom, set: boom, del: boom } as never;
    const monitor = new ZoneSpeedMonitor({ byVehicle: async () => 'relay_only', invalidate: jest.fn() }, { storedLimit: async () => 6 }, redis, events, { openRentalId: async () => undefined });
    await expect(monitor.onSample({ vehicleId: 'v', thingName: 't', speedKmh: 12, measuredAt: AT0 })).resolves.toBeUndefined();
    await expect(monitor.onSample({ vehicleId: 'v', thingName: 't', speedKmh: 12, measuredAt: AT0 + 20_000 })).resolves.toBeUndefined();
    expect(got).toEqual([]);
  });
});
