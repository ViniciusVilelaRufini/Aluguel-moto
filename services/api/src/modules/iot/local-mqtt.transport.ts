import { Logger } from '@nestjs/common';
import type { LocalShadowStore, OutboundMessage } from './local-shadow';
import { parseReported, SERVER_SUBSCRIPTIONS, thingFromTopic, TOPICS } from './mqtt-contract';
import type { DesiredState, InboundHandler, IotTransport, MomentaryCommand } from './shadow-transport';

/** Subconjunto do cliente `mqtt` (v5) usado aqui (facilita testes com cliente falso). */
export interface MqttClientLike {
  connected: boolean;
  on(event: 'message', cb: (topic: string, payload: Buffer) => void): unknown;
  on(event: 'connect' | 'close' | 'offline' | 'reconnect', cb: () => void): unknown;
  on(event: 'error', cb: (err: Error) => void): unknown;
  publishAsync(topic: string, payload: string, opts?: { qos?: 0 | 1 | 2; retain?: boolean }): Promise<unknown>;
  subscribeAsync(topics: string[], opts?: { qos?: 0 | 1 | 2 }): Promise<unknown>;
  endAsync(force?: boolean): Promise<unknown>;
}

/**
 * IOT_MODE=local: o servidor conecta no Mosquitto do docker-compose e faz o papel do serviço de device shadow do IoT Core
 * (mesmos tópicos `$aws/things/{thingName}/shadow/...`), além de receber telemetria, eventos e presença (LWT do rastreador).
 */
export class LocalMqttTransport implements IotTransport {
  private readonly logger = new Logger('LocalMqttTransport');
  private client?: MqttClientLike;
  private inbound?: InboundHandler;

  constructor(
    private readonly connect: () => MqttClientLike,
    private readonly shadow: LocalShadowStore,
  ) {}

  async start(inbound: InboundHandler): Promise<void> {
    this.inbound = inbound;
    const client = this.connect();
    this.client = client;
    client.on('error', (err) => this.logger.warn({ msg: 'mqtt_error', error: err.message }));
    client.on('close', () => this.logger.warn({ msg: 'mqtt_closed' }));
    client.on('message', (topic, payload) => {
      void this.route(topic, payload).catch((err) => this.logger.error({ msg: 'mqtt_route_failed', topic, error: (err as Error).message }));
    });
    // `connect` → (re)assina: sessão limpa a cada reconexão.
    client.on('connect', () => {
      void client.subscribeAsync(SERVER_SUBSCRIPTIONS, { qos: 1 }).catch((err) => this.logger.error({ msg: 'mqtt_subscribe_failed', error: (err as Error).message }));
      this.logger.log({ msg: 'mqtt_connected' });
    });
    if (client.connected) await client.subscribeAsync(SERVER_SUBSCRIPTIONS, { qos: 1 });
  }

  async stop(): Promise<void> {
    await this.client?.endAsync(true).catch(() => undefined);
    this.client = undefined;
  }

  async updateDesired(thingName: string, desired: DesiredState): Promise<void> {
    await this.publishAll(await this.shadow.applyDesired(thingName, desired));
  }

  async publishCommand(thingName: string, command: MomentaryCommand): Promise<void> {
    await this.publish(TOPICS.commands(thingName), command);
  }

  private async publish(topic: string, payload: unknown): Promise<void> {
    if (!this.client) throw new Error('MQTT não conectado');
    await this.client.publishAsync(topic, JSON.stringify(payload), { qos: 1 });
  }

  private async publishAll(messages: OutboundMessage[]): Promise<void> {
    for (const m of messages) await this.publish(m.topic, m.payload);
  }

  private async route(topic: string, payload: Buffer): Promise<void> {
    const thingName = thingFromTopic(topic);
    if (!thingName || !this.inbound) return;
    let body: unknown;
    try {
      body = payload.length ? JSON.parse(payload.toString('utf8')) : {};
    } catch {
      if (topic === TOPICS.shadowUpdate(thingName)) await this.publish(TOPICS.shadowRejected(thingName), { code: 400, message: 'Payload contains invalid json' });
      else this.logger.warn({ msg: 'mqtt_invalid_json', topic });
      return;
    }
    if (topic === TOPICS.telemetry(thingName)) return this.inbound.telemetry(thingName, body);
    if (topic === TOPICS.events(thingName)) return this.inbound.deviceEvent(thingName, body);
    if (topic === TOPICS.presenceConnected(thingName)) return this.inbound.presence(thingName, true);
    if (topic === TOPICS.presenceDisconnected(thingName)) return this.inbound.presence(thingName, false);
    if (topic === TOPICS.shadowGet(thingName)) return this.publishAll(await this.shadow.get(thingName));
    if (topic === TOPICS.shadowUpdate(thingName)) {
      const reported = parseReported(body);
      if (!reported) {
        await this.publish(TOPICS.shadowRejected(thingName), { code: 400, message: 'Missing required node: state.reported' });
        return;
      }
      await this.publishAll(await this.shadow.applyReported(thingName, reported));
      await this.inbound.reported(thingName, reported);
    }
  }
}
