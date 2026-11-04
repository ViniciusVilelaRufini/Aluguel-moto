import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { PUSH_NOTIFIER, type PushNotifier } from '../../ports/push-notifier.port';
import { PrismaService } from '../../prisma/prisma.service';

/** Aviso do fim do período pré-pago: 1 h antes. */
const REMIND_BEFORE_MS = 60 * 60_000;

/** Aviso (push, uma vez) de que o período pré-pago do balcão está acabando; o excedente é acertado no galpão. */
@Injectable()
export class CounterPeriodReminderService {
  private readonly logger = new Logger(CounterPeriodReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_NOTIFIER) private readonly push: PushNotifier,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  @Interval('counter-period-remind', 60_000)
  @ExclusiveJob('counter-period-remind', jobLockTtl(60_000))
  async remindJob(): Promise<void> {
    if (!this.cfg.jobsEnabled) return;
    await this.remind().catch((err) => this.logger.error({ msg: 'counter_period_remind_failed', error: (err as Error).message }));
  }

  /** Aluguéis abertos com `prepaidUntil` em (now, now + 1 h] e sem aviso: claim condicional, depois push. */
  async remind(now = new Date()): Promise<number> {
    const due = await this.prisma.rental.findMany({
      where: {
        status: { in: OPEN_RENTAL_STATUSES },
        prepaidReminderSentAt: null,
        prepaidUntil: { gt: now, lte: new Date(now.getTime() + REMIND_BEFORE_MS) },
      },
      orderBy: { prepaidUntil: 'asc' },
      take: 200,
    });
    let sent = 0;
    for (const r of due) {
      const claimed = await this.prisma.rental.updateMany({
        where: { id: r.id, prepaidReminderSentAt: null, status: { in: OPEN_RENTAL_STATUSES } },
        data: { prepaidReminderSentAt: now },
      });
      if (claimed.count !== 1 || !r.prepaidUntil) continue;
      try {
        await this.push.sendToOwner(r.customerId, {
          title: 'Fim do período',
          body: `Seu período termina às ${formatTime(r.prepaidUntil)}. O excedente é acertado no galpão.`,
          data: { type: 'rental.prepaid_ending', rentalId: r.id },
        });
        sent++;
      } catch (err) {
        this.logger.warn({ msg: 'counter_period_remind_push_failed', rentalId: r.id, error: (err as Error).message });
      }
    }
    return sent;
  }
}

function formatTime(at: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
}
