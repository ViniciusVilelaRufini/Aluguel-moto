import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { MAX_SPEED_KMH } from '../../../common/enums';
import { EV, GeofenceTransitionEvent, ZoneChangedEvent } from '../../../common/events';
import type { RedisStore } from '../../../redis/redis-store';
import type { Clock, TimerHandle } from '../clock';
import { effectiveZoneLimit } from '../speed-limit';
import type { GeofenceEngine, ZoneRef } from './geofence-engine';

export const GEOFENCE_COMMANDER = Symbol('GEOFENCE_COMMANDER');
export const RENTAL_LOOKUP = Symbol('RENTAL_LOOKUP');

export interface CommandContext {
  rentalId?: string;
  purpose: 'zone_speed_limit' | 'out_of_area';
}

/** Como o motor de cercas age sobre a moto (implementação: comandos de sistema via `CommandsService`, com AuditLog). */
export interface GeofenceCommander {
  setSpeedLimit(vehicleId: string, kmh: number, ctx: CommandContext): Promise<void>;
  safeLock(vehicleId: string, ctx: CommandContext): Promise<void>;
}

/** Aluguel em andamento (`active`/`paused`/`ending`) da moto, se houver. */
export interface RentalLookup {
  openRentalId(vehicleId: string): Promise<string | undefined>;
  invalidate(vehicleId?: string): void;
}

export interface PositionInput {
  vehicleId: string;
  thingName: string;
  lat: number;
  lng: number;
  ts: string;
}

interface VehicleZones {
  zones: ZoneRef[];
  appliedLimit?: number;
}

/**
 * Transições de cerca (ENTER/EXIT) a partir das posições, com as regras do produto:
 * - `reduced_speed`: ENTER → limite da zona; EXIT → menor limite das zonas que ainda contêm a moto, senão 32;
 * - fora da área = fora de **todas** as zonas `operation`: só então sai o EXIT de `operation` (alerta imediato e `zone.notice`
 *   pelos consumidores de `geofence.transition`); trocar de uma zona `operation` para outra é silencioso;
 * - com aluguel e fora da área (avaliado a cada posição, não só na transição) → bloqueio seguro após `OUT_OF_AREA_LOCK_MINUTES`,
 *   cancelado se a moto voltar antes. O prazo fica no Redis (`geofence:out-of-area:{vehicleId}`) e é rearmado depois de um reinício.
 * Estado por moto no Redis (`geofence:inside:{vehicleId}`), para um reinício não reemitir transições.
 */
export class GeofenceService {
  private readonly logger = new Logger('GeofenceService');
  private readonly byVehicle = new Map<string, VehicleZones>();
  private readonly limitByThing = new Map<string, number>();
  private readonly outOfArea = new Map<string, { handle: TimerHandle; rentalId: string }>();
  /** Motos cujo prazo persistido já foi conferido neste processo (evita um GET/DEL no Redis a cada posição). */
  private readonly outOfAreaChecked = new Set<string>();

  constructor(
    private readonly engine: GeofenceEngine,
    private readonly commander: GeofenceCommander,
    private readonly rentals: RentalLookup,
    private readonly events: EventEmitter2,
    private readonly clock: Clock,
    private readonly redis: RedisStore,
    private readonly opts: { outOfAreaLockMinutes: number },
  ) {}

  /** Limite em vigor pelas zonas (resolver do `unlock`). */
  effectiveLimit(thingName: string): number {
    return this.limitByThing.get(thingName) ?? MAX_SPEED_KMH;
  }

  async onZoneChanged(ev: ZoneChangedEvent): Promise<void> {
    await this.engine.sync(ev);
  }

  private key(vehicleId: string): string {
    return `geofence:inside:${vehicleId}`;
  }

  private async load(vehicleId: string): Promise<VehicleZones | undefined> {
    const mem = this.byVehicle.get(vehicleId);
    if (mem) return mem;
    const raw = await this.redis.get(this.key(vehicleId)).catch(() => null);
    if (!raw) return undefined;
    try {
      const v = JSON.parse(raw) as VehicleZones;
      this.byVehicle.set(vehicleId, v);
      return v;
    } catch {
      return undefined;
    }
  }

  private async save(vehicleId: string, v: VehicleZones): Promise<void> {
    this.byVehicle.set(vehicleId, v);
    await this.redis.set(this.key(vehicleId), JSON.stringify(v)).catch(() => undefined);
  }

  async onPosition(p: PositionInput): Promise<void> {
    await this.engine.updatePosition(p.thingName, p.lat, p.lng, p.ts).catch((err) =>
      this.logger.warn({ msg: 'geofence_tracker_update_failed', vehicleId: p.vehicleId, error: (err as Error).message }),
    );
    const zones = await this.engine.containing(p.lat, p.lng);
    const prev = await this.load(p.vehicleId);
    const prevZones = prev?.zones ?? [];
    const prevIds = new Set(prevZones.map((z) => z.id));
    const nowIds = new Set(zones.map((z) => z.id));
    const opBefore = prevZones.some((z) => z.type === 'operation');
    const opNow = zones.some((z) => z.type === 'operation');
    // Zonas operation: só a passagem "dentro de alguma" ↔ "fora de todas" conta como transição.
    // Uma única transição de operation mesmo com zonas sobrepostas deixadas/alcançadas na mesma posição.
    const exits = onlyOneOperation(prevZones.filter((z) => !nowIds.has(z.id) && (z.type !== 'operation' || (opBefore && !opNow))));
    const enters = onlyOneOperation(zones.filter((z) => !prevIds.has(z.id) && (z.type !== 'operation' || (!opBefore && opNow))));

    const reduced = zones.filter((z) => z.type === 'reduced_speed' && z.speedLimitKmh !== null);
    const limit = effectiveZoneLimit(reduced.map((z) => z.speedLimitKmh!));
    this.limitByThing.set(p.thingName, limit);

    const state: VehicleZones = { zones, appliedLimit: prev?.appliedLimit };
    const zonesChanged = prevIds.size !== nowIds.size || [...nowIds].some((id) => !prevIds.has(id));
    if (!exits.length && !enters.length) {
      if (!prev || zonesChanged) await this.save(p.vehicleId, state);
      await this.evaluateOutOfArea(p.vehicleId, opNow);
      return;
    }

    const rentalId = await this.rentals.openRentalId(p.vehicleId);
    for (const z of exits) this.emit(p, z, 'EXIT', rentalId);
    for (const z of enters) this.emit(p, z, 'ENTER', rentalId);

    // Regra de velocidade: só quando o conjunto de zonas de velocidade reduzida mudou.
    const reducedChanged = [...exits, ...enters].some((z) => z.type === 'reduced_speed');
    if (reducedChanged && state.appliedLimit !== limit) {
      state.appliedLimit = limit;
      await this.commander
        .setSpeedLimit(p.vehicleId, limit, { rentalId, purpose: 'zone_speed_limit' })
        .catch((err) => this.logger.error({ msg: 'zone_speed_limit_failed', vehicleId: p.vehicleId, error: (err as Error).message }));
    }
    await this.save(p.vehicleId, state);

    await this.evaluateOutOfArea(p.vehicleId, opNow, rentalId);
  }

  /** A cada posição: com aluguel e fora de todas as zonas operation → arma (se ainda não armado); dentro → cancela. */
  private async evaluateOutOfArea(vehicleId: string, insideOperation: boolean, knownRentalId?: string): Promise<void> {
    if (insideOperation) {
      await this.cancelOutOfAreaLock(vehicleId);
      return;
    }
    const rentalId = knownRentalId ?? (await this.rentals.openRentalId(vehicleId));
    const armed = this.outOfArea.get(vehicleId);
    if (armed && armed.rentalId === rentalId) return;
    // Armado para outro aluguel (ou nenhum): o prazo de A nunca vale para B.
    if (armed) await this.cancelOutOfAreaLock(vehicleId, true);
    // Nada armado e sem aluguel: no máximo um DEL por moto e processo (prazo órfão de antes de um reinício).
    else if (!rentalId) await this.cancelOutOfAreaLock(vehicleId);
    if (!rentalId) return;
    await this.armOutOfAreaLock(vehicleId, rentalId);
  }

  /** `rental.changed` com o aluguel encerrado: desarma e apaga o prazo persistido. */
  async onRentalEnded(vehicleId: string): Promise<void> {
    this.rentals.invalidate(vehicleId);
    await this.cancelOutOfAreaLock(vehicleId, true);
  }

  private emit(p: PositionInput, z: ZoneRef, transition: 'ENTER' | 'EXIT', rentalId?: string): void {
    const ev: GeofenceTransitionEvent = { vehicleId: p.vehicleId, zoneId: z.id, zoneType: z.type, transition, ts: p.ts };
    if (rentalId) ev.rentalId = rentalId;
    if (z.speedLimitKmh !== null && z.speedLimitKmh !== undefined) ev.speedLimitKmh = z.speedLimitKmh;
    this.logger.log({ msg: 'geofence_transition', vehicleId: p.vehicleId, zoneId: z.id, zoneType: z.type, transition });
    this.events.emit(EV.GEOFENCE_TRANSITION, sortKeys(ev));
  }

  private outOfAreaKey(vehicleId: string): string {
    return `geofence:out-of-area:${vehicleId}`;
  }

  /**
   * Arma com o prazo persistido do **mesmo aluguel** (reinício) ou com um prazo novo de `OUT_OF_AREA_LOCK_MINUTES`.
   * Persistido como `{ rentalId, deadline }` com TTL (prazo + 1 h), para não sobrar chave órfã.
   */
  private async armOutOfAreaLock(vehicleId: string, rentalId: string): Promise<void> {
    const now = this.clock.now();
    const raw = await this.redis.get(this.outOfAreaKey(vehicleId)).catch(() => null);
    let deadline = NaN;
    try {
      const stored = raw ? (JSON.parse(raw) as { rentalId?: string; deadline?: number }) : null;
      if (stored && stored.rentalId === rentalId && Number.isFinite(stored.deadline)) deadline = stored.deadline!;
    } catch {
      /* formato antigo/corrompido: prazo novo */
    }
    if (!Number.isFinite(deadline)) {
      deadline = now + this.opts.outOfAreaLockMinutes * 60_000;
      await this.redis.set(this.outOfAreaKey(vehicleId), JSON.stringify({ rentalId, deadline }), deadline - now + OUT_OF_AREA_KEY_GRACE_MS).catch(() => undefined);
    }
    this.outOfAreaChecked.add(vehicleId);
    const handle = this.clock.setTimeout(() => this.fireOutOfAreaLock(vehicleId, rentalId), Math.max(0, deadline - now));
    this.outOfArea.set(vehicleId, { handle, rentalId });
    this.logger.log({ msg: 'out_of_area_lock_armed', vehicleId, rentalId, inMs: Math.max(0, deadline - now) });
  }

  private async cancelOutOfAreaLock(vehicleId: string, force = false): Promise<void> {
    const armed = this.outOfArea.get(vehicleId);
    if (armed) {
      this.clock.clearTimeout(armed.handle);
      this.outOfArea.delete(vehicleId);
      this.logger.log({ msg: 'out_of_area_lock_canceled', vehicleId, rentalId: armed.rentalId });
    } else if (!force && this.outOfAreaChecked.has(vehicleId)) {
      return;
    }
    this.outOfAreaChecked.add(vehicleId);
    await this.redis.del(this.outOfAreaKey(vehicleId)).catch(() => undefined);
  }

  private async fireOutOfAreaLock(vehicleId: string, armedRentalId: string): Promise<void> {
    if (this.outOfArea.get(vehicleId)?.rentalId !== armedRentalId) return;
    this.outOfArea.delete(vehicleId);
    await this.redis.del(this.outOfAreaKey(vehicleId)).catch(() => undefined);
    const state = await this.load(vehicleId);
    if (state?.zones.some((z) => z.type === 'operation')) return;
    this.rentals.invalidate(vehicleId);
    const rentalId = await this.rentals.openRentalId(vehicleId);
    // Só bloqueia pelo aluguel que armou o prazo.
    if (!rentalId || rentalId !== armedRentalId) return;
    this.logger.warn({ msg: 'out_of_area_safe_lock', vehicleId, rentalId });
    await this.commander
      .safeLock(vehicleId, { rentalId, purpose: 'out_of_area' })
      .catch((err) => this.logger.error({ msg: 'out_of_area_lock_failed', vehicleId, error: (err as Error).message }));
  }

  /** Encerramento do módulo. */
  stop(): void {
    for (const a of this.outOfArea.values()) this.clock.clearTimeout(a.handle);
    this.outOfArea.clear();
  }
}

/** Folga do TTL do prazo persistido além do próprio prazo. */
const OUT_OF_AREA_KEY_GRACE_MS = 60 * 60_000;

function onlyOneOperation(zones: ZoneRef[]): ZoneRef[] {
  let seen = false;
  return zones.filter((z) => {
    if (z.type !== 'operation') return true;
    if (seen) return false;
    seen = true;
    return true;
  });
}

/** Ordem estável das chaves no payload (vehicleId, rentalId, zoneId, zoneType, speedLimitKmh, transition, ts). */
function sortKeys(ev: GeofenceTransitionEvent): GeofenceTransitionEvent {
  const out: Record<string, unknown> = { vehicleId: ev.vehicleId };
  if (ev.rentalId) out.rentalId = ev.rentalId;
  out.zoneId = ev.zoneId;
  out.zoneType = ev.zoneType;
  if (ev.speedLimitKmh !== undefined) out.speedLimitKmh = ev.speedLimitKmh;
  out.transition = ev.transition;
  out.ts = ev.ts;
  return out as unknown as GeofenceTransitionEvent;
}
