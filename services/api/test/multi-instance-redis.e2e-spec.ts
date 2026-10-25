import { randomUUID } from 'node:crypto';
import { JobLock } from '../src/common/job-lock';
import { FakeClock } from '../src/modules/iot/clock';
import { SafeLockService } from '../src/modules/iot/safe-lock.service';
import { RedisSafeLockStore } from '../src/modules/iot/safe-lock.store';
import type { DesiredState } from '../src/modules/iot/shadow-transport';
import { RedisMutex } from '../src/redis/redis-mutex';
import { IoRedisStore } from '../src/redis/redis-store';

/**
 * Lacunas T5 contra o Redis real do docker compose: cada "instância" tem a própria conexão (como cada task do ECS).
 * Chaves com prefixo aleatório (o Redis é compartilhado com outros worktrees).
 */
describe('Várias instâncias no Redis real (locks e estado da rampa)', () => {
  const ns = `e2e-t5:${randomUUID()}`;
  const conns: IoRedisStore[] = [];
  const conn = () => {
    const c = new IoRedisStore(process.env.REDIS_URL!);
    conns.push(c);
    return c;
  };
  afterAll(async () => {
    for (const c of conns) await c.close();
  });

  it('SET NX PX / delIfEquals / conjuntos', async () => {
    const r = conn();
    expect(await r.setNx(`${ns}:k`, 'a', 5_000)).toBe(true);
    expect(await r.setNx(`${ns}:k`, 'b', 5_000)).toBe(false);
    expect(await r.delIfEquals(`${ns}:k`, 'b')).toBe(false);
    expect(await r.delIfEquals(`${ns}:k`, 'a')).toBe(true);
    await r.sadd(`${ns}:s`, 'x');
    await r.sadd(`${ns}:s`, 'y');
    await r.srem(`${ns}:s`, 'x');
    expect(await r.smembers(`${ns}:s`)).toEqual(['y']);
    await r.del(`${ns}:s`);
  });

  it('JobLock: 5 instâncias disparando a mesma rodada → uma execução', async () => {
    const runs: number[] = [];
    await Promise.all([0, 1, 2, 3, 4].map((i) => new JobLock(conn(), `inst-${i}`).run(`${ns}-job`, 5_000, async () => void runs.push(i))));
    expect(runs).toHaveLength(1);
  });

  it('RedisMutex: seções críticas de instâncias diferentes nunca se sobrepõem', async () => {
    const a = new RedisMutex(conn(), { ttlMs: 5_000, waitMs: 5_000 });
    const b = new RedisMutex(conn(), { ttlMs: 5_000, waitMs: 5_000 });
    let inside = 0;
    let overlap = false;
    const work = (m: RedisMutex) =>
      m.run(`${ns}:mutex`, async () => {
        inside += 1;
        if (inside > 1) overlap = true;
        await new Promise((r) => setTimeout(r, 30));
        inside -= 1;
      });
    await Promise.all([work(a), work(b), work(a), work(b)]);
    expect(overlap).toBe(false);
  });

  it('rampa no Redis real: começa na instância A, telemetria concorrente em A e B, trava só com velocidade < 3', async () => {
    const thing = `${ns}-moto`;
    let speed = 25;
    const desired: DesiredState[] = [];
    const violations: number[] = [];
    const transport = {
      updateDesired: async (_t: string, d: DesiredState) => {
        if (d.travada === true && speed >= 3) violations.push(speed);
        desired.push(d);
      },
      publishCommand: async () => undefined,
    };
    const clock = new FakeClock(Date.now());
    const outcomes: unknown[] = [];
    const a = new SafeLockService(clock, transport, (o) => outcomes.push(o), { store: new RedisSafeLockStore(conn(), { prefix: `${ns}:sl` }) });
    const b = new SafeLockService(clock, transport, (o) => outcomes.push(o), { store: new RedisSafeLockStore(conn(), { prefix: `${ns}:sl` }) });
    await a.start({ commandId: 'c1', thingName: thing }, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    // Telemetria chegando ao mesmo tempo nas duas instâncias (ainda andando): ninguém trava.
    speed = 12;
    await Promise.all([a.onSpeed(thing, 12), b.onSpeed(thing, 12), b.onReported(thing, { limite_kmh: 15 })]);
    expect(desired.some((d) => d.travada === true)).toBe(false);
    speed = 0;
    await Promise.all([a.onSpeed(thing, 0), b.onSpeed(thing, 0)]);
    expect(desired.filter((d) => d.travada === true)).toHaveLength(1); // um único travada:true, apesar das duas
    await b.onReported(thing, { travada: true });
    expect(outcomes).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
    expect(violations).toEqual([]);
    expect(await a.isActiveAnywhere(thing)).toBe(false);
  });
});
