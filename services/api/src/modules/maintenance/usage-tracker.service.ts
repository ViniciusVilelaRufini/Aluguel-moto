import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IotTelemetryEvent } from '../../common/events';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { accumulateUsage, type UsageSample } from './usage-accumulator';

const key = (vehicleId: string) => `vehicle:usage:${vehicleId}`;
/** Escritores concorrentes na mesma moto: tentativas do compare-and-set antes de desistir da amostra. */
const MAX_CAS_ATTEMPTS = 5;

/**
 * Acumula odômetro e horas de uso por moto entre gravações no Postgres (contrato v2). A última amostra e o acumulado
 * pendente ficam no Redis (`vehicle:usage:{id}`); o `VehiclesService` soma o pendente na linha da moto a cada 30 s.
 */
@Injectable()
export class UsageTracker {
  private readonly logger = new Logger('UsageTracker');

  constructor(@Inject(REDIS_STORE) private readonly redis: RedisStore) {}

  /**
   * Fix round 2 (M4): ler a amostra anterior e gravar a nova (com o acumulado) é atômico — a gravação é um compare-and-set
   * no `ts` lido (Lua no Redis). Se outra instância gravou antes, relê e recalcula; amostra igual ou mais antiga é ignorada.
   */
  async record(ev: Pick<IotTelemetryEvent, 'vehicleId' | 'lat' | 'lng' | 'ts' | 'ignition' | 'speedKmh'>): Promise<void> {
    const next: UsageSample = { lat: ev.lat, lng: ev.lng, ts: Date.parse(ev.ts), ignition: ev.ignition, speedKmh: ev.speedKmh };
    if (!Number.isFinite(next.ts)) return;
    for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
      const h = await this.redis.hgetall(key(ev.vehicleId));
      const prev: UsageSample | undefined = h.ts
        ? { lat: Number(h.lat), lng: Number(h.lng), ts: Number(h.ts), ignition: h.ignition === 'true', speedKmh: Number(h.speedKmh) }
        : undefined;
      // Amostra fora de ordem (ou repetida) não substitui a referência.
      if (prev && next.ts <= prev.ts) return;
      const { km, hours } = accumulateUsage(prev, next);
      const written = await this.redis.hcas(
        key(ev.vehicleId),
        'ts',
        h.ts ?? null,
        { lat: String(next.lat), lng: String(next.lng), ts: String(next.ts), ignition: String(next.ignition), speedKmh: String(next.speedKmh) },
        { pendingKm: km, pendingHours: hours },
      );
      if (written) return;
    }
    this.logger.warn({ msg: 'usage_sample_contended', vehicleId: ev.vehicleId });
  }

  /** Lê e zera o acumulado pendente (para somar no Postgres). */
  async take(vehicleId: string): Promise<{ km: number; hours: number }> {
    const [km, hours] = await this.redis.htakeFloats(key(vehicleId), ['pendingKm', 'pendingHours']);
    return { km, hours };
  }

  /** Correção manual do odômetro: descarta o pendente. */
  async reset(vehicleId: string): Promise<void> {
    await this.redis.hset(key(vehicleId), { pendingKm: '0', pendingHours: '0' });
  }
}
