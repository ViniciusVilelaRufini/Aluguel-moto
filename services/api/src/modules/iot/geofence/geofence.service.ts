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
  /** Aluguel aberto cujo titular mantém o consentimento de localização: só então o trajeto é gravado (QA-09). */
  trackingRentalId(vehicleId: string): Promise<string | undefined>;
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
  /** Último limite que o motor de cercas mandou (deduplicação). */
  appliedLimit?: number;
  /** Limite das zonas em que a moto está (menor `reduced_speed`, senão 32): fonte do `effectiveLimit` em qualquer task. */
  zoneLimit?: number;
}

/** Estado ao vivo compartilhado (implementação: `LiveStateStore`, sobre o Redis). */
export interface LiveVehicleSource {
  /** Última posição conhecida da moto (qualquer task), ou `null`. */
  lastKnownPosition(thingName: string): Promise<{ lat: number; lng: number } | null>;
  /** Último `limite_kmh` gravado no desired (qualquer task), ou `null` se desconhecido. */
  desiredLimit(thingName: string): Promise<number | null>;
}

/** Última posição conhecida de uma moto (QA-03: reavaliar as motos dentro de uma zona alterada). */
export interface VehiclePosition {
  vehicleId: string;
  thingName: string;
  lat: number;
  lng: number;
}

/** Motos cuja posição conhecida está dentro da geometria atual da zona (local: PostGIS sobre `Vehicle`). */
export interface ZoneVehiclePositions {
  vehiclesInZone(zoneId: string): Promise<VehiclePosition[]>;
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
  /** Última posição vista por este processo (só memória; depois de um reinício vale a posição gravada no Postgres). */
  private readonly lastPosition = new Map<string, VehiclePosition>();
  private readonly outOfArea = new Map<string, { handle: TimerHandle; rentalId: string }>();
  /** Motos cujo prazo persistido já foi conferido neste processo (evita um GET/DEL no Redis a cada posição). */
  private readonly outOfAreaChecked = new Set<string>();
  /** thingName → vehicleId já indexado no Redis por este processo. */
  private readonly indexed = new Map<string, string>();

  constructor(
    private readonly engine: GeofenceEngine,
    private readonly commander: GeofenceCommander,
    private readonly rentals: RentalLookup,
    private readonly events: EventEmitter2,
    private readonly clock: Clock,
    private readonly redis: RedisStore,
    private readonly opts: { outOfAreaLockMinutes: number },
    private readonly positions?: ZoneVehiclePositions,
    private readonly live?: LiveVehicleSource,
  ) {}

  /**
   * Limite em vigor pelas zonas (resolver do `unlock` e teto do limite manual), igual em todas as tasks da API:
   * 1. estado persistido pelo motor de cercas (`geofence:thing:{thingName}` → `geofence:inside:{vehicleId}`), de qualquer task;
   * 2. sem estado (ou Redis fora): o que este processo calculou; senão a última posição conhecida avaliada contra as zonas;
   * 3. sem posição alguma: 32 (teto legal), com log `zone_limit_unknown`.
   * Nunca devolve mais que 32.
   */
  async effectiveLimit(thingName: string): Promise<number> {
    const persisted = await this.persistedZoneLimit(thingName);
    if (persisted !== undefined) return persisted;
    const mem = this.limitByThing.get(thingName);
    if (mem !== undefined) return mem;
    const position = await this.knownPosition(thingName);
    if (position) {
      try {
        const zones = await this.engine.containing(position.lat, position.lng);
        return zoneLimitOf(zones);
      } catch (err) {
        this.logger.warn({ msg: 'zone_limit_lookup_failed', thingName, error: (err as Error).message });
      }
    }
    this.logger.warn({ msg: 'zone_limit_unknown', thingName });
    return MAX_SPEED_KMH;
  }

  private thingKey(thingName: string): string {
    return `geofence:thing:${thingName}`;
  }

  /** Limite das zonas gravado no Redis por qualquer task; `undefined` se não houver estado (ou erro ao ler). */
  private async persistedZoneLimit(thingName: string): Promise<number | undefined> {
    try {
      const vehicleId = await this.redis.get(this.thingKey(thingName));
      if (!vehicleId) return undefined;
      const raw = await this.redis.get(this.key(vehicleId));
      if (!raw) return undefined;
      const v = JSON.parse(raw) as VehicleZones;
      if (Number.isInteger(v.zoneLimit) && v.zoneLimit! >= 0) return Math.min(MAX_SPEED_KMH, v.zoneLimit!);
      // Estado gravado antes do campo `zoneLimit`: recalcula pelas zonas gravadas.
      return Array.isArray(v.zones) ? zoneLimitOf(v.zones) : undefined;
    } catch (err) {
      this.logger.warn({ msg: 'zone_limit_read_failed', thingName, error: (err as Error).message });
      return undefined;
    }
  }

  private async knownPosition(thingName: string): Promise<{ lat: number; lng: number } | null> {
    for (const p of this.lastPosition.values()) if (p.thingName === thingName) return p;
    return (await this.live?.lastKnownPosition(thingName).catch(() => null)) ?? null;
  }

  /** Índice thingName → vehicleId do estado persistido (uma escrita por moto e processo). */
  private async indexThing(thingName: string, vehicleId: string): Promise<void> {
    if (this.indexed.get(thingName) === vehicleId) return;
    try {
      await this.redis.set(this.thingKey(thingName), vehicleId);
      this.indexed.set(thingName, vehicleId);
    } catch {
      /* tenta de novo na próxima posição */
    }
  }

  /**
   * `zone.changed` → ressincroniza o motor e reavalia na hora as motos afetadas (QA-03): as que este processo viu dentro da
   * zona e as que, pela posição conhecida, estão dentro da geometria nova. Assim uma ciclovia que vira 6 km/h, ou uma cerca
   * que passa a cobrir uma moto parada, aplica o limite sem esperar a próxima posição. O limite enviado é sempre o efetivo
   * (menor das zonas que contêm a moto, nunca acima de 32).
   */
  async onZoneChanged(ev: ZoneChangedEvent): Promise<void> {
    await this.engine.sync(ev);
    const candidates = new Map<string, VehiclePosition>();
    for (const [vehicleId, st] of this.byVehicle) {
      const last = this.lastPosition.get(vehicleId);
      if (last && st.zones.some((z) => z.id === ev.zoneId)) candidates.set(vehicleId, last);
    }
    if (this.positions) {
      const inside = await this.positions.vehiclesInZone(ev.zoneId).catch((err) => {
        this.logger.warn({ msg: 'zone_vehicles_lookup_failed', zoneId: ev.zoneId, error: (err as Error).message });
        return [] as VehiclePosition[];
      });
      // A posição vista ao vivo por este processo é mais nova que a gravada no Postgres (a cada 30 s).
      for (const v of inside) if (!candidates.has(v.vehicleId)) candidates.set(v.vehicleId, this.lastPosition.get(v.vehicleId) ?? v);
    }
    const ts = new Date(this.clock.now()).toISOString();
    for (const c of candidates.values()) {
      await this.evaluate({ ...c, ts }, false).catch((err) =>
        this.logger.error({ msg: 'zone_change_reevaluate_failed', vehicleId: c.vehicleId, zoneId: ev.zoneId, error: (err as Error).message }),
      );
    }
    if (candidates.size) this.logger.log({ msg: 'zone_change_reevaluated', zoneId: ev.zoneId, vehicles: candidates.size });
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
    await this.evaluate(p, true);
  }

  /** `fromDevice`: posição nova do rastreador (vai ao tracker); `false` = reavaliação da última posição conhecida. */
  private async evaluate(p: PositionInput, fromDevice: boolean): Promise<void> {
    if (fromDevice) {
      await this.engine.updatePosition(p.thingName, p.lat, p.lng, p.ts).catch((err) =>
        this.logger.warn({ msg: 'geofence_tracker_update_failed', vehicleId: p.vehicleId, error: (err as Error).message }),
      );
    }
    this.lastPosition.set(p.vehicleId, { vehicleId: p.vehicleId, thingName: p.thingName, lat: p.lat, lng: p.lng });
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

    const limit = zoneLimitOf(zones);
    this.limitByThing.set(p.thingName, limit);
    await this.indexThing(p.thingName, p.vehicleId);

    const state: VehicleZones = { zones, appliedLimit: prev?.appliedLimit, zoneLimit: limit };
    const zonesChanged = prevIds.size !== nowIds.size || [...nowIds].some((id) => !prevIds.has(id));
    // Regra de velocidade: o conjunto de zonas de velocidade reduzida mudou, ou o limite efetivo mudou com as mesmas zonas
    // (QA-03: cerca editada de 20 para 6 com a moto dentro). Sem limite aplicado registrado, vale 32 (nada a corrigir).
    const reducedChanged = [...exits, ...enters].some((z) => z.type === 'reduced_speed');
    const applied = reducedChanged ? state.appliedLimit : (state.appliedLimit ?? MAX_SPEED_KMH);
    // Auditoria, item 1: um desired acima da zona (ex.: unlock com limite antigo, em outra task) é corrigido mesmo com
    // `appliedLimit` igual. Abaixo da zona (limite manual menor, rampa do bloqueio, hold em 0) fica como está.
    const desired = await this.live?.desiredLimit(p.thingName).catch(() => null);
    const desiredAbove = desired !== undefined && desired !== null && desired > limit;
    const limitChanged = applied !== limit || desiredAbove;
    if (!exits.length && !enters.length && !limitChanged) {
      if (!prev || zonesChanged || prev.zoneLimit !== limit) await this.save(p.vehicleId, state);
      await this.evaluateOutOfArea(p.vehicleId, opNow);
      return;
    }

    const rentalId = await this.rentals.openRentalId(p.vehicleId);
    for (const z of exits) this.emit(p, z, 'EXIT', rentalId);
    for (const z of enters) this.emit(p, z, 'ENTER', rentalId);

    if (limitChanged) {
      if (desiredAbove) this.logger.warn({ msg: 'zone_limit_resent_desired_above', vehicleId: p.vehicleId, desired, limit });
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

/** Limite das zonas que contêm a moto: menor `reduced_speed`, senão 32 (nunca acima de 32). */
function zoneLimitOf(zones: ZoneRef[]): number {
  return effectiveZoneLimit(zones.filter((z) => z.type === 'reduced_speed' && z.speedLimitKmh !== null && z.speedLimitKmh !== undefined).map((z) => z.speedLimitKmh!));
}

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
