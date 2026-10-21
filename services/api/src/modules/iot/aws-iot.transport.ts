import { GetThingShadowCommand, PublishCommand, UpdateThingShadowCommand, type IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import { Logger } from '@nestjs/common';
import type { QueueBus } from '../../ports/queue-bus.port';
import { parseReported, TOPICS } from './mqtt-contract';
import type { DesiredState, InboundHandler, IotTransport, MomentaryCommand } from './shadow-transport';

/**
 * IOT_MODE=aws:
 * - desired → `UpdateThingShadow` (IoT Data Plane); comandos momentâneos → `Publish` em `motos/{t}/comandos`;
 * - telemetria chega pela fila SQS `telemetria` (regra IoT `SELECT *, topic(2) AS thingName ...`); mensagens com `tipo` são eventos
 *   (proposta: regra de `motos/+/eventos` também para esta fila — hoje ela vai para `alertas`, ver docs/decisoes.md);
 * - `reported`: enquanto houver comando ou rampa aguardando uma moto, `GetThingShadow` a cada `pollMs`.
 *   (A task role da API não tem `iot:Connect`/`iot:Subscribe`; assinar `/update/documents` exigiria isso.)
 * - presença: vigia de inatividade do `TelemetryService` (os eventos de presença vão para o EventBridge).
 */
export class AwsIotTransport implements IotTransport {
  private readonly logger = new Logger('AwsIotTransport');
  private readonly watched = new Set<string>();
  private readonly versions = new Map<string, number>();
  private inbound?: InboundHandler;
  private timer?: NodeJS.Timeout;
  private polling = false;

  constructor(
    private readonly client: Pick<IoTDataPlaneClient, 'send'>,
    private readonly queue: QueueBus,
    private readonly opts: { pollMs: number },
  ) {}

  async start(inbound: InboundHandler): Promise<void> {
    this.inbound = inbound;
    this.queue.subscribe<Record<string, unknown>>('telemetria', async (m) => {
      if (!m || typeof m !== 'object' || typeof m.thingName !== 'string') return;
      const { thingName, ingestedAt: _ingested, ...body } = m;
      if ('tipo' in body) await inbound.deviceEvent(thingName, body);
      else await inbound.telemetry(thingName, body);
    });
    if (this.opts.pollMs > 0) {
      this.timer = setInterval(() => void this.pollOnce(), this.opts.pollMs);
      this.timer.unref?.();
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
  }

  watch(thingName: string, active: boolean): void {
    if (active) this.watched.add(thingName);
    else this.watched.delete(thingName);
  }

  async updateDesired(thingName: string, desired: DesiredState): Promise<void> {
    await this.client.send(new UpdateThingShadowCommand({ thingName, payload: new TextEncoder().encode(JSON.stringify({ state: { desired } })) }));
  }

  async publishCommand(thingName: string, command: MomentaryCommand): Promise<void> {
    await this.client.send(new PublishCommand({ topic: TOPICS.commands(thingName), qos: 1, payload: new TextEncoder().encode(JSON.stringify(command)) }));
  }

  async pollOnce(): Promise<void> {
    if (this.polling || !this.inbound) return;
    this.polling = true;
    try {
      for (const thingName of [...this.watched]) {
        try {
          const res = await this.client.send(new GetThingShadowCommand({ thingName }));
          if (!res.payload) continue;
          const doc = JSON.parse(new TextDecoder().decode(res.payload)) as { version?: number };
          if (doc.version !== undefined && this.versions.get(thingName) === doc.version) continue;
          if (doc.version !== undefined) this.versions.set(thingName, doc.version);
          const reported = parseReported(doc);
          if (reported) await this.inbound.reported(thingName, reported);
        } catch (err) {
          this.logger.warn({ msg: 'shadow_poll_failed', thingName, error: (err as Error).message });
        }
      }
    } finally {
      this.polling = false;
    }
  }
}
