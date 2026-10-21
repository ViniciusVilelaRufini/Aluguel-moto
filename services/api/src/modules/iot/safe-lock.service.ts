import { SAFE_LOCK_SPEED_KMH } from '../../common/enums';
import type { CommandOutcome, CommandRequest } from '../../ports/iot-gateway.port';
import type { Clock, TimerHandle } from './clock';
import type { ReportedState, ShadowTransport } from './shadow-transport';
import { safeLockSteps } from './speed-limit';

/** Intervalo entre degraus, contado a partir do `reported` do degrau anterior. */
export const SAFE_LOCK_STEP_INTERVAL_MS = 2_000;
/** Tempo máximo para a moto parar (desde o início da rampa). */
export const SAFE_LOCK_TIMEOUT_MS = 120_000;

export interface SafeLockVehicleState {
  /** Última velocidade reportada **fresca**; `null` = desconhecida/velha → tratada como em movimento (nunca 0 por padrão). */
  speedKmh: number | null;
  speedLimitKmh: number;
  locked: boolean;
  online: boolean;
}

type Phase = 'waiting_online' | 'ramping' | 'locking';

interface Ramp {
  thingName: string;
  commandIds: string[];
  phase: Phase;
  steps: number[];
  stepIdx: number;
  awaitingAck: boolean;
  lastSpeed: number | null;
  lastPublishedLimit?: number;
  /** Quando o degrau atual / a trava foram publicados (o ack só vale para reported mais novo). */
  publishedAt: number;
  stepTimer?: TimerHandle;
  timeoutTimer?: TimerHandle;
}

export type OutcomeSink = (outcome: CommandOutcome) => void;

/** Horário (ms) de cada campo do reported, quando conhecido (metadata do shadow no modo aws). */
export type ReportedTimestamps = Partial<Record<keyof ReportedState, number>>;

/**
 * Bloqueio seguro (CLAUDE.md: "nunca cortar o motor com a moto em movimento").
 *
 * - Velocidade reportada < 3 km/h → publica `travada: true` direto.
 * - Velocidade ≥ 3 → `limite_kmh` em degraus `min(atual, 15) → 8 → 3 → 0`, um degrau 2 s depois do `reported`
 *   do anterior; publica `travada: true` assim que a velocidade reportada (telemetria ou shadow) ficar < 3.
 * - 120 s sem parar → `failed`/`did_not_stop`, mantendo `limite_kmh: 0`.
 * - Moto offline → `pending`/`offline`; a rampa começa quando ela reconecta.
 *
 * Invariante (coberta por testes): `travada: true` só é publicado quando a última velocidade reportada é < 3.
 * Desfechos posteriores ao retorno de `start` vão para o `sink` (→ `iot.command-updated`).
 */
export class SafeLockService {
  private readonly ramps = new Map<string, Ramp>();

  constructor(
    private readonly clock: Clock,
    private readonly transport: ShadowTransport,
    private readonly sink: OutcomeSink,
    private readonly opts: { stepIntervalMs?: number; timeoutMs?: number; onHeld?: (thingName: string) => void } = {},
  ) {}

  private get stepIntervalMs(): number {
    return this.opts.stepIntervalMs ?? SAFE_LOCK_STEP_INTERVAL_MS;
  }

  private get timeoutMs(): number {
    return this.opts.timeoutMs ?? SAFE_LOCK_TIMEOUT_MS;
  }

  isActive(thingName: string): boolean {
    return this.ramps.has(thingName);
  }

  async start(req: CommandRequest, state: SafeLockVehicleState): Promise<CommandOutcome> {
    const existing = this.ramps.get(req.thingName);
    if (existing) {
      existing.commandIds.push(req.commandId);
      return existing.phase === 'waiting_online'
        ? { commandId: req.commandId, status: 'pending', reason: 'offline' }
        : { commandId: req.commandId, status: 'in_progress' };
    }
    if (state.locked) return { commandId: req.commandId, status: 'confirmed' };

    const ramp: Ramp = {
      thingName: req.thingName,
      commandIds: [req.commandId],
      phase: 'waiting_online',
      steps: [],
      stepIdx: 0,
      awaitingAck: false,
      lastSpeed: state.speedKmh,
      publishedAt: 0,
    };
    this.ramps.set(req.thingName, ramp);
    if (!state.online) return { commandId: req.commandId, status: 'pending', reason: 'offline' };
    await this.begin(ramp, state);
    return { commandId: req.commandId, status: 'in_progress' };
  }

  /** Velocidade reportada (telemetria ou `reported.velocidade_kmh`). */
  async onSpeed(thingName: string, speedKmh: number): Promise<void> {
    const ramp = this.ramps.get(thingName);
    if (!ramp || !Number.isFinite(speedKmh)) return;
    ramp.lastSpeed = speedKmh;
    if (ramp.phase === 'ramping' && speedKmh < SAFE_LOCK_SPEED_KMH) await this.lock(ramp);
  }

  /**
   * `reported` do rastreador. A velocidade só deve chegar aqui se for uma amostra fresca (o gateway filtra).
   * `at`: horário de cada campo; sem ele, vale a hora de chegada. O ack do degrau e a confirmação da trava só aceitam
   * reported não mais antigo que a publicação (com resolução de 1 s, a da metadata do shadow).
   */
  async onReported(thingName: string, reported: ReportedState, at: ReportedTimestamps = {}): Promise<void> {
    const ramp = this.ramps.get(thingName);
    if (!ramp) return;
    if (reported.velocidade_kmh !== undefined) await this.onSpeed(thingName, reported.velocidade_kmh);
    if (this.ramps.get(thingName) !== ramp) return;
    const notOlder = (field: keyof ReportedState) => (at[field] ?? this.clock.now()) >= Math.floor(ramp.publishedAt / 1000) * 1000;
    if (ramp.phase === 'locking' && reported.travada === true && notOlder('travada')) {
      this.finish(ramp, { status: 'confirmed' });
      return;
    }
    if (ramp.phase === 'ramping' && ramp.awaitingAck && reported.limite_kmh !== undefined && reported.limite_kmh <= ramp.steps[ramp.stepIdx] && notOlder('limite_kmh')) {
      ramp.awaitingAck = false;
      if (ramp.stepIdx < ramp.steps.length - 1) {
        ramp.stepTimer = this.clock.setTimeout(() => this.nextStep(ramp), this.stepIntervalMs);
      }
    }
  }

  /** Reconexão: começa a rampa pendente com o estado atual. */
  async onConnectivity(thingName: string, online: boolean, state: SafeLockVehicleState): Promise<void> {
    const ramp = this.ramps.get(thingName);
    if (!ramp || !online || ramp.phase !== 'waiting_online') return;
    if (state.locked) {
      this.finish(ramp, { status: 'confirmed' });
      return;
    }
    await this.begin(ramp, state);
  }

  /** Destravar/novo comando conflitante: interrompe a rampa; os locks em curso terminam `failed`. */
  cancel(thingName: string): void {
    const ramp = this.ramps.get(thingName);
    if (ramp) this.finish(ramp, { status: 'failed' });
  }

  private async begin(ramp: Ramp, state: SafeLockVehicleState): Promise<void> {
    ramp.lastSpeed = state.speedKmh;
    ramp.timeoutTimer = this.clock.setTimeout(() => this.onTimeout(ramp), this.timeoutMs);
    // Velocidade desconhecida/velha (null) = em movimento: rampa. Só trava direto com amostra fresca < 3.
    if (state.speedKmh !== null && state.speedKmh < SAFE_LOCK_SPEED_KMH) {
      await this.lock(ramp);
      return;
    }
    ramp.phase = 'ramping';
    ramp.steps = safeLockSteps(state.speedLimitKmh);
    ramp.stepIdx = 0;
    await this.publishStep(ramp);
  }

  private async publishStep(ramp: Ramp): Promise<void> {
    const limit = ramp.steps[ramp.stepIdx];
    ramp.awaitingAck = true;
    ramp.lastPublishedLimit = limit;
    ramp.publishedAt = this.clock.now();
    await this.transport.updateDesired(ramp.thingName, { limite_kmh: limit });
  }

  /** Timer de degrau ligado à rampa que o criou: um timer velho nunca avança uma rampa nova. */
  private async nextStep(ramp: Ramp): Promise<void> {
    if (this.ramps.get(ramp.thingName) !== ramp || ramp.phase !== 'ramping') return;
    ramp.stepTimer = undefined;
    ramp.stepIdx += 1;
    await this.publishStep(ramp);
  }

  private async lock(ramp: Ramp): Promise<void> {
    // Defesa em profundidade: nunca publica travada com velocidade reportada ≥ 3.
    if (ramp.lastSpeed === null || !(ramp.lastSpeed < SAFE_LOCK_SPEED_KMH)) return;
    this.clock.clearTimeout(ramp.stepTimer);
    ramp.stepTimer = undefined;
    ramp.phase = 'locking';
    ramp.publishedAt = this.clock.now();
    await this.transport.updateDesired(ramp.thingName, { travada: true });
  }

  private async onTimeout(ramp: Ramp): Promise<void> {
    const thingName = ramp.thingName;
    if (this.ramps.get(thingName) !== ramp) return;
    ramp.timeoutTimer = undefined;
    if (ramp.phase === 'ramping') {
      this.clock.clearTimeout(ramp.stepTimer);
      // Limite 0 fica "segurado" até um unlock explícito (o gateway recusa qualquer setSpeedLimit).
      this.opts.onHeld?.(thingName);
      this.finish(ramp, { status: 'failed', reason: 'did_not_stop' });
      if (ramp.lastPublishedLimit !== 0) await this.transport.updateDesired(thingName, { limite_kmh: 0 });
      return;
    }
    if (ramp.phase === 'locking') this.finish(ramp, { status: 'failed', reason: 'timeout' });
  }

  private finish(ramp: Ramp, outcome: Omit<CommandOutcome, 'commandId'>): void {
    this.clock.clearTimeout(ramp.stepTimer);
    this.clock.clearTimeout(ramp.timeoutTimer);
    if (this.ramps.get(ramp.thingName) === ramp) this.ramps.delete(ramp.thingName);
    for (const commandId of ramp.commandIds) this.sink({ commandId, ...outcome });
  }
}
