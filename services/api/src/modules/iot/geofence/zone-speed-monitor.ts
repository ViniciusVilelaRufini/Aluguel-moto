import type { EventEmitter2 } from '@nestjs/event-emitter';
import { MAX_SPEED_KMH } from '../../../common/enums';
import { EV, type SpeedCeilingExceededEvent, type ZoneSpeedExceededEvent } from '../../../common/events';
import type { RedisStore } from '../../../redis/redis-store';
import type { TrackerModeLookup } from '../tracker-mode';
import type { RentalLookup } from './geofence.service';

/** Acima do limite da zona por mais que isto → alerta (spec GT06 §10). */
export const ZONE_SPEED_EXCEEDED_AFTER_MS = 5_000;
/** Tolerância do GPS sobre o teto legal: só acima de 32 + isto conta como limitador fora da norma (auditoria 4, item 3). */
export const SPEED_CEILING_GPS_TOLERANCE_KMH = 3;
/** Acima disto (estritamente) por mais de `ZONE_SPEED_EXCEEDED_AFTER_MS` → `speed_limiter_noncompliant`. */
export const SPEED_CEILING_ALERT_KMH = MAX_SPEED_KMH + SPEED_CEILING_GPS_TOLERANCE_KMH;
/** Episódio sem amostra por mais que isto é esquecido. */
const EPISODE_TTL_MS = 60_000;

export interface ZoneSpeedSample {
  vehicleId: string;
  thingName: string;
  speedKmh: number;
  /** Hora da medição limitada a agora (ms). */
  measuredAt: number;
  /** `travada` da telemetria: o teto legal só alerta com a moto destravada ou em aluguel (P5: moto travada na van). */
  locked: boolean;
}

interface Episode {
  since: number;
  limit: number;
  alerted: boolean;
}

/**
 * Rastreador só relé não reduz a velocidade: acima do limite da zona em que está (o limite gravado pelo motor de cercas)
 * por mais de 5 s → `zone.speed-exceeded` (um por episódio; o `AlertsService` agrupa repetições da moto em 10 min). Episódio no
 * Redis (`geofence:zone-speed:{thing}`), lido por qualquer instância. Falha de leitura do tipo = `speed_control` (não alerta).
 * Limite efetivo da zona = min(gravado ?? 32, 32): só zona abaixo de 32 gera alerta de zona.
 *
 * Teto legal (auditoria 4, item 3; contrato `telemetria.schema.json`): acima de `SPEED_CEILING_ALERT_KMH` (32 + 3 de
 * tolerância do GPS) por mais de 5 s → `iot.speed-ceiling-exceeded` (alerta `speed_limiter_noncompliant`), um por episódio,
 * em **qualquer** tipo de rastreador e mesmo sem limite gravado ou com falha ao ler o tipo — a moto acima do teto está fora da
 * Resolução Contran 996/2023 seja qual for a causa. Episódio próprio no Redis (`geofence:speed-ceiling:{thing}`).
 */
export class ZoneSpeedMonitor {
  constructor(
    private readonly modes: TrackerModeLookup,
    private readonly limits: { storedLimit(thingName: string): Promise<number | null> },
    private readonly redis: RedisStore,
    private readonly events: Pick<EventEmitter2, 'emit'>,
    private readonly rentals: Pick<RentalLookup, 'openRentalId'>,
  ) {}

  private key(thingName: string): string {
    return `geofence:zone-speed:${thingName}`;
  }

  private ceilingKey(thingName: string): string {
    return `geofence:speed-ceiling:${thingName}`;
  }

  async onSample(s: ZoneSpeedSample): Promise<void> {
    await this.checkCeiling(s);
    const mode = await this.modes.byVehicle(s.vehicleId).catch(() => 'speed_control' as const);
    if (mode !== 'relay_only') return;
    // Só o limite gravado: o de falha fechada (6 km/h, motor de cercas fora) geraria alerta falso. Desconhecido = 32 (o teto
    // legal, conferido acima) = sem alerta de zona.
    const limit = Math.min((await this.limits.storedLimit(s.thingName)) ?? MAX_SPEED_KMH, MAX_SPEED_KMH);
    if (limit >= MAX_SPEED_KMH || !(s.speedKmh > limit)) {
      await this.redis.del(this.key(s.thingName)).catch(() => undefined);
      return;
    }
    if (!(await this.episodeElapsed(this.key(s.thingName), limit, s.measuredAt))) return;
    const ev: ZoneSpeedExceededEvent = { vehicleId: s.vehicleId, speedLimitKmh: limit, speedKmh: Math.round(s.speedKmh * 10) / 10, ts: new Date(s.measuredAt).toISOString() };
    const rentalId = await this.rentals.openRentalId(s.vehicleId).catch(() => undefined);
    if (rentalId) ev.rentalId = rentalId;
    this.events.emit(EV.ZONE_SPEED_EXCEEDED, ev);
  }

  /**
   * Teto legal: independe do tipo do rastreador e da zona. Só com a moto destravada ou em aluguel aberto (P5): travada e sem
   * aluguel ela está sendo transportada (van), e a velocidade é a do veículo que a leva. Aluguel só é consultado acima do teto.
   */
  private async checkCeiling(s: ZoneSpeedSample): Promise<void> {
    const key = this.ceilingKey(s.thingName);
    let rentalId: string | undefined;
    const over = s.speedKmh > SPEED_CEILING_ALERT_KMH;
    if (over && s.locked !== false) rentalId = await this.rentals.openRentalId(s.vehicleId).catch(() => undefined);
    if (!over || (s.locked !== false && !rentalId)) {
      await this.redis.del(key).catch(() => undefined);
      return;
    }
    if (!(await this.episodeElapsed(key, MAX_SPEED_KMH, s.measuredAt))) return;
    const ev: SpeedCeilingExceededEvent = { vehicleId: s.vehicleId, speedKmh: Math.round(s.speedKmh * 10) / 10, ts: new Date(s.measuredAt).toISOString() };
    rentalId ??= await this.rentals.openRentalId(s.vehicleId).catch(() => undefined);
    if (rentalId) ev.rentalId = rentalId;
    this.events.emit(EV.SPEED_CEILING_EXCEEDED, ev);
  }

  /**
   * Amostra acima de `limit` num episódio guardado em `key`: `true` uma única vez por episódio, quando ele passa de
   * `ZONE_SPEED_EXCEEDED_AFTER_MS` (marca `alerted`). Amostra mais velha que o início é ignorada; limite novo recomeça.
   */
  private async episodeElapsed(key: string, limit: number, measuredAt: number): Promise<boolean> {
    const ep = parseEpisode(await this.redis.get(key).catch(() => null));
    if (ep && ep.limit === limit && measuredAt < ep.since) return false; // mais velha que o episódio: ignorada
    if (!ep || ep.limit !== limit) {
      await this.save(key, { since: measuredAt, limit, alerted: false });
      return false;
    }
    if (ep.alerted || measuredAt - ep.since <= ZONE_SPEED_EXCEEDED_AFTER_MS) {
      await this.save(key, ep);
      return false;
    }
    await this.save(key, { ...ep, alerted: true });
    return true;
  }

  private async save(key: string, ep: Episode): Promise<void> {
    await this.redis.set(key, JSON.stringify(ep), EPISODE_TTL_MS).catch(() => undefined);
  }
}

function parseEpisode(raw: string | null): Episode | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Episode>;
    return typeof v.since === 'number' && typeof v.limit === 'number' && typeof v.alerted === 'boolean' ? { since: v.since, limit: v.limit, alerted: v.alerted } : null;
  } catch {
    return null;
  }
}
