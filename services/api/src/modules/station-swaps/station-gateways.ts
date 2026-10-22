import { PublishCommand, type IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import { Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { QueueBus } from '../../ports/queue-bus.port';
import type { StationCommand, StationEvent, StationEventHandler, StationGateway } from '../../ports/station-gateway.port';
import type { MqttClientLike } from '../iot/local-mqtt.transport';
import { commandPayload, parseStationEvent, STATION_SERVER_SUBSCRIPTIONS, STATION_TOPICS, stationThingFromTopic } from './station-mqtt-contract';

const encode = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));

/**
 * IOT_MODE=stub: estação imaginária que avança sozinha em passos curtos (`STATION_STUB_STEP_MS`, padrão 1,5 s), para os e2e
 * e o emulador funcionarem sem o simulador. `open_slot` → `slot_opened` → `battery_returned` (série esperada, 15 %) →
 * `slot_closed`; `release_battery` → `battery_released` (série sugerida ou `BT-STUB-*`). `setAuto(false)` congela (timeout).
 */
export class StubStationGateway implements StationGateway {
  private handler?: StationEventHandler;
  private auto = true;
  private readonly timers = new Set<NodeJS.Timeout>();
  /** Comandos recebidos (inspeção em testes). */
  readonly sent: Array<{ thing: string; command: StationCommand }> = [];

  constructor(private readonly opts: { stepMs: number }) {}

  setAuto(on: boolean): void {
    this.auto = on;
  }

  async start(handler: StationEventHandler): Promise<void> {
    this.handler = handler;
  }

  async stop(): Promise<void> {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  async send(thing: string, command: StationCommand): Promise<void> {
    this.sent.push({ thing, command });
    if (!this.auto) return;
    const ts = () => new Date().toISOString();
    const swapId = command.swapId;
    if (command.action === 'open_slot') {
      const slotNumber = 1 + Math.floor(Math.random() * 8);
      const serial = command.expectedSerial ?? `BT-STUB-${randomBytes(3).toString('hex').toUpperCase()}`;
      this.later(1, thing, () => ({ type: 'slot_opened', swapId, slotNumber, ts: ts() }));
      this.later(2, thing, () => ({ type: 'battery_returned', swapId, serial, pct: 15, ts: ts() }));
      this.later(3, thing, () => ({ type: 'slot_closed', swapId, ts: ts() }));
    } else if (command.action === 'abort_swap') {
      // Fecha a vaga (se aberta) e confirma; nunca libera bateria.
      this.later(1, thing, () => ({ type: 'slot_closed', swapId, ts: ts() }));
    } else {
      const serial = command.serialHint ?? `BT-STUB-${randomBytes(3).toString('hex').toUpperCase()}`;
      this.later(1, thing, () => ({ type: 'battery_released', swapId, serial, ts: ts() }));
    }
  }

  /** Entrega um evento como se viesse da estação (testes e modo manual). */
  async emit(thing: string, event: StationEvent): Promise<void> {
    await this.handler?.(thing, event);
  }

  private later(steps: number, thing: string, make: () => StationEvent): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      void this.emit(thing, make()).catch(() => undefined);
    }, steps * this.opts.stepMs);
    t.unref?.();
    this.timers.add(t);
  }
}

/** IOT_MODE=local: Mosquitto do docker-compose; o simulador `services/station-sim` responde pelas estações. */
export class MqttStationGateway implements StationGateway {
  private readonly logger = new Logger('MqttStationGateway');
  private client?: MqttClientLike;

  constructor(private readonly connect: () => MqttClientLike) {}

  async start(handler: StationEventHandler): Promise<void> {
    const client = this.connect();
    this.client = client;
    client.on('error', (err) => this.logger.warn({ msg: 'station_mqtt_error', error: err.message }));
    client.on('message', (topic, payload) => {
      const thing = stationThingFromTopic(topic);
      if (!thing) return;
      let body: unknown;
      try {
        body = JSON.parse(payload.toString('utf8'));
      } catch {
        this.logger.warn({ msg: 'station_event_invalid_json', thing });
        return;
      }
      const ev = parseStationEvent(body);
      if (!ev) {
        this.logger.warn({ msg: 'station_event_invalid', thing });
        return;
      }
      void handler(thing, ev).catch((err) => this.logger.error({ msg: 'station_event_failed', thing, swapId: ev.swapId, error: (err as Error).message }));
    });
    client.on('connect', () => {
      void client.subscribeAsync(STATION_SERVER_SUBSCRIPTIONS, { qos: 1 }).catch((err) => this.logger.error({ msg: 'station_subscribe_failed', error: (err as Error).message }));
    });
    if (client.connected) await client.subscribeAsync(STATION_SERVER_SUBSCRIPTIONS, { qos: 1 });
  }

  async stop(): Promise<void> {
    await this.client?.endAsync(true).catch(() => undefined);
    this.client = undefined;
  }

  async send(thing: string, command: StationCommand): Promise<void> {
    if (!this.client) throw new Error('MQTT não conectado');
    await this.client.publishAsync(STATION_TOPICS.commands(thing), JSON.stringify(commandPayload(command)), { qos: 1 });
  }
}

/**
 * Fix 1 (I4): a fila `estacoes` tem de ser FIFO (`.fifo`, `MessageGroupId` = thing da estação), senão eventos da mesma troca
 * podem chegar fora de ordem entre instâncias da API. A API não sobe com outra fila.
 */
export function assertFifoQueueUrl(url: string | undefined): void {
  if (!url) throw new Error('IOT_MODE=aws exige SQS_QUEUE_ESTACOES_URL (fila FIFO dos eventos das estações).');
  if (!url.endsWith('.fifo')) throw new Error('SQS_QUEUE_ESTACOES_URL precisa ser uma fila FIFO (nome terminando em .fifo).');
}

/**
 * IOT_MODE=aws: comandos por `Publish` do IoT Data Plane em `estacoes/{thing}/comandos`; eventos pela fila SQS `estacoes`
 * (regra IoT `SELECT *, topic(2) AS thing FROM 'estacoes/+/eventos'` — pendência de infra, ver docs/decisoes.md).
 */
export class AwsStationGateway implements StationGateway {
  private readonly logger = new Logger('AwsStationGateway');

  constructor(
    private readonly client: Pick<IoTDataPlaneClient, 'send'>,
    private readonly queue: QueueBus,
    private readonly queueUrl: string | undefined,
  ) {}

  async start(handler: StationEventHandler): Promise<void> {
    assertFifoQueueUrl(this.queueUrl);
    this.queue.subscribe<Record<string, unknown>>('estacoes', async (m) => {
      if (!m || typeof m !== 'object' || typeof m.thing !== 'string') return;
      const { thing, ...body } = m;
      const ev = parseStationEvent(body);
      if (!ev) {
        this.logger.warn({ msg: 'station_event_invalid', thing });
        return;
      }
      await handler(thing, ev);
    });
  }

  async stop(): Promise<void> {
    return undefined;
  }

  async send(thing: string, command: StationCommand): Promise<void> {
    await this.client.send(new PublishCommand({ topic: STATION_TOPICS.commands(thing), qos: 1, payload: encode(commandPayload(command)) }));
  }
}
