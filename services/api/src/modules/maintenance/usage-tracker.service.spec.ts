import { MemoryRedisStore } from '../../redis/redis-store';
import { UsageTracker } from './usage-tracker.service';

describe('UsageTracker (acumulado de odômetro/horas no Redis)', () => {
  const t0 = Date.parse('2026-10-22T12:00:00Z');
  const ev = (dtS: number, lat: number) => ({ vehicleId: 'v1', lat, lng: -46.6559, ts: new Date(t0 + dtS * 1000).toISOString(), ignition: true, speedKmh: 20 });

  it('soma entre amostras, entrega o pendente uma vez e ignora amostra fora de ordem', async () => {
    const t = new UsageTracker(new MemoryRedisStore());
    await t.record(ev(0, -23.5614));
    await t.record(ev(20, -23.5604));
    await t.record(ev(10, -23.5700)); // fora de ordem: ignorada
    await t.record(ev(40, -23.5594));
    const first = await t.take('v1');
    expect(first.km).toBeCloseTo(0.222, 2);
    expect(first.hours).toBeCloseTo(40 / 3600, 6);
    expect(await t.take('v1')).toEqual({ km: 0, hours: 0 });
    await t.record(ev(60, -23.5584));
    await t.reset('v1');
    expect(await t.take('v1')).toEqual({ km: 0, hours: 0 });
  });
});
