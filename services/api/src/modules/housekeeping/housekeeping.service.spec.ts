import { Prisma } from '@prisma/client';
import { HOUSEKEEPING_BATCH, HousekeepingService, PROCESSED_WEBHOOK_RETENTION_DAYS, TRACKER_CONSOLE_RETENTION_DAYS } from './housekeeping.service';

const NOW = new Date('2026-11-03T06:00:00.000Z');

function setup(results: number[], jobsEnabled = true) {
  const calls: Prisma.Sql[] = [];
  const queue = [...results];
  const prisma = {
    $executeRaw: jest.fn(async (sql: Prisma.Sql) => {
      calls.push(sql);
      return queue.shift() ?? 0;
    }),
  };
  const svc = new HousekeepingService(prisma as any, { jobsEnabled } as any);
  svc.now = () => NOW;
  return { svc, prisma, calls, text: (i: number) => calls[i].text.replace(/\s+/g, ' ') };
}

describe('HousekeepingService (auditoria run-4: TTL de idempotência e webhooks)', () => {
  it('apaga IdempotencyRecord expirado em lotes até um lote vir incompleto', async () => {
    const { svc, calls, text } = setup([HOUSEKEEPING_BATCH, HOUSEKEEPING_BATCH, 12]);
    await expect(svc.purgeExpiredIdempotency()).resolves.toBe(2 * HOUSEKEEPING_BATCH + 12);
    expect(calls).toHaveLength(3);
    expect(text(0)).toContain('DELETE FROM "IdempotencyRecord" WHERE "id" IN (SELECT "id" FROM "IdempotencyRecord" WHERE "expiresAt" <');
    expect(text(0)).toContain(`LIMIT ${HOUSEKEEPING_BATCH})`);
    // `expiresAt` é timestamp sem fuso em UTC: o corte vai como timestamptz convertido para UTC.
    expect(text(0)).toContain(`$1::timestamptz AT TIME ZONE 'UTC'`);
    expect(calls[0].values[0]).toBe(NOW.toISOString());
  });

  it('apaga ProcessedWebhook processado há mais de 90 dias, em lotes', async () => {
    const { svc, calls, text } = setup([3]);
    await expect(svc.purgeOldProcessedWebhooks()).resolves.toBe(3);
    expect(calls).toHaveLength(1);
    expect(text(0)).toContain('DELETE FROM "ProcessedWebhook" WHERE "id" IN (SELECT "id" FROM "ProcessedWebhook" WHERE "processedAt" <');
    expect(text(0)).toContain(`LIMIT ${HOUSEKEEPING_BATCH})`);
    expect(PROCESSED_WEBHOOK_RETENTION_DAYS).toBe(90);
    expect(calls[0].values[0]).toBe(new Date(NOW.getTime() - 90 * 86_400_000).toISOString());
  });

  it('apaga TrackerConsoleCommand com mais de 90 dias (createdAt), em lotes', async () => {
    const { svc, calls, text } = setup([4]);
    await expect(svc.purgeOldTrackerConsoleCommands()).resolves.toBe(4);
    expect(text(0)).toContain('DELETE FROM "TrackerConsoleCommand" WHERE "id" IN (SELECT "id" FROM "TrackerConsoleCommand" WHERE "createdAt" <');
    expect(text(0)).toContain(`LIMIT ${HOUSEKEEPING_BATCH})`);
    expect(TRACKER_CONSOLE_RETENTION_DAYS).toBe(90);
    expect(calls[0].values[0]).toBe(new Date(NOW.getTime() - 90 * 86_400_000).toISOString());
  });

  it('nada a apagar: uma consulta só', async () => {
    const { svc, calls } = setup([0]);
    await expect(svc.purgeExpiredIdempotency()).resolves.toBe(0);
    expect(calls).toHaveLength(1);
  });

  it('para no teto de lotes por rodada (não segura o lock indefinidamente)', async () => {
    const { svc, calls } = setup(Array(1000).fill(HOUSEKEEPING_BATCH));
    const total = await svc.purgeExpiredIdempotency();
    expect(calls.length).toBeLessThan(1000);
    expect(total).toBe(calls.length * HOUSEKEEPING_BATCH);
  });

  it('job diário: roda os três expurgos; com JOBS_ENABLED=false não toca no banco', async () => {
    const on = setup([5, 7]);
    await on.svc.purgeJob();
    expect(on.calls).toHaveLength(3);

    const off = setup([5, 7], false);
    await off.svc.purgeJob();
    expect(off.prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('falha em um expurgo não impede o outro', async () => {
    const { svc, prisma } = setup([]);
    prisma.$executeRaw.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(2);
    await expect(svc.purgeJob()).resolves.toBeUndefined();
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it('é um @Cron diário com @ExclusiveJob (metadados preservados)', () => {
    const fn = HousekeepingService.prototype.purgeJob;
    expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', fn)).toMatchObject({ cronTime: '15 4 * * *', timeZone: 'America/Sao_Paulo' });
    expect(Reflect.getMetadata('SCHEDULER_NAME', fn)).toBe('housekeeping-ttl');
  });
});
