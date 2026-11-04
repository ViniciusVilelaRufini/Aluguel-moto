import { MemoryRedisStore } from '../../redis/redis-store';
import { withLiveState } from './live-overlay';

/** QA-20: `GET /vehicles` usa o estado ao vivo do Redis (`iot:live:{thingName}`), mais novo que o Postgres (gravado a cada 30 s). */
describe('withLiveState', () => {
  const dbRow = {
    id: 'v1', thingName: 'moto-0001', lat: -23.5, lng: -46.6, speedKmh: 0, batteryPct: 90, batteryKnown: true, locked: true, ignition: false, signal: 3, online: true,
    lastSeenAt: new Date('2026-10-21T15:00:00Z'),
  };

  it('estado ao vivo mais novo → posição, velocidade, bateria e trava do Redis', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0001', { lat: '-23.51', lng: '-46.61', speedKmh: '18.5', batteryPct: '80.4', locked: 'false', lockedAt: '1761058825000', ignition: 'true', signal: '4', online: 'true', lastSeenAt: '2026-10-21T15:00:25.000Z' });
    const [v] = await withLiveState(redis, [dbRow]);
    expect(v).toMatchObject({ lat: -23.51, lng: -46.61, speedKmh: 18.5, batteryPct: 80, locked: false, ignition: true, signal: 4, online: true });
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

  describe('bancada do J16 (2026-11-03)', () => {
    it('só status/heartbeat (Redis sem posição, lat/lng 0) → trava, online e lastSeenAt do Redis; posição do banco', async () => {
      const redis = new MemoryRedisStore();
      await redis.hset('iot:live:moto-0001', { lat: '0', lng: '0', batteryPct: '0', locked: 'false', lockedAt: '1761058850000', online: 'true', lastSeenAt: '2026-10-21T15:00:50.000Z' });
      const [v] = await withLiveState(redis, [dbRow]);
      expect(v).toMatchObject({ lat: -23.5, lng: -46.6, batteryPct: 90, locked: false, online: true });
      expect(v.lastSeenAt).toEqual(new Date('2026-10-21T15:00:50.000Z'));
    });

    it('lastSeenAt do banco à frente (relógio do rastreador adiantado) não esconde o estado ao vivo', async () => {
      const redis = new MemoryRedisStore();
      await redis.hset('iot:live:moto-0001', { lat: '-23.51', lng: '-46.61', locked: 'false', lockedAt: '1761058790000', online: 'true', lastSeenAt: '2026-10-21T14:59:50.000Z' });
      const [v] = await withLiveState(redis, [{ ...dbRow, lastSeenAt: new Date('2026-10-21T15:02:00Z') }]);
      expect(v).toMatchObject({ lat: -23.51, lng: -46.61, locked: false });
      expect(v.lastSeenAt).toEqual(new Date('2026-10-21T14:59:50.000Z'));
    });

    it('trava do estado em branco (presença sem mensagem: lockedAt vazio) não sobrepõe o banco', async () => {
      const redis = new MemoryRedisStore();
      await redis.hset('iot:live:moto-0001', { lat: '0', lng: '0', locked: 'true', lockedAt: '', online: 'true', lastSeenAt: '2026-10-21T15:00:30.000Z' });
      const [v] = await withLiveState(redis, [{ ...dbRow, locked: false }]);
      expect(v.locked).toBe(false);
      expect(v.lastSeenAt).toEqual(new Date('2026-10-21T15:00:30.000Z'));
    });

    it('online vem do Redis (presença caiu → false); bateria desconhecida → batteryKnown false e batteryPct 0', async () => {
      const redis = new MemoryRedisStore();
      await redis.hset('iot:live:moto-0001', { lat: '-23.51', lng: '-46.61', batteryPct: '0', batteryKnown: 'false', online: 'false', lastSeenAt: '2026-10-21T15:00:30.000Z' });
      const [v] = await withLiveState(redis, [dbRow]);
      expect(v).toMatchObject({ online: false, batteryKnown: false, batteryPct: 0 });
    });
  });
});

/** Revisão final do J16: o GET/frota seguem a mesma precedência do banco e do `vehicle.state` (lock-precedence.ts). */
describe('withLiveState — trava com a precedência do reported', () => {
  const at = Date.parse('2026-11-03T15:00:00.000Z');
  const row = {
    id: 'v1', thingName: 'moto-0059', lat: -23.5, lng: -46.6, speedKmh: 0, batteryPct: 70, batteryKnown: true, locked: true, ignition: false, signal: 4, online: true,
    lastSeenAt: new Date(at), lockedAt: new Date(at), lockedFromReport: true,
  };
  const hash = (lockedAtMs: number) => ({ lat: '-23.51', lng: '-46.61', locked: 'false', lockedAt: String(lockedAtMs), online: 'true', lastSeenAt: new Date(lockedAtMs).toISOString() });

  it('telemetria conservadora (travada:false) 30 s depois do reported travada:true → o GET continua travado', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0059', hash(at + 30_000));
    const [v] = await withLiveState(redis, [row]);
    expect(v.locked).toBe(true);
    expect(v).toMatchObject({ lat: -23.51, online: true }); // o resto do estado ao vivo continua valendo
  });

  it('sem reported novo por mais que a precedência → a trava do Redis vale', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0059', hash(at + 90_001));
    expect((await withLiveState(redis, [row]))[0].locked).toBe(false);
  });

  it('trava do banco vinda da telemetria e mais nova que a do Redis → banco', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0059', hash(at - 1_000));
    expect((await withLiveState(redis, [{ ...row, lockedFromReport: false }]))[0].locked).toBe(true);
  });

  it('banco sem origem (linha antiga) → a trava do Redis vale', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0059', hash(at + 1_000));
    expect((await withLiveState(redis, [{ ...row, lockedAt: null, lockedFromReport: false }]))[0].locked).toBe(false);
  });
});

/** Painel de bancada: o GET leva a hora da posição ao vivo (o heartbeat avança o último sinal sem posição nova). */
describe('withLiveState — positionAt', () => {
  const row = {
    id: 'v1', thingName: 'moto-0059', lat: -23.5, lng: -46.6, speedKmh: 0, batteryPct: 70, batteryKnown: true, locked: false, ignition: false, signal: 4, online: true,
    lastSeenAt: new Date('2026-11-03T15:00:00.000Z'), positionAt: new Date('2026-11-03T14:50:00.000Z'),
  };

  it('posição do Redis → positionAt do Redis (ms da medição)', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0059', { lat: '-23.51', lng: '-46.61', positionAt: String(Date.parse('2026-11-03T15:00:05.000Z')), online: 'true', lastSeenAt: '2026-11-03T15:00:06.000Z' });
    expect((await withLiveState(redis, [row]))[0].positionAt).toEqual(new Date('2026-11-03T15:00:05.000Z'));
  });

  it('só heartbeat (Redis sem posição) → positionAt do banco, mesmo com o último sinal mais novo', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0059', { lat: '0', lng: '0', positionAt: '', online: 'true', lastSeenAt: '2026-11-03T15:01:00.000Z' });
    const [v] = await withLiveState(redis, [row]);
    expect(v.positionAt).toEqual(new Date('2026-11-03T14:50:00.000Z'));
    expect(v.lastSeenAt).toEqual(new Date('2026-11-03T15:01:00.000Z'));
  });

  it('posição do Redis sem hora conhecida → positionAt desconhecida (null), nunca a hora da posição velha do banco', async () => {
    const redis = new MemoryRedisStore();
    await redis.hset('iot:live:moto-0059', { lat: '-23.51', lng: '-46.61', positionAt: '', online: 'true', lastSeenAt: '2026-11-03T15:00:06.000Z' });
    expect((await withLiveState(redis, [row]))[0].positionAt).toBeNull();
  });
});
