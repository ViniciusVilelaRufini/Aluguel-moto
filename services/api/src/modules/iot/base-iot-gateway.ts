import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { MAX_SPEED_KMH } from '../../common/enums';
import { EV, IotCommandUpdatedEvent } from '../../common/events';
import type { CommandOutcome, CommandRequest, IotGateway, VehicleLiveState } from '../../ports/iot-gateway.port';
import type { Clock, TimerHandle } from './clock';
import type { LiveStateStore } from './live-state.store';
import { SafeLockService } from './safe-lock.service';
import type { DesiredState, IotTransport, ReportedMeta, ReportedState } from './shadow-transport';
import { assertSpeedLimit } from './speed-limit';

export interface GatewayOptions {
  /** Quanto a chamada espera o `reported` antes de responder `in_progress`. */
  confirmWaitMs: number;
  /** Sem `reported` depois disso (moto online) → `failed`/`timeout`. */
  commandTimeoutMs: number;
  stepIntervalMs?: number;
  safeLockTimeoutMs?: number;
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
 * - `lock` = bloqueio seguro (`SafeLockService`) e grava a origem da trava (`LiveStateStore.setLockOrigin`);
 * - `unlock` cancela a rampa e restaura o limite em vigor; pedido por cliente/campo, é recusado sem publicar nada se a trava é de
 *   equipe/sistema, se o limite está segurado em 0 (hold) ou com modo roubada — só `staff` (admin/operacao) desfaz;
 * - limite fora de 0..32 → `InvalidSpeedLimitError` antes de publicar qualquer coisa.
 */
export abstract class BaseIotGateway implements IotGateway {
  protected readonly logger = new Logger(this.constructor.name);
  readonly safeLock: SafeLockService;
  private readonly waiters = new Map<string, (o: CommandOutcome) => void>();
  private readonly tracked = new Map<string, Tracked>();
  private readonly returnedAt = new Map<string, number>();
  /** Último `limite_kmh` gravado no desired por este processo (a rampa nunca começa acima dele). */
  private readonly desiredLimit = new Map<string, number>();
  private limitResolver: (thingName: string) => Promise<number> = async () => MAX_SPEED_KMH;

  constructor(
    readonly transport: IotTransport,
    readonly live: LiveStateStore,
    protected readonly clock: Clock,
    protected readonly events: EventEmitter2,
    protected readonly opts: GatewayOptions,
  ) {
    // A rampa publica pelo mesmo caminho que registra o último limite desejado.
    const recording = { updateDesired: (t: string, d: DesiredState) => this.publishDesired(t, d), publishCommand: transport.publishCommand.bind(transport) };
    this.safeLock = new SafeLockService(clock, recording, (o) => this.settle(o), {
      stepIntervalMs: opts.stepIntervalMs,
      timeoutMs: opts.safeLockTimeoutMs,
      // Em memória na hora (falha fechada); a escrita no Redis que falhar é registrada.
      onHeld: (thingName) => {
        void this.live.setHeld(thingName, true).catch((err: Error) => this.logger.error({ msg: 'safe_lock_hold_persist_failed', thingName, error: err.message }));
        // O hold é trava do sistema: só a equipe desfaz (setLockOrigin já registra a falha de escrita e falha fechada).
        void this.live.setLockOrigin(thingName, 'system');
      },
    });
  }

  /**
   * Publica o desired e só então registra o limite como teto (publicação que falhou não deixa teto acima do shadow real).
   * Sem registro (processo novo), o teto é o `reported` — `Math.min` com `MAX_SPEED_KMH` no lock — e o hold persistido.
   * O limite também vai ao Redis (`LiveStateStore.recordDesiredLimit`), para o motor de cercas de qualquer task corrigir um
   * desired acima da zona; falha nessa escrita só é registrada (o desired já foi publicado).
   */
  private async publishDesired(thingName: string, desired: DesiredState): Promise<void> {
    await this.transport.updateDesired(thingName, desired);
    if (desired.limite_kmh === undefined) return;
    this.desiredLimit.set(thingName, desired.limite_kmh);
    await this.live
      .recordDesiredLimit(thingName, desired.limite_kmh)
      .catch((err: Error) => this.logger.warn({ msg: 'desired_limit_persist_failed', thingName, error: err.message }));
  }

  /**
   * Limite em vigor para a moto (zonas de velocidade reduzida), usado ao destravar e como teto do limite manual. Registrado
   * pelo motor de cercas; assíncrono porque lê o estado compartilhado (Redis), válido em qualquer task.
   */
  setLimitResolver(fn: (thingName: string) => Promise<number>): void {
    this.limitResolver = fn;
  }

  // ── IotGateway ──

  async lock(req: CommandRequest): Promise<CommandOutcome> {
    // Origem gravada antes da rampa: um unlock de cliente/campo em qualquer task já vê a trava de equipe/sistema em curso.
    const origin = req.lockOrigin === undefined ? 'system' : req.lockOrigin;
    if (origin) await this.live.setLockOrigin(req.thingName, origin);
    this.supersede(req.thingName, ['travada']);
    const s = await this.live.load(req.thingName);
    const state = {
      // Só velocidade fresca; desconhecida = null (a rampa trata como em movimento). Nunca 0 por padrão.
      speedKmh: this.live.knownSpeed(req.thingName),
      // Teto da rampa: o menor entre o reported, o último desired e o hold (0). Nunca sobe acima do que já foi pedido.
      speedLimitKmh: Math.min(
        s?.speedLimitKmh ?? MAX_SPEED_KMH,
        this.desiredLimit.get(req.thingName) ?? MAX_SPEED_KMH,
        (await this.live.isHeld(req.thingName)) ? 0 : MAX_SPEED_KMH,
      ),
      locked: s?.locked === true && this.live.isOnline(req.thingName),
      online: this.live.isOnline(req.thingName),
    };
    const wait = this.registerWaiter(req.commandId);
    const initial = await this.safeLock.start(req, state);
    this.watch(req.thingName);
    if (initial.status !== 'in_progress') {
      this.waiters.delete(req.commandId);
      if (initial.status === 'pending') this.returnedAt.set(req.commandId, this.clock.now());
      return initial;
    }
    return wait();
  }

  async unlock(req: CommandRequest): Promise<CommandOutcome> {
    const authority = req.authority ?? 'customer';
    if (authority !== 'staff') {
      const blockedBy = await this.unlockBlocker(req.thingName);
      if (blockedBy) {
        // Nada é publicado e a rampa em curso segue (nunca cortar/soltar a potência por uma recusa).
        this.logger.warn({ msg: 'unlock_refused_locked_by_staff', thingName: req.thingName, commandId: req.commandId, authority, blockedBy });
        return { commandId: req.commandId, status: 'failed', reason: 'locked_by_staff' };
      }
    }
    // Origem apagada primeiro: se a escrita falhar, nada mudou (a rampa segue, o hold fica) e o unlock termina failed.
    await this.live.setLockOrigin(req.thingName, null);
    this.safeLock.cancel(req.thingName);
    await this.live.setHeld(req.thingName, false);
    const limit = assertSpeedLimit(await this.limitResolver(req.thingName));
    return this.desiredCommand(req, { travada: false }, { limite_kmh: limit });
  }

  async setSpeedLimit(req: CommandRequest, kmh: number): Promise<CommandOutcome> {
    assertSpeedLimit(kmh);
    // Durante o bloqueio seguro, a rampa é dona do limite: nada (zona, operador) pode subir ou mexer nos degraus.
    // Depois de `did_not_stop`, o limite fica segurado em 0 até um unlock explícito.
    if (this.safeLock.isActive(req.thingName) || (await this.live.isHeld(req.thingName))) {
      this.logger.warn({ msg: 'speed_limit_refused_during_safe_lock', thingName: req.thingName, commandId: req.commandId });
      return { commandId: req.commandId, status: 'failed' };
    }
    // QA-01: nenhum limite (operador/admin) acima do limite da zona em que a moto está (6 calçadão, 20 ciclovia).
    // O motor de cercas manda exatamente o limite em vigor, então só comandos manuais acima dele são recusados (nunca truncar).
    const zoneLimit = await this.limitResolver(req.thingName);
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
    await this.safeLock.onReported(thingName, forLock, meta.timestamps ?? {});
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
    await this.safeLock.onConnectivity(thingName, true, { speedKmh: this.live.knownSpeed(thingName), speedLimitKmh: s.speedLimitKmh, locked: s.locked, online: true });
  }

  /** Há algo aguardando `reported` desta moto? (o modo aws consulta o shadow enquanto houver). */
  isWatching(thingName: string): boolean {
    if (this.safeLock.isActive(thingName)) return true;
    for (const t of this.tracked.values()) if (t.thingName === thingName) return true;
    return false;
  }

  // ── internos ──

  /** Motivo de recusa do unlock de quem não é `staff`, ou `null` se pode destravar. Erros de leitura = recusa (falha fechada). */
  private async unlockBlocker(thingName: string): Promise<'origin' | 'held' | 'stolen_mode' | null> {
    const origin = await this.live.getLockOrigin(thingName);
    if (origin === 'staff' || origin === 'system') return 'origin';
    if (await this.live.isHeld(thingName)) return 'held';
    if ((await this.live.load(thingName))?.stolenMode === true) return 'stolen_mode';
    return null;
  }

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
