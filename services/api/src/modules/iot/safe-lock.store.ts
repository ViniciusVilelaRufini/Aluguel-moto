import { LocalMutex, outsideLock, RedisMutex } from '../../redis/redis-mutex';
import type { RedisStore } from '../../redis/redis-store';

export type SafeLockPhase = 'waiting_online' | 'ramping' | 'locking';

/**
 * Estado de uma rampa do bloqueio seguro. Tudo o que decide o próximo passo está aqui (e não em timers/objetos do processo),
 * para outra instância — ou a mesma depois de um deploy — continuar a rampa: `nextStepAt` (próximo degrau, depois do ack) e
 * `deadlineAt` (120 s desde o início) são horários absolutos; os timers locais só antecipam a varredura.
 */
export interface RampState {
  /** Identidade da rampa: um timer/varredura de uma rampa encerrada nunca age sobre uma rampa nova da mesma moto. */
  id: string;
  thingName: string;
  commandIds: string[];
  phase: SafeLockPhase;
  steps: number[];
  stepIdx: number;
  awaitingAck: boolean;
  /** Última velocidade reportada fresca; `null` = desconhecida (= em movimento). */
  lastSpeed: number | null;
  lastPublishedLimit?: number;
  /** Quando o degrau atual / a trava foram publicados (o ack só vale para reported mais novo). */
  publishedAt: number;
  nextStepAt?: number;
  deadlineAt?: number;
}

/**
 * Rampa que está no índice mas cujo estado sumiu sem `finish` (expulsão de memória, failover que perdeu escritas): a varredura
 * faz o mesmo que o timeout da fase `locking` — nunca deixa `travada: true` órfão no desired.
 */
export interface OrphanRamp {
  thingName: string;
  rampId: string;
  phase: SafeLockPhase;
  commandIds: string[];
}

/** Onde as rampas vivem. `withLock` serializa tudo o que mexe na rampa de uma moto (entre instâncias, no Redis). */
export interface SafeLockStore {
  get(thingName: string): Promise<RampState | null>;
  put(ramp: RampState): Promise<void>;
  /** Remove só se a rampa guardada ainda for `rampId`. */
  remove(thingName: string, rampId: string): Promise<void>;
  /** Motos com rampa ativa e rampas órfãs (no índice, sem estado) — para a varredura. */
  scan(): Promise<{ active: string[]; orphans: OrphanRamp[] }>;
  /** Tira a órfã do índice (só se a entrada ainda for `rampId` e não houver estado). */
  clearOrphan(thingName: string, rampId: string): Promise<void>;
  /** A entrada do índice ainda é esta órfã (mesmo `rampId`, sem estado)? Consultado sob o lock da moto. */
  isOrphan(thingName: string, rampId: string): Promise<boolean>;
  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T>;
}

export { outsideLock };

/** Em memória (um processo; testes). Guarda a própria referência do objeto, como o `Map` original. Nunca tem órfãs. */
export class MemorySafeLockStore implements SafeLockStore {
  private readonly ramps = new Map<string, RampState>();
  private readonly mutex = new LocalMutex();

  async get(thingName: string) {
    return this.ramps.get(thingName) ?? null;
  }
  async put(ramp: RampState) {
    this.ramps.set(ramp.thingName, ramp);
  }
  async remove(thingName: string, rampId: string) {
    if (this.ramps.get(thingName)?.id === rampId) this.ramps.delete(thingName);
  }
  async scan() {
    return { active: [...this.ramps.keys()], orphans: [] };
  }
  async clearOrphan() {}
  async isOrphan() {
    return false;
  }
  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T> {
    return this.mutex.run(thingName, fn);
  }
}

export interface RedisSafeLockStoreOptions {
  /** TTL do lock distribuído (renovado enquanto a operação roda). */
  lockTtlMs?: number;
  /** Quanto esperar pelo lock de outra instância antes de desistir (`LockBusyError`). */
  lockWaitMs?: number;
  prefix?: string;
}

/**
 * Redis (várias instâncias): estado em `iot:safe-lock:{thing}` (JSON, **sem TTL**: só o `finish` apaga) e índice
 * `iot:safe-lock:index` (hash `thing → { rampId, phase, commandIds }`), gravados e apagados juntos numa operação atômica; lock
 * por moto `iot:safe-lock:lock:{thing}` (`RedisMutex`). O ElastiCache usa `maxmemory-policy noeviction` (infra), então o estado
 * não é expulso; se mesmo assim sumir (failover), o índice revela a órfã. Falha de Redis propaga o erro: quem chama não publica
 * nada (falha fechada — nunca trava sem estado).
 */
export class RedisSafeLockStore implements SafeLockStore {
  private readonly mutex: RedisMutex;
  private readonly prefix: string;

  constructor(
    private readonly redis: RedisStore,
    opts: RedisSafeLockStoreOptions = {},
  ) {
    this.mutex = new RedisMutex(redis, { ttlMs: opts.lockTtlMs ?? 15_000, waitMs: opts.lockWaitMs ?? 5_000 });
    this.prefix = opts.prefix ?? 'iot:safe-lock';
  }

  private key(thingName: string) {
    return `${this.prefix}:${thingName}`;
  }
  private get index() {
    return `${this.prefix}:index`;
  }

  async get(thingName: string): Promise<RampState | null> {
    const raw = await this.redis.get(this.key(thingName));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RampState;
    } catch {
      return null;
    }
  }

  async put(ramp: RampState): Promise<void> {
    const entry = JSON.stringify({ rampId: ramp.id, phase: ramp.phase, commandIds: ramp.commandIds });
    await this.redis.setWithIndex(this.key(ramp.thingName), JSON.stringify(ramp), this.index, ramp.thingName, entry);
  }

  async remove(thingName: string, rampId: string): Promise<void> {
    const cur = await this.get(thingName);
    if (cur && cur.id !== rampId) return;
    await this.redis.delWithIndex(this.key(thingName), this.index, thingName);
  }

  async scan(): Promise<{ active: string[]; orphans: OrphanRamp[] }> {
    const entries = await this.redis.hgetall(this.index);
    const active: string[] = [];
    const orphans: OrphanRamp[] = [];
    for (const [thingName, raw] of Object.entries(entries)) {
      if (await this.redis.exists(this.key(thingName))) {
        active.push(thingName);
        continue;
      }
      try {
        const e = JSON.parse(raw) as { rampId: string; phase: SafeLockPhase; commandIds?: string[] };
        orphans.push({ thingName, rampId: e.rampId, phase: e.phase, commandIds: e.commandIds ?? [] });
      } catch {
        orphans.push({ thingName, rampId: '', phase: 'locking', commandIds: [] }); // entrada ilegível: trata como a pior fase
      }
    }
    return { active, orphans };
  }

  async isOrphan(thingName: string, rampId: string): Promise<boolean> {
    if (await this.redis.exists(this.key(thingName))) return false;
    const raw = (await this.redis.hgetall(this.index))[thingName];
    if (raw === undefined) return false;
    let id = '';
    try {
      id = (JSON.parse(raw) as { rampId?: string }).rampId ?? '';
    } catch {
      id = '';
    }
    return id === rampId;
  }

  async clearOrphan(thingName: string, rampId: string): Promise<void> {
    if (!(await this.isOrphan(thingName, rampId))) return;
    await this.redis.delWithIndex(this.key(thingName), this.index, thingName);
  }

  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T> {
    return this.mutex.run(`${this.prefix}:lock:${thingName}`, fn);
  }
}
