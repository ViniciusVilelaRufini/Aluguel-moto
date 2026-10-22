import { MemoryRedisStore } from '../../redis/redis-store';
import { withLiveState } from './live-overlay';

/** QA-20: `GET /vehicles` usa o estado ao vivo do Redis (`iot:live:{thingName}`), mais novo que o Postgres (gravado a cada 30 s). */
describe('withLiveState', () => {
  const dbRow = { id: 'v1', thingName: 'moto-0001', lat: -23.5, lng: -46.6, speedKmh: 0, batteryPct: 90, locked: true, ignition: false, signal: 3, lastSeenAt: new Date('2026-10-21T15:00:00Z') };

  it('estado ao vivo mais novo → posição, velocidade, bateria e trava do Redis', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0001', { lat: '-23.51', lng: '-46.61', speedKmh: '18.5', batteryPct: '80.4', locked: 'false', ignition: 'true', signal: '4', lastSeenAt: '2026-10-21T15:00:25.000Z' });
    const [v] = await withLiveState(redis, [dbRow]);
    expect(v).toMatchObject({ lat: -23.51, lng: -46.61, speedKmh: 18.5, batteryPct: 80, locked: false, ignition: true, signal: 4 });
    expect(v.lastSeenAt).toEqual(new Date('2026-10-21T15:00:25.000Z'));
  });

  it('sem estado ao vivo, mais velho que o banco ou Redis fora → linha do banco', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0001', { lat: '1', lng: '1', lastSeenAt: '2026-10-21T14:00:00.000Z' });
    expect((await withLiveState(redis, [dbRow]))[0]).toEqual(dbRow);
    expect((await withLiveState(new MemoryRedisStore(), [dbRow]))[0]).toEqual(dbRow);
    const broken = new MemoryRedisStore();
    jest.spyOn(broken, 'hgetall').mockRejectedValue(new Error('fora'));
    expect((await withLiveState(broken, [dbRow]))[0]).toEqual(dbRow);
  });
});
