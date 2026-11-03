import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { ExclusiveJob } from '../../common/job-lock';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';

/** Linhas apagadas por comando (lotes curtos: transações e locks pequenos, sem inchar o WAL de uma vez). */
export const HOUSEKEEPING_BATCH = 5000;
/** Teto de lotes por tabela numa rodada (2,5 milhões de linhas); o resto fica para o dia seguinte. */
export const HOUSEKEEPING_MAX_BATCHES = 500;
/** Webhooks processados ficam 90 dias (o gateway não reenvia um evento tão antigo; a deduplicação não precisa de mais). */
export const PROCESSED_WEBHOOK_RETENTION_DAYS = 90;

/** Tabelas e colunas fixas (nunca vêm de entrada): entram no SQL como identificadores. */
type Target = { table: 'IdempotencyRecord'; column: 'expiresAt' } | { table: 'ProcessedWebhook'; column: 'processedAt' };

/**
 * Auditoria run-4: expurgo diário das tabelas técnicas que só cresciam — `IdempotencyRecord` vencido (`expiresAt < agora`;
 * o store só apagava o registro vencido quando a mesma chave voltava) e `ProcessedWebhook` com mais de 90 dias.
 */
@Injectable()
export class HousekeepingService {
  private readonly logger = new Logger('HousekeepingService');
  /** Relógio (substituível nos testes). */
  now: () => Date = () => new Date();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  /** Apaga `IdempotencyRecord` com `expiresAt` no passado. */
  purgeExpiredIdempotency(): Promise<number> {
    return this.purgeBefore({ table: 'IdempotencyRecord', column: 'expiresAt' }, this.now());
  }

  /** Apaga `ProcessedWebhook` processado há mais de `PROCESSED_WEBHOOK_RETENTION_DAYS` dias. */
  purgeOldProcessedWebhooks(): Promise<number> {
    const cutoff = new Date(this.now().getTime() - PROCESSED_WEBHOOK_RETENTION_DAYS * 86_400_000);
    return this.purgeBefore({ table: 'ProcessedWebhook', column: 'processedAt' }, cutoff);
  }

  /** Job diário (04:15 em São Paulo, depois do expurgo LGPD das 03:30). */
  @Cron('15 4 * * *', { name: 'housekeeping-ttl', timeZone: 'America/Sao_Paulo' })
  @ExclusiveJob('housekeeping-ttl', 30 * 60_000)
  async purgeJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    const idempotency = await this.purgeExpiredIdempotency().catch((err) => this.failed('idempotency', err));
    const webhooks = await this.purgeOldProcessedWebhooks().catch((err) => this.failed('processed_webhooks', err));
    this.logger.log({ msg: 'housekeeping_purged', idempotency, webhooks });
  }

  /**
   * DELETE em lotes de `HOUSEKEEPING_BATCH` (`id IN (SELECT ... LIMIT)`; o Postgres não tem `DELETE ... LIMIT`), até um lote
   * vir incompleto ou atingir o teto. As colunas são `timestamp` sem fuso gravadas em UTC: o corte vai convertido para UTC.
   */
  private async purgeBefore(target: Target, cutoff: Date): Promise<number> {
    const table = Prisma.raw(`"${target.table}"`);
    const column = Prisma.raw(`"${target.column}"`);
    const bound = Prisma.sql`(${cutoff.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
    let total = 0;
    for (let i = 0; i < HOUSEKEEPING_MAX_BATCHES; i++) {
      const deleted = await this.prisma.$executeRaw(
        Prisma.sql`DELETE FROM ${table} WHERE "id" IN (SELECT "id" FROM ${table} WHERE ${column} < ${bound} LIMIT ${Prisma.raw(String(HOUSEKEEPING_BATCH))})`,
      );
      total += deleted;
      if (deleted < HOUSEKEEPING_BATCH) break;
    }
    return total;
  }

  private failed(what: string, err: unknown): number {
    this.logger.error({ msg: 'housekeeping_purge_failed', what, error: (err as Error).message });
    return 0;
  }
}
