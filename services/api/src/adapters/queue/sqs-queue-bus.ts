import { DeleteMessageCommand, ReceiveMessageCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
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
            new ReceiveMessageCommand({ QueueUrl: url, MaxNumberOfMessages: 10, WaitTimeSeconds: 20 }),
          );
          for (const m of res.Messages ?? []) {
            try {
              await handler(JSON.parse(m.Body ?? 'null') as T);
              await this.client.send(new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: m.ReceiptHandle }));
            } catch (err) {
              this.logger.error({ msg: 'sqs_handler_failed', queue, error: (err as Error).message });
            }
          }
        } catch (err) {
          this.logger.error({ msg: 'sqs_receive_failed', queue, error: (err as Error).message });
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    };
    void loop();
  }

  onModuleDestroy(): void {
    this.running = false;
  }
}
