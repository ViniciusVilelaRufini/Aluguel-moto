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
 * - saída de `operation` com aluguel → alerta imediato (consumidores de `geofence.transition`: alerts, realtime `zone.notice`)
 *   e bloqueio seguro após `OUT_OF_AREA_LOCK_MINUTES`, cancelado se a moto voltar antes.
 * Estado por moto no Redis (`geofence:inside:{vehicleId}`), para um reinício não reemitir transições.
 */
export class GeofenceService {
  private readonly logger = new Logger('GeofenceService');
  private readonly byVehicle = new Map<string, VehicleZones>();
  private readonly limitByThing = new Map<string, number>();
  private readonly outOfArea = new Map<string, TimerHandle>();

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
    const exits = prevZones.filter((z) => !nowIds.has(z.id));
    const enters = zones.filter((z) => !prevIds.has(z.id));

    const reduced = zones.filter((z) => z.type === 'reduced_speed' && z.speedLimitKmh !== null);
    const limit = effectiveZoneLimit(reduced.map((z) => z.speedLimitKmh!));
    this.limitByThing.set(p.thingName, limit);

    const state: VehicleZones = { zones, appliedLimit: prev?.appliedLimit };
    if (!exits.length && !enters.length) {
      if (!prev) await this.save(p.vehicleId, state);
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

    // Fora da área de operação.
    if (exits.some((z) => z.type === 'operation') && rentalId) this.scheduleOutOfAreaLock(p.vehicleId);
    if (enters.some((z) => z.type === 'operation')) this.cancelOutOfAreaLock(p.vehicleId);
  }

  private emit(p: PositionInput, z: ZoneRef, transition: 'ENTER' | 'EXIT', rentalId?: string): void {
    const ev: GeofenceTransitionEvent = { vehicleId: p.vehicleId, zoneId: z.id, zoneType: z.type, transition, ts: p.ts };
    if (rentalId) ev.rentalId = rentalId;
    if (z.speedLimitKmh !== null && z.speedLimitKmh !== undefined) ev.speedLimitKmh = z.speedLimitKmh;
    this.logger.log({ msg: 'geofence_transition', vehicleId: p.vehicleId, zoneId: z.id, zoneType: z.type, transition });
    this.events.emit(EV.GEOFENCE_TRANSITION, sortKeys(ev));
  }

  private scheduleOutOfAreaLock(vehicleId: string): void {
    if (this.outOfArea.has(vehicleId)) return;
    const handle = this.clock.setTimeout(() => this.fireOutOfAreaLock(vehicleId), this.opts.outOfAreaLockMinutes * 60_000);
    this.outOfArea.set(vehicleId, handle);
  }

  private cancelOutOfAreaLock(vehicleId: string): void {
    const h = this.outOfArea.get(vehicleId);
    if (!h) return;
    this.clock.clearTimeout(h);
    this.outOfArea.delete(vehicleId);
    this.logger.log({ msg: 'out_of_area_lock_canceled', vehicleId });
  }

  private async fireOutOfAreaLock(vehicleId: string): Promise<void> {
    this.outOfArea.delete(vehicleId);
    const state = await this.load(vehicleId);
    if (state?.zones.some((z) => z.type === 'operation')) return;
    this.rentals.invalidate(vehicleId);
    const rentalId = await this.rentals.openRentalId(vehicleId);
    if (!rentalId) return;
    this.logger.warn({ msg: 'out_of_area_safe_lock', vehicleId, rentalId });
    await this.commander
      .safeLock(vehicleId, { rentalId, purpose: 'out_of_area' })
      .catch((err) => this.logger.error({ msg: 'out_of_area_lock_failed', vehicleId, error: (err as Error).message }));
  }

  /** Encerramento do módulo. */
  stop(): void {
    for (const h of this.outOfArea.values()) this.clock.clearTimeout(h);
    this.outOfArea.clear();
  }
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
