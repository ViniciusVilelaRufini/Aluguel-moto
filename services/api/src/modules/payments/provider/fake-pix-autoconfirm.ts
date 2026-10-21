import { Logger } from '@nestjs/common';
import type { QueueBus } from '../../../ports/queue-bus.port';
import { FakePaymentProvider } from './fake-payment-provider';
import type { PaymentProvider } from './payment-provider';

export interface WebhookQueueMessage {
  provider: string;
  eventId: string;
  type: string;
  action?: string;
  dataId: string;
}

const logger = new Logger('FakePixAutoConfirm');

/**
 * Dev local (`PAYMENT_PROVIDER=fake`): simula o cliente pagando o Pix depois de N segundos e entrega um evento
 * na fila `pagamentos-webhook`, exatamente como um webhook do Mercado Pago (mesmo processamento e deduplicação).
 */
export function scheduleFakePixConfirmation(provider: PaymentProvider, queue: QueueBus, providerPaymentId: string, seconds: number): void {
  if (!(provider instanceof FakePaymentProvider) || seconds <= 0) return;
  const t = setTimeout(() => {
    try {
      provider.simulatePixPaid(providerPaymentId);
    } catch (err) {
      logger.warn({ msg: 'fake_pix_confirm_skipped', providerPaymentId, error: (err as Error).message });
      return;
    }
    const msg: WebhookQueueMessage = { provider: 'fake', eventId: `fake:${providerPaymentId}:paid`, type: 'payment', action: 'payment.updated', dataId: providerPaymentId };
    void queue.publish('pagamentos-webhook', msg, { dedupId: msg.eventId });
  }, seconds * 1000);
  t.unref?.();
}
