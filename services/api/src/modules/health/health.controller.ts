import { Controller, Get, Inject, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { Public } from '../auth/principal';

/** Health check do ALB: banco fora → 503; Redis fora → `degraded` (ainda atende). */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_STORE) private readonly redis: RedisStore,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  @Get()
  @Public()
  @SkipThrottle()
  async check(@Res({ passthrough: true }) res: Response) {
    const db = await this.prisma.$queryRaw`SELECT 1`.then(() => 'ok' as const).catch(() => 'down' as const);
    const redis = (await this.redis.ping()) ? ('ok' as const) : ('degraded' as const);
    const status = db === 'down' ? 'down' : redis === 'ok' ? 'ok' : 'degraded';
    if (status === 'down') {
      res.status(503).type('application/problem+json');
      return { type: 'https://api.volti.com.br/problems/internal-error', title: 'Serviço indisponível', status: 503, detail: 'Banco de dados indisponível.', code: 'internal-error' };
    }
    return { status, version: this.cfg.version, time: new Date().toISOString(), checks: { database: db, redis } };
  }
}
