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
  /** Lê e zera campos numéricos do hash numa operação atômica (ausente = 0). */
  htakeFloats(key: string, fields: string[]): Promise<number[]>;
  /**
   * Fix round 2 (M4): compare-and-set atômico no hash — só se `guardField` ainda vale `expected` (`null` = ausente), grava
   * `values` e soma `increments` (HINCRBYFLOAT), tudo numa operação. Devolve `false` se outro escritor mudou o campo antes.
   */
  hcas(key: string, guardField: string, expected: string | null, values: Record<string, string>, increments?: Record<string, number>): Promise<boolean>;
  /**
   * Compare-and-delete atômico no hash: apaga `key` só se `guardField` vale um de `allowed` (`null` = ausente). Devolve
   * `false` (nada apagado) se outro escritor gravou outro valor antes.
   */
  hdelIf(key: string, guardField: string, allowed: Array<string | null>): Promise<boolean>;
  /** Contador de janela fixa: INCR e, no primeiro hit, expira em `ttlMs`. Devolve a contagem e o tempo restante (ms). */
  incrWindow(key: string, ttlMs: number): Promise<{ count: number; ttlMs: number }>;
  /** `SET key value NX PX ttl`: grava só se a chave não existir. `true` = gravou (lock obtido). */
  setNx(key: string, value: string, ttlMs: number): Promise<boolean>;
  /** Apaga a chave só se ela ainda valer `expected` (liberar/consumir lock sem apagar o de outro dono). */
  delIfEquals(key: string, expected: string): Promise<boolean>;
  /** Renova o TTL só se a chave ainda valer `expected` (lock estendido enquanto o dono trabalha). */
  pexpireIfEquals(key: string, expected: string, ttlMs: number): Promise<boolean>;
  /** Grava `key` (sem TTL) e o campo `field` do hash `indexKey` numa operação atômica. */
  setWithIndex(key: string, value: string, indexKey: string, field: string, fieldValue: string): Promise<void>;
  /** Apaga `key` e o campo `field` do hash `indexKey` numa operação atômica. */
  delWithIndex(key: string, indexKey: string, field: string): Promise<void>;
  /** Conjuntos (índices de estado ao vivo: rampas e prazos ativos). */
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
  /** Chamado quando uma chave expira por TTL (keyspace notifications `Ex`). */
  onExpired(handler: (key: string) => void): void;
  /** Pub/sub entre instâncias da API (barramento de eventos do cluster). */
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, handler: (message: string) => void): void;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

const HTAKE_LUA = "local out = {} for i, f in ipairs(ARGV) do out[i] = redis.call('HGET', KEYS[1], f) or '0' redis.call('HSET', KEYS[1], f, '0') end return out";
// ARGV: guardField, expected ('' = ausente), nº de pares a gravar, pares campo/valor, depois pares campo/incremento.
const HCAS_LUA = `local cur = redis.call('HGET', KEYS[1], ARGV[1]) or ''
if cur ~= ARGV[2] then return 0 end
local n = tonumber(ARGV[3])
local i = 4
for _ = 1, n do redis.call('HSET', KEYS[1], ARGV[i], ARGV[i + 1]) i = i + 2 end
while i <= #ARGV do redis.call('HINCRBYFLOAT', KEYS[1], ARGV[i], ARGV[i + 1]) i = i + 2 end
return 1`;
const DEL_IF_EQUALS_LUA = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
const PEXPIRE_IF_EQUALS_LUA = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) else return 0 end";
const SET_WITH_INDEX_LUA = "redis.call('HSET', KEYS[2], ARGV[2], ARGV[3]) redis.call('SET', KEYS[1], ARGV[1]) return 1";
const DEL_WITH_INDEX_LUA = "redis.call('DEL', KEYS[1]) redis.call('HDEL', KEYS[2], ARGV[1]) return 1";
// ARGV: guardField, depois os valores aceitos ('' = ausente).
const HDEL_IF_LUA = `local cur = redis.call('HGET', KEYS[1], ARGV[1]) or ''
for i = 2, #ARGV do if cur == ARGV[i] then redis.call('DEL', KEYS[1]) return 1 end end
return 0`;
const INCR_WINDOW_LUA = "local c = redis.call('INCR', KEYS[1]) if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end return {c, redis.call('PTTL', KEYS[1])}";

/** Incremento como texto decimal sem notação científica (o HINCRBYFLOAT não aceita `1e-7`). */
const floatArg = (v: number) => v.toFixed(9);

/** Redis real (ioredis). Liga `notify-keyspace-events Ex` para receber expirações. */
export class IoRedisStore implements RedisStore {
  private readonly logger = new Logger('IoRedisStore');
  private readonly client: Redis;
  private subscriber?: Redis;
  private readonly handlers: Array<(key: string) => void> = [];
  private busSubscriber?: Redis;
  private readonly busHandlers = new Map<string, Array<(message: string) => void>>();

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
  async htakeFloats(key: string, fields: string[]) {
    const out = (await this.client.eval(HTAKE_LUA, 1, key, ...fields)) as string[];
    return out.map((v) => Number(v) || 0);
  }
  async hcas(key: string, guardField: string, expected: string | null, values: Record<string, string>, increments: Record<string, number> = {}) {
    const sets = Object.entries(values);
    const incs = Object.entries(increments).filter(([, v]) => v !== 0);
    const args = [guardField, expected ?? '', String(sets.length), ...sets.flat(), ...incs.flatMap(([f, v]) => [f, floatArg(v)])];
    return Number(await this.client.eval(HCAS_LUA, 1, key, ...args)) === 1;
  }
  async hdelIf(key: string, guardField: string, allowed: Array<string | null>) {
    return Number(await this.client.eval(HDEL_IF_LUA, 1, key, guardField, ...allowed.map((v) => v ?? ''))) === 1;
  }
  async incrWindow(key: string, ttlMs: number) {
    const [count, pttl] = (await this.client.eval(INCR_WINDOW_LUA, 1, key, String(Math.ceil(ttlMs)))) as [number, number];
    return { count: Number(count), ttlMs: Number(pttl) > 0 ? Number(pttl) : ttlMs };
  }

  async setNx(key: string, value: string, ttlMs: number) {
    return (await this.client.set(key, value, 'PX', Math.max(1, Math.ceil(ttlMs)), 'NX')) === 'OK';
  }
  async delIfEquals(key: string, expected: string) {
    return Number(await this.client.eval(DEL_IF_EQUALS_LUA, 1, key, expected)) === 1;
  }
  async pexpireIfEquals(key: string, expected: string, ttlMs: number) {
    return Number(await this.client.eval(PEXPIRE_IF_EQUALS_LUA, 1, key, expected, String(Math.max(1, Math.ceil(ttlMs))))) === 1;
  }
  async setWithIndex(key: string, value: string, indexKey: string, field: string, fieldValue: string) {
    await this.client.eval(SET_WITH_INDEX_LUA, 2, key, indexKey, value, field, fieldValue);
  }
  async delWithIndex(key: string, indexKey: string, field: string) {
    await this.client.eval(DEL_WITH_INDEX_LUA, 2, key, indexKey, field);
  }
  async sadd(key: string, member: string) {
    await this.client.sadd(key, member);
  }
  async srem(key: string, member: string) {
    await this.client.srem(key, member);
  }
  async smembers(key: string) {
    return this.client.smembers(key);
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

  async publish(channel: string, message: string) {
    await this.client.publish(channel, message);
  }

  subscribe(channel: string, handler: (message: string) => void): void {
    const list = this.busHandlers.get(channel) ?? [];
    list.push(handler);
    this.busHandlers.set(channel, list);
    if (!this.busSubscriber) {
      // Conexão dedicada: um cliente em modo subscriber não executa outros comandos.
      this.busSubscriber = this.client.duplicate();
      this.busSubscriber.on('error', (err) => this.logger.warn({ msg: 'redis_bus_error', error: err.message }));
      this.busSubscriber.on('message', (ch: string, msg: string) => this.busHandlers.get(ch)?.forEach((h) => h(msg)));
    }
    this.busSubscriber.subscribe(channel).catch((err) => this.logger.warn({ msg: 'redis_bus_subscribe_failed', error: (err as Error).message }));
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
    await this.busSubscriber?.quit().catch(() => undefined);
    await this.client.quit().catch(() => undefined);
  }
}

/** Implementação em memória (testes e `REDIS_URL=memory`). Respeita TTL e dispara `onExpired`. */
export class MemoryRedisStore implements RedisStore {
  private readonly data = new Map<string, { value: string; expiresAt?: number; timer?: NodeJS.Timeout }>();
  private readonly hashes = new Map<string, Record<string, string>>();
  private readonly sets = new Map<string, Set<string>>();
  private readonly handlers: Array<(key: string) => void> = [];
  private readonly busHandlers = new Map<string, Array<(message: string) => void>>();

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
    this.sets.delete(key);
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
  async htakeFloats(key: string, fields: string[]) {
    const h = this.hashes.get(key) ?? {};
    const out = fields.map((f) => Number(h[f]) || 0);
    this.hashes.set(key, { ...h, ...Object.fromEntries(fields.map((f) => [f, '0'])) });
    return out;
  }
  async hcas(key: string, guardField: string, expected: string | null, values: Record<string, string>, increments: Record<string, number> = {}) {
    const h = this.hashes.get(key) ?? {};
    if ((h[guardField] ?? '') !== (expected ?? '')) return false;
    const next = { ...h, ...values };
    for (const [f, v] of Object.entries(increments)) if (v !== 0) next[f] = String((Number(next[f]) || 0) + Number(floatArg(v)));
    this.hashes.set(key, next);
    return true;
  }
  async hdelIf(key: string, guardField: string, allowed: Array<string | null>) {
    const cur = this.hashes.get(key)?.[guardField] ?? '';
    if (!allowed.some((v) => (v ?? '') === cur)) return false;
    this.hashes.delete(key);
    return true;
  }
  async incrWindow(key: string, ttlMs: number) {
    const now = Date.now();
    const e = this.data.get(key);
    if (!e || (e.expiresAt !== undefined && e.expiresAt <= now)) {
      await this.set(key, '1', ttlMs);
      return { count: 1, ttlMs };
    }
    const count = Number(e.value) + 1;
    e.value = String(count);
    return { count, ttlMs: e.expiresAt !== undefined ? e.expiresAt - now : ttlMs };
  }
  /** Sem `await` entre a leitura e a escrita: atômico dentro do processo, como o `SET NX` do Redis. */
  async setNx(key: string, value: string, ttlMs: number) {
    if (this.peek(key) !== null) return false;
    void this.set(key, value, Math.max(1, ttlMs));
    return true;
  }
  async delIfEquals(key: string, expected: string) {
    if (this.peek(key) !== expected) return false;
    void this.del(key);
    return true;
  }
  async pexpireIfEquals(key: string, expected: string, ttlMs: number) {
    if (this.peek(key) !== expected) return false;
    void this.set(key, expected, Math.max(1, ttlMs));
    return true;
  }
  async setWithIndex(key: string, value: string, indexKey: string, field: string, fieldValue: string) {
    this.hashes.set(indexKey, { ...(this.hashes.get(indexKey) ?? {}), [field]: fieldValue });
    void this.set(key, value);
  }
  async delWithIndex(key: string, indexKey: string, field: string) {
    const h = { ...(this.hashes.get(indexKey) ?? {}) };
    delete h[field];
    this.hashes.set(indexKey, h);
    const e = this.data.get(key);
    if (e?.timer) clearTimeout(e.timer);
    this.data.delete(key);
  }
  private peek(key: string): string | null {
    const e = this.data.get(key);
    if (!e || (e.expiresAt !== undefined && e.expiresAt <= Date.now())) return null;
    return e.value;
  }
  async sadd(key: string, member: string) {
    const set = this.sets.get(key) ?? new Set<string>();
    set.add(member);
    this.sets.set(key, set);
  }
  async srem(key: string, member: string) {
    this.sets.get(key)?.delete(member);
  }
  async smembers(key: string) {
    return [...(this.sets.get(key) ?? [])];
  }
  onExpired(handler: (key: string) => void) {
    this.handlers.push(handler);
  }
  async publish(channel: string, message: string) {
    const list = [...(this.busHandlers.get(channel) ?? [])];
    queueMicrotask(() => list.forEach((h) => h(message)));
  }
  subscribe(channel: string, handler: (message: string) => void) {
    this.busHandlers.set(channel, [...(this.busHandlers.get(channel) ?? []), handler]);
  }
  async ping() {
    return true;
  }
  async close() {
    for (const e of this.data.values()) if (e.timer) clearTimeout(e.timer);
    this.data.clear();
  }
}
