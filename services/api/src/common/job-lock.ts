import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RedisStore } from '../redis/redis-store';

const KEY_PREFIX = 'job-lock:';

/**
 * Lock distribuído por job (`SET job-lock:{nome} {instância} NX PX ttl`): com várias tasks da API (ECS, 2–10), cada rodada de
 * um `@Interval`/`@Cron` roda em uma instância só. O lock **não** é liberado ao terminar: ele vale pela rodada inteira (TTL ≈
 * 80% do intervalo), para a mesma rodada não rodar de novo na instância cujo timer disparou alguns ms depois. Uma execução
 * mais longa que o TTL pode encostar na rodada seguinte de outra instância — os jobs já são idempotentes (CAS no banco).
 * Redis fora do ar → a rodada é pulada (nunca roda sem lock). Sem Redis (`REDIS_URL=memory`) o `MemoryRedisStore` faz o mesmo
 * papel dentro do processo: o comportamento local continua igual (uma execução por rodada).
 */
export class JobLock {
  private readonly logger = new Logger('JobLock');

  constructor(
    private readonly redis: RedisStore,
    private readonly owner: string = randomUUID(),
  ) {}

  async tryAcquire(name: string, ttlMs: number): Promise<boolean> {
    return this.redis.setNx(KEY_PREFIX + name, this.owner, ttlMs);
  }

  /** Libera antes do TTL, só se esta instância ainda for a dona. */
  async release(name: string): Promise<void> {
    await this.redis.delIfEquals(KEY_PREFIX + name, this.owner);
  }

  /**
   * Executa `fn` se obtiver o lock da rodada; devolve se executou. Lock **indisponível** (Redis fora, não ocupado): pula, salvo
   * `runIfUnavailable` — jobs de segurança/atendimento idempotentes (CAS no banco) rodam mesmo assim em cada instância.
   */
  async run(name: string, ttlMs: number, fn: () => Promise<unknown>, opts: { runIfUnavailable?: boolean } = {}): Promise<boolean> {
    let acquired: boolean;
    try {
      acquired = await this.tryAcquire(name, ttlMs);
    } catch (err) {
      this.logger.warn({ msg: 'job_lock_unavailable', job: name, runAnyway: !!opts.runIfUnavailable, error: (err as Error).message });
      if (!opts.runIfUnavailable) return false;
      await fn();
      return true;
    }
    if (!acquired) return false;
    await fn();
    return true;
  }
}

/** Instância registrada pelo `CoreModule` (os decoradores não têm injeção de dependência). */
let current: JobLock | undefined;

export function registerJobLock(lock: JobLock | undefined): void {
  current = lock;
}

/** TTL padrão do lock de um job que roda a cada `intervalMs`: 80% do intervalo (mín. 1 s). */
export const jobLockTtl = (intervalMs: number) => Math.max(1_000, Math.floor(intervalMs * 0.8));

/**
 * Decorador para métodos `@Interval`/`@Cron`: a rodada só executa na instância que obtiver o lock `name` (TTL `ttlMs`).
 * Coloque **abaixo** do `@Interval`/`@Cron`; os metadados do método original são copiados de qualquer forma. Sem `JobLock`
 * registrado (testes unitários que instanciam o serviço direto), executa como antes.
 */
export function ExclusiveJob(name: string, ttlMs: number, opts: { runIfUnavailable?: boolean } = {}): MethodDecorator {
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as (...args: unknown[]) => Promise<unknown>;
    const wrapped = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      const lock = current;
      if (!lock) return original.apply(this, args);
      let result: unknown;
      await lock.run(
        name,
        ttlMs,
        async () => {
          result = await original.apply(this, args);
        },
        opts,
      );
      return result;
    };
    for (const key of Reflect.getMetadataKeys(original)) Reflect.defineMetadata(key, Reflect.getMetadata(key, original), wrapped);
    Object.defineProperty(wrapped, 'name', { value: original.name });
    descriptor.value = wrapped;
    return descriptor;
  };
}
