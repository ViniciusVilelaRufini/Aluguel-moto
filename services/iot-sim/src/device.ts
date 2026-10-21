import type { DesiredDelta, DeviceEventType, ReportedChange, VirtualMoto } from './model';

/** Subconjunto do cliente `mqtt` usado pelo rastreador simulado. */
export interface SimMqttClient {
  connected: boolean;
  on(event: 'connect' | 'close' | 'offline', cb: () => void): unknown;
  on(event: 'message', cb: (topic: string, payload: Buffer) => void): unknown;
  on(event: 'error', cb: (err: Error) => void): unknown;
  publish(topic: string, payload: string, opts?: { qos?: 0 | 1; retain?: boolean }): unknown;
  subscribe(topics: string | string[], opts?: { qos?: 0 | 1 }): unknown;
  end(force?: boolean): unknown;
}

export interface DeviceOptions {
  telemetryRidingMs: number;
  telemetryParkedMs: number;
  now: () => Date;
  log?: (entry: Record<string, unknown>) => void;
}

/** Tópicos do contrato (packages/contracts/mqtt.md). */
export const topics = (t: string) => ({
  telemetry: `motos/${t}/telemetria`,
  events: `motos/${t}/eventos`,
  commands: `motos/${t}/comandos`,
  update: `$aws/things/${t}/shadow/update`,
  delta: `$aws/things/${t}/shadow/update/delta`,
  get: `$aws/things/${t}/shadow/get`,
  getAccepted: `$aws/things/${t}/shadow/get/accepted`,
  connected: `$aws/events/presence/connected/${t}`,
  disconnected: `$aws/events/presence/disconnected/${t}`,
});

/**
 * Rastreador simulado: liga o `VirtualMoto` ao MQTT com os mesmos tópicos do AWS IoT Core.
 * Na conexão anuncia presença, reporta o shadow completo e pede o documento (`/get`) para aplicar desired pendente.
 */
export class SimDevice {
  private readonly t: ReturnType<typeof topics>;
  private lastTelemetry = 0;

  constructor(
    readonly moto: VirtualMoto,
    private readonly client: SimMqttClient,
    private readonly opts: DeviceOptions,
  ) {
    this.t = topics(moto.state.thingName);
  }

  start(): void {
    this.client.on('connect', () => this.onConnect());
    this.client.on('message', (topic, payload) => this.onMessage(topic, payload));
  }

  private pub(topic: string, payload: unknown, qos: 0 | 1 = 1): void {
    if (!this.client.connected) return;
    this.client.publish(topic, JSON.stringify(payload), { qos });
  }

  private onConnect(): void {
    this.client.subscribe([this.t.delta, this.t.getAccepted, this.t.commands], { qos: 1 });
    this.pub(this.t.connected, { clientId: this.moto.state.thingName, eventType: 'connected', timestamp: this.opts.now().getTime() });
    this.pub(this.t.update, { state: { reported: this.moto.fullReported() } });
    this.pub(this.t.get, {});
    this.publishTelemetry();
  }

  private onMessage(topic: string, payload: Buffer): void {
    let body: any;
    try {
      body = JSON.parse(payload.toString('utf8'));
    } catch {
      return;
    }
    if (topic === this.t.delta && body?.state) this.applyDelta(body.state as DesiredDelta);
    else if (topic === this.t.getAccepted && body?.state?.delta) this.applyDelta(body.state.delta as DesiredDelta);
    else if (topic === this.t.commands && body?.acao === 'buzina') this.opts.log?.({ msg: 'buzina', thingName: this.moto.state.thingName, commandId: body.comando_id });
  }

  private applyDelta(delta: DesiredDelta): void {
    const changes = this.moto.applyDesired(delta);
    if (Object.keys(changes).length) this.report(changes);
  }

  private report(changes: ReportedChange & { velocidade_kmh?: number }): void {
    this.pub(this.t.update, { state: { reported: { ...changes, velocidade_kmh: round1(this.moto.state.speedKmh) } } });
  }

  private publishTelemetry(): void {
    this.lastTelemetry = this.opts.now().getTime();
    this.pub(this.t.telemetry, this.moto.telemetry(this.opts.now()), 0);
  }

  private telemetryInterval(): number {
    const s = this.moto.state;
    return (!s.locked && s.ignition) || s.stolenMode ? this.opts.telemetryRidingMs : this.opts.telemetryParkedMs;
  }

  tick(dtSec: number): void {
    const r = this.moto.step(dtSec);
    if (r.lockedNow) this.report({ travada: true });
    else if (r.reportSpeed) this.report({});
    for (const e of r.events) this.injectEvent(e);
    if (this.opts.now().getTime() - this.lastTelemetry >= this.telemetryInterval()) this.publishTelemetry();
  }

  injectEvent(type: DeviceEventType): void {
    this.pub(this.t.events, { tipo: type, timestamp: this.opts.now().toISOString() });
    this.opts.log?.({ msg: 'evento_injetado', thingName: this.moto.state.thingName, tipo: type });
  }
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
