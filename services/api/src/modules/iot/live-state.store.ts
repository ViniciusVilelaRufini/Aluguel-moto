import { MAX_SPEED_KMH } from '../../common/enums';
import type { VehicleLiveState } from '../../ports/iot-gateway.port';
import type { RedisStore } from '../../redis/redis-store';
import type { Clock } from './clock';
import type { TelemetryMessage } from './mqtt-contract';
import type { ReportedState } from './shadow-transport';

/** Sem telemetria por mais que isto → offline (3 × o intervalo de 60 s da moto parada). */
export const DEFAULT_OFFLINE_AFTER_MS = 180_000;

/**
 * Estado ao vivo por rastreador (thingName): telemetria + reported do shadow + conectividade.
 * Memória com write-through no Redis (`iot:live:{thingName}`), para sobreviver a reinícios.
 * Não guarda nenhum dado do cliente: só o estado da moto.
 */
export class LiveStateStore {
  private readonly states = new Map<string, VehicleLiveState>();

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
    this.states.set(thingName, s);
    await this.persist(s);
    return s;
  }

  async applyReported(thingName: string, r: ReportedState): Promise<VehicleLiveState> {
    const s = (await this.load(thingName)) ?? this.blank(thingName);
    if (r.travada !== undefined) s.locked = r.travada;
    if (r.limite_kmh !== undefined) s.speedLimitKmh = r.limite_kmh;
    if (r.modo_roubada !== undefined) s.stolenMode = r.modo_roubada;
    if (r.velocidade_kmh !== undefined) s.speedKmh = r.velocidade_kmh;
    s.online = true;
    s.lastSeenAt = new Date(this.clock.now()).toISOString();
    this.states.set(thingName, s);
    await this.persist(s);
    return s;
  }

  async setOnline(thingName: string, online: boolean): Promise<VehicleLiveState> {
    const s = (await this.load(thingName)) ?? this.blank(thingName);
    s.online = online;
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
