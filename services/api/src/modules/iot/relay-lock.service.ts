import { randomUUID } from 'node:crypto';
import { SAFE_LOCK_SPEED_KMH } from '../../common/enums';
import type { CommandOutcome, CommandRequest } from '../../ports/iot-gateway.port';
import type { Clock, TimerHandle } from './clock';
import { SPEED_FRESH_MS } from './live-state.store';
import { MemoryRelayLockStore, outsideLock, type OrphanRelayLock, type RelayLockState, type RelayLockStore, type RelayStillRun } from './relay-lock.store';
import type { OutcomeSink, ReportedTimestamps } from './safe-lock.service';
import type { DesiredState, ReportedState } from './shadow-transport';

/** Prazo para a moto parar (desde o início da espera). */
export const RELAY_STOP_TIMEOUT_MS = 120_000;
/** Prazo para o rastreador confirmar o corte (desde a gravação de `travada: true`). */
export const RELAY_CONFIRM_TIMEOUT_MS = 120_000;
export const RELAY_STILL_MIN_SAMPLES = 2;
export const RELAY_STILL_MIN_SPAN_MS = 10_000;

/** Telemetria vista pelo `TelemetryService`: `accepted` = o `LiveStateStore` aceitou a velocidade (fresca, em ordem, fora da graça). */
export interface RelaySample {
  kmh: number;
  /** `timestamp` bruto do rastreador (ms). */
  deviceTs: number;
  /** Hora da medição limitada a agora (ms). */
  measuredAt: number;
  accepted: boolean;
}

/** Só a conectividade: o estado ao vivo da trava (`locked`) pode ser o padrão de uma moto ainda sem dados — nunca confirma. */
export interface RelayLockVehicleState {
  online: boolean;
}

export interface RelayLockOptions {
  /** Velocidade fresca do `LiveStateStore` (`null` = desconhecida): última conferência antes de gravar o corte. */
  knownSpeed: (thingName: string) => number | null;
  store?: RelayLockStore;
  stopTimeoutMs?: number;
  confirmTimeoutMs?: number;
  /** Estado relido (Redis) pela varredura: começa a espera de uma trava `waiting_online` cuja reconexão outra instância viu. */
  probe?: (thingName: string) => Promise<RelayLockVehicleState | null>;
  onLocalActivity?: (thingName: string) => void;
  onError?: (entry: Record<string, unknown>) => void;
}

/** Parada confirmada (spec §5.1): ≥ 2 amostras paradas consecutivas, ≥ 10 s entre a primeira e a última, a última fresca. */
export function stillConfirmed(run: RelayStillRun | undefined, now: number): boolean {
  if (!run || run.count < RELAY_STILL_MIN_SAMPLES) return false;
  if (run.lastAt - run.firstAt < RELAY_STILL_MIN_SPAN_MS) return false;
  return now - run.lastAt <= SPEED_FRESH_MS;
}

/**
 * Bloqueio de rastreador só relé (spec GT06 §5): não existe rampa. Enquanto a moto não estiver parada de forma confirmada, o
 * comando fica `in_progress` e nada é enviado; confirmada a parada, grava `desired.travada = true` uma única vez (a ponte manda
 * `engineStop`) e espera `reported.travada = true`. 120 s sem parar → `did_not_stop` sem corte; corte sem confirmação em 120 s →
 * `timeout` e `desired.travada = false`. Offline → `pending`; ao reconectar, recomeça (amostras novas, fora da graça).
 *
 * Invariante (testes fixos e de propriedade): `travada: true` só é gravado com a sequência parada confirmada e a velocidade
 * fresca conhecida < 3 km/h no instante da gravação.
 */
export class RelayLockService {
  private readonly store: RelayLockStore;
  private readonly local = new Set<string>();
  private readonly timers = new Map<string, { lockId: string; handle: TimerHandle }>();

  constructor(
    private readonly clock: Clock,
    private readonly transport: { updateDesired(thingName: string, desired: DesiredState): Promise<void> },
    private readonly sink: OutcomeSink,
    private readonly opts: RelayLockOptions,
  ) {
    this.store = opts.store ?? new MemoryRelayLockStore();
  }

  /** Trava conhecida por esta instância (síncrono; o gateway liga o polling do shadow no modo aws). */
  isActive(thingName: string): boolean {
    return this.local.has(thingName);
  }

  private async exists(thingName: string): Promise<boolean> {
    return this.local.has(thingName) || (await this.store.get(thingName)) !== null;
  }

  async start(req: CommandRequest, state: RelayLockVehicleState): Promise<CommandOutcome> {
    return this.store.withLock(req.thingName, async () => {
      const existing = await this.store.get(req.thingName);
      if (existing) {
        existing.commandIds.push(req.commandId);
        await this.save(existing);
        return existing.phase === 'waiting_online'
          ? { commandId: req.commandId, status: 'pending', reason: 'offline' }
          : { commandId: req.commandId, status: 'in_progress' };
      }
      const lock: RelayLockState = { id: randomUUID(), thingName: req.thingName, commandIds: [req.commandId], phase: 'waiting_online' };
      if (!state.online) {
        await this.save(lock);
        return { commandId: req.commandId, status: 'pending', reason: 'offline' };
      }
      await this.begin(lock);
      return { commandId: req.commandId, status: 'in_progress' };
    });
  }

  /** Toda telemetria da moto (aceita ou não). Só a fase `waiting_stop` usa. */
  async onSample(thingName: string, s: RelaySample): Promise<void> {
    if (!Number.isFinite(s.kmh) || !Number.isFinite(s.deviceTs) || !Number.isFinite(s.measuredAt)) return;
    if (!(await this.exists(thingName))) return;
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock || lock.phase !== 'waiting_stop') return;
      if (!(s.kmh < SAFE_LOCK_SPEED_KMH)) {
        // Em movimento — inclusive fora de ordem (medida entre as paradas e chegada atrasada): a sequência parada recomeça.
        lock.run = undefined;
        if (lock.newestDeviceTs === undefined || s.deviceTs > lock.newestDeviceTs) lock.newestDeviceTs = s.deviceTs;
        await this.save(lock);
        return;
      }
      if (lock.newestDeviceTs !== undefined && s.deviceTs <= lock.newestDeviceTs) return; // parada mais velha ou repetida: ignorada
      lock.newestDeviceTs = s.deviceTs;
      if (!s.accepted) {
        // Parada mas rejeitada (na graça, velha, relógio no futuro) = em movimento para a trava: a sequência recomeça.
        lock.run = undefined;
        await this.save(lock);
        return;
      }
      lock.run = lock.run ? { firstAt: lock.run.firstAt, lastAt: s.measuredAt, count: lock.run.count + 1 } : { firstAt: s.measuredAt, lastAt: s.measuredAt, count: 1 };
      await this.save(lock);
      await this.tryCut(lock);
    });
  }

  /** `reported` (velocidade já filtrada pelo gateway): ≥ 3 km/h zera a sequência; `travada: true` confirma. */
  async onReported(thingName: string, reported: ReportedState, at: ReportedTimestamps = {}): Promise<void> {
    if (!(await this.exists(thingName))) return;
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock || lock.phase === 'waiting_online') return;
      if (reported.travada === true) {
        const since = Math.floor((lock.cutAt ?? lock.startedAt ?? 0) / 1000) * 1000;
        if ((at.travada ?? this.clock.now()) >= since) {
          await this.finish(lock, { status: 'confirmed' });
          return;
        }
      }
      if (lock.phase === 'waiting_stop' && reported.velocidade_kmh !== undefined && !(reported.velocidade_kmh < SAFE_LOCK_SPEED_KMH) && lock.run) {
        lock.run = undefined;
        await this.save(lock);
      }
    });
  }

  /** Reconexão percebida (presença, lacuna, atraso de fila, volta de offline): a sequência parada e a ordem recomeçam. */
  async onReconnected(thingName: string): Promise<void> {
    if (!(await this.exists(thingName))) return;
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock || (lock.run === undefined && lock.newestDeviceTs === undefined)) return;
      lock.run = undefined;
      lock.newestDeviceTs = undefined;
      await this.save(lock);
    });
  }

  async onConnectivity(thingName: string, online: boolean, state: RelayLockVehicleState): Promise<void> {
    if (!(await this.exists(thingName))) return;
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock) return;
      if (!online) {
        if (lock.phase === 'waiting_stop' && (lock.run || lock.newestDeviceTs !== undefined)) {
          lock.run = undefined;
          lock.newestDeviceTs = undefined;
          await this.save(lock);
        }
        return;
      }
      if (lock.phase !== 'waiting_online' || !state.online) return;
      await this.begin(lock);
    });
  }

  /** Destravar/comando conflitante: encerra a trava; os locks em curso terminam `failed`. Nada é publicado aqui. */
  async cancel(thingName: string): Promise<void> {
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (lock) await this.finish(lock, { status: 'failed' });
    });
  }

  /** Varredura (a cada ~1 s, todas as instâncias): prazos vencidos, esperas `waiting_online` reconectadas em outra instância, órfãs. */
  async sweep(): Promise<void> {
    const { active, orphans } = await this.store.scan();
    const set = new Set(active);
    for (const thingName of [...this.local]) if (!set.has(thingName)) this.forget(thingName);
    for (const thingName of active) {
      if (!this.local.has(thingName)) {
        this.local.add(thingName);
        this.opts.onLocalActivity?.(thingName);
      }
      await this.tick(thingName, true);
    }
    for (const orphan of orphans) await this.recoverOrphan(orphan);
  }

  private async tick(thingName: string, fromSweep = false): Promise<void> {
    await this.store.withLock(thingName, async () => {
      const lock = await this.store.get(thingName);
      if (!lock) return;
      if (lock.deadlineAt !== undefined && lock.deadlineAt <= this.clock.now()) {
        await this.onDeadline(lock);
        return;
      }
      if (fromSweep && lock.phase === 'waiting_online' && this.opts.probe) {
        const state = await this.opts.probe(thingName);
        if (state?.online) await this.begin(lock);
      }
    });
  }

  private async begin(lock: RelayLockState): Promise<void> {
    const now = this.clock.now();
    lock.phase = 'waiting_stop';
    lock.startedAt = now;
    lock.run = undefined;
    lock.newestDeviceTs = undefined;
    lock.deadlineAt = now + (this.opts.stopTimeoutMs ?? RELAY_STOP_TIMEOUT_MS);
    await this.save(lock);
    this.schedule(lock);
  }

  /** Grava o estado `cutting` **antes** de publicar: nenhuma outra instância grava o corte de novo. */
  private async tryCut(lock: RelayLockState): Promise<void> {
    const now = this.clock.now();
    if (!stillConfirmed(lock.run, now)) return;
    const speed = this.opts.knownSpeed(lock.thingName);
    if (speed === null || !(speed < SAFE_LOCK_SPEED_KMH)) return;
    lock.phase = 'cutting';
    lock.cutAt = now;
    lock.run = undefined;
    lock.deadlineAt = now + (this.opts.confirmTimeoutMs ?? RELAY_CONFIRM_TIMEOUT_MS);
    await this.save(lock);
    this.schedule(lock);
    await this.transport.updateDesired(lock.thingName, { travada: true });
  }

  private async onDeadline(lock: RelayLockState): Promise<void> {
    if (lock.phase === 'waiting_stop') {
      await this.finish(lock, { status: 'failed', reason: 'did_not_stop' });
      return;
    }
    if (lock.phase !== 'cutting') return;
    // Corte enviado e não confirmado: o desired volta a `travada: false` (a ponte não reenvia o corte ao reconectar). Se a
    // publicação falhar, o estado fica e a próxima varredura tenta de novo (o desfecho sai uma vez só).
    const commands = lock.commandIds;
    lock.commandIds = [];
    try {
      await this.transport.updateDesired(lock.thingName, { travada: false });
    } catch (err) {
      this.opts.onError?.({ msg: 'relay_lock_uncut_failed', thingName: lock.thingName, error: (err as Error).message });
      await this.save(lock);
      this.emit(commands, { status: 'failed', reason: 'timeout' });
      return;
    }
    await this.store.remove(lock.thingName, lock.id);
    this.forget(lock.thingName);
    this.emit(commands, { status: 'failed', reason: 'timeout' });
  }

  private async recoverOrphan(orphan: OrphanRelayLock): Promise<void> {
    await this.store.withLock(orphan.thingName, async () => {
      if ((await this.store.get(orphan.thingName)) !== null) return;
      this.opts.onError?.({ msg: 'relay_lock_state_lost', thingName: orphan.thingName, phase: orphan.phase, commands: orphan.commandIds.length });
      if (orphan.phase === 'cutting') {
        try {
          await this.transport.updateDesired(orphan.thingName, { travada: false });
        } catch (err) {
          this.opts.onError?.({ msg: 'relay_lock_uncut_failed', thingName: orphan.thingName, error: (err as Error).message });
          return; // fica no índice: a próxima varredura tenta de novo
        }
      }
      await this.store.clearOrphan(orphan.thingName, orphan.lockId);
      this.forget(orphan.thingName);
      this.emit(orphan.commandIds, { status: 'failed', reason: 'timeout' });
    });
  }

  private schedule(lock: RelayLockState): void {
    if (lock.deadlineAt === undefined) return;
    const prev = this.timers.get(lock.thingName);
    if (prev) this.clock.clearTimeout(prev.handle);
    const thingName = lock.thingName;
    const handle = this.clock.setTimeout(() => outsideLock(() => this.tick(thingName).catch(() => undefined)), Math.max(0, lock.deadlineAt - this.clock.now()));
    this.timers.set(thingName, { lockId: lock.id, handle });
  }

  private async save(lock: RelayLockState): Promise<void> {
    await this.store.put(lock);
    if (!this.local.has(lock.thingName)) {
      this.local.add(lock.thingName);
      this.opts.onLocalActivity?.(lock.thingName);
    }
  }

  private forget(thingName: string): void {
    const t = this.timers.get(thingName);
    if (t) this.clock.clearTimeout(t.handle);
    this.timers.delete(thingName);
    if (this.local.delete(thingName)) this.opts.onLocalActivity?.(thingName);
  }

  private async finish(lock: RelayLockState, outcome: Omit<CommandOutcome, 'commandId'>): Promise<void> {
    await this.store.remove(lock.thingName, lock.id);
    this.forget(lock.thingName);
    this.emit(lock.commandIds, outcome);
  }

  /** Fora da reentrância do lock: quem recebe o desfecho pode mandar outro comando para a mesma moto. */
  private emit(commandIds: string[], outcome: Omit<CommandOutcome, 'commandId'>): void {
    if (!commandIds.length) return;
    outsideLock(() => {
      for (const commandId of commandIds) this.sink({ commandId, ...outcome });
    });
  }
}
