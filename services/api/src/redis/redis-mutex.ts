import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { RedisStore } from './redis-store';

/** Locks já obtidos nesta cadeia assíncrona (reentrância: quem já tem o lock de uma chave não espera por si mesmo). */
const held = new AsyncLocalStorage<ReadonlySet<string>>();

/** Roda `fn` fora de qualquer lock (timers e callbacks agendados dentro do lock não podem herdar a reentrância). */
export function outsideLock<T>(fn: () => T): T {
  return held.exit(fn);
}

/** Fila por chave dentro do processo (FIFO: a ordem das chamadas é a ordem de execução), reentrante. */
export class LocalMutex {
  private readonly chains = new Map<string, Promise<unknown>>();

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const mine = held.getStore();
    if (mine?.has(key)) return fn();
    const prev = this.chains.get(key) ?? Promise.resolve();
    const next = prev.then(() => held.run(new Set([...(mine ?? []), key]), fn));
    const settled = next.then(
      () => undefined,
      () => undefined,
    );
    this.chains.set(key, settled);
    void settled.then(() => {
      if (this.chains.get(key) === settled) this.chains.delete(key);
    });
    return next;
  }
}

export class LockBusyError extends Error {
  constructor(readonly key: string) {
    super(`lock ocupado em outra instância: ${key}`);
  }
}

export interface RedisMutexOptions {
  /** TTL do lock (maior que a operação mais lenta protegida por ele). */
  ttlMs?: number;
  /** Quanto esperar pelo lock de outra instância antes de desistir (`LockBusyError`). */
  waitMs?: number;
}

/**
 * Lock distribuído por chave (`SET {chave} {token} NX PX ttl`, liberado só pelo dono), com fila local na frente (a instância
 * não disputa o lock consigo mesma) e reentrância na mesma cadeia assíncrona. Erro do Redis propaga.
 */
export class RedisMutex {
  private readonly local = new LocalMutex();
  private readonly ttlMs: number;
  private readonly waitMs: number;

  constructor(
    private readonly redis: RedisStore,
    opts: RedisMutexOptions = {},
  ) {
    this.ttlMs = opts.ttlMs ?? 15_000;
    this.waitMs = opts.waitMs ?? 5_000;
  }

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (held.getStore()?.has(key)) return fn();
    return this.local.run(key, async () => {
      const token = randomUUID();
      const until = Date.now() + this.waitMs;
      while (!(await this.redis.setNx(key, token, this.ttlMs))) {
        if (Date.now() >= until) throw new LockBusyError(key);
        await new Promise((r) => setTimeout(r, 25));
      }
      try {
        return await fn();
      } finally {
        await this.redis.delIfEquals(key, token).catch(() => undefined);
      }
    });
  }
}
