import { FIXED_LIMIT_KMH, TOPICS, thingOf, type ReportedState } from './contract';
import { CUT_FRESH_MS, parseDelta, planDeltaFor, planReconnect, type BridgeAction } from './delta';
import { maskImei, silentLogger, type Logger } from './log';
import { applyPosition, currentBlocked, markReconnected, toDeviceEvents, type DeviceMemory } from './mapping';
import type { MqttLike } from './mqtt';
import type { TraccarDevice, TraccarEvent, TraccarPosition, TraccarSocketMessage } from './traccar/types';
import type { BatteryModel } from './units';

export interface TraccarApi {
  devices(): Promise<TraccarDevice[]>;
  sendCommand(deviceId: number, type: 'engineStop' | 'engineResume'): Promise<'sent' | 'queued'>;
}

export interface Registry {
  /** IMEI → thingName dos rastreadores `relay_only`. */
  things(): Promise<Map<string, string>>;
}

export interface BridgeOptions {
  iotMode: 'local' | 'aws';
  battery: BatteryModel;
  now?: () => number;
  log?: Logger;
}

/** Corte conhecido e bateria ainda desconhecida há este tempo → telemetria sai com `bateria_pct: 0` (log `battery_unknown`). */
export const BATTERY_UNKNOWN_CAP_MS = 5 * 60_000;
/** Logs repetitivos (retenção, bateria, replay): no máximo um por moto e motivo nesta janela. */
export const LOG_RATE_MS = 60_000;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Ponte GT06 (spec §6): posições/eventos do Traccar → `motos/{t}/telemetria|eventos` e `reported` do shadow; delta do shadow →
 * `engineStop`/`engineResume` (com a segunda guarda: só corta com posição fresca < 3 km/h). Para a API nada muda (mesmos tópicos).
 * Processamento em ordem por moto. Logs sem dado pessoal e sem IMEI completo.
 *
 * Bit de corte: lido só por `currentBlocked`. Toda (re)conexão — do dispositivo no Traccar ou do WebSocket da ponte — chama
 * `markReconnected`; o replay de últimas posições que o Traccar manda ao abrir o WebSocket não conta como status novo.
 */
export class Bridge {
  private readonly devices = new Map<number, TraccarDevice>();
  private readonly memory = new Map<string, DeviceMemory>();
  private readonly stolen = new Map<string, boolean>();
  private readonly stopSentAt = new Map<string, number>();
  /** Desde quando a moto está com o corte conhecido e a bateria desconhecida (teto de retenção). */
  private readonly batteryWaitSince = new Map<string, number>();
  private readonly lastLogAt = new Map<string, number>();
  private readonly awaitingGet = new Set<string>();
  private readonly subscribed = new Set<string>();
  private readonly chains = new Map<string, Promise<void>>();
  private imeiToThing = new Map<string, string>();
  private thingToImei = new Map<string, string>();
  private inbound: Promise<void> = Promise.resolve();
  /** A próxima mensagem do WebSocket com `positions` é o replay de conexão (últimas conhecidas, possivelmente velhas). */
  private replayPending = false;
  private listening = false;
  private lastMissRefresh = 0;
  private readonly log: Logger;
  private readonly now: () => number;

  constructor(
    private readonly mqtt: MqttLike,
    private readonly traccar: TraccarApi,
    private readonly registry: Registry,
    private readonly opts: BridgeOptions,
  ) {
    this.log = opts.log ?? silentLogger;
    this.now = opts.now ?? Date.now;
  }

  async start(): Promise<void> {
    if (!this.listening) {
      this.mqtt.on('message', (topic: string, payload: Buffer) => {
        void this.onMqtt(topic, payload).catch((err: Error) => this.log.error({ msg: 'mqtt_message_failed', error: err.message }));
      });
      this.listening = true;
    }
    await this.refreshDevices();
    await this.refreshRegistry();
  }

  /** Lista de dispositivos do Traccar; mudança de status de um já conhecido dispara presença/reconexão. */
  async refreshDevices(): Promise<void> {
    for (const d of await this.traccar.devices()) await this.updateDevice(d);
  }

  async refreshRegistry(): Promise<void> {
    this.imeiToThing = await this.registry.things();
    this.thingToImei = new Map([...this.imeiToThing].map(([imei, thing]) => [thing, imei]));
    await this.subscribe([...this.thingToImei.keys()].filter((t) => !this.subscribed.has(t)));
  }

  /** Sessão MQTT limpa a cada (re)conexão: assina tudo de novo. */
  async resubscribe(): Promise<void> {
    this.subscribed.clear();
    await this.subscribe([...this.thingToImei.keys()]);
  }

  /**
   * WebSocket do Traccar (re)aberto: mensagens podem ter se perdido. Esquece o bit de corte de todas as motos
   * (`markReconnected`), marca a próxima lista de posições como replay e relê os dispositivos (status mudados no intervalo).
   * Entra na fila de entrada, antes da primeira mensagem do socket novo.
   */
  onSocketOpen(): Promise<void> {
    return this.inboundStep(async () => {
      this.replayPending = true;
      for (const thing of [...this.memory.keys()]) await this.serial(thing, async () => this.reconnected(thing));
      await this.refreshDevices();
    });
  }

  /** Mensagens do WebSocket processadas uma de cada vez, na ordem de chegada. */
  enqueue(msg: TraccarSocketMessage): Promise<void> {
    return this.inboundStep(() => this.onTraccar(msg));
  }

  async onTraccar(msg: TraccarSocketMessage): Promise<void> {
    for (const d of msg.devices ?? []) await this.updateDevice(d);
    const replay = this.replayPending && msg.positions !== undefined;
    if (msg.positions !== undefined) this.replayPending = false;
    for (const p of msg.positions ?? []) {
      const thing = await this.thingOfDevice(p.deviceId);
      if (thing) await this.serial(thing, () => this.onPosition(thing, p, replay));
    }
    for (const e of msg.events ?? []) {
      if (e.type === 'deviceOnline' || e.type === 'deviceOffline' || e.type === 'deviceUnknown') {
        await this.setStatus(e.deviceId, e.type === 'deviceOnline' ? 'online' : 'offline');
        continue;
      }
      const thing = await this.thingOfDevice(e.deviceId);
      if (thing) await this.serial(thing, () => this.onAlarm(thing, e));
    }
  }

  private inboundStep(fn: () => Promise<void>): Promise<void> {
    this.inbound = this.inbound.then(fn).catch((err: Error) => this.log.error({ msg: 'traccar_message_failed', error: err.message }));
    return this.inbound;
  }

  private async subscribe(things: string[]): Promise<void> {
    if (!things.length) return;
    await this.mqtt.subscribeAsync(things.flatMap((t) => [TOPICS.shadowDelta(t), TOPICS.shadowGetAccepted(t), TOPICS.commands(t)]), { qos: 1 });
    for (const t of things) this.subscribed.add(t);
  }

  private async updateDevice(d: TraccarDevice): Promise<void> {
    const prev = this.devices.get(d.id);
    this.devices.set(d.id, { ...prev, ...d });
    if (prev && d.status && prev.status !== d.status) await this.onStatusChange(d.id, d.status);
  }

  private async setStatus(deviceId: number, status: 'online' | 'offline'): Promise<void> {
    if (!this.devices.has(deviceId)) await this.refreshDevices();
    const d = this.devices.get(deviceId);
    if (!d || d.status === status) return;
    d.status = status;
    await this.onStatusChange(deviceId, status);
  }

  private async onStatusChange(deviceId: number, status: TraccarDevice['status']): Promise<void> {
    const thing = await this.thingOfDevice(deviceId);
    if (!thing) return;
    await this.serial(thing, async () => {
      if (status === 'online') {
        // Bit de corte desconhecido até o primeiro status depois de reconectar (J16 pode ter reiniciado com o relé em outro estado).
        this.reconnected(thing);
        if (this.opts.iotMode === 'local') await this.publish(TOPICS.presenceConnected(thing), {}, 1);
        await this.report(thing, this.fullReported(thing));
        this.awaitingGet.add(thing);
        await this.publish(TOPICS.shadowGet(thing), {}, 1);
        this.log.info({ msg: 'device_online', thingName: thing });
        return;
      }
      if (this.opts.iotMode === 'local') await this.publish(TOPICS.presenceDisconnected(thing), {}, 1);
      this.log.info({ msg: 'device_offline', thingName: thing });
    });
  }

  private reconnected(thing: string): void {
    this.memory.set(thing, markReconnected(this.mem(thing)));
    this.batteryWaitSince.delete(thing);
  }

  private async thingOfDevice(deviceId: number): Promise<string | null> {
    if (!this.devices.has(deviceId)) await this.refreshDevices();
    const d = this.devices.get(deviceId);
    if (!d) return null;
    let thing = this.imeiToThing.get(d.uniqueId);
    if (!thing && this.now() - this.lastMissRefresh > 10_000) {
      // Provisionado há pouco (antes da próxima leitura periódica): relê o registro no máximo a cada 10 s.
      this.lastMissRefresh = this.now();
      await this.refreshRegistry();
      thing = this.imeiToThing.get(d.uniqueId);
    }
    if (!thing) {
      this.log.warn({ msg: 'traccar_unknown_device', imei: maskImei(d.uniqueId) });
      return null;
    }
    return thing;
  }

  private deviceOf(thing: string): TraccarDevice | undefined {
    const imei = this.thingToImei.get(thing);
    return [...this.devices.values()].find((d) => d.uniqueId === imei);
  }

  private mem(thing: string): DeviceMemory {
    return this.memory.get(thing) ?? {};
  }

  private async onPosition(thing: string, raw: TraccarPosition, replay: boolean): Promise<void> {
    let p = raw;
    if (replay && typeof raw.attributes?.blocked === 'boolean') {
      // Replay de conexão: a última posição conhecida pode ser de antes de uma reinicialização do J16. Não é status atual.
      p = { ...raw, attributes: { ...raw.attributes, blocked: undefined } };
      this.logLimited(thing, 'traccar_replay_status_ignored', 'info', {});
    }
    const now = this.now();
    const before = this.mem(thing);
    let r = applyPosition(p, before, this.opts.battery, now);
    if (r.held === 'awaiting_battery') {
      const since = this.batteryWaitSince.get(thing) ?? now;
      this.batteryWaitSince.set(thing, since);
      if (now - since >= BATTERY_UNKNOWN_CAP_MS) {
        // Teto: sem leitura de bateria (ex.: J16 em conversor DC-DC) a moto não pode ficar sem telemetria para sempre.
        // `bateria_pct: 0` só na mensagem; a memória continua sem bateria conhecida.
        const forced = applyPosition(p, { ...before, batteryPct: 0 }, this.opts.battery, now);
        if (forced.telemetry) {
          r = { ...forced, memory: { ...forced.memory, batteryPct: r.memory.batteryPct } };
          this.logLimited(thing, 'battery_unknown', 'warn', {});
        }
      }
    } else if (r.telemetry) {
      this.batteryWaitSince.delete(thing);
    }
    this.memory.set(thing, r.memory);
    if (r.invalid) this.log.warn({ msg: 'telemetry_invalid', thingName: thing });
    if (r.held && !r.telemetry) this.logLimited(thing, 'telemetry_held', 'info', { reason: r.held }, r.held);
    if (r.telemetry) await this.publish(TOPICS.telemetry(thing), r.telemetry, 0);
    if (r.movedWhileLocked) {
      // Evento de segurança: sai mesmo com a telemetria retida (ex.: bateria desconhecida).
      await this.publish(TOPICS.events(thing), { tipo: 'movimento_sem_aluguel', timestamp: new Date(Date.parse(p.fixTime)).toISOString() }, 1);
    }
    // Cada status com o bit de corte republica `reported.travada` (confirmação fresca para a API), sempre do bit ATUAL.
    const blocked = currentBlocked(r.memory);
    if (typeof p.attributes?.blocked === 'boolean' && typeof blocked === 'boolean') await this.report(thing, { travada: blocked, ...this.freshSpeed(thing) });
  }

  private async onAlarm(thing: string, e: TraccarEvent): Promise<void> {
    if (e.type !== 'alarm') return;
    const events = toDeviceEvents(e, this.mem(thing), this.now());
    if (!events.length) {
      this.log.info({ msg: 'alarm_ignored', thingName: thing, alarm: String(e.attributes?.alarm ?? '') });
      return;
    }
    for (const ev of events) await this.publish(TOPICS.events(thing), ev, 1);
  }

  private async onMqtt(topic: string, payload: Buffer): Promise<void> {
    const thing = thingOf(topic);
    if (!thing || !this.thingToImei.has(thing)) return;
    if (topic === TOPICS.commands(thing)) {
      this.log.info({ msg: 'command_ignored_no_horn', thingName: thing });
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(payload.toString('utf8'));
    } catch {
      this.log.warn({ msg: 'mqtt_invalid_json', thingName: thing });
      return;
    }
    const state = isObj(body) && isObj(body.state) ? body.state : undefined;
    if (topic === TOPICS.shadowDelta(thing)) {
      await this.serial(thing, () => this.onDelta(thing, state));
      return;
    }
    if (topic === TOPICS.shadowGetAccepted(thing) && this.awaitingGet.delete(thing)) {
      // Só `travada: false` pendente é reaplicado; `planReconnect` nunca devolve engineStop (a API recomeça o fluxo, §5.7).
      const actions = planReconnect(state && isObj(state.delta) ? parseDelta(state.delta) : undefined).filter((a) => a.kind !== 'engineStop');
      await this.serial(thing, () => this.execute(thing, actions));
    }
  }

  /** Todo delta passa pela segunda guarda (`planDeltaFor`); `travada` null/ausente/não booleana não vira comando. */
  private async onDelta(thing: string, state: Record<string, unknown> | undefined): Promise<void> {
    const delta = parseDelta(state);
    const online = this.deviceOf(thing)?.status === 'online';
    const { actions, refusal } = planDeltaFor(delta, { online, mem: this.mem(thing), now: this.now(), lastStopSentAt: this.stopSentAt.get(thing) });
    if (refusal && refusal !== 'already_blocked') this.log.warn({ msg: 'engine_stop_refused', thingName: thing, reason: refusal });
    await this.execute(thing, actions);
  }

  private async execute(thing: string, actions: BridgeAction[]): Promise<void> {
    for (const a of actions) {
      if (a.kind === 'report') {
        if (a.reported.modo_roubada !== undefined) this.stolen.set(thing, a.reported.modo_roubada);
        // Eco `travada: true` de moto já travada (planDeltaFor usa o bit atual) leva a velocidade fresca, como o reported normal.
        await this.report(thing, a.reported.travada === true ? { ...a.reported, ...this.freshSpeed(thing) } : a.reported);
        continue;
      }
      const device = this.deviceOf(thing);
      if (!device) {
        this.log.warn({ msg: 'command_unknown_device', thingName: thing });
        continue;
      }
      if (a.kind === 'engineStop') {
        await this.sendStop(thing, device);
        continue;
      }
      if (device.status !== 'online') {
        this.log.info({ msg: 'engine_resume_deferred_offline', thingName: thing });
        continue;
      }
      let sent: 'sent' | 'queued';
      try {
        sent = await this.traccar.sendCommand(device.id, 'engineResume');
      } catch (err) {
        // Sem fila: se o dispositivo caiu, o get da reconexão reaplica o `travada: false` pendente.
        this.log.error({ msg: 'engine_resume_not_sent', thingName: thing, error: (err as Error).message });
        continue;
      }
      this.stopSentAt.delete(thing);
      if (sent === 'queued') this.log.error({ msg: 'engine_resume_queued', thingName: thing });
      else this.log.info({ msg: 'engine_resume_sent', thingName: thing });
      if (currentBlocked(this.mem(thing)) === false) await this.report(thing, { travada: false });
    }
  }

  /** Chamado só com a guarda liberada (`planDeltaFor` sem recusa). Nunca deixa o corte na fila do Traccar (`noQueue`). */
  private async sendStop(thing: string, device: TraccarDevice): Promise<void> {
    let sent: 'sent' | 'queued';
    try {
      sent = await this.traccar.sendCommand(device.id, 'engineStop');
    } catch (err) {
      // Dispositivo sem sessão no Traccar (caiu entre a checagem e o envio) ou erro HTTP: nada enviado nem enfileirado.
      this.log.error({ msg: 'engine_stop_not_sent', thingName: thing, error: (err as Error).message });
      return;
    }
    this.stopSentAt.set(thing, this.now());
    if (sent === 'queued') {
      // Só acontece com um Traccar que ignora `noQueue`: o corte seria entregue na reconexão, em qualquer velocidade. Alerta.
      this.log.error({ msg: 'engine_stop_queued', thingName: thing });
      return;
    }
    this.log.info({ msg: 'engine_stop_sent', thingName: thing });
  }

  private freshSpeed(thing: string): { velocidade_kmh?: number } {
    const last = this.mem(thing).last;
    if (!last || this.now() - Math.min(last.fixTime, this.now()) > CUT_FRESH_MS) return {};
    return { velocidade_kmh: last.speedKmh };
  }

  /** Reported completo (reconexão). `travada` só se o bit ATUAL for conhecido — nunca de memória anterior à reconexão. */
  private fullReported(thing: string): ReportedState {
    const model = this.deviceOf(thing)?.model;
    const blocked = currentBlocked(this.mem(thing));
    return {
      ...(typeof blocked === 'boolean' ? { travada: blocked } : {}),
      limite_kmh: FIXED_LIMIT_KMH,
      modo_roubada: this.stolen.get(thing) ?? false,
      firmware: (model ? `gt06/${model}` : 'gt06').slice(0, 64),
      ...this.freshSpeed(thing),
    };
  }

  private logLimited(thing: string, msg: string, level: 'info' | 'warn', extra: Record<string, unknown>, key = ''): void {
    const id = `${thing}|${msg}|${key}`;
    const at = this.lastLogAt.get(id);
    const now = this.now();
    if (at !== undefined && now - at < LOG_RATE_MS) return;
    this.lastLogAt.set(id, now);
    this.log[level]({ msg, thingName: thing, ...extra });
  }

  private async report(thing: string, reported: ReportedState): Promise<void> {
    await this.publish(TOPICS.shadowUpdate(thing), { state: { reported } }, 1);
  }

  private async publish(topic: string, payload: unknown, qos: 0 | 1): Promise<void> {
    await this.mqtt.publishAsync(topic, JSON.stringify(payload), { qos });
  }

  private serial(key: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    const next = prev.then(fn).catch((err: Error) => this.log.error({ msg: 'bridge_step_failed', thingName: key, error: err.message }));
    this.chains.set(key, next);
    void next.then(() => {
      if (this.chains.get(key) === next) this.chains.delete(key);
    });
    return next;
  }
}
