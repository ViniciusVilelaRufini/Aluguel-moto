import type { EventEmitter2 } from '@nestjs/event-emitter';
import { MAX_SPEED_KMH } from '../../../common/enums';
import { EV, type ZoneSpeedExceededEvent } from '../../../common/events';
import type { RedisStore } from '../../../redis/redis-store';
import type { TrackerModeLookup } from '../tracker-mode';
import type { RentalLookup } from './geofence.service';

/** Acima do limite da zona por mais que isto → alerta (spec GT06 §10). */
export const ZONE_SPEED_EXCEEDED_AFTER_MS = 5_000;
/** Episódio sem amostra por mais que isto é esquecido. */
const EPISODE_TTL_MS = 60_000;

export interface ZoneSpeedSample {
  vehicleId: string;
  thingName: string;
  speedKmh: number;
  /** Hora da medição limitada a agora (ms). */
  measuredAt: number;
}

interface Episode {
  since: number;
  limit: number;
  alerted: boolean;
}

/**
 * Rastreador só relé não reduz a velocidade: acima do limite da zona em que está (o mesmo `effectiveLimit` do motor de cercas)
 * por mais de 5 s → `zone.speed-exceeded` (um por episódio; o `AlertsService` agrupa repetições da moto em 10 min). Episódio no
 * Redis (`geofence:zone-speed:{thing}`), lido por qualquer instância. Falha de leitura do tipo = `speed_control` (não alerta).
 */
export class ZoneSpeedMonitor {
  constructor(
    private readonly modes: TrackerModeLookup,
    private readonly limits: { effectiveLimit(thingName: string): Promise<number> },
    private readonly redis: RedisStore,
    private readonly events: Pick<EventEmitter2, 'emit'>,
    private readonly rentals: Pick<RentalLookup, 'openRentalId'>,
  ) {}

  private key(thingName: string): string {
    return `geofence:zone-speed:${thingName}`;
  }

  async onSample(s: ZoneSpeedSample): Promise<void> {
    const mode = await this.modes.byVehicle(s.vehicleId).catch(() => 'speed_control' as const);
    if (mode !== 'relay_only') return;
    const limit = await this.limits.effectiveLimit(s.thingName);
    if (limit >= MAX_SPEED_KMH || !(s.speedKmh > limit)) {
      await this.redis.del(this.key(s.thingName)).catch(() => undefined);
      return;
    }
    const ep = parseEpisode(await this.redis.get(this.key(s.thingName)).catch(() => null));
    if (ep && ep.limit === limit && s.measuredAt < ep.since) return; // mais velha que o episódio: ignorada
    if (!ep || ep.limit !== limit) {
      await this.save(s.thingName, { since: s.measuredAt, limit, alerted: false });
      return;
    }
    if (ep.alerted || s.measuredAt - ep.since <= ZONE_SPEED_EXCEEDED_AFTER_MS) {
      await this.save(s.thingName, ep);
      return;
    }
    await this.save(s.thingName, { ...ep, alerted: true });
    const ev: ZoneSpeedExceededEvent = { vehicleId: s.vehicleId, speedLimitKmh: limit, speedKmh: Math.round(s.speedKmh * 10) / 10, ts: new Date(s.measuredAt).toISOString() };
    const rentalId = await this.rentals.openRentalId(s.vehicleId).catch(() => undefined);
    if (rentalId) ev.rentalId = rentalId;
    this.events.emit(EV.ZONE_SPEED_EXCEEDED, ev);
  }

  private async save(thingName: string, ep: Episode): Promise<void> {
    await this.redis.set(this.key(thingName), JSON.stringify(ep), EPISODE_TTL_MS).catch(() => undefined);
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
