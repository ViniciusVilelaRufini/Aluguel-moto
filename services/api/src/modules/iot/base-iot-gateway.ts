import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { MAX_SPEED_KMH } from '../../common/enums';
import { EV, IotCommandUpdatedEvent } from '../../common/events';
import type { CommandOutcome, CommandRequest, IotGateway, VehicleLiveState } from '../../ports/iot-gateway.port';
import type { Clock, TimerHandle } from './clock';
import type { LiveStateStore } from './live-state.store';
import { SafeLockService } from './safe-lock.service';
import type { DesiredState, IotTransport, ReportedState } from './shadow-transport';
import { assertSpeedLimit } from './speed-limit';

export interface GatewayOptions {
  /** Quanto a chamada espera o `reported` antes de responder `in_progress`. */
  confirmWaitMs: number;
  /** Sem `reported` depois disso (moto online) → `failed`/`timeout`. */
  commandTimeoutMs: number;
  stepIntervalMs?: number;
  safeLockTimeoutMs?: number;
}

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
  private readonly waiters = new Map<string, (o: CommandOutcome) => void>();
  private readonly tracked = new Map<string, Tracked>();
  private limitResolver: (thingName: string) => number = () => MAX_SPEED_KMH;

  constructor(
    readonly transport: IotTransport,
    readonly live: LiveStateStore,
    protected readonly clock: Clock,
    protected readonly events: EventEmitter2,
    protected readonly opts: GatewayOptions,
  ) {
    this.safeLock = new SafeLockService(clock, transport, (o) => this.settle(o), {
      stepIntervalMs: opts.stepIntervalMs,
      timeoutMs: opts.safeLockTimeoutMs,
    });
  }

  /** Limite em vigor para a moto (zonas de velocidade reduzida), usado ao destravar. Registrado pelo motor de cercas. */
  setLimitResolver(fn: (thingName: string) => number): void {
    this.limitResolver = fn;
  }

  // ── IotGateway ──

  async lock(req: CommandRequest): Promise<CommandOutcome> {
    this.supersede(req.thingName, ['travada']);
    const s = await this.live.load(req.thingName);
    const state = {
      speedKmh: s?.speedKmh ?? 0,
      speedLimitKmh: s?.speedLimitKmh ?? MAX_SPEED_KMH,
      locked: s?.locked === true && this.live.isOnline(req.thingName),
      online: this.live.isOnline(req.thingName),
    };
    const wait = this.registerWaiter(req.commandId);
    const initial = await this.safeLock.start(req, state);
    this.watch(req.thingName);
    if (initial.status !== 'in_progress') {
      this.waiters.delete(req.commandId);
      return initial;
    }
    return wait();
  }

  async unlock(req: CommandRequest): Promise<CommandOutcome> {
    this.safeLock.cancel(req.thingName);
    const limit = assertSpeedLimit(this.limitResolver(req.thingName));
    return this.desiredCommand(req, { travada: false }, { limite_kmh: limit });
  }

  async setSpeedLimit(req: CommandRequest, kmh: number): Promise<CommandOutcome> {
    assertSpeedLimit(kmh);
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

  async onReported(thingName: string, reported: ReportedState): Promise<void> {
    await this.live.applyReported(thingName, reported);
    await this.safeLock.onReported(thingName, reported);
    const s = this.live.get(thingName);
    for (const t of [...this.tracked.values()]) {
      if (t.thingName !== thingName) continue;
      if (matches(s, t.expect)) this.finishTracked(t, { status: 'confirmed' });
    }
    this.watch(thingName);
  }

  async onSpeed(thingName: string, speedKmh: number): Promise<void> {
    await this.safeLock.onSpeed(thingName, speedKmh);
  }

  async onConnectivity(thingName: string, online: boolean): Promise<void> {
    const s = await this.live.setOnline(thingName, online);
    if (!online) return;
    // Comandos que estavam esperando a moto: passam a ter prazo a partir da reconexão.
    for (const t of this.tracked.values()) {
      if (t.thingName === thingName && !t.timer) t.timer = this.clock.setTimeout(() => this.onTrackedTimeout(t.commandId), this.opts.commandTimeoutMs);
    }
    await this.safeLock.onConnectivity(thingName, true, { speedKmh: s.speedKmh, speedLimitKmh: s.speedLimitKmh, locked: s.locked, online: true });
  }

  /** Há algo aguardando `reported` desta moto? (o modo aws consulta o shadow enquanto houver). */
  isWatching(thingName: string): boolean {
    if (this.safeLock.isActive(thingName)) return true;
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
      await this.transport.updateDesired(req.thingName, { ...expect, ...extra });
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
    this.events.emit(EV.IOT_COMMAND_UPDATED, ev);
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
