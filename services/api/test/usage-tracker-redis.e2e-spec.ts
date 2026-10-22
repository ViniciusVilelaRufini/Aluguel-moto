import { randomUUID } from 'node:crypto';
import { UsageTracker } from '../src/modules/maintenance/usage-tracker.service';
import { IoRedisStore } from '../src/redis/redis-store';

/**
 * Fix round 2 (M4): o compare-and-set do odômetro (Lua `HCAS_LUA`) contra o Redis real do docker compose. Duas conexões
 * (duas instâncias da API) recebem a mesma telemetria ao mesmo tempo: o km/h de uso conta uma vez só.
 */
describe('UsageTracker no Redis real (script Lua atômico)', () => {
  const a = new IoRedisStore(process.env.REDIS_URL!);
  const b = new IoRedisStore(process.env.REDIS_URL!);
  const vehicleId = `e2e-${randomUUID()}`;
  const t0 = Date.parse('2026-10-22T12:00:00Z');
  const ev = (dtS: number, lat: number) => ({ vehicleId, lat, lng: -46.6559, ts: new Date(t0 + dtS * 1000).toISOString(), ignition: true, speedKmh: 20 });

  afterAll(async () => {
    await a.del(`vehicle:usage:${vehicleId}`);
    await a.close();
    await b.close();
  });

  it('hcas: grava só se o campo guardado não mudou, com incrementos decimais pequenos', async () => {
    const key = `vehicle:usage:${vehicleId}:cas`;
    expect(await a.hcas(key, 'ts', null, { ts: '1' }, { pendingKm: 0.0000001 })).toBe(true);
    expect(await b.hcas(key, 'ts', null, { ts: '2' }, { pendingKm: 5 })).toBe(false);
    expect(await b.hcas(key, 'ts', '1', { ts: '2' }, { pendingKm: 0.5, pendingHours: 0 })).toBe(true);
    const h = await a.hgetall(key);
    expect(h.ts).toBe('2');
    expect(Number(h.pendingKm)).toBeCloseTo(0.5000001, 7);
    expect(h.pendingHours).toBeUndefined();
    await a.del(key);
  });

  it('entrega duplicada concorrente em duas instâncias conta a distância uma vez', async () => {
    const ta = new UsageTracker(a);
    const tb = new UsageTracker(b);
    await ta.record(ev(0, -23.5614));
    for (const [dt, lat] of [[20, -23.5604], [40, -23.5594], [60, -23.5584]] as const) {
      await Promise.all([ta.record(ev(dt, lat)), tb.record(ev(dt, lat)), ta.record(ev(dt, lat))]);
    }
    const got = await tb.take(vehicleId);
    expect(got.km).toBeCloseTo(0.333, 2);
    expect(got.hours).toBeCloseTo(60 / 3600, 6);
    expect(await ta.take(vehicleId)).toEqual({ km: 0, hours: 0 });
  });
});
