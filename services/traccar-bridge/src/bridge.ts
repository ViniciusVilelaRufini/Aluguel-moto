import { ConsoleQueue, CONSOLE_TIMEOUT_MS, isRelayConsoleText, parseConsoleCommand, replyMatches } from './console';
import { FIXED_LIMIT_KMH, TOPICS, thingOf, type DeviceEventMessage, type ReportedState } from './contract';
import { CUT_FRESH_MS, cutRefusal, parseDelta, planDeltaFor, planReconnect, type BridgeAction } from './delta';
import { maskImei, silentLogger, type Logger } from './log';
import { applyPosition, currentBlocked, freshBlocked, gpsSleepOf, markCommandSent, markReconnected, parseRelayReply, toDeviceEvents, type DeviceMemory } from './mapping';
import type { MqttLike } from './mqtt';
import type { TraccarDevice, TraccarEvent, TraccarPosition, TraccarSocketMessage } from './traccar/types';
import { MIN_TRACCAR_NOQUEUE, supportsNoQueue } from './traccar/version';
import type { BatteryModel } from './units';

export interface TraccarApi {
  devices(): Promise<TraccarDevice[]>;
  /** `GET /api/server` (`version`). */
  server(): Promise<{ version?: unknown }>;
  /** Abre a sessão se ainda não houver (login). */
  ensureSession(): Promise<void>;
  /** `engineStop` exige sessão aberta e não faz login nem reenvia no 401; `engineResume` pode. */
  sendCommand(deviceId: number, type: 'engineStop' | 'engineResume'): Promise<'sent' | 'queued'>;
  /** Comando de texto do console (`custom`, sempre `noQueue`): 202 = enfileirado pelo Traccar (`queued`); 400 = sem sessão (`offline`). */
  sendCustom(deviceId: number, data: string): Promise<'sent' | 'queued' | 'offline'>;
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
  /** Prazo de um SUBSCRIBE (SUBACK); padrão `SUBSCRIBE_TIMEOUT_MS`. */
  subscribeTimeoutMs?: number;
  /**
   * Reabre o WebSocket do Traccar (login novo; `TraccarSocket.reopen`). `false` = não havia conexão aberta. Sem ele a ponte
   * não reabre sozinha um WebSocket que não entrega um dispositivo do registro (só loga).
   */
  reopenSocket?: () => boolean;
  /** Intervalo da varredura de comandos de console sem resposta (padrão `CONSOLE_SWEEP_MS`). */
  consoleSweepMs?: number;
}

/** Varredura dos comandos de console vencidos (prazo `CONSOLE_TIMEOUT_MS`). */
export const CONSOLE_SWEEP_MS = 5_000;

/**
 * Dispositivo do registro online no Traccar sem nenhuma mensagem no WebSocket por este tempo (desde que entrou no registro
 * ou desde a abertura do WebSocket) → a sessão do WebSocket provavelmente não o inclui (bancada do J16, 2026-11-03).
 */
export const UNDELIVERED_REOPEN_MS = 90_000;
/** Reaberturas do WebSocket por dispositivo não entregue: no máximo uma neste intervalo (e uma por moto). */
export const SOCKET_REOPEN_MIN_MS = 5 * 60_000;

/** Corte conhecido e bateria ainda desconhecida há este tempo → telemetria sai com `bateria_pct: 0` (log `battery_unknown`). */
export const BATTERY_UNKNOWN_CAP_MS = 5 * 60_000;
/** Logs repetitivos (retenção, bateria, replay, IMEI desconhecido): no máximo um por chave nesta janela. */
export const LOG_RATE_MS = 60_000;
/** `reported.travada` igual ao último publicado sai no máximo uma vez neste intervalo (mudança sai na hora). */
export const REPORT_REPEAT_MS = 60_000;
/** Publicação MQTT sem conclusão neste prazo é abandonada (log) para não travar a fila de entrada. */
export const PUBLISH_TIMEOUT_MS = 10_000;
/** SUBSCRIBE sem SUBACK neste prazo falha (a próxima releitura do registro / reconexão tenta de novo). */
export const SUBSCRIBE_TIMEOUT_MS = 10_000;
/** Com a versão do Traccar não confirmada, um comando relê `/api/server` no máximo uma vez neste intervalo. */
export const VERSION_RECHECK_MS = 10_000;
/** Ids de posição cujos alarmes já saíram, por moto (deduplicação position × events). */
const ALARM_IDS_KEPT = 256;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Tipo do tópico para logs (sem dado pessoal). */
function topicKind(topic: string): 'presence' | 'events' | 'shadow_get' | 'shadow_update' | 'other' {
  if (topic.startsWith('$aws/events/presence/')) return 'presence';
  if (topic.endsWith('/eventos')) return 'events';
  if (topic.endsWith('/shadow/get')) return 'shadow_get';
  if (topic.endsWith('/shadow/update')) return 'shadow_update';
  return 'other';
}

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
  /** Último `reported.gps_economia` publicado (valor e hora): sozinho só na mudança ou no máximo 1/min. */
  private readonly lastGpsSleep = new Map<string, { value: boolean; at: number }>();
  private readonly alarmIds = new Map<string, number[]>();
  private readonly lastLogAt = new Map<string, number>();
  private readonly awaitingGet = new Set<string>();
  /** Relógio da ponte quando o thing entrou no registro (ou no início). Base do prazo de `checkUndelivered`. */
  private readonly registeredAt = new Map<string, number>();
  /** Última mensagem do WebSocket (posição, dispositivo ou evento) por id de dispositivo do Traccar. */
  private readonly deliveredAt = new Map<number, number>();
  /** Things para os quais o WebSocket já foi reaberto por falta de entrega (uma vez por moto e por entrada no registro). */
  private readonly reopenTried = new Set<string>();
  private socketOpenedAt?: number;
  private lastReopenAt = Number.NEGATIVE_INFINITY;
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
  private readonly consoleQueue = new ConsoleQueue(CONSOLE_TIMEOUT_MS);
  private readonly lastConsolePosition = new Map<string, number>();
  private consoleTimer?: ReturnType<typeof setInterval>;
  private lastMissRefresh = 0;
  /** Releitura do registro em voo (single-flight): chamadas concorrentes esperam a mesma. */
  private registryRefresh?: Promise<void>;
  private readonly log: Logger;
  private readonly now: () => number;
  private readonly publishTimeoutMs: number;
  private readonly subscribeTimeoutMs: number;

  constructor(
    private readonly mqtt: MqttLike,
    private readonly traccar: TraccarApi,
    private readonly registry: Registry,
    private readonly opts: BridgeOptions,
  ) {
    this.log = opts.log ?? silentLogger;
    this.now = opts.now ?? Date.now;
    this.publishTimeoutMs = opts.publishTimeoutMs ?? PUBLISH_TIMEOUT_MS;
    this.subscribeTimeoutMs = opts.subscribeTimeoutMs ?? SUBSCRIBE_TIMEOUT_MS;
  }

  async start(): Promise<void> {
    if (!this.listening) {
      this.mqtt.on('message', (topic: string, payload: Buffer, packet?: { retain?: boolean }) => {
        // Auditoria run-4: mensagem RETIDA (entregue no SUBSCRIBE, de qualquer publicador antigo) nunca vira comando. O
        // shadow do servidor não retém delta nem get/accepted; um retido é sobra ou injeção e destravaria a moto sozinho.
        if (packet?.retain) {
          this.log.warn({ msg: 'mqtt_retained_ignored', thingName: thingOf(topic) ?? undefined });
          return;
        }
        void this.onMqtt(topic, payload).catch((err: Error) => this.log.error({ msg: 'mqtt_message_failed', error: err.message }));
      });
      this.mqtt.on('connect', () => void this.onMqttConnect());
      this.listening = true;
    }
    this.consoleTimer ??= setInterval(
      () => void this.sweepConsole().catch((err: Error) => this.log.error({ msg: 'console_sweep_failed', error: err.message })),
      this.opts.consoleSweepMs ?? CONSOLE_SWEEP_MS,
    );
    this.consoleTimer.unref?.();
    await this.refreshDevices();
    await this.refreshRegistry();
    await this.requestPendingUnlocks();
  }

  /** Para a varredura do console (encerramento/testes). */
  close(): void {
    if (this.consoleTimer) clearInterval(this.consoleTimer);
    this.consoleTimer = undefined;
  }

  /** Comandos de console sem resposta há 60 s → `console_falha` `timeout`. */
  private async sweepConsole(): Promise<void> {
    for (const { thing, comandoId } of this.consoleQueue.expire(this.now())) {
      this.log.warn({ msg: 'console_timeout', thingName: thing, comandoId });
      await this.consoleFail(thing, comandoId, 'timeout');
    }
  }

  private async consoleFail(thing: string, comandoId: string, motivo: 'offline' | 'timeout' | 'erro'): Promise<void> {
    await this.publish(TOPICS.events(thing), { tipo: 'console_falha', comando_id: comandoId, motivo, timestamp: new Date(this.now()).toISOString() }, 1);
  }

  /** `acao: 'console'`: envia o texto ao aparelho pelo Traccar; a resposta chega depois como posição com `attributes.result`. */
  private async onConsoleCommand(thing: string, body: unknown): Promise<void> {
    const cmd = parseConsoleCommand(body);
    if (!cmd) {
      this.log.warn({ msg: 'console_invalid', thingName: thing });
      return;
    }
    // C1 (defesa em profundidade): relé/motor nunca pelo console, mesmo que a API deixe passar.
    if (isRelayConsoleText(cmd.texto)) {
      this.log.error({ msg: 'console_relay_refused', thingName: thing, comandoId: cmd.comandoId });
      await this.consoleFail(thing, cmd.comandoId, 'erro');
      return;
    }
    const device = this.deviceOf(thing);
    if (!device) {
      this.log.warn({ msg: 'console_device_unknown', thingName: thing, comandoId: cmd.comandoId });
      await this.consoleFail(thing, cmd.comandoId, 'offline');
      return;
    }
    // I1: mesmo gate dos comandos de motor — sem `noQueue` garantido o Traccar guardaria o texto para a reconexão.
    if (!this.noQueueOk && this.now() - this.lastVersionCheck >= VERSION_RECHECK_MS) await this.refreshServerVersion();
    if (!this.noQueueOk) {
      this.logLimited(`${thing}|console_refused|no_noqueue`, 'error', { msg: 'console_refused', thingName: thing, comandoId: cmd.comandoId, reason: 'traccar_no_noqueue' });
      await this.consoleFail(thing, cmd.comandoId, 'erro');
      return;
    }
    // I1: status conhecido e não online → offline sem chamar o Traccar.
    const status = this.devices.get(device.id)?.status;
    if (status !== undefined && status !== 'online') {
      this.log.info({ msg: 'console_offline', thingName: thing, comandoId: cmd.comandoId });
      await this.consoleFail(thing, cmd.comandoId, 'offline');
      return;
    }
    // Entra na fila antes do envio: a resposta pode chegar antes de o POST voltar. M3: id já visto = reentrega, não reenvia.
    if (!this.consoleQueue.add(thing, cmd.comandoId, this.now(), cmd.texto)) {
      this.log.warn({ msg: 'console_duplicate_ignored', thingName: thing, comandoId: cmd.comandoId });
      return;
    }
    let sent: 'sent' | 'queued' | 'offline';
    try {
      sent = await this.traccar.sendCustom(device.id, cmd.texto);
    } catch (err) {
      this.consoleQueue.remove(thing, cmd.comandoId);
      this.log.error({ msg: 'console_not_sent', thingName: thing, comandoId: cmd.comandoId, error: (err as Error).message });
      await this.consoleFail(thing, cmd.comandoId, 'erro');
      return;
    }
    if (sent === 'queued') {
      // 202 = o Traccar guardou o texto para entregar na reconexão (ignorou o `noQueue`). Não há como tirá-lo da fila pela
      // REST usada aqui: só alerta e falha o comando.
      this.consoleQueue.remove(thing, cmd.comandoId);
      this.log.error({ msg: 'console_queued_by_traccar', thingName: thing, comandoId: cmd.comandoId });
      await this.consoleFail(thing, cmd.comandoId, 'erro');
      return;
    }
    if (sent === 'offline') {
      this.consoleQueue.remove(thing, cmd.comandoId);
      this.log.info({ msg: 'console_offline', thingName: thing, comandoId: cmd.comandoId });
      await this.consoleFail(thing, cmd.comandoId, 'offline');
      return;
    }
    this.log.info({ msg: 'console_sent', thingName: thing, comandoId: cmd.comandoId });
  }

  /** Resposta de texto do aparelho (não é a de relé) → `console_resposta` do pendente mais antigo. */
  private async routeConsoleReply(thing: string, positionId: number, result: string): Promise<void> {
    if (parseRelayReply(result) !== undefined) return;
    // Mesma posição reentregue pelo Traccar: não consome um segundo pendente.
    if (this.lastConsolePosition.get(thing) === positionId) return;
    // Comando de motor/relé em curso: um texto qualquer pode ser dele, não do console.
    if (this.mem(thing).pendingCommand) return;
    const oldest = this.consoleQueue.peek(thing);
    if (!oldest) return;
    // M2: FIFO sem correlação; para leituras de resposta conhecida, a resposta tem de ser coerente com o texto enviado.
    if (!replyMatches(oldest.texto, result)) {
      this.log.warn({ msg: 'console_reply_unmatched', thingName: thing, comandoId: oldest.comandoId });
      return;
    }
    const pending = this.consoleQueue.take(thing)!;
    this.lastConsolePosition.set(thing, positionId);
    this.log.info({ msg: 'console_reply', thingName: thing, comandoId: pending.comandoId });
    await this.publish(TOPICS.events(thing), { tipo: 'console_resposta', comando_id: pending.comandoId, texto: result, timestamp: new Date(this.now()).toISOString() }, 1);
  }

  /** Versão do Traccar (gate do `noQueue`) e lista de dispositivos; mudança de status de um já conhecido dispara presença/reconexão. */
  async refreshDevices(): Promise<void> {
    await this.refreshServerVersion();
    for (const d of await this.traccar.devices()) await this.updateDevice(d);
  }

  /**
   * Relê o registro. Thing cujo IMEI mudou (aparelho trocado, removido ou devolvido) recomeça sem memória.
   * Single-flight: com uma releitura em voo, devolve a mesma promessa (o banco travado não empilha consultas).
   */
  refreshRegistry(): Promise<void> {
    if (!this.registryRefresh) {
      this.registryRefresh = this.loadRegistry().finally(() => {
        this.registryRefresh = undefined;
      });
    }
    return this.registryRefresh;
  }

  private async loadRegistry(): Promise<void> {
    const next = await this.registry.things();
    const nextT2I = new Map([...next].map(([imei, thing]) => [thing, imei]));
    const changed = [...new Set([...this.thingToImei.keys(), ...nextT2I.keys()])].filter((t) => this.thingToImei.get(t) !== nextT2I.get(t));
    this.imeiToThing = next;
    this.thingToImei = nextT2I;
    for (const thing of changed) {
      this.reopenTried.delete(thing);
      if (nextT2I.has(thing)) this.registeredAt.set(thing, this.now());
      else this.registeredAt.delete(thing);
      await this.serial(thing, async () => {
        if (this.memory.has(thing) || this.stolen.has(thing) || this.stopSentAt.has(thing)) this.log.info({ msg: 'registry_thing_remapped', thingName: thing });
        this.forget(thing);
      });
    }
    await this.subscribe([...this.thingToImei.keys()].filter((t) => !this.subscribed.has(t)));
    try {
      await this.checkUndelivered();
    } catch (err) {
      this.log.error({ msg: 'undelivered_check_failed', error: (err as Error).message });
    }
  }

  /**
   * Bancada do J16 (2026-11-03): dispositivo ligado ao usuário da ponte no Traccar DEPOIS da abertura do WebSocket não
   * chegava nele até reiniciar a ponte. Moto do registro online no Traccar (REST) sem nenhuma mensagem no WebSocket há
   * `UNDELIVERED_REOPEN_MS` (desde que entrou no registro ou desde a abertura do WebSocket) → reabre o WebSocket (login novo)
   * pelo caminho seguro de `onSocketOpen` (esquece o bit de corte de todas as motos, ignora o replay, relê dispositivos).
   * Uma vez por moto (por entrada no registro) e no máximo uma reabertura a cada `SOCKET_REOPEN_MIN_MS`; se nem assim chegar,
   * erro `traccar_device_not_delivered` (limitado): reiniciar a ponte. O `gt06.sh provision` reinicia a ponte de qualquer jeito.
   */
  private async checkUndelivered(): Promise<void> {
    const opened = this.socketOpenedAt;
    if (opened === undefined) return;
    const due = (thing: string, now: number): boolean => {
      const base = Math.max(this.registeredAt.get(thing) ?? now, opened);
      if (now - base < UNDELIVERED_REOPEN_MS) return false;
      const d = this.deviceOf(thing);
      return !(d && (this.deliveredAt.get(d.id) ?? Number.NEGATIVE_INFINITY) >= base);
    };
    if (![...this.thingToImei.keys()].some((t) => due(t, this.now()))) return;
    await this.refreshDevices(); // status atual (REST: vê o que a sessão do WebSocket pode não ver) e dispositivos novos
    const now = this.now();
    const undelivered = [...this.thingToImei.keys()].filter((t) => due(t, now) && this.deviceOf(t)?.status === 'online');
    for (const thing of undelivered.filter((t) => this.reopenTried.has(t))) {
      this.logLimited(`${thing}|not_delivered`, 'error', { msg: 'traccar_device_not_delivered', thingName: thing });
    }
    const fresh = undelivered.filter((t) => !this.reopenTried.has(t));
    if (!fresh.length) return;
    if (now - this.lastReopenAt < SOCKET_REOPEN_MIN_MS) {
      this.logLimited('traccar_socket_reopen_rate_limited', 'warn', { thingName: fresh[0], things: fresh.length });
      return;
    }
    if (!this.opts.reopenSocket?.()) {
      this.logLimited('traccar_device_not_delivered_no_reopen', 'warn', { thingName: fresh[0], things: fresh.length });
      return;
    }
    this.lastReopenAt = now;
    for (const t of fresh) this.reopenTried.add(t);
    this.log.warn({ msg: 'traccar_socket_reopen_undelivered', thingName: fresh[0], things: fresh.length });
  }

  /** Sessão MQTT limpa a cada (re)conexão: assina tudo de novo. */
  async resubscribe(): Promise<void> {
    this.subscribed.clear();
    await this.subscribe([...this.thingToImei.keys()]);
  }

  /**
   * MQTT (re)conectado: reassina, republica `reported.travada` do estado ATUAL (bit fresco) de cada moto e pede o shadow
   * (`get`) das motos online para aplicar um `travada: false` pendente (B-M1).
   *
   * Com o MQTT fora a ponte não publica QoS 1 (`publish`/`report` pulam). Mas um QoS 1 já entregue ao mqtt.js sem PUBACK
   * (em voo na queda, ou abandonado pelo prazo de `publish`) fica no `outgoingStore` e o mqtt.js o REENVIA na reconexão,
   * antes de emitir `connect`. Por isso este republish do estado atual vem depois e é o que vale no shadow.
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
    await this.requestPendingUnlocks();
  }

  /**
   * `shadow/get` de cada moto do registro online no Traccar (início e reconexão do MQTT): um desbloqueio pedido enquanto a
   * ponte/MQTT estava fora é aplicado sem esperar o aparelho reconectar. Do `get/accepted` só `travada: false` vira comando
   * (`planReconnect` + filtro: `travada: true` nunca é reaplicado).
   */
  private async requestPendingUnlocks(): Promise<void> {
    for (const thing of [...this.thingToImei.keys()]) {
      if (this.deviceOf(thing)?.status !== 'online') continue;
      await this.serial(thing, async () => {
        this.awaitingGet.add(thing);
        await this.publish(TOPICS.shadowGet(thing), {}, 1);
      });
    }
  }

  /** Conclui quando tudo o que já entrou na fila de entrada foi processado (sonda de vida, `liveness.ts`). */
  probeInbound(): Promise<void> {
    return this.inboundStep(async () => undefined);
  }

  /**
   * WebSocket do Traccar (re)aberto: mensagens podem ter se perdido. Esquece o bit de corte de todas as motos
   * (`markReconnected`), marca a próxima lista de posições como replay e relê os dispositivos (status mudados no intervalo).
   * Entra na fila de entrada, antes da primeira mensagem do socket novo.
   */
  onSocketOpen(): Promise<void> {
    return this.inboundStep(async () => {
      this.socketOpenedAt = this.now();
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
    // Entregue pelo WebSocket (inclusive replay): a sessão inclui o dispositivo (`checkUndelivered`).
    const at = this.now();
    for (const x of [...(msg.positions ?? []), ...(msg.events ?? [])]) this.deliveredAt.set(x.deviceId, at);
    for (const d of msg.devices ?? []) this.deliveredAt.set(d.id, at);
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

  /** SUBSCRIBE com prazo (`subscribeTimeoutMs`): sem SUBACK lança `mqtt_subscribe_timeout` e os things ficam para a próxima. */
  private async subscribe(things: string[]): Promise<void> {
    if (!things.length) return;
    const sub = this.mqtt.subscribeAsync(things.flatMap((t) => [TOPICS.shadowDelta(t), TOPICS.shadowGetAccepted(t), TOPICS.commands(t)]), { qos: 1 });
    sub.catch(() => undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('mqtt_subscribe_timeout')), this.subscribeTimeoutMs);
      timer.unref?.();
    });
    try {
      await Promise.race([sub, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
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
    this.lastGpsSleep.delete(thing);
    this.alarmIds.delete(thing);
    this.awaitingGet.delete(thing);
    this.lastConsolePosition.delete(thing);
    // Aparelho trocado: quem esperava resposta falha (a API não fica com comando pendente de outro aparelho).
    for (const p of this.consoleQueue.clear(thing)) {
      void this.consoleFail(thing, p.comandoId, 'erro').catch((err: Error) => this.log.error({ msg: 'console_fail_publish_failed', thingName: thing, error: err.message }));
    }
  }

  private async thingOfDevice(deviceId: number): Promise<string | null> {
    if (!this.devices.has(deviceId)) await this.refreshDevices();
    const d = this.devices.get(deviceId);
    if (!d) return null;
    const thing = this.imeiToThing.get(d.uniqueId);
    if (!thing && this.now() - this.lastMissRefresh > 10_000) {
      // Provisionado há pouco (antes da próxima leitura periódica): relê o registro no máximo a cada 10 s, SEM esperar
      // (o banco lento não pode travar a fila de entrada). Esta mensagem fica como de aparelho desconhecido; as próximas já mapeiam.
      this.lastMissRefresh = this.now();
      void this.refreshRegistry().catch((err: Error) => this.log.error({ msg: 'registry_refresh_failed', error: err.message }));
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
    if (replay && (typeof raw.attributes?.blocked === 'boolean' || typeof raw.attributes?.result === 'string')) {
      // Replay de conexão: a última posição conhecida pode ser de antes de uma reinicialização do J16 (inclusive uma resposta
      // "RELAY n OK" antiga). Não é status atual: sai sem o bit e sem a resposta.
      p = { ...raw, attributes: { ...raw.attributes, blocked: undefined, result: undefined } };
      this.logLimited(`${thing}|replay`, 'info', { msg: 'traccar_replay_status_ignored', thingName: thing });
    }
    const now = this.now();
    // Replay de conexão já saiu sem `result` em `p`: não é resposta nova.
    // I2: com console pendente, uma resposta de texto sem o estado do relé pode ser do console — não é ack do comando de motor.
    const consolePending = this.consoleQueue.has(thing);
    if (typeof p.attributes?.result === 'string') await this.routeConsoleReply(thing, p.id, p.attributes.result);
    const before = this.mem(thing);
    let r = applyPosition(p, before, this.opts.battery, now, { consolePending });
    if (r.held === 'awaiting_battery') {
      const since = this.batteryWaitSince.get(thing) ?? now;
      this.batteryWaitSince.set(thing, since);
      if (now - since >= BATTERY_UNKNOWN_CAP_MS) {
        // Teto: sem leitura de bateria (ex.: J16 em conversor DC-DC) a moto não pode ficar sem telemetria para sempre.
        // `bateria_pct: 0` só na mensagem; a memória continua sem bateria conhecida.
        const forced = applyPosition(p, { ...before, batteryPct: 0 }, this.opts.battery, now, { consolePending });
        if (forced.telemetry) {
          // `bateria_conhecida: false` (contrato MQTT): o 0 é falta de leitura, não bateria vazia.
          r = { ...forced, telemetry: { ...forced.telemetry, bateria_conhecida: false }, memory: { ...forced.memory, batteryPct: r.memory.batteryPct } };
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
    // Byte de status GT06 nesta mensagem (heartbeat): modo de economia do GPS para o painel/app (`reported.gps_economia`).
    const gpsSleep = r.memory.gpsStatus !== before.gpsStatus ? gpsSleepOf(r.memory, now) : undefined;
    const gps: ReportedState = gpsSleep === undefined ? {} : { gps_economia: gpsSleep };
    const blocked = currentBlocked(r.memory);
    if (r.relayReply && typeof blocked === 'boolean') {
      // Resposta do J16 com o estado do relé ("RELAY n OK"): status fresco do aparelho, sai na hora (sem a deduplicação de M5).
      // É ela que confirma o lock/unlock em ~1 s, sem esperar o heartbeat de 60 s.
      this.log.info({ msg: 'relay_reply', thingName: thing, travada: blocked });
      await this.report(thing, { travada: blocked, ...this.freshSpeed(thing) });
      return;
    }
    if (r.staleAfterReply) {
      // Bancada: status logo depois da resposta "RELAY n OK" com o bit antigo. Não muda nem republica a trava (`travada` = a da resposta).
      this.logLimited(`${thing}|stale_status_after_reply`, 'info', { msg: 'stale_status_after_reply', thingName: thing, travada: blocked });
      await this.reportGpsSleep(thing, gps);
      return;
    }
    // Status com o bit de corte → `reported.travada` do bit ATUAL: na mudança ou, igual, no máximo 1/min (M5).
    if (typeof p.attributes?.blocked === 'boolean' && typeof blocked === 'boolean') {
      const last = this.lastTravada.get(thing);
      if (!last || last.value !== blocked || now - last.at >= REPORT_REPEAT_MS) {
        await this.report(thing, { travada: blocked, ...this.freshSpeed(thing), ...gps });
        return;
      }
    }
    await this.reportGpsSleep(thing, gps);
  }

  /** `reported.gps_economia` sozinho (sem travada): na mudança ou, igual, no máximo 1/min. */
  private async reportGpsSleep(thing: string, gps: ReportedState): Promise<void> {
    if (gps.gps_economia === undefined) return;
    const last = this.lastGpsSleep.get(thing);
    if (!last || last.value !== gps.gps_economia || this.now() - last.at >= REPORT_REPEAT_MS) await this.report(thing, gps);
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
      let cmd: unknown;
      try {
        cmd = JSON.parse(payload.toString('utf8'));
      } catch {
        this.log.warn({ msg: 'mqtt_invalid_json', thingName: thing });
        return;
      }
      if (isObj(cmd) && cmd.acao === 'console') await this.onConsoleCommand(thing, cmd);
      else this.log.info({ msg: 'command_ignored_no_horn', thingName: thing });
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

  /**
   * Todo delta passa pela segunda guarda (`planDeltaFor`); `travada` null/ausente/não booleana não vira comando.
   * O aparelho do thing é resolvido UMA vez (B-M4): o mesmo vale para o plano e para o envio.
   */
  private async onDelta(thing: string, state: Record<string, unknown> | undefined): Promise<void> {
    const delta = parseDelta(state);
    const device = this.deviceOf(thing);
    const online = device?.status === 'online';
    const { actions, refusal } = planDeltaFor(delta, { online, mem: this.mem(thing), now: this.now(), lastStopSentAt: this.stopSentAt.get(thing) });
    if (refusal && refusal !== 'already_blocked') this.log.warn({ msg: 'engine_stop_refused', thingName: thing, reason: refusal });
    await this.execute(thing, actions, device);
  }

  /** `device` = aparelho resolvido no início do delta (B-M4); padrão: o atual do thing. */
  private async execute(thing: string, actions: BridgeAction[], device: TraccarDevice | undefined = this.deviceOf(thing)): Promise<void> {
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
      if (!device) {
        this.log.warn({ msg: 'command_unknown_device', thingName: thing });
        continue;
      }
      if (a.kind === 'engineStop') {
        await this.sendStop(thing, device);
        continue;
      }
      if (this.deviceOf(thing)?.id !== device.id || this.devices.get(device.id)?.status !== 'online') {
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
      // A4-1: o bit anterior ao comando não vale mais (nem telemetria, nem eco already_blocked). O eco `false` de uma moto
      // já destravada continua: o resume nunca trava o relé.
      const wasUnlocked = freshBlocked(this.mem(thing), this.now()) === false;
      this.commandSent(thing, 'resume');
      if (sent === 'queued') this.log.error({ msg: 'engine_resume_queued', thingName: thing });
      else this.log.info({ msg: 'engine_resume_sent', thingName: thing });
      if (wasUnlocked) await this.report(thing, { travada: false });
    }
  }

  /**
   * Chamado com a guarda liberada no plano (`planDeltaFor`) e Traccar ≥ 6.7.0. Nunca deixa o corte na fila (`noQueue`).
   * B-I2: entre o plano e aqui houve `await` (releitura da versão, outras ações): a guarda é refeita AGORA, com o status atual
   * do dispositivo, a memória atual e o relógio atual; e o aparelho do thing tem de ser o mesmo resolvido no plano (B-M4).
   * Daqui até o `sendCommand` não há `await`: a sessão HTTP é garantida ANTES da guarda (N3), e o `sendCommand` do
   * `engineStop` não faz login nem reenvia no 401.
   */
  private async sendStop(thing: string, device: TraccarDevice): Promise<void> {
    try {
      await this.traccar.ensureSession();
    } catch (err) {
      this.log.error({ msg: 'engine_stop_not_sent', thingName: thing, error: (err as Error).message });
      return;
    }
    const refusal =
      this.deviceOf(thing)?.id !== device.id
        ? 'device_changed'
        : cutRefusal({ online: this.devices.get(device.id)?.status === 'online', mem: this.mem(thing), now: this.now(), lastStopSentAt: this.stopSentAt.get(thing) });
    if (refusal) {
      // `already_blocked` aqui também é recusa: o eco travada:true só sai pelo plano.
      this.log.warn({ msg: 'engine_stop_refused', thingName: thing, reason: refusal });
      return;
    }
    let sent: 'sent' | 'queued';
    try {
      sent = await this.traccar.sendCommand(device.id, 'engineStop');
    } catch (err) {
      // Dispositivo sem sessão no Traccar (caiu entre a checagem e o envio) ou erro HTTP: nada enviado nem enfileirado.
      this.log.error({ msg: 'engine_stop_not_sent', thingName: thing, error: (err as Error).message });
      return;
    }
    this.stopSentAt.set(thing, this.now());
    // A4-1: só um status recebido depois do envio confirma o corte; o bit anterior não vale para nada.
    this.commandSent(thing, 'stop');
    if (sent === 'queued') {
      // Não deveria acontecer com ≥ 6.7.0 e `noQueue`: o corte seria entregue na reconexão, em qualquer velocidade. Alerta.
      this.log.error({ msg: 'engine_stop_queued', thingName: thing });
      return;
    }
    this.log.info({ msg: 'engine_stop_sent', thingName: thing });
  }

  /**
   * A4-1: comando de motor aceito → esquece o bit de corte anterior (`markCommandSent`) e a deduplicação M5, para que o
   * primeiro status posterior ao envio saia sempre como `reported.travada` (é ele que confirma o comando).
   */
  private commandSent(thing: string, kind: 'stop' | 'resume'): void {
    this.memory.set(thing, markCommandSent(this.mem(thing), this.now(), kind));
    this.lastTravada.delete(thing);
  }

  private freshSpeed(thing: string): { velocidade_kmh?: number } {
    const last = this.mem(thing).last;
    if (!last || this.now() - Math.min(last.fixTime, this.now()) > CUT_FRESH_MS) return {};
    return { velocidade_kmh: last.speedKmh };
  }

  /** `gps_economia` do status de até 3 min (`GPS_STATUS_FRESH_MS`); sem ele, nada. */
  private freshGpsSleep(thing: string): { gps_economia?: boolean } {
    const v = gpsSleepOf(this.mem(thing), this.now());
    return v === undefined ? {} : { gps_economia: v };
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
      ...this.freshGpsSleep(thing),
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
      if (typeof reported.gps_economia === 'boolean') this.lastGpsSleep.set(thing, { value: reported.gps_economia, at: this.now() });
    }
  }

  /**
   * `false` = não publicado (MQTT fora) ou sem conclusão no prazo (log `mqtt_publish_timeout`).
   * B-M7: com o MQTT fora nada é entregue ao mqtt.js — QoS 0 é descartado; QoS 1 (presença, eventos, get) é pulado com log
   * limitado em vez de esperar o prazo, para não travar a fila de entrada (o mqtt.js o guardaria e entregaria velho na volta).
   * Um `get` pulado é refeito na reconexão (`onMqttConnect` → `requestPendingUnlocks`).
   */
  private async publish(topic: string, payload: unknown, qos: 0 | 1): Promise<boolean> {
    if (this.mqtt.connected === false) {
      if (qos === 1) {
        const kind = topicKind(topic);
        const thing = kind === 'presence' ? topic.split('/').pop() : thingOf(topic);
        this.logLimited(`${thing}|mqtt_down_skipped|${kind}`, 'warn', { msg: 'mqtt_down_skipped', thingName: thing, kind });
      }
      return false;
    }
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
