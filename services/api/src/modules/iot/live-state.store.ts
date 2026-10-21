import { MAX_SPEED_KMH } from '../../common/enums';
import type { VehicleLiveState } from '../../ports/iot-gateway.port';
import type { RedisStore } from '../../redis/redis-store';
import type { Clock } from './clock';
import type { TelemetryMessage } from './mqtt-contract';
import type { ReportedState } from './shadow-transport';

/** Sem telemetria por mais que isto → offline (3 × o intervalo de 60 s da moto parada). */
export const DEFAULT_OFFLINE_AFTER_MS = 180_000;
/** Amostra de velocidade mais velha que isto não serve para decidir a trava (é tratada como desconhecida = em movimento). */
export const SPEED_FRESH_MS = 10_000;

/**
 * Estado ao vivo por rastreador (thingName): telemetria + reported do shadow + conectividade.
 * Memória com write-through no Redis (`iot:live:{thingName}`), para sobreviver a reinícios.
 * Não guarda nenhum dado do cliente: só o estado da moto.
 */
export class LiveStateStore {
  private readonly states = new Map<string, VehicleLiveState>();
  /** Horário (relógio do servidor) da última amostra de velocidade aceita. Ausente = desconhecida. Não persiste: após reinício, desconhecida. */
  private readonly speedAt = new Map<string, number>();
  /** Início da conexão atual: amostras anteriores a ela não valem. */
  private readonly reconnectAt = new Map<string, number>();
  private readonly held = new Map<string, boolean>();

  constructor(
    private readonly redis: RedisStore,
    private readonly clock: Clock,
    private readonly offlineAfterMs = DEFAULT_OFFLINE_AFTER_MS,
  ) {}

  private key(thingName: string): string {
    return `iot:live:${thingName}`;
  }

  private blank(thingName: string): VehicleLiveState {
    return {
      thingName,
      lat: 0,
      lng: 0,
      speedKmh: 0,
      batteryPct: 0,
      locked: true,
      ignition: false,
      signal: 0,
      speedLimitKmh: MAX_SPEED_KMH,
      stolenMode: false,
      online: false,
      lastSeenAt: new Date(0).toISOString(),
    };
  }

  get(thingName: string): VehicleLiveState | null {
    return this.states.get(thingName) ?? null;
  }

  async load(thingName: string): Promise<VehicleLiveState | null> {
    const mem = this.states.get(thingName);
    if (mem) return mem;
    const h = await this.redis.hgetall(this.key(thingName)).catch(() => ({}) as Record<string, string>);
    if (!h || !h.lastSeenAt) return null;
    const s: VehicleLiveState = {
      thingName,
      lat: Number(h.lat),
      lng: Number(h.lng),
      speedKmh: Number(h.speedKmh),
      batteryPct: Number(h.batteryPct),
      locked: h.locked === 'true',
      ignition: h.ignition === 'true',
      signal: Number(h.signal),
      speedLimitKmh: Number(h.speedLimitKmh ?? MAX_SPEED_KMH),
      stolenMode: h.stolenMode === 'true',
      online: h.online === 'true',
      lastSeenAt: h.lastSeenAt,
    };
    this.states.set(thingName, s);
    return s;
  }

  /** Online = marcado online e visto há menos de `offlineAfterMs`. */
  isOnline(thingName: string): boolean {
    const s = this.states.get(thingName);
    if (!s || !s.online) return false;
    return this.clock.now() - Date.parse(s.lastSeenAt) < this.offlineAfterMs;
  }

  /** Rastreadores marcados online mas sem notícia há mais que o limite (vigia de inatividade). */
  stale(): string[] {
    const now = this.clock.now();
    return [...this.states.values()].filter((s) => s.online && now - Date.parse(s.lastSeenAt) >= this.offlineAfterMs).map((s) => s.thingName);
  }

  /** Velocidade conhecida e fresca, ou `null` (desconhecida, velha ou anterior à reconexão) — nunca 0 por padrão. */
  knownSpeed(thingName: string): number | null {
    const s = this.states.get(thingName);
    const at = this.speedAt.get(thingName);
    if (!s || at === undefined) return null;
    if (this.clock.now() - at > SPEED_FRESH_MS) return null;
    return s.speedKmh;
  }

  /** Presença `connected`: a velocidade de antes da desconexão deixa de valer até chegar amostra nova. */
  markReconnected(thingName: string): void {
    this.speedAt.delete(thingName);
    this.reconnectAt.set(thingName, this.clock.now());
  }

  /** "Limite segurado em 0" depois de `did_not_stop`: persiste até um unlock explícito. */
  async isHeld(thingName: string): Promise<boolean> {
    const mem = this.held.get(thingName);
    if (mem !== undefined) return mem;
    const v = (await this.redis.get(`iot:held:${thingName}`).catch(() => null)) === '1';
    this.held.set(thingName, v);
    return v;
  }

  async setHeld(thingName: string, on: boolean): Promise<void> {
    this.held.set(thingName, on);
    if (on) await this.redis.set(`iot:held:${thingName}`, '1').catch(() => undefined);
    else await this.redis.del(`iot:held:${thingName}`).catch(() => undefined);
  }

  async applyTelemetry(thingName: string, t: TelemetryMessage): Promise<VehicleLiveState> {
    const s = (await this.load(thingName)) ?? this.blank(thingName);
    Object.assign(s, {
      lat: t.lat,
      lng: t.lng,
      speedKmh: t.velocidade_kmh,
      batteryPct: t.bateria_pct,
      locked: t.travada,
      ignition: t.ignicao,
      signal: t.sinal,
      online: true,
      lastSeenAt: new Date(this.clock.now()).toISOString(),
    });
    this.speedAt.set(thingName, this.clock.now());
    this.states.set(thingName, s);
    await this.persist(s);
    return s;
  }

  /**
   * Aplica um `reported`. Do rastreador (MQTT): marca online e a velocidade vale como amostra de agora.
   * Do polling (`fromPoll`): não mexe na conectividade; a velocidade só é aceita com horário (metadata) mais novo que a última
   * amostra, não anterior à reconexão e fresco. Devolve se a velocidade foi aceita.
   */
  async applyReported(thingName: string, r: ReportedState, opts: { fromPoll?: boolean; speedAt?: number } = {}): Promise<{ state: VehicleLiveState; speedAccepted: boolean }> {
    const s = (await this.load(thingName)) ?? this.blank(thingName);
    const now = this.clock.now();
    if (r.travada !== undefined) s.locked = r.travada;
    if (r.limite_kmh !== undefined) s.speedLimitKmh = r.limite_kmh;
    if (r.modo_roubada !== undefined) s.stolenMode = r.modo_roubada;
    let speedAccepted = false;
    if (r.velocidade_kmh !== undefined) {
      const sampleAt = opts.fromPoll ? opts.speedAt : (opts.speedAt ?? now);
      const last = this.speedAt.get(thingName);
      const since = this.reconnectAt.get(thingName);
      if (
        sampleAt !== undefined &&
        (last === undefined || sampleAt > last || (!opts.fromPoll && sampleAt >= last)) &&
        (since === undefined || sampleAt >= since) &&
        now - sampleAt <= SPEED_FRESH_MS
      ) {
        s.speedKmh = r.velocidade_kmh;
        this.speedAt.set(thingName, sampleAt);
        speedAccepted = true;
      }
    }
    if (!opts.fromPoll) {
      s.online = true;
      s.lastSeenAt = new Date(now).toISOString();
    }
    this.states.set(thingName, s);
    await this.persist(s);
    return { state: s, speedAccepted };
  }

  async setOnline(thingName: string, online: boolean): Promise<VehicleLiveState> {
    const s = (await this.load(thingName)) ?? this.blank(thingName);
    s.online = online;
    if (!online) this.speedAt.delete(thingName);
    if (online) s.lastSeenAt = new Date(this.clock.now()).toISOString();
    this.states.set(thingName, s);
    await this.persist(s);
    return s;
  }

  private async persist(s: VehicleLiveState): Promise<void> {
    const values: Record<string, string> = {};
    for (const [k, v] of Object.entries(s)) values[k] = String(v);
    await this.redis.hset(this.key(s.thingName), values).catch(() => undefined);
  }
}
