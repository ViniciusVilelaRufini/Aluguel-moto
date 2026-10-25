import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { MAX_SPEED_KMH } from '../../common/enums';
import { EV, IotCommandUpdatedEvent } from '../../common/events';
import type { CommandOutcome, CommandRequest, IotGateway, VehicleLiveState } from '../../ports/iot-gateway.port';
import type { Clock, TimerHandle } from './clock';
import type { LiveStateStore } from './live-state.store';
import { SafeLockService, type SafeLockVehicleState } from './safe-lock.service';
import { assertSpeedLimit, SAFE_LOCK_MIN_START_KMH } from './speed-limit';
import { MemorySafeLockStore, type SafeLockStore } from './safe-lock.store';
import type { DesiredState, IotTransport, ReportedMeta, ReportedState } from './shadow-transport';

export interface GatewayOptions {
  /** Quanto a chamada espera o `reported` antes de responder `in_progress`. */
  confirmWaitMs: number;
  /** Sem `reported` depois disso (moto online) → `failed`/`timeout`. */
  commandTimeoutMs: number;
  stepIntervalMs?: number;
  safeLockTimeoutMs?: number;
  /** Estado das rampas do bloqueio seguro (produção: Redis, compartilhado entre as instâncias; padrão: memória). */
  safeLockStore?: SafeLockStore;
}

/**
 * Janela depois de a chamada responder `in_progress`/`pending` em que o desfecho é emitido com atraso: o `CommandsService`
 * grava o status devolvido logo após a chamada e, sem isso, um `confirmed` muito rápido poderia ser sobrescrito.
 * PALIATIVO: o bug é do `CommandsService.applyOutcome` (Task 3), que rebaixa `confirmed` para `in_progress`; ele será corrigido
 * no módulo commands depois do merge (decisão do coordenador na revisão da Task 4). Remover esta janela quando isso acontecer.
 */
export const EMIT_GRACE_MS = 1_000;

interface Tracked {
  commandId: string;
  thingName: string;
  expect: Partial<ReportedState>;
  timer?: TimerHandle;
}

/**
 * Lógica comum dos gateways reais (`LocalMqttIotGateway`, `AwsIotGateway`):
 * - grava o desired no shadow e espera o `reported` (até `confirmWaitMs`); depois disso o desfecho chega por `iot.command-updated`;
 * - moto offline → `pending`/`offline`; o shadow guarda o desired e o comando confirma quando ela reconecta e reporta;
 * - `lock` = bloqueio seguro (`SafeLockService`); `unlock` cancela a rampa e restaura o limite em vigor;
 * - limite fora de 0..32 → `InvalidSpeedLimitError` antes de publicar qualquer coisa.
 */
export abstract class BaseIotGateway implements IotGateway {
  protected readonly logger = new Logger(this.constructor.name);
  readonly safeLock: SafeLockService;
  /**
   * Rampa degradada (lacunas T5, fix 1): com o Redis fora do ar, um lock ainda reduz a potência — a rampa roda só nesta instância,
   * em memória (como antes da T5), com o mesmo invariante (`travada: true` só com velocidade fresca < 3).
   */
  readonly safeLockLocal: SafeLockService;
  private readonly waiters = new Map<string, (o: CommandOutcome) => void>();
  private readonly tracked = new Map<string, Tracked>();
  private readonly returnedAt = new Map<string, number>();
  /**
   * Limite das zonas em vigor para a moto (unlock e teto dos comandos manuais). Recebe a posição atual: o motor de cercas
   * reavalia a zona por ela (PostGIS) em vez de confiar só no valor gravado (fix 2, N3).
   */
  private limitResolver: (thingName: string, position?: { lat: number; lng: number }) => number | Promise<number> = () => MAX_SPEED_KMH;

  constructor(
    readonly transport: IotTransport,
    readonly live: LiveStateStore,
    protected readonly clock: Clock,
    protected readonly events: EventEmitter2,
    protected readonly opts: GatewayOptions,
  ) {
    // A rampa publica pelo mesmo caminho que grava o desired compartilhado, e um degrau nunca sai acima do teto confirmado (uma
    // redução aceita durante a rampa não é desfeita pelo degrau seguinte) — mas o teto nunca puxa um degrau para baixo de 3:
    // um valor < 3 só sai como degrau da própria escada (depois do 3 confirmado), nunca por um teto guardado (fix 2).
    const recording = {
      updateDesired: async (t: string, d: DesiredState) => {
        if (d.limite_kmh !== undefined && d.limite_kmh > 0) {
          const cap = await this.confirmedCeiling(t);
          if (cap !== null && d.limite_kmh > cap) d = { ...d, limite_kmh: Math.min(d.limite_kmh, Math.max(cap, SAFE_LOCK_MIN_START_KMH)) };
        }
        return this.publishDesired(t, d);
      },
      publishCommand: transport.publishCommand.bind(transport),
    };
    const common = {
      stepIntervalMs: opts.stepIntervalMs,
      timeoutMs: opts.safeLockTimeoutMs,
      // Em memória na hora (falha fechada); a escrita no Redis que falhar é registrada.
      onHeld: (thingName: string) =>
        void this.live.setHeld(thingName, true).catch((err: Error) => this.logger.error({ msg: 'safe_lock_hold_persist_failed', thingName, error: err.message })),
      onLocalActivity: (thingName: string) => this.watch(thingName),
      onError: (entry: Record<string, unknown>) => this.logger.error(entry),
    };
    this.safeLock = new SafeLockService(clock, recording, (o) => this.settle(o), {
      ...common,
      store: opts.safeLockStore,
      // Varredura: rampa pendente cuja reconexão foi vista por outra instância começa com o estado relido do Redis.
      probe: (thingName) => this.safeLockState(thingName, true),
    });
    this.safeLockLocal = new SafeLockService(clock, recording, (o) => this.settle(o), { ...common, store: new MemorySafeLockStore() });
  }

  /** O estado compartilhado (Redis) está legível agora? */
  private async sharedReadable(thingName: string): Promise<boolean> {
    return this.safeLock.isActiveAnywhere(thingName).then(
      () => true,
      () => false,
    );
  }

  /**
   * Teto confirmado do desired (fix 2): o `iot:desired-limit` gravado a cada publicação por qualquer instância; sem ele (Redis
   * fora ou nunca gravado), o documento do shadow (desired, senão reported) lido direto da fonte; senão desconhecido (`null`).
   * Nenhuma cópia por instância: ela fica velha assim que outra instância publica.
   */
  private async confirmedCeiling(thingName: string): Promise<number | null> {
    const shared = await this.live.readDesiredLimit(thingName);
    if (typeof shared === 'number') return shared;
    const doc = this.transport.readShadow ? await this.transport.readShadow(thingName).catch(() => null) : null;
    const v = doc?.desired.limite_kmh ?? doc?.reported.limite_kmh;
    return typeof v === 'number' ? v : null;
  }

  /**
   * Estado usado pela rampa: velocidade fresca (desconhecida = `null`, em movimento), teto confirmado (só limita o 1º degrau e
   * nunca abaixo de 3) e hold **confirmado** (só ele começa a rampa em 0). Ver `rampSteps`.
   */
  private async safeLockState(thingName: string, refresh = false): Promise<SafeLockVehicleState> {
    const s = refresh ? await this.live.refresh(thingName) : await this.live.load(thingName);
    const online = this.live.isOnline(thingName);
    const ceiling = await this.confirmedCeiling(thingName);
    return {
      speedKmh: this.live.knownSpeed(thingName),
      speedLimitKmh: Math.min(s?.speedLimitKmh ?? MAX_SPEED_KMH, ceiling ?? MAX_SPEED_KMH),
      held: (await this.live.heldState(thingName)) === true,
      locked: s?.locked === true && online,
      online,
    };
  }

  /** Posição conhecida da moto (estado ao vivo), para reavaliar a zona antes de subir limite. */
  private async positionOf(thingName: string): Promise<{ lat: number; lng: number } | undefined> {
    const s = await this.live.load(thingName);
    return s && !(s.lat === 0 && s.lng === 0) ? { lat: s.lat, lng: s.lng } : undefined;
  }

  /**
   * Publica o desired e só então grava o limite como teto compartilhado (publicação que falhou não deixa teto acima do shadow
   * real). Redis fora: o teto vem do documento do shadow (`confirmedCeiling`).
   */
  private async publishDesired(thingName: string, desired: DesiredState): Promise<void> {
    await this.transport.updateDesired(thingName, desired);
    if (desired.limite_kmh !== undefined) {
      await this.live
        .setDesiredLimit(thingName, desired.limite_kmh)
        .catch((err: Error) => this.logger.warn({ msg: 'desired_limit_persist_failed', thingName, error: err.message }));
    }
  }

  /** Limite em vigor para a moto (zonas de velocidade reduzida), usado ao destravar. Registrado pelo motor de cercas. */
  setLimitResolver(fn: (thingName: string, position?: { lat: number; lng: number }) => number | Promise<number>): void {
    this.limitResolver = fn;
  }

  // ── IotGateway ──

  async lock(req: CommandRequest): Promise<CommandOutcome> {
    this.supersede(req.thingName, ['travada']);
    // Só velocidade fresca; desconhecida = null (a rampa trata como em movimento). Nunca 0 por padrão.
    const state = await this.safeLockState(req.thingName);
    const wait = this.registerWaiter(req.commandId);
    let initial: CommandOutcome;
    try {
      initial = await this.safeLock.start(req, state);
    } catch (err) {
      // Redis fora do ar: o lock reduz a potência mesmo assim, pela rampa local (mesmo invariante). Outro erro (IoT) propaga.
      if (await this.sharedReadable(req.thingName)) {
        this.waiters.delete(req.commandId);
        throw err;
      }
      this.logger.error({ msg: 'safe_lock_degraded_local', thingName: req.thingName, commandId: req.commandId, error: (err as Error).message });
      initial = await this.safeLockLocal.start(req, state);
    }
    this.watch(req.thingName);
    if (initial.status !== 'in_progress') {
      this.waiters.delete(req.commandId);
      if (initial.status === 'pending') this.returnedAt.set(req.commandId, this.clock.now());
      return initial;
    }
    return wait();
  }

  /** Mesma velocidade usada pelo bloqueio seguro: só fresca; desconhecida = `null` (em movimento). */
  async knownSpeedKmh(thingName: string): Promise<number | null> {
    return this.live.knownSpeed(thingName);
  }

  async unlock(req: CommandRequest): Promise<CommandOutcome> {
    // A rampa local (degradada) sai sempre; a compartilhada exige o Redis (unlock sobe o limite: falha fechada).
    await this.safeLockLocal.cancel(req.thingName);
    await this.safeLock.cancel(req.thingName);
    await this.live.setHeld(req.thingName, false);
    // Sobe o limite: a zona é reavaliada pela posição atual (não só pelo valor gravado, que pode estar velho — fix 2, N3).
    const limit = assertSpeedLimit(await this.limitResolver(req.thingName, await this.positionOf(req.thingName)));
    return this.desiredCommand(req, { travada: false }, { limite_kmh: limit });
  }

  async setSpeedLimit(req: CommandRequest, kmh: number): Promise<CommandOutcome> {
    assertSpeedLimit(kmh);
    // Durante o bloqueio seguro, a rampa é dona do limite: nada (zona, operador) pode subir ou mexer nos degraus.
    // Depois de `did_not_stop`, o limite fica segurado em 0 até um unlock explícito.
    // Lacunas T5: rampa ativa, hold, ou estado ilegível (Redis fora) → só reduções. Hold confirmado: só 0. Senão o limite tem de
    // ficar ≤ teto confirmado (desired compartilhado ou documento do shadow); com o teto desconhecido, ≤ o limite que a moto
    // reportou; sem nada conhecido, aceito. Reduzir nunca é recusado — falhar fechado numa redução seria falhar aberto.
    let restricted: boolean;
    try {
      restricted = await this.safeLock.isActiveAnywhere(req.thingName);
    } catch {
      restricted = true;
    }
    const held = await this.live.heldState(req.thingName);
    restricted = restricted || this.safeLockLocal.isActive(req.thingName) || held !== false;
    if (restricted) {
      const ceiling = held === true ? 0 : ((await this.confirmedCeiling(req.thingName)) ?? (await this.live.load(req.thingName))?.speedLimitKmh ?? null);
      if (ceiling !== null && kmh > ceiling) {
        this.logger.warn({ msg: 'speed_limit_refused_during_safe_lock', thingName: req.thingName, commandId: req.commandId, kmh, ceiling });
        return { commandId: req.commandId, status: 'failed' };
      }
    }
    // QA-01: nenhum limite (operador/admin) acima do limite da zona em que a moto está (6 calçadão, 20 ciclovia), reavaliada pela
    // posição atual. O motor de cercas manda exatamente o limite em vigor, então só comandos manuais acima dele são recusados.
    const zoneLimit = await this.limitResolver(req.thingName, await this.positionOf(req.thingName));
    if (kmh > zoneLimit) {
      this.logger.warn({ msg: 'speed_limit_refused_above_zone_limit', thingName: req.thingName, commandId: req.commandId, kmh, zoneLimit });
      return { commandId: req.commandId, status: 'failed', reason: 'invalid_limit' };
    }
    return this.desiredCommand(req, { limite_kmh: kmh });
  }

  async setStolenMode(req: CommandRequest, on: boolean): Promise<CommandOutcome> {
    return this.desiredCommand(req, { modo_roubada: on });
  }

  async horn(req: CommandRequest): Promise<CommandOutcome> {
    await this.live.load(req.thingName);
    if (!this.live.isOnline(req.thingName)) return { commandId: req.commandId, status: 'failed', reason: 'offline' };
    await this.transport.publishCommand(req.thingName, { comando_id: req.commandId, acao: 'buzina' });
    return { commandId: req.commandId, status: 'confirmed' };
  }

  async getLiveState(thingName: string): Promise<VehicleLiveState | null> {
    const s = await this.live.load(thingName);
    if (!s) return null;
    return { ...s, online: this.live.isOnline(thingName) };
  }

  // ── entradas vindas dos rastreadores (chamadas pelo TelemetryService) ──

  async onReported(thingName: string, reported: ReportedState, meta: ReportedMeta = {}): Promise<void> {
    const { speedAccepted } = await this.live.applyReported(thingName, reported, { fromPoll: meta.fromPoll, speedAt: meta.timestamps?.velocidade_kmh });
    // A rampa só vê velocidade que é amostra fresca e mais nova (reported velho replayed pelo polling não trava ninguém).
    const forLock: ReportedState = { ...reported };
    if (!speedAccepted) delete forLock.velocidade_kmh;
    await this.safeLockLocal.onReported(thingName, forLock, meta.timestamps ?? {});
    // Redis fora: a rampa compartilhada não avança, mas os comandos que esperam este reported (ex.: redução de limite) confirmam.
    await this.safeLock.onReported(thingName, forLock, meta.timestamps ?? {}).catch((err: Error) => this.logger.error({ msg: 'safe_lock_reported_failed', thingName, error: err.message }));
    const s = this.live.get(thingName);
    for (const t of [...this.tracked.values()]) {
      if (t.thingName !== thingName) continue;
      if (matches(s, t.expect)) this.finishTracked(t, { status: 'confirmed' });
    }
    this.watch(thingName);
  }

  async onSpeed(thingName: string, speedKmh: number): Promise<void> {
    await this.safeLockLocal.onSpeed(thingName, speedKmh);
    await this.safeLock.onSpeed(thingName, speedKmh);
  }

  async onConnectivity(thingName: string, online: boolean): Promise<void> {
    const s = await this.live.setOnline(thingName, online);
    if (!online) return;
    // Comandos que estavam esperando a moto: passam a ter prazo a partir da reconexão.
    for (const t of this.tracked.values()) {
      if (t.thingName === thingName && !t.timer) t.timer = this.clock.setTimeout(() => this.onTrackedTimeout(t.commandId), this.opts.commandTimeoutMs);
    }
    // Mesmo teto do lock (reported, desired gravado e hold): a rampa pendente nunca começa acima do que já foi pedido.
    const state = await this.safeLockState(thingName);
    const pending = { ...state, speedLimitKmh: Math.min(state.speedLimitKmh, s.speedLimitKmh), locked: s.locked, online: true };
    await this.safeLockLocal.onConnectivity(thingName, true, pending);
    await this.safeLock.onConnectivity(thingName, true, pending).catch((err: Error) => this.logger.error({ msg: 'safe_lock_connectivity_failed', thingName, error: err.message }));
  }

  /** Há algo aguardando `reported` desta moto? (o modo aws consulta o shadow enquanto houver). */
  isWatching(thingName: string): boolean {
    if (this.safeLock.isActive(thingName) || this.safeLockLocal.isActive(thingName)) return true;
    for (const t of this.tracked.values()) if (t.thingName === thingName) return true;
    return false;
  }

  // ── internos ──

  private watch(thingName: string): void {
    this.transport.watch?.(thingName, this.isWatching(thingName));
  }

  private async desiredCommand(req: CommandRequest, expect: DesiredState, extra: DesiredState = {}): Promise<CommandOutcome> {
    await this.live.load(req.thingName);
    const online = this.live.isOnline(req.thingName);
    this.supersede(req.thingName, Object.keys(expect) as Array<keyof ReportedState>);
    const tracked: Tracked = { commandId: req.commandId, thingName: req.thingName, expect };
    const wait = this.registerWaiter(req.commandId);
    if (online) tracked.timer = this.clock.setTimeout(() => this.onTrackedTimeout(req.commandId), this.opts.commandTimeoutMs);
    this.tracked.set(req.commandId, tracked);
    try {
      await this.publishDesired(req.thingName, { ...expect, ...extra });
    } catch (err) {
      this.untrack(tracked);
      this.waiters.delete(req.commandId);
      throw err;
    }
    this.watch(req.thingName);
    // Reported já igual ao desired (ex.: limite já aplicado): o rastreador não reporta de novo.
    if (this.tracked.has(req.commandId) && online && matches(this.live.get(req.thingName), expect)) {
      this.finishTracked(tracked, { status: 'confirmed' });
    }
    if (!online && this.tracked.has(req.commandId)) {
      this.waiters.delete(req.commandId);
      this.returnedAt.set(req.commandId, this.clock.now());
      return { commandId: req.commandId, status: 'pending', reason: 'offline' };
    }
    return wait();
  }

  /** Comando novo sobre o mesmo campo substitui o anterior ainda pendente (que termina `failed`). */
  private supersede(thingName: string, keys: Array<keyof ReportedState>): void {
    for (const t of [...this.tracked.values()]) {
      if (t.thingName === thingName && keys.some((k) => k in t.expect)) this.finishTracked(t, { status: 'failed' });
    }
  }

  private registerWaiter(commandId: string): () => Promise<CommandOutcome> {
    let resolve!: (o: CommandOutcome) => void;
    const p = new Promise<CommandOutcome>((r) => (resolve = r));
    this.waiters.set(commandId, resolve);
    return () => {
      if (!this.waiters.has(commandId)) return p;
      const timer = this.clock.setTimeout(() => {
        if (this.waiters.get(commandId) === resolve) {
          this.waiters.delete(commandId);
          this.returnedAt.set(commandId, this.clock.now());
          resolve({ commandId, status: 'in_progress' });
        }
      }, this.opts.confirmWaitMs);
      return p.finally(() => this.clock.clearTimeout(timer));
    };
  }

  /** Desfecho: responde a chamada ainda em espera ou, se ela já voltou, emite `iot.command-updated`. */
  protected settle(o: CommandOutcome): void {
    const waiter = this.waiters.get(o.commandId);
    if (waiter) {
      this.waiters.delete(o.commandId);
      waiter(o);
      return;
    }
    const ev: IotCommandUpdatedEvent = { commandId: o.commandId, status: o.status };
    if (o.reason) ev.reason = o.reason;
    const returned = this.returnedAt.get(o.commandId);
    this.returnedAt.delete(o.commandId);
    const wait = returned === undefined ? 0 : EMIT_GRACE_MS - (this.clock.now() - returned);
    if (wait > 0) this.clock.setTimeout(() => this.events.emit(EV.IOT_COMMAND_UPDATED, ev), wait);
    else this.events.emit(EV.IOT_COMMAND_UPDATED, ev);
  }

  private onTrackedTimeout(commandId: string): void {
    const t = this.tracked.get(commandId);
    if (t) this.finishTracked(t, { status: 'failed', reason: 'timeout' });
  }

  private untrack(t: Tracked): void {
    this.clock.clearTimeout(t.timer);
    this.tracked.delete(t.commandId);
  }

  private finishTracked(t: Tracked, outcome: Omit<CommandOutcome, 'commandId'>): void {
    if (!this.tracked.has(t.commandId)) return;
    this.untrack(t);
    this.settle({ commandId: t.commandId, ...outcome });
    this.watch(t.thingName);
  }
}

function matches(s: VehicleLiveState | null, expect: Partial<ReportedState>): boolean {
  if (!s) return false;
  if (expect.travada !== undefined && s.locked !== expect.travada) return false;
  if (expect.limite_kmh !== undefined && s.speedLimitKmh !== expect.limite_kmh) return false;
  if (expect.modo_roubada !== undefined && s.stolenMode !== expect.modo_roubada) return false;
  return true;
}
