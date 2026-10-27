import { FIXED_LIMIT_KMH, TOPICS, thingOf, type DeviceEventMessage, type ReportedState } from './contract';
import { CUT_FRESH_MS, parseDelta, planDeltaFor, planReconnect, type BridgeAction } from './delta';
import { maskImei, silentLogger, type Logger } from './log';
import { applyPosition, currentBlocked, freshBlocked, markReconnected, toDeviceEvents, type DeviceMemory } from './mapping';
import type { MqttLike } from './mqtt';
import type { TraccarDevice, TraccarEvent, TraccarPosition, TraccarSocketMessage } from './traccar/types';
import { MIN_TRACCAR_NOQUEUE, supportsNoQueue } from './traccar/version';
import type { BatteryModel } from './units';

export interface TraccarApi {
  devices(): Promise<TraccarDevice[]>;
  /** `GET /api/server` (`version`). */
  server(): Promise<{ version?: unknown }>;
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
  /** Prazo de uma publicação MQTT (PUBACK do QoS 1); padrão `PUBLISH_TIMEOUT_MS`. */
  publishTimeoutMs?: number;
}

/** Corte conhecido e bateria ainda desconhecida há este tempo → telemetria sai com `bateria_pct: 0` (log `battery_unknown`). */
export const BATTERY_UNKNOWN_CAP_MS = 5 * 60_000;
/** Logs repetitivos (retenção, bateria, replay, IMEI desconhecido): no máximo um por chave nesta janela. */
export const LOG_RATE_MS = 60_000;
/** `reported.travada` igual ao último publicado sai no máximo uma vez neste intervalo (mudança sai na hora). */
export const REPORT_REPEAT_MS = 60_000;
/** Publicação MQTT sem conclusão neste prazo é abandonada (log) para não travar a fila de entrada. */
export const PUBLISH_TIMEOUT_MS = 10_000;
/** Com a versão do Traccar não confirmada, um comando relê `/api/server` no máximo uma vez neste intervalo. */
export const VERSION_RECHECK_MS = 10_000;
/** Ids de posição cujos alarmes já saíram, por moto (deduplicação position × events). */
const ALARM_IDS_KEPT = 256;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Ponte GT06 (spec §6): posições/eventos do Traccar → `motos/{t}/telemetria|eventos` e `reported` do shadow; delta do shadow →
 * `engineStop`/`engineResume` (com a segunda guarda: só corta com posição fresca < 3 km/h). Para a API nada muda (mesmos tópicos).
 * Processamento em ordem por moto. Logs sem dado pessoal e sem IMEI completo.
 *
 * - Bit de corte: lido só por `currentBlocked`/`freshBlocked`. Toda (re)conexão — do dispositivo no Traccar ou do WebSocket da
 *   ponte — chama `markReconnected`; o replay de últimas posições que o Traccar manda ao abrir o WebSocket não conta como status.
 * - Comandos de motor só com Traccar ≥ 6.7.0 (respeita `noQueue`); senão, recusa sem chamar a REST.
 */
export class Bridge {
  private readonly devices = new Map<number, TraccarDevice>();
  private readonly memory = new Map<string, DeviceMemory>();
  private readonly stolen = new Map<string, boolean>();
  private readonly stopSentAt = new Map<string, number>();
  /** Desde quando a moto está com o corte conhecido e a bateria desconhecida (teto de retenção). */
  private readonly batteryWaitSince = new Map<string, number>();
  /** Último `reported.travada` publicado (valor e hora), para M5. */
  private readonly lastTravada = new Map<string, { value: boolean; at: number }>();
  private readonly alarmIds = new Map<string, number[]>();
  private readonly lastLogAt = new Map<string, number>();
  private readonly awaitingGet = new Set<string>();
  private readonly subscribed = new Set<string>();
  private readonly chains = new Map<string, Promise<void>>();
  private imeiToThing = new Map<string, string>();
  private thingToImei = new Map<string, string>();
  private inbound: Promise<void> = Promise.resolve();
  /** A próxima mensagem do WebSocket com `positions` é o replay de conexão (últimas conhecidas, possivelmente velhas). */
  private replayPending = false;
  /** Traccar respeita `noQueue` (≥ 6.7.0)? Relido a cada `refreshDevices`; desconhecido = não. */
  private noQueueOk = false;
  private lastVersionCheck = Number.NEGATIVE_INFINITY;
  private listening = false;
  private lastMissRefresh = 0;
  private readonly log: Logger;
  private readonly now: () => number;
  private readonly publishTimeoutMs: number;

  constructor(
    private readonly mqtt: MqttLike,
    private readonly traccar: TraccarApi,
    private readonly registry: Registry,
    private readonly opts: BridgeOptions,
  ) {
    this.log = opts.log ?? silentLogger;
    this.now = opts.now ?? Date.now;
    this.publishTimeoutMs = opts.publishTimeoutMs ?? PUBLISH_TIMEOUT_MS;
  }

  async start(): Promise<void> {
    if (!this.listening) {
      this.mqtt.on('message', (topic: string, payload: Buffer) => {
        void this.onMqtt(topic, payload).catch((err: Error) => this.log.error({ msg: 'mqtt_message_failed', error: err.message }));
      });
      this.mqtt.on('connect', () => void this.onMqttConnect());
      this.listening = true;
    }
    await this.refreshDevices();
    await this.refreshRegistry();
  }

  /** Versão do Traccar (gate do `noQueue`) e lista de dispositivos; mudança de status de um já conhecido dispara presença/reconexão. */
  async refreshDevices(): Promise<void> {
    await this.refreshServerVersion();
    for (const d of await this.traccar.devices()) await this.updateDevice(d);
  }

  /** Relê o registro. Thing cujo IMEI mudou (aparelho trocado, removido ou devolvido) recomeça sem memória. */
  async refreshRegistry(): Promise<void> {
    const next = await this.registry.things();
    const nextT2I = new Map([...next].map(([imei, thing]) => [thing, imei]));
    const changed = [...new Set([...this.thingToImei.keys(), ...nextT2I.keys()])].filter((t) => this.thingToImei.get(t) !== nextT2I.get(t));
    this.imeiToThing = next;
    this.thingToImei = nextT2I;
    for (const thing of changed) {
      await this.serial(thing, async () => {
        if (this.memory.has(thing) || this.stolen.has(thing) || this.stopSentAt.has(thing)) this.log.info({ msg: 'registry_thing_remapped', thingName: thing });
        this.forget(thing);
      });
    }
    await this.subscribe([...this.thingToImei.keys()].filter((t) => !this.subscribed.has(t)));
  }

  /** Sessão MQTT limpa a cada (re)conexão: assina tudo de novo. */
  async resubscribe(): Promise<void> {
    this.subscribed.clear();
    await this.subscribe([...this.thingToImei.keys()]);
  }

  /**
   * MQTT (re)conectado: reassina e republica `reported.travada` do estado ATUAL (bit fresco) de cada moto. Nada do que ficou
   * pendente enquanto desconectado é reenviado pela ponte (os reported são descartados fora do ar).
   */
  async onMqttConnect(): Promise<void> {
    try {
      await this.resubscribe();
    } catch (err) {
      this.log.error({ msg: 'mqtt_resubscribe_failed', error: (err as Error).message });
    }
    for (const thing of [...this.memory.keys()]) {
      await this.serial(thing, async () => {
        const blocked = freshBlocked(this.mem(thing), this.now());
        if (typeof blocked === 'boolean') await this.report(thing, { travada: blocked, ...this.freshSpeed(thing) });
      });
    }
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

  /** Relê `GET /api/server` (gate do `noQueue`). Também chamado por `main` no intervalo do registro. */
  async refreshServerVersion(): Promise<void> {
    this.lastVersionCheck = this.now();
    let version: unknown;
    try {
      version = (await this.traccar.server()).version;
    } catch (err) {
      this.noQueueOk = false;
      this.logLimited('traccar_version_unknown', 'error', { error: (err as Error).message });
      return;
    }
    this.noQueueOk = supportsNoQueue(version);
    if (!this.noQueueOk) {
      this.logLimited('traccar_version_unsupported', 'error', { version: typeof version === 'string' ? version.slice(0, 32) : null, minimum: MIN_TRACCAR_NOQUEUE });
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
    this.lastTravada.delete(thing); // o primeiro status depois da reconexão sai sempre
  }

  /** Aparelho do thing mudou no registro: nada do aparelho anterior vale. */
  private forget(thing: string): void {
    this.memory.delete(thing);
    this.stopSentAt.delete(thing);
    this.stolen.delete(thing);
    this.batteryWaitSince.delete(thing);
    this.lastTravada.delete(thing);
    this.alarmIds.delete(thing);
    this.awaitingGet.delete(thing);
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
      const imei = maskImei(d.uniqueId);
      this.logLimited(`traccar_unknown_device|${imei}`, 'warn', { msg: 'traccar_unknown_device', imei });
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
      this.logLimited(`${thing}|replay`, 'info', { msg: 'traccar_replay_status_ignored', thingName: thing });
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
          this.logLimited(`${thing}|battery_unknown`, 'warn', { msg: 'battery_unknown', thingName: thing });
        }
      }
    } else if (r.telemetry) {
      this.batteryWaitSince.delete(thing);
    }
    this.memory.set(thing, r.memory);
    if (r.invalid) this.log.warn({ msg: 'telemetry_invalid', thingName: thing });
    if (r.held && !r.telemetry) this.logLimited(`${thing}|held|${r.held}`, 'info', { msg: 'telemetry_held', thingName: thing, reason: r.held });
    if (r.telemetry && !(await this.publish(TOPICS.telemetry(thing), r.telemetry, 0)) && this.mqtt.connected === false) {
      this.logLimited(`${thing}|mqtt_down`, 'warn', { msg: 'telemetry_skipped_mqtt_down', thingName: thing });
    }
    if (r.movedWhileLocked) {
      // Evento de segurança: sai mesmo com a telemetria retida (ex.: bateria desconhecida).
      await this.publish(TOPICS.events(thing), { tipo: 'movimento_sem_aluguel', timestamp: new Date(Date.parse(p.fixTime)).toISOString() }, 1);
    }
    if (!replay) await this.positionAlarms(thing, p, r.memory, now);
    // Status com o bit de corte → `reported.travada` do bit ATUAL: na mudança ou, igual, no máximo 1/min (M5).
    const blocked = currentBlocked(r.memory);
    if (typeof p.attributes?.blocked === 'boolean' && typeof blocked === 'boolean') {
      const last = this.lastTravada.get(thing);
      if (!last || last.value !== blocked || now - last.at >= REPORT_REPEAT_MS) await this.report(thing, { travada: blocked, ...this.freshSpeed(thing) });
    }
  }

  /**
   * Sem Notification configurada no Traccar os alarmes não chegam como `events` no WebSocket, só em `position.attributes.alarm`
   * (I1). Mesmo mapeamento de `toDeviceEvents`; deduplicado por id de posição com o caminho `events`.
   */
  private async positionAlarms(thing: string, p: TraccarPosition, mem: DeviceMemory, now: number): Promise<void> {
    const alarm = p.attributes?.alarm;
    if (typeof alarm !== 'string' || !alarm || !this.claimAlarm(thing, p.id)) return;
    // Heartbeat/status (`outdated`) repete o fixTime da última posição: a hora do alarme é a do servidor.
    const at = p.outdated ? p.serverTime : p.fixTime;
    await this.publishAlarm(thing, toDeviceEvents({ id: 0, type: 'alarm', eventTime: at, deviceId: p.deviceId, positionId: p.id, attributes: { alarm } }, mem, now), alarm);
  }

  private async onAlarm(thing: string, e: TraccarEvent): Promise<void> {
    if (e.type !== 'alarm') return;
    if (e.positionId !== undefined && !this.claimAlarm(thing, e.positionId)) return; // já saiu pela posição
    await this.publishAlarm(thing, toDeviceEvents(e, this.mem(thing), this.now()), String(e.attributes?.alarm ?? ''));
  }

  private async publishAlarm(thing: string, events: DeviceEventMessage[], alarm: string): Promise<void> {
    if (!events.length) {
      this.log.info({ msg: 'alarm_ignored', thingName: thing, alarm: alarm.slice(0, 64) });
      return;
    }
    for (const ev of events) await this.publish(TOPICS.events(thing), ev, 1);
  }

  /** `true` na primeira vez que o alarme da posição `id` é visto (por posição ou por evento). */
  private claimAlarm(thing: string, id: number): boolean {
    const ids = this.alarmIds.get(thing) ?? [];
    if (ids.includes(id)) return false;
    ids.push(id);
    if (ids.length > ALARM_IDS_KEPT) ids.shift();
    this.alarmIds.set(thing, ids);
    return true;
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
        // Eco `travada: true` de moto já travada (bit atual e fresco): sai SEMPRE (sem a deduplicação de M5), com a velocidade fresca.
        await this.report(thing, a.reported.travada === true ? { ...a.reported, ...this.freshSpeed(thing) } : a.reported);
        continue;
      }
      // Falha passageira do /api/server não pode travar comandos até a próxima releitura: relê antes de recusar (≤ 1 a cada 10 s).
      if (!this.noQueueOk && this.now() - this.lastVersionCheck >= VERSION_RECHECK_MS) await this.refreshServerVersion();
      if (!this.noQueueOk) {
        // C1: Traccar < 6.7.0 (ou versão desconhecida) enfileira comando de dispositivo sem sessão — nenhum comando de motor.
        const msg = a.kind === 'engineStop' ? 'engine_stop_refused' : 'engine_resume_refused';
        this.logLimited(`${thing}|${msg}|no_noqueue`, 'error', { msg, thingName: thing, reason: 'traccar_no_noqueue' });
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
      if (freshBlocked(this.mem(thing), this.now()) === false) await this.report(thing, { travada: false });
    }
  }

  /** Chamado só com a guarda liberada (`planDeltaFor` sem recusa) e Traccar ≥ 6.7.0. Nunca deixa o corte na fila (`noQueue`). */
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
      // Não deveria acontecer com ≥ 6.7.0 e `noQueue`: o corte seria entregue na reconexão, em qualquer velocidade. Alerta.
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

  /** Reported completo (reconexão). `travada` só se o bit atual e fresco for conhecido — nunca de memória anterior. */
  private fullReported(thing: string): ReportedState {
    const model = this.deviceOf(thing)?.model;
    const blocked = freshBlocked(this.mem(thing), this.now());
    return {
      ...(typeof blocked === 'boolean' ? { travada: blocked } : {}),
      limite_kmh: FIXED_LIMIT_KMH,
      modo_roubada: this.stolen.get(thing) ?? false,
      firmware: (model ? `gt06/${model}` : 'gt06').slice(0, 64),
      ...this.freshSpeed(thing),
    };
  }

  /** Um log por `key` a cada `LOG_RATE_MS` (relógio da ponte). `entry.msg` vale; sem ele, o nome do log é a própria `key`. */
  private logLimited(key: string, level: 'info' | 'warn' | 'error', entry: Record<string, unknown>): void {
    const at = this.lastLogAt.get(key);
    const now = this.now();
    if (at !== undefined && now - at < LOG_RATE_MS) return;
    this.lastLogAt.set(key, now);
    this.log[level]({ msg: key, ...entry });
  }

  /**
   * `reported` do shadow. Com o MQTT fora, não publica (o mqtt.js guardaria na fila offline e entregaria um estado velho na
   * reconexão); `onMqttConnect` republica o estado atual.
   */
  private async report(thing: string, reported: ReportedState): Promise<void> {
    if (this.mqtt.connected === false) return;
    if (await this.publish(TOPICS.shadowUpdate(thing), { state: { reported } }, 1)) {
      if (typeof reported.travada === 'boolean') this.lastTravada.set(thing, { value: reported.travada, at: this.now() });
    }
  }

  /** `false` = não publicado (QoS 0 com o MQTT fora) ou sem conclusão no prazo (log `mqtt_publish_timeout`). */
  private async publish(topic: string, payload: unknown, qos: 0 | 1): Promise<boolean> {
    if (qos === 0 && this.mqtt.connected === false) return false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), this.publishTimeoutMs);
      timer.unref?.();
    });
    const sent = this.mqtt.publishAsync(topic, JSON.stringify(payload), { qos }).then(() => 'ok' as const);
    sent.catch(() => undefined);
    try {
      if ((await Promise.race([sent, timeout])) === 'timeout') {
        this.log.error({ msg: 'mqtt_publish_timeout', thingName: thingOf(topic), qos });
        return false;
      }
      return true;
    } catch (err) {
      this.log.error({ msg: 'mqtt_publish_failed', thingName: thingOf(topic), error: (err as Error).message });
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
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
