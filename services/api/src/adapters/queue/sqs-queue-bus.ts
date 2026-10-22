import { DeleteMessageCommand, ReceiveMessageCommand, SendMessageCommand, SQSClient, type Message } from '@aws-sdk/client-sqs';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import type { AppConfig } from '../../config/env';
import type { QueueBus, QueueName } from '../../ports/queue-bus.port';

/** `QUEUE_MODE=sqs`: SQS (ou LocalStack com `SQS_ENDPOINT`). Long polling por fila assinada. */
export class SqsQueueBus implements QueueBus, OnModuleDestroy {
  private readonly logger = new Logger('SqsQueueBus');
  private readonly client: SQSClient;
  private running = true;

  constructor(private readonly cfg: AppConfig) {
    this.client = new SQSClient({ region: cfg.sqs.region, endpoint: cfg.sqs.endpoint });
  }

  private url(queue: QueueName): string {
    const url = this.cfg.sqs.queueUrls[queue];
    if (!url) throw new Error(`URL da fila SQS não configurada: ${queue}`);
    return url;
  }

  async publish<T>(queue: QueueName, message: T, opts?: { dedupId?: string }): Promise<void> {
    const url = this.url(queue);
    const fifo = url.endsWith('.fifo');
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: url,
        MessageBody: JSON.stringify(message),
        ...(fifo ? { MessageGroupId: queue, MessageDeduplicationId: opts?.dedupId } : {}),
      }),
    );
  }

  subscribe<T>(queue: QueueName, handler: (message: T) => Promise<void>): void {
    const url = this.url(queue);
    const loop = async () => {
      while (this.running) {
        try {
          const res = await this.client.send(
            new ReceiveMessageCommand({ QueueUrl: url, MaxNumberOfMessages: 10, WaitTimeSeconds: 20, MessageSystemAttributeNames: ['MessageGroupId'] }),
          );
          await this.processBatch(queue, url, res.Messages ?? [], handler);
        } catch (err) {
          this.logger.error({ msg: 'sqs_receive_failed', queue, error: (err as Error).message });
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    };
    void loop();
  }

  /**
   * Processa um lote em ordem. Fix 1 (I4): numa fila FIFO, quando o handler falha, o resto do mesmo `MessageGroupId` neste lote
   * não é processado nem apagado (volta depois do visibility timeout, na ordem); os outros grupos seguem. Sem grupo (fila
   * padrão), cada mensagem é independente.
   */
  async processBatch<T>(queue: QueueName, url: string, messages: Message[], handler: (message: T) => Promise<void>): Promise<void> {
    const failedGroups = new Set<string>();
    for (const m of messages) {
      const group = m.Attributes?.MessageGroupId;
      if (group && failedGroups.has(group)) continue;
      try {
        await handler(JSON.parse(m.Body ?? 'null') as T);
        await this.client.send(new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: m.ReceiptHandle }));
      } catch (err) {
        if (group) failedGroups.add(group);
        this.logger.error({ msg: 'sqs_handler_failed', queue, messageId: m.MessageId, groupHeld: !!group, error: (err as Error).message });
      }
    }
  }

  onModuleDestroy(): void {
    this.running = false;
  }
}
