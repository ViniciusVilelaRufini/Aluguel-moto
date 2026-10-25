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

/** O lock distribuído não pôde ser obtido (Redis fora do ar ou ocupado): `fn` **não** rodou. */
export class LockUnavailableError extends Error {
  constructor(
    readonly key: string,
    override readonly cause?: unknown,
  ) {
    super(`lock indisponível: ${key}${cause instanceof Error ? ` (${cause.message})` : ''}`);
  }
}

/** Ocupado por outra instância além do tempo de espera. */
export class LockBusyError extends LockUnavailableError {
  constructor(key: string) {
    super(key);
    this.message = `lock ocupado em outra instância: ${key}`;
  }
}

export interface RedisMutexOptions {
  /** TTL do lock; enquanto `fn` roda, o dono renova a cada ~1/3 do TTL (sem fencing: a renovação cobre `fn` lenta). */
  ttlMs?: number;
  /** Quanto esperar pelo lock de outra instância antes de desistir (`LockBusyError`). */
  waitMs?: number;
}

/**
 * Lock distribuído por chave (`SET {chave} {token} NX PX ttl`, liberado só pelo dono), com fila local na frente (a instância
 * não disputa o lock consigo mesma), reentrância na mesma cadeia assíncrona e renovação do TTL enquanto `fn` roda.
 * Falha ao obter o lock → `LockUnavailableError` (quem chama decide se degrada); erro de `fn` propaga como veio.
 */
export class RedisMutex {
  private readonly localMutex = new LocalMutex();
  private readonly ttlMs: number;
  private readonly waitMs: number;

  constructor(
    private readonly redis: RedisStore,
    opts: RedisMutexOptions = {},
  ) {
    this.ttlMs = opts.ttlMs ?? 15_000;
    this.waitMs = opts.waitMs ?? 5_000;
  }

  /** Só a fila local (degradação sem Redis): serializa dentro do processo. */
  runLocal<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return this.localMutex.run(key, fn);
  }

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (held.getStore()?.has(key)) return fn();
    return this.localMutex.run(key, async () => {
      const token = randomUUID();
      const until = Date.now() + this.waitMs;
      for (;;) {
        let got: boolean;
        try {
          got = await this.redis.setNx(key, token, this.ttlMs);
        } catch (err) {
          throw new LockUnavailableError(key, err);
        }
        if (got) break;
        if (Date.now() >= until) throw new LockBusyError(key);
        await new Promise((r) => setTimeout(r, 25));
      }
      const renew = setInterval(() => void this.redis.pexpireIfEquals(key, token, this.ttlMs).catch(() => undefined), Math.max(250, Math.floor(this.ttlMs / 3)));
      renew.unref?.();
      try {
        return await fn();
      } finally {
        clearInterval(renew);
        await this.redis.delIfEquals(key, token).catch(() => undefined);
      }
    });
  }
}
