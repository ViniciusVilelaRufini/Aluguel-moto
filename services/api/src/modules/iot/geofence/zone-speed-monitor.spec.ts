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
  const limits = { effectiveLimit: jest.fn().mockResolvedValue(limit) };
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
    expect(a.limits.effectiveLimit).not.toHaveBeenCalled();
    const b = setup('relay_only', 32);
    await b.sample(35, 0);
    await b.sample(35, 10);
    expect(b.got).toEqual([]);
  });
});
