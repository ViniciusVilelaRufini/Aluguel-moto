import { Inject, Injectable } from '@nestjs/common';
import type { IotTelemetryEvent } from '../../common/events';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { accumulateUsage, type UsageSample } from './usage-accumulator';

const key = (vehicleId: string) => `vehicle:usage:${vehicleId}`;

/**
 * Acumula odômetro e horas de uso por moto entre gravações no Postgres (contrato v2). A última amostra e o acumulado
 * pendente ficam no Redis (`vehicle:usage:{id}`); o `VehiclesService` soma o pendente na linha da moto a cada 30 s.
 */
@Injectable()
export class UsageTracker {
  constructor(@Inject(REDIS_STORE) private readonly redis: RedisStore) {}

  async record(ev: Pick<IotTelemetryEvent, 'vehicleId' | 'lat' | 'lng' | 'ts' | 'ignition' | 'speedKmh'>): Promise<void> {
    const h = await this.redis.hgetall(key(ev.vehicleId));
    const prev: UsageSample | undefined = h.ts
      ? { lat: Number(h.lat), lng: Number(h.lng), ts: Number(h.ts), ignition: h.ignition === 'true', speedKmh: Number(h.speedKmh) }
      : undefined;
    const next: UsageSample = { lat: ev.lat, lng: ev.lng, ts: Date.parse(ev.ts), ignition: ev.ignition, speedKmh: ev.speedKmh };
    if (!Number.isFinite(next.ts)) return;
    // Amostra fora de ordem não substitui a referência.
    if (prev && next.ts <= prev.ts) return;
    const { km, hours } = accumulateUsage(prev, next);
    await this.redis.hset(key(ev.vehicleId), {
      lat: String(next.lat), lng: String(next.lng), ts: String(next.ts), ignition: String(next.ignition), speedKmh: String(next.speedKmh),
      pendingKm: String((Number(h.pendingKm) || 0) + km),
      pendingHours: String((Number(h.pendingHours) || 0) + hours),
    });
  }

  /** Lê e zera o acumulado pendente (para somar no Postgres). */
  async take(vehicleId: string): Promise<{ km: number; hours: number }> {
    const h = await this.redis.hgetall(key(vehicleId));
    const km = Number(h.pendingKm) || 0;
    const hours = Number(h.pendingHours) || 0;
    if (km || hours) await this.redis.hset(key(vehicleId), { pendingKm: '0', pendingHours: '0' });
    return { km, hours };
  }

  /** Correção manual do odômetro: descarta o pendente. */
  async reset(vehicleId: string): Promise<void> {
    await this.redis.hset(key(vehicleId), { pendingKm: '0', pendingHours: '0' });
  }
}
