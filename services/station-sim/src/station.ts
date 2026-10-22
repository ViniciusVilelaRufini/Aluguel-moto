import type { SimConfig } from './config';
import { stationIdOf, type StationCommand, type StationEvent } from './protocol';

export type Publish = (thing: string, event: StationEvent) => void;
export type Logger = (entry: Record<string, unknown>) => void;
export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
}

/** Fase de uma troca na estação simulada. */
export type Phase = 'opening' | 'awaiting_return' | 'returned' | 'closed' | 'release_requested' | 'done';

export interface SimSwap {
  swapId: string;
  thing: string;
  slotNumber: number;
  phase: Phase;
  expectedSerial?: string;
  serialHint?: string;
  createdAt: number;
}

/** Pseudo-aleatório determinístico (LCG), como no simulador das motos. */
export function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const realScheduler: Scheduler = { setTimeout: (fn, ms) => setTimeout(fn, ms) };

/**
 * Estações simuladas. Responde a qualquer `station-{id}` (ou só às de `STATION_SIM_STATIONS`).
 * - `open_slot`: abre uma vaga livre (`slot_opened`). Automático: depois devolve a bateria esperada (`battery_returned`, carga
 *   baixa sorteada) e fecha a vaga (`slot_closed`). Manual: espera as teclas `d` (devolver e fechar) ou `f` (fechar vazia).
 * - `release_battery`: automático libera a sugerida ou uma do estoque simulado (`battery_released`); manual espera a tecla `l`.
 * - Comando repetido (mesmo `commandId`) é ignorado; liberação sem devolução é recusada (a estação real também recusaria).
 */
export class StationSim {
  readonly swaps = new Map<string, SimSwap>();
  private readonly seen = new Set<string>();
  private readonly usedSlots = new Map<string, Set<number>>();
  private readonly stock = new Map<string, number>();
  private readonly random: () => number;

  constructor(
    private readonly cfg: SimConfig,
    private readonly publish: Publish,
    private readonly log: Logger = () => undefined,
    private readonly scheduler: Scheduler = realScheduler,
    private readonly now: () => number = Date.now,
  ) {
    this.random = rng(cfg.seed);
  }

  handles(thing: string): boolean {
    return this.cfg.stations.length === 0 || this.cfg.stations.includes(stationIdOf(thing));
  }

  onCommand(thing: string, cmd: StationCommand): void {
    if (!this.handles(thing)) return;
    if (this.seen.has(cmd.commandId)) {
      this.log({ msg: 'comando_repetido', swapId: cmd.swapId, action: cmd.action });
      return;
    }
    this.seen.add(cmd.commandId);
    this.log({ msg: 'comando_recebido', swapId: cmd.swapId, action: cmd.action, stationId: stationIdOf(thing) });
    if (cmd.action === 'open_slot') this.openSlot(thing, cmd);
    else if (cmd.action === 'abort_swap') this.abort(thing, cmd);
    else this.requestRelease(thing, cmd);
  }

  /**
   * Fix 1 (I2): troca cancelada pelo cliente ou vencida na API. Fecha a vaga (se aberta ou ainda abrindo) e confirma com
   * `slot_closed`; não devolve nem libera mais nada nessa troca. Troca desconhecida (simulador reiniciado) também confirma.
   */
  private abort(thing: string, cmd: StationCommand): void {
    const s = this.swaps.get(cmd.swapId);
    if (s && s.phase === 'done') return;
    if (s) {
      s.phase = 'done';
      this.usedSlots.get(s.thing)?.delete(s.slotNumber);
      this.emit(s, { type: 'slot_closed' });
      return;
    }
    this.emit({ swapId: cmd.swapId, thing, slotNumber: cmd.slotNumber ?? 0, phase: 'done', createdAt: this.now() }, { type: 'slot_closed' });
  }

  /** Trocas que esperam alguém no teclado (manual), mais antigas primeiro. */
  waiting(phase: 'awaiting_return' | 'release_requested'): SimSwap[] {
    return [...this.swaps.values()].filter((s) => s.phase === phase).sort((a, b) => a.createdAt - b.createdAt);
  }

  /** Tecla `d`: devolve a bateria na vaga aberta mais antiga e fecha a vaga. */
  returnBattery(swapId?: string): SimSwap | null {
    const s = swapId ? this.swaps.get(swapId) : this.waiting('awaiting_return')[0];
    if (!s || s.phase !== 'awaiting_return') return null;
    this.emitReturned(s);
    this.scheduler.setTimeout(() => this.emitClosed(s), Math.min(this.cfg.stepMs, 1000));
    return s;
  }

  /** Tecla `f`: fecha a vaga mais antiga sem devolver (a API cancela a troca). */
  closeEmpty(swapId?: string): SimSwap | null {
    const s = swapId ? this.swaps.get(swapId) : this.waiting('awaiting_return')[0];
    if (!s || s.phase !== 'awaiting_return') return null;
    this.emitClosed(s);
    return s;
  }

  /** Tecla `l`: libera a carregada da liberação pedida mais antiga. */
  release(swapId?: string): SimSwap | null {
    const s = swapId ? this.swaps.get(swapId) : this.waiting('release_requested')[0];
    if (!s || s.phase !== 'release_requested') return null;
    this.emitReleased(s);
    return s;
  }

  private openSlot(thing: string, cmd: StationCommand): void {
    if (this.swaps.has(cmd.swapId)) return;
    const slotNumber = this.freeSlot(thing);
    const s: SimSwap = { swapId: cmd.swapId, thing, slotNumber, phase: 'opening', expectedSerial: cmd.expectedSerial, createdAt: this.now() };
    this.swaps.set(s.swapId, s);
    const step = this.cfg.stepMs;
    this.scheduler.setTimeout(() => {
      if (s.phase !== 'opening') return; // abortada antes de abrir
      s.phase = 'awaiting_return';
      this.emit(s, { type: 'slot_opened', slotNumber });
      if (this.cfg.mode === 'auto') {
        this.scheduler.setTimeout(() => {
          if (s.phase !== 'awaiting_return') return;
          this.emitReturned(s);
          this.scheduler.setTimeout(() => this.emitClosed(s), step);
        }, step);
      }
    }, step);
  }

  private requestRelease(thing: string, cmd: StationCommand): void {
    const s = this.swaps.get(cmd.swapId);
    if (!s || s.thing !== thing || s.phase !== 'closed') {
      // Sem devolução registrada nesta estação: não libera (segurança física).
      this.log({ msg: 'liberacao_recusada', swapId: cmd.swapId, phase: s?.phase ?? 'desconhecida' });
      return;
    }
    s.serialHint = cmd.serialHint;
    s.phase = 'release_requested';
    if (this.cfg.mode === 'auto') this.scheduler.setTimeout(() => this.emitReleased(s), this.cfg.stepMs);
  }

  private emitReturned(s: SimSwap): void {
    const span = this.cfg.returnPctMax - this.cfg.returnPctMin;
    const pct = this.cfg.returnPctMin + Math.floor(this.random() * (span + 1));
    const serial = s.expectedSerial ?? `SIM-RET-${Math.floor(this.random() * 1e6).toString().padStart(6, '0')}`;
    s.phase = 'returned';
    this.emit(s, { type: 'battery_returned', serial, pct });
  }

  private emitClosed(s: SimSwap): void {
    if (s.phase !== 'returned' && s.phase !== 'awaiting_return') return;
    const empty = s.phase === 'awaiting_return';
    s.phase = empty ? 'done' : 'closed';
    this.usedSlots.get(s.thing)?.delete(s.slotNumber);
    this.emit(s, { type: 'slot_closed' });
  }

  private emitReleased(s: SimSwap): void {
    if (s.phase !== 'release_requested') return;
    s.phase = 'done';
    this.emit(s, { type: 'battery_released', serial: s.serialHint ?? this.nextStockSerial(s.thing) });
  }

  private freeSlot(thing: string): number {
    const used = this.usedSlots.get(thing) ?? new Set<number>();
    this.usedSlots.set(thing, used);
    for (let n = 1; n <= this.cfg.slots; n++) {
      if (!used.has(n)) {
        used.add(n);
        return n;
      }
    }
    return 1 + Math.floor(this.random() * this.cfg.slots);
  }

  private nextStockSerial(thing: string): string {
    const n = (this.stock.get(thing) ?? 0) + 1;
    this.stock.set(thing, n);
    return `SIM-${stationIdOf(thing).slice(-4).toUpperCase()}-${String(n).padStart(3, '0')}`;
  }

  private emit(s: SimSwap, ev: Omit<StationEvent, 'swapId' | 'ts'>): void {
    const event: StationEvent = { ...ev, swapId: s.swapId, ts: new Date(this.now()).toISOString() };
    this.log({ msg: 'evento_publicado', swapId: s.swapId, type: ev.type, stationId: stationIdOf(s.thing) });
    this.publish(s.thing, event);
  }
}
