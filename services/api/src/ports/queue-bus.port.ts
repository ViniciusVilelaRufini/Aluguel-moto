// services/api/src/ports/queue-bus.port.ts
export const QUEUE_BUS = Symbol('QUEUE_BUS');
export type QueueName = 'telemetria' | 'pagamentos-webhook' | 'alertas' | 'estacoes';
export interface QueueBus {
  publish<T>(queue: QueueName, message: T, opts?: { dedupId?: string }): Promise<void>;
  subscribe<T>(queue: QueueName, handler: (message: T) => Promise<void>): void;
}
