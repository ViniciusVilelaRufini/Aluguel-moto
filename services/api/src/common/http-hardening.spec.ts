import request from 'supertest';
import { createHarness } from '../../test/helpers/http-harness';
import { MemoryRedisStore } from '../redis/redis-store';
import { RedisThrottlerStorage } from './redis-throttler-storage';

/** QA-18: cabeçalhos de segurança (helmet), trust proxy só quando configurado e rate limit compartilhado no Redis. */
describe('Endurecimento HTTP (QA-18)', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('respostas levam HSTS, nosniff e frame-ancestors; sem x-powered-by', async () => {
    const h = await createHarness({ controllers: [] });
    const res = await request(h.app.getHttpServer()).get('/qualquer');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
    expect(res.headers['x-powered-by']).toBeUndefined();
    await h.app.close();
  });

  it('trust proxy desligado por padrão (X-Forwarded-For forjado não troca o IP); ligado com TRUST_PROXY', async () => {
    delete process.env.TRUST_PROXY;
    const off = await createHarness({ controllers: [] });
    expect(off.app.getHttpAdapter().getInstance().get('trust proxy')).toBe(false);
    await off.app.close();
    process.env.TRUST_PROXY = '1';
    const on = await createHarness({ controllers: [] });
    expect(on.app.getHttpAdapter().getInstance().get('trust proxy')).toBe(1);
    await on.app.close();
  });

  it('RedisThrottlerStorage: janela fixa compartilhada entre instâncias, bloqueia acima do limite e expira com o TTL', async () => {
    const redis = new MemoryRedisStore();
    const a = new RedisThrottlerStorage(redis);
    const b = new RedisThrottlerStorage(redis); // outra task ECS, mesmo Redis
    expect(await a.increment('ip-1', 60_000, 2, 60_000, 'default')).toMatchObject({ totalHits: 1, isBlocked: false });
    expect(await b.increment('ip-1', 60_000, 2, 60_000, 'default')).toMatchObject({ totalHits: 2, isBlocked: false });
    const third = await a.increment('ip-1', 60_000, 2, 60_000, 'default');
    expect(third).toMatchObject({ totalHits: 3, isBlocked: true });
    expect(third.timeToBlockExpire).toBeGreaterThan(0);
    expect(third.timeToExpire).toBeLessThanOrEqual(60);
    expect(await a.increment('ip-2', 60_000, 2, 60_000, 'default')).toMatchObject({ totalHits: 1 });
  });

  it('RedisThrottlerStorage: Redis fora do ar → não derruba a API (deixa passar e registra)', async () => {
    const redis = new MemoryRedisStore();
    jest.spyOn(redis, 'incrWindow').mockRejectedValue(new Error('redis fora'));
    expect(await new RedisThrottlerStorage(redis).increment('ip', 60_000, 1, 60_000, 'default')).toMatchObject({ isBlocked: false });
  });
});
