import { Logger } from '@nestjs/common';
import type { RedisStore } from '../../redis/redis-store';
import type { ReverseGeocoder } from '../../ports/reverse-geocoder.port';

/** Grade do cache (~11 m): posições muito próximas reaproveitam o mesmo endereço. */
export const cacheKey = (lat: number, lng: number) => `geo:rev:v1:${lat.toFixed(4)}:${lng.toFixed(4)}`;
const TTL_MS = 30 * 24 * 3600_000;
/** Marca de "sem endereço" no cache, para não perguntar de novo ao provedor a cada leitura. */
const NONE = '-';

/** Cache no Redis na frente do geocodificador (local ou Amazon Location). Falha do provedor ou do Redis → `null`. */
export class CachedReverseGeocoder implements ReverseGeocoder {
  private readonly logger = new Logger('ReverseGeocoder');

  constructor(
    private readonly inner: ReverseGeocoder,
    private readonly redis: Pick<RedisStore, 'get' | 'set'>,
  ) {}

  async reverse(lat: number, lng: number): Promise<string | null> {
    const key = cacheKey(lat, lng);
    try {
      const hit = await this.redis.get(key);
      if (hit !== null && hit !== undefined) return hit === NONE ? null : hit;
    } catch (err) {
      this.logger.warn({ msg: 'geocode_cache_read_failed', error: (err as Error).message });
    }
    let label: string | null;
    try {
      label = await this.inner.reverse(lat, lng);
    } catch (err) {
      this.logger.warn({ msg: 'geocode_failed', error: (err as Error).message });
      return null;
    }
    try {
      await this.redis.set(key, label ?? NONE, TTL_MS);
    } catch {
      /* cache é melhor esforço */
    }
    return label;
  }
}
