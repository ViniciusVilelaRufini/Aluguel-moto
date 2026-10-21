import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_STORE = Symbol('REDIS_STORE');

/** Subconjunto do Redis usado pela API (estado ao vivo, TTL de reservas). */
export interface RedisStore {
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  hset(key: string, values: Record<string, string>): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
  /** Chamado quando uma chave expira por TTL (keyspace notifications `Ex`). */
  onExpired(handler: (key: string) => void): void;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

/** Redis real (ioredis). Liga `notify-keyspace-events Ex` para receber expirações. */
export class IoRedisStore implements RedisStore {
  private readonly logger = new Logger('IoRedisStore');
  private readonly client: Redis;
  private subscriber?: Redis;
  private readonly handlers: Array<(key: string) => void> = [];

  constructor(url: string) {
    this.client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3, enableOfflineQueue: true });
    this.client.on('error', (err) => this.logger.warn({ msg: 'redis_error', error: err.message }));
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs && ttlMs > 0) await this.client.set(key, value, 'PX', Math.ceil(ttlMs));
    else await this.client.set(key, value);
  }
  async get(key: string) {
    return this.client.get(key);
  }
  async del(key: string) {
    await this.client.del(key);
  }
  async exists(key: string) {
    return (await this.client.exists(key)) === 1;
  }
  async hset(key: string, values: Record<string, string>) {
    await this.client.hset(key, values);
  }
  async hgetall(key: string) {
    return this.client.hgetall(key);
  }

  onExpired(handler: (key: string) => void): void {
    this.handlers.push(handler);
    if (this.subscriber) return;
    this.subscriber = this.client.duplicate();
    this.subscriber.on('error', (err) => this.logger.warn({ msg: 'redis_sub_error', error: err.message }));
    void (async () => {
      try {
        await this.client.config('SET', 'notify-keyspace-events', 'Ex');
      } catch (err) {
        // ElastiCache não permite CONFIG: configure o parameter group; a varredura periódica cobre a falta.
        this.logger.warn({ msg: 'redis_keyspace_config_failed', error: (err as Error).message });
      }
      await this.subscriber!.psubscribe('__keyevent@*__:expired');
      this.subscriber!.on('pmessage', (_p, _c, key: string) => this.handlers.forEach((h) => h(key)));
    })().catch((err) => this.logger.warn({ msg: 'redis_subscribe_failed', error: (err as Error).message }));
  }

  async ping() {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async close() {
    await this.subscriber?.quit().catch(() => undefined);
    await this.client.quit().catch(() => undefined);
  }
}

/** Implementação em memória (testes e `REDIS_URL=memory`). Respeita TTL e dispara `onExpired`. */
export class MemoryRedisStore implements RedisStore {
  private readonly data = new Map<string, { value: string; expiresAt?: number; timer?: NodeJS.Timeout }>();
  private readonly hashes = new Map<string, Record<string, string>>();
  private readonly handlers: Array<(key: string) => void> = [];

  async set(key: string, value: string, ttlMs?: number) {
    const prev = this.data.get(key);
    if (prev?.timer) clearTimeout(prev.timer);
    const entry: { value: string; expiresAt?: number; timer?: NodeJS.Timeout } = { value };
    if (ttlMs && ttlMs > 0) {
      entry.expiresAt = Date.now() + ttlMs;
      entry.timer = setTimeout(() => {
        this.data.delete(key);
        this.handlers.forEach((h) => h(key));
      }, ttlMs);
      entry.timer.unref?.();
    }
    this.data.set(key, entry);
  }
  async get(key: string) {
    const e = this.data.get(key);
    if (!e) return null;
    if (e.expiresAt && e.expiresAt <= Date.now()) {
      this.data.delete(key);
      return null;
    }
    return e.value;
  }
  async del(key: string) {
    const e = this.data.get(key);
    if (e?.timer) clearTimeout(e.timer);
    this.data.delete(key);
    this.hashes.delete(key);
  }
  async exists(key: string) {
    return (await this.get(key)) !== null || this.hashes.has(key);
  }
  async hset(key: string, values: Record<string, string>) {
    this.hashes.set(key, { ...(this.hashes.get(key) ?? {}), ...values });
  }
  async hgetall(key: string) {
    return { ...(this.hashes.get(key) ?? {}) };
  }
  onExpired(handler: (key: string) => void) {
    this.handlers.push(handler);
  }
  async ping() {
    return true;
  }
  async close() {
    for (const e of this.data.values()) if (e.timer) clearTimeout(e.timer);
    this.data.clear();
  }
}
