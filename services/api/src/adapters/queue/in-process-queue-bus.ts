import { Logger } from '@nestjs/common';
import type { QueueBus, QueueName } from '../../ports/queue-bus.port';

/** `QUEUE_MODE=local`: fila em processo. Entrega assíncrona, deduplicação por `dedupId` (janela de 5 min, como SQS FIFO). */
export class InProcessQueueBus implements QueueBus {
  private readonly logger = new Logger('InProcessQueueBus');
  private readonly handlers = new Map<QueueName, Array<(m: unknown) => Promise<void>>>();
  private readonly seen = new Map<string, number>();
  private static readonly DEDUP_WINDOW_MS = 5 * 60 * 1000;

  async publish<T>(queue: QueueName, message: T, opts?: { dedupId?: string }): Promise<void> {
    if (opts?.dedupId) {
      const now = Date.now();
      for (const [k, t] of this.seen) if (now - t > InProcessQueueBus.DEDUP_WINDOW_MS) this.seen.delete(k);
      const key = `${queue}:${opts.dedupId}`;
      if (this.seen.has(key)) return;
      this.seen.set(key, now);
    }
    const handlers = this.handlers.get(queue) ?? [];
    setImmediate(() => {
      for (const h of handlers) {
        h(message).catch((err: Error) => this.logger.error({ msg: 'queue_handler_failed', queue, error: err?.message }));
      }
    });
  }

  subscribe<T>(queue: QueueName, handler: (message: T) => Promise<void>): void {
    const list = this.handlers.get(queue) ?? [];
    list.push(handler as (m: unknown) => Promise<void>);
    this.handlers.set(queue, list);
  }
}
