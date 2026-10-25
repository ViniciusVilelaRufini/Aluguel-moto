import { randomUUID } from 'node:crypto';
import { SAFE_LOCK_SPEED_KMH } from '../../common/enums';
import type { CommandOutcome, CommandRequest } from '../../ports/iot-gateway.port';
import type { Clock, TimerHandle } from './clock';
import { MAX_SPEED_KMH } from '../../common/enums';
import { MemorySafeLockStore, outsideLock, rampCurrentLimit, type OrphanRamp, type RampState, type SafeLockStore } from './safe-lock.store';
import type { ReportedState, ShadowTransport } from './shadow-transport';
import { rampSteps } from './speed-limit';

/** Intervalo entre degraus, contado a partir do `reported` do degrau anterior. */
export const SAFE_LOCK_STEP_INTERVAL_MS = 2_000;
/** Tempo máximo para a moto parar (desde o início da rampa). */
export const SAFE_LOCK_TIMEOUT_MS = 120_000;

export interface SafeLockVehicleState {
  /** Última velocidade reportada **fresca**; `null` = desconhecida/velha → tratada como em movimento (nunca 0 por padrão). */
  speedKmh: number | null;
  /** Teto confirmado (zona/desired gravado); só limita o primeiro degrau, nunca abaixo de 3. */
  speedLimitKmh: number;
  locked: boolean;
  online: boolean;
  /** Hold confirmado (limite segurado em 0 lido do estado compartilhado): só então a rampa começa em 0. */
  held?: boolean;
  /**
   * Limite que o rastreador reportou, só quando confirmado (lido do Redis agora). ≤ degrau publicado = o degrau já está aplicado:
   * vale como ack (com desired igual ao reported o shadow não gera `/delta` e o rastreador não reporta de novo).
   */
  reportedLimitKmh?: number;
}

export type OutcomeSink = (outcome: CommandOutcome) => void;

/** Horário (ms) de cada campo do reported, quando conhecido (metadata do shadow no modo aws). */
export type ReportedTimestamps = Partial<Record<keyof ReportedState, number>>;

export interface SafeLockOptions {
  stepIntervalMs?: number;
  timeoutMs?: number;
  onHeld?: (thingName: string) => void;
  /** Onde as rampas vivem (padrão: memória do processo; produção: Redis, compartilhado entre as instâncias). */
  store?: SafeLockStore;
  /**
   * Estado atual da moto, lido de novo (Redis) pela varredura para começar uma rampa `waiting_online` cuja reconexão foi
   * processada por outra instância. Sem ele, a rampa pendente só começa no `onConnectivity` desta instância.
   */
  probe?: (thingName: string) => Promise<SafeLockVehicleState | null>;
  /** Esta instância passou a acompanhar (ou largou) a rampa de uma moto — o gateway liga/desliga o polling do shadow. */
  onLocalActivity?: (thingName: string) => void;
  /** Log estruturado de erro (sem dado pessoal). */
  onError?: (entry: Record<string, unknown>) => void;
}

/**
 * Bloqueio seguro (CLAUDE.md: "nunca cortar o motor com a moto em movimento").
 *
 * - Velocidade reportada < 3 km/h → publica `travada: true` direto.
 * - Velocidade ≥ 3 → `limite_kmh` em degraus `min(atual, 15) → 8 → 3 → 0`, um degrau 2 s depois do `reported`
 *   do anterior; publica `travada: true` assim que a velocidade reportada (telemetria ou shadow) ficar < 3.
 * - 120 s sem parar → `failed`/`did_not_stop`, mantendo `limite_kmh: 0`.
 * - Moto offline → `pending`/`offline`; a rampa começa quando ela reconecta.
 *
 * Várias instâncias (lacunas T5): o estado da rampa fica no `SafeLockStore` (Redis em produção) e toda mudança passa por
 * `store.withLock(moto)`. Assim a telemetria processada por outra instância avança/trava a rampa, e um deploy no meio dela não
 * a perde: os horários do próximo degrau e do prazo estão no estado e a varredura (`sweep`, a cada 1 s) os cumpre se o timer
 * local se perdeu. Falha fechada: estado perdido/expirado ou Redis fora do ar → nada é publicado (nunca `travada` sem a
 * última velocidade fresca < 3 guardada no estado); o desired fica no último degrau (limite reduzido).
 *
 * Invariante (coberta por testes): `travada: true` só é publicado quando a última velocidade reportada é < 3.
 * Desfechos posteriores ao retorno de `start` vão para o `sink` (→ `iot.command-updated`).
 */
export class SafeLockService {
  private readonly store: SafeLockStore;
  /** Rampas que esta instância criou/tocou e ainda não viu terminar (isActive síncrono, polling do shadow). */
  private readonly local = new Set<string>();
  private readonly timers = new Map<string, { rampId: string; step?: TimerHandle; deadline?: TimerHandle }>();

  constructor(
    private readonly clock: Clock,
    private readonly transport: ShadowTransport,
    private readonly sink: OutcomeSink,
    private readonly opts: SafeLockOptions = {},
  ) {
    this.store = opts.store ?? new MemorySafeLockStore();
  }

  private get stepIntervalMs(): number {
    return this.opts.stepIntervalMs ?? SAFE_LOCK_STEP_INTERVAL_MS;
  }

  private get timeoutMs(): number {
    return this.opts.timeoutMs ?? SAFE_LOCK_TIMEOUT_MS;
  }

  /** Rampa ativa conhecida por esta instância (síncrono; para decisões de segurança use `isActiveAnywhere`). */
  isActive(thingName: string): boolean {
    return this.local.has(thingName);
  }

  /** Rampa ativa em qualquer instância (estado compartilhado). Erro de leitura propaga (quem chama falha fechado). */
  async isActiveAnywhere(thingName: string): Promise<boolean> {
    return (await this.store.get(thingName)) !== null;
  }

  /**
   * Fix 3: enquanto há rampa para a moto, ela é dona do limite. Sob o lock da moto, um limite pedido por fora (cerca, operador)
   * só entra se não subir o limite em vigor da rampa; aceito, vira teto dos degraus seguintes (`capKmh`). `no_ramp` = sem rampa
   * aqui (quem chama aplica as outras regras). Erro do armazenamento propaga.
   */
  async claimLimit(thingName: string, kmh: number): Promise<'no_ramp' | 'refused' | 'accepted'> {
    if (!this.local.has(thingName) && (await this.store.get(thingName)) === null) return 'no_ramp';
    return this.store.withLock(thingName, async () => {
      const ramp = await this.store.get(thingName);
      if (!ramp) return 'no_ramp';
      const current = rampCurrentLimit(ramp);
      if (current !== undefined && kmh > current) return 'refused';
      ramp.capKmh = Math.min(ramp.capKmh ?? kmh, kmh);
      await this.save(ramp);
      return 'accepted';
    });
  }

  /** Rampas desta instância (estado próprio) — para migrar a rampa degradada (memória) para o Redis quando ele volta. */
  async snapshot(): Promise<RampState[]> {
    const { active } = await this.store.scan();
    const out: RampState[] = [];
    for (const t of active) {
      const r = await this.store.get(t);
      if (r) out.push(JSON.parse(JSON.stringify(r)) as RampState);
    }
    return out;
  }

  /** Larga a rampa sem desfecho (ela foi adotada por outro armazenamento). */
  async drop(thingName: string, rampId: string): Promise<void> {
    await this.store.withLock(thingName, async () => {
      await this.store.remove(thingName, rampId);
      this.forget(thingName);
    });
  }

  /**
   * Adota uma rampa vinda da rampa degradada (memória): se já houver rampa compartilhada, só junta os comandos e o teto; senão
   * grava a rampa como está e reagenda os prazos. Erro do armazenamento propaga (Redis ainda fora → tenta na próxima varredura).
   */
  async adopt(ramp: RampState): Promise<void> {
    await this.store.withLock(ramp.thingName, async () => {
      const existing = await this.store.get(ramp.thingName);
      if (existing) {
        existing.commandIds.push(...ramp.commandIds.filter((c) => !existing.commandIds.includes(c)));
        const cap = rampCurrentLimit(ramp);
        if (cap !== undefined) existing.capKmh = Math.min(existing.capKmh ?? cap, cap);
        await this.save(existing);
        return;
      }
      await this.save(ramp);
      if (ramp.deadlineAt !== undefined) this.schedule(ramp, 'deadline', ramp.deadlineAt);
      if (ramp.nextStepAt !== undefined && !ramp.awaitingAck) this.schedule(ramp, 'step', ramp.nextStepAt);
    });
  }

  async start(req: CommandRequest, state: SafeLockVehicleState): Promise<CommandOutcome> {
    return this.store.withLock(req.thingName, async () => {
      const existing = await this.store.get(req.thingName);
      if (existing) {
        // Rampa retomada (prazo vencido ou órfã: os comandos dela já terminaram) → o comando novo tem os 120 s dele inteiros.
        if (existing.commandIds.length === 0 && existing.phase !== 'waiting_online') {
          existing.deadlineAt = this.clock.now() + this.timeoutMs;
          this.schedule(existing, 'deadline', existing.deadlineAt);
        }
        existing.commandIds.push(req.commandId);
        await this.save(existing);
        return existing.phase === 'waiting_online'
          ? { commandId: req.commandId, status: 'pending', reason: 'offline' }
          : { commandId: req.commandId, status: 'in_progress' };
      }
      if (state.locked) return { commandId: req.commandId, status: 'confirmed' };

      const ramp: RampState = {
        id: randomUUID(),
        thingName: req.thingName,
        commandIds: [req.commandId],
        phase: 'waiting_online',
        steps: [],
        stepIdx: 0,
        awaitingAck: false,
        lastSpeed: state.speedKmh,
        publishedAt: 0,
      };
      await this.save(ramp);
      if (!state.online) return { commandId: req.commandId, status: 'pending', reason: 'offline' };
      await this.begin(ramp, state);
      return { commandId: req.commandId, status: 'in_progress' };
    });
  }

  /** Velocidade reportada (telemetria ou `reported.velocidade_kmh`). */
  async onSpeed(thingName: string, speedKmh: number): Promise<void> {
    if (!Number.isFinite(speedKmh)) return;
    // Caminho rápido (toda telemetria passa aqui): sem rampa, nem pega o lock.
    if (!this.local.has(thingName) && (await this.store.get(thingName)) === null) return;
    await this.store.withLock(thingName, async () => {
      const ramp = await this.store.get(thingName);
      if (ramp) await this.applySpeed(ramp, speedKmh);
    });
  }

  private async applySpeed(ramp: RampState, speedKmh: number): Promise<void> {
    ramp.lastSpeed = speedKmh;
    if (ramp.phase === 'ramping' && speedKmh < SAFE_LOCK_SPEED_KMH) await this.lock(ramp);
    else await this.save(ramp);
  }

  /**
   * `reported` do rastreador. A velocidade só deve chegar aqui se for uma amostra fresca (o gateway filtra).
   * `at`: horário de cada campo; sem ele, vale a hora de chegada. O ack do degrau e a confirmação da trava só aceitam
   * reported não mais antigo que a publicação (com resolução de 1 s, a da metadata do shadow).
   */
  async onReported(thingName: string, reported: ReportedState, at: ReportedTimestamps = {}): Promise<void> {
    if (!this.local.has(thingName) && (await this.store.get(thingName)) === null) return;
    await this.store.withLock(thingName, async () => {
      let ramp = await this.store.get(thingName);
      if (!ramp) return;
      if (reported.velocidade_kmh !== undefined && Number.isFinite(reported.velocidade_kmh)) {
        await this.applySpeed(ramp, reported.velocidade_kmh);
        ramp = await this.store.get(thingName);
        if (!ramp) return;
      }
      const publishedAt = ramp.publishedAt;
      const notOlder = (field: keyof ReportedState) => (at[field] ?? this.clock.now()) >= Math.floor(publishedAt / 1000) * 1000;
      if (ramp.phase === 'locking' && reported.travada === true && notOlder('travada')) {
        await this.finish(ramp, { status: 'confirmed' });
        return;
      }
      if (ramp.phase === 'ramping' && ramp.awaitingAck && reported.limite_kmh !== undefined && reported.limite_kmh <= ramp.steps[ramp.stepIdx] && notOlder('limite_kmh')) {
        ramp.awaitingAck = false;
        if (ramp.stepIdx < ramp.steps.length - 1) {
          ramp.nextStepAt = this.clock.now() + this.stepIntervalMs;
          await this.save(ramp);
          this.schedule(ramp, 'step', ramp.nextStepAt);
        } else {
          await this.save(ramp);
        }
      }
    });
  }

  /** Reconexão: começa a rampa pendente com o estado atual. */
  async onConnectivity(thingName: string, online: boolean, state: SafeLockVehicleState): Promise<void> {
    if (!online) return;
    if (!this.local.has(thingName) && (await this.store.get(thingName)) === null) return;
    await this.store.withLock(thingName, async () => {
      const ramp = await this.store.get(thingName);
      if (!ramp || ramp.phase !== 'waiting_online') return;
      if (state.locked) {
        await this.finish(ramp, { status: 'confirmed' });
        return;
      }
      await this.begin(ramp, state);
    });
  }

  /** Destravar/novo comando conflitante: interrompe a rampa; os locks em curso terminam `failed`. */
  async cancel(thingName: string): Promise<void> {
    await this.store.withLock(thingName, async () => {
      const ramp = await this.store.get(thingName);
      if (ramp) await this.finish(ramp, { status: 'failed' });
    });
  }

  /**
   * Varredura (todas as instâncias, a cada ~1 s): cumpre degraus e prazos vencidos cujo timer local se perdeu (deploy, rampa
   * começada por outra instância), começa rampas `waiting_online` de motos que outra instância viu reconectar, e passa a
   * acompanhar (polling do shadow) as rampas ativas. Cada moto é processada sob o lock dela.
   */
  async sweep(): Promise<void> {
    const { active: list, orphans } = await this.store.scan();
    const active = new Set(list);
    for (const thingName of [...this.local]) {
      if (!active.has(thingName)) this.forget(thingName);
    }
    for (const thingName of active) {
      if (!this.local.has(thingName)) {
        this.local.add(thingName);
        this.opts.onLocalActivity?.(thingName);
      }
      await this.tick(thingName, true);
    }
    for (const orphan of orphans) await this.recoverOrphan(orphan);
  }

  /**
   * Rampa cujo estado sumiu sem `finish` (expulsão/failover): os comandos terminam `failed`, o limite fica segurado (hold) e a
   * rampa é retomada (`resume`) a partir do limite que a perdida impunha — o degrau herdado é republicado e espera o ack; nunca
   * `travada: true` órfão (sem velocidade fresca < 3 sai `travada: false`) nem limite 0 de uma vez. `waiting_online` (nada
   * publicado) só encerra os comandos.
   */
  private async recoverOrphan(orphan: OrphanRamp): Promise<void> {
    await this.store.withLock(orphan.thingName, async () => {
      // Sob o lock da moto (fix 2, N2): só segue se a entrada do índice ainda for esta órfã e não houver estado — outra varredura
      // já tratou, ou um lock novo começou/terminou entre o scan e aqui → nada (nunca desfaz uma trava recém-confirmada).
      if ((await this.store.get(orphan.thingName)) !== null) return;
      if (!(await this.store.isOrphan(orphan.thingName, orphan.rampId))) return;
      this.opts.onError?.({ msg: 'safe_lock_state_lost', thingName: orphan.thingName, phase: orphan.phase, commands: orphan.commandIds.length });
      await this.store.clearOrphan(orphan.thingName, orphan.rampId);
      this.forget(orphan.thingName);
      // Fix 3: nada de limite 0 de uma vez com a moto possivelmente andando — a rampa é retomada pela velocidade medida agora
      // (nunca acima do limite que a rampa perdida já impunha); trava só com velocidade fresca < 3. Os comandos terminam `failed`.
      if (orphan.phase !== 'waiting_online') {
        this.opts.onHeld?.(orphan.thingName);
        const ramp: RampState = {
          id: randomUUID(),
          thingName: orphan.thingName,
          commandIds: [],
          phase: orphan.phase,
          steps: [],
          stepIdx: 0,
          // O degrau herdado não conta como confirmado (M1): é republicado e o próximo só sai depois do reported dele.
          awaitingAck: true,
          lastSpeed: null,
          publishedAt: this.clock.now(),
          ...(orphan.limitKmh !== undefined ? { lastPublishedLimit: orphan.limitKmh } : {}),
        };
        try {
          await this.resume(ramp);
        } finally {
          this.emitFailed(orphan.commandIds, 'timeout');
        }
        return;
      }
      this.emitFailed(orphan.commandIds, 'timeout');
    });
  }

  /** Executa o que estiver vencido na rampa da moto (degrau, prazo; com `probe`, o início pendente). */
  private async tick(thingName: string, fromSweep = false): Promise<void> {
    const peek = await this.store.get(thingName);
    if (!peek || (!this.isDue(peek) && !(fromSweep && peek.phase === 'waiting_online' && this.opts.probe))) return;
    await this.store.withLock(thingName, async () => {
      const ramp = await this.store.get(thingName);
      if (!ramp) return;
      const now = this.clock.now();
      if (ramp.deadlineAt !== undefined && ramp.deadlineAt <= now) {
        await this.onTimeout(ramp);
        return;
      }
      if (ramp.phase === 'ramping' && !ramp.awaitingAck && ramp.nextStepAt !== undefined && ramp.nextStepAt <= now) {
        await this.nextStep(ramp);
        return;
      }
      if (fromSweep && ramp.phase === 'waiting_online' && this.opts.probe) {
        const state = await this.opts.probe(thingName);
        if (!state?.online) return;
        if (state.locked) await this.finish(ramp, { status: 'confirmed' });
        else await this.begin(ramp, state);
      }
    });
  }

  private isDue(r: RampState): boolean {
    const now = this.clock.now();
    if (r.deadlineAt !== undefined && r.deadlineAt <= now) return true;
    return r.phase === 'ramping' && !r.awaitingAck && r.nextStepAt !== undefined && r.nextStepAt <= now;
  }

  private async save(ramp: RampState): Promise<void> {
    await this.store.put(ramp);
    if (!this.local.has(ramp.thingName)) {
      this.local.add(ramp.thingName);
      this.opts.onLocalActivity?.(ramp.thingName);
    }
  }

  /** Timer local ligado à rampa: só antecipa o `tick`, que confere o horário guardado no estado. */
  private schedule(ramp: RampState, kind: 'step' | 'deadline', at: number): void {
    let t = this.timers.get(ramp.thingName);
    if (!t || t.rampId !== ramp.id) {
      this.clearTimers(ramp.thingName);
      t = { rampId: ramp.id };
      this.timers.set(ramp.thingName, t);
    }
    this.clock.clearTimeout(t[kind]);
    const thingName = ramp.thingName;
    t[kind] = this.clock.setTimeout(
      () => outsideLock(() => this.tick(thingName).catch(() => undefined)),
      Math.max(0, at - this.clock.now()),
    );
  }

  private clearTimers(thingName: string): void {
    const t = this.timers.get(thingName);
    if (!t) return;
    this.clock.clearTimeout(t.step);
    this.clock.clearTimeout(t.deadline);
    this.timers.delete(thingName);
  }

  private forget(thingName: string): void {
    this.clearTimers(thingName);
    if (this.local.delete(thingName)) this.opts.onLocalActivity?.(thingName);
  }

  private async begin(ramp: RampState, state: SafeLockVehicleState): Promise<void> {
    ramp.lastSpeed = state.speedKmh;
    ramp.deadlineAt = this.clock.now() + this.timeoutMs;
    this.schedule(ramp, 'deadline', ramp.deadlineAt);
    // Velocidade desconhecida/velha (null) = em movimento: rampa. Só trava direto com amostra fresca < 3.
    if (state.speedKmh !== null && state.speedKmh < SAFE_LOCK_SPEED_KMH) {
      await this.lock(ramp);
      return;
    }
    ramp.phase = 'ramping';
    ramp.steps = rampSteps(state.speedKmh, state.speedLimitKmh, state.held === true);
    ramp.stepIdx = 0;
    await this.publishStep(ramp);
    await this.ackIfAlreadyApplied(ramp, state.reportedLimitKmh);
  }

  /**
   * Degrau já aplicado pelo rastreador (reported confirmado ≤ degrau): conta como ack e o próximo degrau sai no intervalo
   * normal. Sem isso, um degrau igual ao reported (limite manual 8/15 já aplicado, degrau herdado de uma órfã) esperaria para
   * sempre: desired == reported não gera `/delta` e o rastreador não reporta de novo.
   */
  private async ackIfAlreadyApplied(ramp: RampState, reportedLimitKmh: number | undefined): Promise<void> {
    if (reportedLimitKmh === undefined || ramp.phase !== 'ramping' || !ramp.awaitingAck) return;
    const published = rampCurrentLimit(ramp);
    if (published === undefined || reportedLimitKmh > published) return;
    ramp.awaitingAck = false;
    if (ramp.stepIdx < ramp.steps.length - 1) {
      ramp.nextStepAt = this.clock.now() + this.stepIntervalMs;
      await this.save(ramp);
      this.schedule(ramp, 'step', ramp.nextStepAt);
    } else {
      await this.save(ramp);
    }
  }

  /** Grava o estado **antes** de publicar (outra instância, ou um reported imediato, já vê o degrau publicado). */
  private async publishStep(ramp: RampState): Promise<void> {
    const limit = Math.min(ramp.steps[ramp.stepIdx], ramp.capKmh ?? MAX_SPEED_KMH);
    ramp.awaitingAck = true;
    ramp.lastPublishedLimit = limit;
    ramp.publishedAt = this.clock.now();
    ramp.nextStepAt = undefined;
    await this.save(ramp);
    await this.transport.updateDesired(ramp.thingName, { limite_kmh: limit });
  }

  private async nextStep(ramp: RampState): Promise<void> {
    if (ramp.phase !== 'ramping' || ramp.stepIdx >= ramp.steps.length - 1) return;
    ramp.stepIdx += 1;
    await this.publishStep(ramp);
  }

  private async lock(ramp: RampState): Promise<void> {
    // Defesa em profundidade: nunca publica travada com velocidade reportada ≥ 3 (ou desconhecida).
    if (ramp.lastSpeed === null || !(ramp.lastSpeed < SAFE_LOCK_SPEED_KMH)) {
      await this.save(ramp);
      return;
    }
    const t = this.timers.get(ramp.thingName);
    if (t) {
      this.clock.clearTimeout(t.step);
      t.step = undefined;
    }
    ramp.phase = 'locking';
    ramp.nextStepAt = undefined;
    ramp.publishedAt = this.clock.now();
    await this.save(ramp);
    await this.transport.updateDesired(ramp.thingName, { travada: true });
  }

  /**
   * Prazo de 120 s vencido. Os comandos terminam `failed` (`did_not_stop` na rampa → alerta `command_failed`; `timeout` na trava),
   * o limite fica segurado (hold: nada sobe até um unlock) e — fix 3 — **nada de limite 0 de uma vez**: a rampa continua pela
   * velocidade medida agora, nunca acima do limite que já impõe, com um prazo novo de 120 s (no qual o degrau sem ack é
   * republicado, sem novo desfecho); trava só com velocidade fresca < 3. Um lock novo que entra nela ganha 120 s próprios.
   */
  private async onTimeout(ramp: RampState): Promise<void> {
    if (ramp.phase !== 'ramping' && ramp.phase !== 'locking') return;
    const commands = ramp.commandIds;
    const reason = ramp.phase === 'ramping' ? 'did_not_stop' : 'timeout';
    ramp.commandIds = [];
    this.opts.onHeld?.(ramp.thingName);
    // Desfecho e alerta saem mesmo se a publicação da retomada falhar (IoT fora) — M4.
    try {
      await this.resume(ramp);
    } finally {
      this.emitFailed(commands, reason);
    }
  }

  private emitFailed(commandIds: string[], reason: 'did_not_stop' | 'timeout'): void {
    if (!commandIds.length) return;
    outsideLock(() => {
      for (const commandId of commandIds) this.sink({ commandId, status: 'failed', reason });
    });
  }

  /**
   * M3: publica um limite pedido por fora sob o lock da moto, conferindo de novo contra a rampa (se houver): nada que um degrau
   * publicado entre a checagem e a publicação tenha baixado é sobrescrito para cima. `false` = recusado (subiria).
   */
  async publishIfAllowed(thingName: string, kmh: number, publish: () => Promise<void>): Promise<boolean> {
    return this.store.withLock(thingName, async () => {
      const ramp = await this.store.get(thingName);
      if (ramp) {
        const current = rampCurrentLimit(ramp);
        if (current !== undefined && kmh > current) return false;
        ramp.capKmh = Math.min(ramp.capKmh ?? kmh, kmh);
        await this.save(ramp);
      }
      await publish();
      return true;
    });
  }

  /**
   * Retoma a rampa (timeout ou órfã), sob o lock: velocidade fresca do `probe` (sem ele, desconhecida = em movimento).
   * - fase `locking` com velocidade fresca < 3: segue esperando a confirmação da trava (prazo novo);
   * - fase `locking` sem isso: `travada:false` (um `travada:true` não confirmado não fica no desired) e rampa;
   * - rampa: degraus de `rampSteps` pela velocidade, nunca acima do limite em vigor; já em < 3 (degrau 0 confirmado), fica.
   */
  private async resume(ramp: RampState): Promise<void> {
    const state = this.opts.probe ? await this.opts.probe(ramp.thingName).catch(() => null) : null;
    const speed = state?.speedKmh ?? null;
    if (speed !== null) ramp.lastSpeed = speed;
    // M2: a rampa retomada tem prazo como qualquer outra; no próximo prazo ela é retomada de novo (degrau republicado), sem
    // novo desfecho (os comandos já terminaram) — nunca fica presa esperando um ack que não vem.
    ramp.deadlineAt = this.clock.now() + this.timeoutMs;
    this.schedule(ramp, 'deadline', ramp.deadlineAt);
    if (ramp.phase === 'locking') {
      if (speed !== null && speed < SAFE_LOCK_SPEED_KMH) {
        ramp.publishedAt = this.clock.now();
        await this.save(ramp);
        return;
      }
      ramp.phase = 'ramping';
      ramp.awaitingAck = false;
      await this.save(ramp);
      await this.transport.updateDesired(ramp.thingName, { travada: false });
    }
    // M5: sem degrau próprio (trava direta, órfã antiga), um teto confirmado < 3 também conta — a retomada nunca sobe dele.
    const current = rampCurrentLimit(ramp) ?? (state && state.speedLimitKmh < SAFE_LOCK_SPEED_KMH ? state.speedLimitKmh : undefined);
    if (current !== undefined && current < SAFE_LOCK_SPEED_KMH) {
      // Já no degrau 0 (depois do 3 confirmado): fica; trava quando a velocidade fresca cair abaixo de 3.
      ramp.steps = [current];
      ramp.stepIdx = 0;
      await this.save(ramp);
      return;
    }
    const ceiling = Math.min(current ?? MAX_SPEED_KMH, state?.speedLimitKmh ?? MAX_SPEED_KMH);
    const steps = rampSteps(speed, ceiling, false).map((v) => Math.min(v, current ?? MAX_SPEED_KMH));
    ramp.steps = steps.filter((v, i) => i === 0 || v < steps[i - 1]);
    ramp.stepIdx = 0;
    if (ramp.steps[0] === ramp.lastPublishedLimit && !ramp.awaitingAck) {
      // Degrau atual publicado e confirmado: o próximo sai no intervalo normal.
      if (ramp.steps.length > 1) {
        ramp.nextStepAt = this.clock.now() + this.stepIntervalMs;
        await this.save(ramp);
        this.schedule(ramp, 'step', ramp.nextStepAt);
      } else {
        await this.save(ramp);
      }
      return;
    }
    // Novo degrau, ou o atual sem ack (o desired pode ter sido sobrescrito, ou é herdado de uma órfã): (re)publica e espera —
    // salvo se o rastreador já reporta um limite ≤ degrau (vale como ack).
    await this.publishStep(ramp);
    await this.ackIfAlreadyApplied(ramp, state?.reportedLimitKmh);
  }

  private async finish(ramp: RampState, outcome: Omit<CommandOutcome, 'commandId'>): Promise<void> {
    await this.store.remove(ramp.thingName, ramp.id);
    this.forget(ramp.thingName);
    // Fora da reentrância do lock: quem recebe o desfecho pode mandar outro comando para a mesma moto.
    outsideLock(() => {
      for (const commandId of ramp.commandIds) this.sink({ commandId, ...outcome });
    });
  }
}
