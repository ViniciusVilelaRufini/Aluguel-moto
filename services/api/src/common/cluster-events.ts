import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { REDIS_STORE, RedisStore } from '../redis/redis-store';
import { EV } from './events';

export const CLUSTER_EVENTS_CHANNEL = 'volti:cluster-events';

/** Eventos de domínio que precisam chegar a todas as instâncias (tasks do ECS). */
const REPLICATED = [EV.PRINCIPAL_REVOKED, EV.RENTAL_CHANGED, EV.ZONE_CHANGED, EV.CUSTOMER_CONSENT_CHANGED] as const;

/** Replica eventos locais para as outras instâncias via Redis pub/sub, sem laço nem eco. */
@Injectable()
export class ClusterEventsBridge implements OnModuleInit {
  private readonly logger = new Logger('ClusterEventsBridge');
  readonly instanceId = randomUUID();
  /** Payloads vindos de outra instância: não são republicados. */
  private readonly remote = new WeakSet<object>();

  constructor(
    private readonly emitter: EventEmitter2,
    @Inject(REDIS_STORE) private readonly redis: RedisStore,
  ) {}

  onModuleInit(): void {
    for (const event of REPLICATED) {
      this.emitter.on(event, (payload: unknown) => {
        if (typeof payload === 'object' && payload !== null && this.remote.has(payload)) return;
        this.redis
          .publish(CLUSTER_EVENTS_CHANNEL, JSON.stringify({ origin: this.instanceId, event, payload }))
          .catch((err) => this.logger.warn({ msg: 'cluster_event_publish_failed', event, error: (err as Error).message }));
      });
    }
    this.redis.subscribe(CLUSTER_EVENTS_CHANNEL, (raw) => this.receive(raw));
  }

  private receive(raw: string): void {
    let msg: { origin?: unknown; event?: unknown; payload?: unknown } | null;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.logger.warn({ msg: 'cluster_event_invalid' });
      return;
    }
    const event = msg?.event;
    if (
      !msg ||
      typeof msg.origin !== 'string' ||
      typeof event !== 'string' ||
      !(REPLICATED as readonly string[]).includes(event) ||
      typeof msg.payload !== 'object' ||
      msg.payload === null
    ) {
      this.logger.warn({ msg: 'cluster_event_invalid' });
      return;
    }
    if (msg.origin === this.instanceId) return;
    this.remote.add(msg.payload);
    this.emitter.emit(event, msg.payload);
  }
}
