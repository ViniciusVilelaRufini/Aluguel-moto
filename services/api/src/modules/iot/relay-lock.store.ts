import { LocalMutex, outsideLock, RedisMutex } from '../../redis/redis-mutex';
import type { RedisStore } from '../../redis/redis-store';

export type RelayLockPhase = 'waiting_online' | 'waiting_stop' | 'cutting';

/** Sequência de telemetrias paradas (< 3 km/h) aceitas e consecutivas; `firstAt`/`lastAt` = hora da medição limitada a agora. */
export interface RelayStillRun {
  firstAt: number;
  lastAt: number;
  count: number;
}

/**
 * Trava de rastreador só relé (spec GT06 §5). Tudo o que decide o próximo passo fica aqui (Redis em produção), para outra
 * instância — ou a mesma depois de um deploy — continuar: prazos são horários absolutos; timers locais só antecipam a varredura.
 */
export interface RelayLockState {
  id: string;
  thingName: string;
  commandIds: string[];
  phase: RelayLockPhase;
  run?: RelayStillRun;
  /** Maior `timestamp` bruto (relógio do rastreador) visto desde o início/última reconexão: amostra mais velha é ignorada. */
  newestDeviceTs?: number;
  /** Início da espera (fase `waiting_stop`): `reported.travada` mais antigo não confirma. */
  startedAt?: number;
  deadlineAt?: number;
  /** Quando `travada: true` foi gravado (fase `cutting`). */
  cutAt?: number;
}

/** No índice sem estado (failover que perdeu escritas): a varredura encerra os comandos e, se o corte saiu, grava `travada: false`. */
export interface OrphanRelayLock {
  thingName: string;
  lockId: string;
  phase: RelayLockPhase;
  commandIds: string[];
}

export interface RelayLockStore {
  get(thingName: string): Promise<RelayLockState | null>;
  put(state: RelayLockState): Promise<void>;
  /** Remove só se a trava guardada ainda for `lockId`. */
  remove(thingName: string, lockId: string): Promise<void>;
  scan(): Promise<{ active: string[]; orphans: OrphanRelayLock[] }>;
  /** Tira a órfã do índice (só se a entrada ainda for `lockId` e não houver estado). */
  clearOrphan(thingName: string, lockId: string): Promise<void>;
  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T>;
}

export { outsideLock };

const clone = (s: RelayLockState): RelayLockState => JSON.parse(JSON.stringify(s)) as RelayLockState;

/** Um processo (testes). Guarda cópias, como o Redis: mexer no objeto devolvido não muda o guardado. */
export class MemoryRelayLockStore implements RelayLockStore {
  private readonly states = new Map<string, RelayLockState>();
  private readonly mutex = new LocalMutex();

  async get(thingName: string) {
    const s = this.states.get(thingName);
    return s ? clone(s) : null;
  }
  async put(state: RelayLockState) {
    this.states.set(state.thingName, clone(state));
  }
  async remove(thingName: string, lockId: string) {
    if (this.states.get(thingName)?.id === lockId) this.states.delete(thingName);
  }
  async scan() {
    return { active: [...this.states.keys()], orphans: [] as OrphanRelayLock[] };
  }
  async clearOrphan() {}
  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T> {
    return this.mutex.run(thingName, fn);
  }
}

/**
 * Redis (várias instâncias): estado em `iot:relay-lock:{thing}` (JSON, sem TTL; só o fim da trava apaga), índice
 * `iot:relay-lock:index` (hash thing → { lockId, phase, commandIds }) gravado junto, e lock por moto `iot:relay-lock:lock:{thing}`.
 * Erro do Redis propaga: quem chama não publica nada (falha fechada — nunca corta sem estado).
 */
export class RedisRelayLockStore implements RelayLockStore {
  private readonly mutex: RedisMutex;

  constructor(
    private readonly redis: RedisStore,
    private readonly prefix = 'iot:relay-lock',
  ) {
    this.mutex = new RedisMutex(redis, { ttlMs: 15_000, waitMs: 5_000 });
  }

  private key(thingName: string) {
    return `${this.prefix}:${thingName}`;
  }
  private get index() {
    return `${this.prefix}:index`;
  }

  async get(thingName: string): Promise<RelayLockState | null> {
    const raw = await this.redis.get(this.key(thingName));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RelayLockState;
    } catch {
      return null;
    }
  }

  async put(state: RelayLockState): Promise<void> {
    const entry = JSON.stringify({ lockId: state.id, phase: state.phase, commandIds: state.commandIds });
    await this.redis.setWithIndex(this.key(state.thingName), JSON.stringify(state), this.index, state.thingName, entry);
  }

  async remove(thingName: string, lockId: string): Promise<void> {
    const cur = await this.get(thingName);
    if (cur && cur.id !== lockId) return;
    await this.redis.delWithIndex(this.key(thingName), this.index, thingName);
  }

  async scan(): Promise<{ active: string[]; orphans: OrphanRelayLock[] }> {
    const entries = await this.redis.hgetall(this.index);
    const active: string[] = [];
    const orphans: OrphanRelayLock[] = [];
    for (const [thingName, raw] of Object.entries(entries)) {
      if (await this.redis.exists(this.key(thingName))) {
        active.push(thingName);
        continue;
      }
      try {
        const e = JSON.parse(raw) as { lockId: string; phase: RelayLockPhase; commandIds?: string[] };
        orphans.push({ thingName, lockId: e.lockId, phase: e.phase, commandIds: e.commandIds ?? [] });
      } catch {
        orphans.push({ thingName, lockId: '', phase: 'cutting', commandIds: [] }); // ilegível: trata como a pior fase
      }
    }
    return { active, orphans };
  }

  async clearOrphan(thingName: string, lockId: string): Promise<void> {
    if (await this.redis.exists(this.key(thingName))) return;
    const raw = (await this.redis.hgetall(this.index))[thingName];
    if (raw === undefined) return;
    let current = '';
    try {
      current = (JSON.parse(raw) as { lockId?: string }).lockId ?? '';
    } catch {
      current = '';
    }
    if (current !== lockId) return;
    await this.redis.delWithIndex(this.key(thingName), this.index, thingName);
  }

  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T> {
    return this.mutex.run(`${this.prefix}:lock:${thingName}`, fn);
  }
}
