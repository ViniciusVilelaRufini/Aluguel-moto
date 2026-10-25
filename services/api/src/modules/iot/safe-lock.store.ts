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

/** Onde as rampas vivem. `withLock` serializa tudo o que mexe na rampa de uma moto (entre instâncias, no Redis). */
export interface SafeLockStore {
  get(thingName: string): Promise<RampState | null>;
  put(ramp: RampState): Promise<void>;
  /** Remove só se a rampa guardada ainda for `rampId`. */
  remove(thingName: string, rampId: string): Promise<void>;
  /** Motos com rampa (possivelmente) ativa — para a varredura. */
  active(): Promise<string[]>;
  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T>;
}

export { outsideLock };

/** Em memória (um processo; testes). Guarda a própria referência do objeto, como o `Map` original. */
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
  async active() {
    return [...this.ramps.keys()];
  }
  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T> {
    return this.mutex.run(thingName, fn);
  }
}

export interface RedisSafeLockStoreOptions {
  /** TTL do lock distribuído (maior que a operação mais lenta: publicar no shadow). */
  lockTtlMs?: number;
  /** Quanto esperar pelo lock de outra instância antes de desistir (`SafeLockBusyError`). */
  lockWaitMs?: number;
  /** TTL do estado da rampa: bem acima dos 120 s da rampa, para o estado nunca expirar no meio dela. */
  stateTtlMs?: number;
  prefix?: string;
}

/**
 * Redis (várias instâncias): estado em `iot:safe-lock:{thing}` (JSON, TTL de horas), índice `iot:safe-lock:active` e lock por
 * moto `iot:safe-lock:lock:{thing}` (`RedisMutex`: `SET NX PX`, liberado só pelo dono, fila local na frente). Falha de Redis propaga o erro: quem chama não publica nada (falha fechada — nunca trava sem estado).
 */
export class RedisSafeLockStore implements SafeLockStore {
  private readonly mutex: RedisMutex;
  private readonly stateTtlMs: number;
  private readonly prefix: string;

  constructor(
    private readonly redis: RedisStore,
    opts: RedisSafeLockStoreOptions = {},
  ) {
    this.mutex = new RedisMutex(redis, { ttlMs: opts.lockTtlMs ?? 15_000, waitMs: opts.lockWaitMs ?? 5_000 });
    this.stateTtlMs = opts.stateTtlMs ?? 6 * 60 * 60_000;
    this.prefix = opts.prefix ?? 'iot:safe-lock';
  }

  private key(thingName: string) {
    return `${this.prefix}:${thingName}`;
  }
  private get index() {
    return `${this.prefix}:active`;
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
    await this.redis.set(this.key(ramp.thingName), JSON.stringify(ramp), this.stateTtlMs);
    await this.redis.sadd(this.index, ramp.thingName);
  }

  async remove(thingName: string, rampId: string): Promise<void> {
    const cur = await this.get(thingName);
    if (cur && cur.id !== rampId) return;
    await this.redis.del(this.key(thingName));
    await this.redis.srem(this.index, thingName);
  }

  async active(): Promise<string[]> {
    const members = await this.redis.smembers(this.index);
    const out: string[] = [];
    for (const m of members) {
      if (await this.redis.exists(this.key(m))) out.push(m);
      else await this.redis.srem(this.index, m); // estado expirado/apagado: limpa o índice
    }
    return out;
  }

  withLock<T>(thingName: string, fn: () => Promise<T>): Promise<T> {
    return this.mutex.run(`${this.prefix}:lock:${thingName}`, fn);
  }
}
