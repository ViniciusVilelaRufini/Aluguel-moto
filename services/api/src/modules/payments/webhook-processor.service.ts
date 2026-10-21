import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { isUniqueViolation } from './payment-state.service';
import type { WebhookQueueMessage } from './provider/fake-pix-autoconfirm';
import { PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider';
import { RentalBillingService } from './rental-billing.service';
import { SubscriptionsService } from './subscriptions.service';

export type WebhookOutcome = 'processed' | 'duplicate' | 'ignored';

/**
 * Consumidor da fila `pagamentos-webhook`. Idempotente: cada evento (`provider` + `eventId`) é registrado em
 * `ProcessedWebhook` (chave única) antes dos efeitos; repetição → `duplicate`, sem efeito. Se o processamento falha,
 * o registro é removido para a reentrega da fila tentar de novo. O estado vem sempre do gateway (`getPayment`), nunca do corpo.
 */
@Injectable()
export class WebhookProcessor implements OnModuleInit {
  private readonly logger = new Logger('WebhookProcessor');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly billing: RentalBillingService,
    private readonly wallet: WalletService,
    private readonly subscriptions: SubscriptionsService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
  ) {}

  onModuleInit(): void {
    this.queue.subscribe<WebhookQueueMessage>('pagamentos-webhook', async (msg) => {
      await this.process(msg);
    });
  }

  private async claim(msg: WebhookQueueMessage): Promise<boolean> {
    try {
      await this.prisma.processedWebhook.create({ data: { provider: msg.provider, eventId: msg.eventId, type: msg.type, dataId: msg.dataId } });
      return true;
    } catch (err) {
      if (isUniqueViolation(err)) return false;
      throw err;
    }
  }

  async process(msg: WebhookQueueMessage): Promise<WebhookOutcome> {
    const seen = await this.prisma.processedWebhook.findUnique({ where: { provider_eventId: { provider: msg.provider, eventId: msg.eventId } } });
    if (seen) return 'duplicate';
    if (msg.type !== 'payment') {
      if (!(await this.claim(msg))) return 'duplicate';
      this.logger.log({ msg: 'webhook_ignored', type: msg.type, eventId: msg.eventId });
      return 'ignored';
    }
    const pp = await this.provider.getPayment(msg.dataId);
    if (!(await this.claim(msg))) return 'duplicate';
    try {
      const applied = await this.billing.applyProviderPayment(pp);
      if (!applied) {
        if (pp.externalReference?.startsWith('subscription:')) await this.subscriptions.onRecurringPayment(pp);
        else this.logger.warn({ msg: 'webhook_payment_unknown', eventId: msg.eventId });
      } else if (applied.changed && applied.payment.kind === 'top_up') {
        await this.wallet.onTopUpPayment(applied.payment);
      } else if (applied.changed && applied.payment.kind === 'subscription') {
        await this.subscriptions.onSubscriptionPaymentChanged(applied.payment);
      }
      this.logger.log({ msg: 'webhook_processed', eventId: msg.eventId, status: pp.status });
      return 'processed';
    } catch (err) {
      await this.prisma.processedWebhook.deleteMany({ where: { provider: msg.provider, eventId: msg.eventId } });
      throw err;
    }
  }
}
