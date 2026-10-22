import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { RedisStore } from '../redis/redis-store';

/**
 * QA-18: rate limit compartilhado entre as tasks ECS (antes cada processo contava sozinho). Janela fixa por chave
 * (`throttle:{nome}:{chave}`, INCR + PEXPIRE no Redis); acima do limite fica bloqueado até a janela acabar.
 * Redis indisponível → deixa passar (a API não cai por causa do limitador; o WAF continua na frente).
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger('RedisThrottlerStorage');

  constructor(private readonly redis: Pick<RedisStore, 'incrWindow'>) {}

  async increment(key: string, ttl: number, limit: number, _blockDuration: number, throttlerName: string) {
    try {
      const { count, ttlMs } = await this.redis.incrWindow(`throttle:${throttlerName}:${key}`, ttl);
      const seconds = Math.max(1, Math.ceil(ttlMs / 1000));
      const isBlocked = count > limit;
      return { totalHits: count, timeToExpire: seconds, isBlocked, timeToBlockExpire: isBlocked ? seconds : 0 };
    } catch (err) {
      this.logger.warn({ msg: 'throttle_storage_unavailable', error: (err as Error).message });
      return { totalHits: 0, timeToExpire: Math.ceil(ttl / 1000), isBlocked: false, timeToBlockExpire: 0 };
    }
  }
}
