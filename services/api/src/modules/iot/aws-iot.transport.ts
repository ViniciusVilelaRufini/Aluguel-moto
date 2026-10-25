import { GetThingShadowCommand, PublishCommand, UpdateThingShadowCommand, type IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import { Logger } from '@nestjs/common';
import type { QueueBus } from '../../ports/queue-bus.port';
import { sanitizeReported, TOPICS } from './mqtt-contract';
import type { DesiredState, InboundHandler, IotTransport, MomentaryCommand, ReportedMeta, ReportedState } from './shadow-transport';

/**
 * IOT_MODE=aws:
 * - desired → `UpdateThingShadow` (IoT Data Plane); comandos momentâneos → `Publish` em `motos/{t}/comandos`;
 * - telemetria chega pela fila SQS `telemetria` (regra IoT `SELECT *, topic(2) AS thingName ...`); mensagens com `tipo` são eventos
 *   (proposta: regra de `motos/+/eventos` também para esta fila — hoje ela vai para `alertas`, ver docs/decisoes.md);
 * - `reported`: enquanto houver comando ou rampa aguardando uma moto, `GetThingShadow` a cada `pollMs`.
 *   (A task role da API não tem `iot:Connect`/`iot:Subscribe`; assinar `/update/documents` exigiria isso.)
 * - presença: `$aws/events/presence` → EventBridge → regra `presence-to-telemetry` → esta fila como
 *   `{ thingName, presence: 'connected' | 'disconnected', timestamp }` (infra/README.md) → `inbound.presence`. A vigia de inatividade
 *   (180 s) e a lacuna entre mensagens (`IOT_RECONNECT_GAP_MS`) continuam valendo se a presença atrasar ou se perder.
 */
export class AwsIotTransport implements IotTransport {
  private readonly logger = new Logger('AwsIotTransport');
  private readonly watched = new Set<string>();
  private readonly versions = new Map<string, number>();
  /** Horário (ms, metadata do shadow) do último valor ingerido de cada campo, por moto. */
  private readonly fieldTs = new Map<string, Partial<Record<keyof ReportedState, number>>>();
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
      if ('presence' in body) {
        if (body.presence === 'connected' || body.presence === 'disconnected') await inbound.presence(thingName, body.presence === 'connected');
        else this.logger.warn({ msg: 'presence_invalid', thingName });
        return;
      }
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
          const doc = JSON.parse(new TextDecoder().decode(res.payload)) as {
            version?: number;
            state?: { reported?: Record<string, unknown> };
            metadata?: { reported?: Record<string, { timestamp?: number }> };
          };
          // A versão muda também com os nossos UpdateThingShadow: ela só evita reprocessar o mesmo documento.
          if (doc.version !== undefined && this.versions.get(thingName) === doc.version) continue;
          if (doc.version !== undefined) this.versions.set(thingName, doc.version);
          const raw = doc.state?.reported;
          if (!raw || typeof raw !== 'object') continue;
          const all = sanitizeReported(raw);
          // Só campos que o rastreador escreveu depois do que já ingerimos (metadata.reported.<campo>.timestamp, em segundos).
          const seen = this.fieldTs.get(thingName) ?? {};
          const fresh: Record<string, unknown> = {};
          const timestamps: NonNullable<ReportedMeta['timestamps']> = {};
          for (const [k, v] of Object.entries(all)) {
            const key = k as keyof ReportedState;
            const sec = doc.metadata?.reported?.[key]?.timestamp;
            if (typeof sec !== 'number') continue; // sem horário não dá para saber se é novo
            const ms = sec * 1000;
            const prev = seen[key];
            if (prev !== undefined && ms <= prev) continue;
            seen[key] = ms;
            fresh[key] = v;
            timestamps[key] = ms;
          }
          this.fieldTs.set(thingName, seen);
          if (Object.keys(fresh).length) await this.inbound.reported(thingName, fresh as ReportedState, { fromPoll: true, timestamps });
        } catch (err) {
          this.logger.warn({ msg: 'shadow_poll_failed', thingName, error: (err as Error).message });
        }
      }
    } finally {
      this.polling = false;
    }
  }
}
