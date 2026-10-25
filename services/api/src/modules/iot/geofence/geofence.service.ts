import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { MAX_SPEED_KMH } from '../../../common/enums';
import { EV, GeofenceTransitionEvent, ZoneChangedEvent } from '../../../common/events';
import { LockUnavailableError, outsideLock, RedisMutex } from '../../../redis/redis-mutex';
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
  appliedLimit?: number;
  /**
   * Prazo do bloqueio por "fora da área" do aluguel atual (lacunas T5): fica no mesmo estado lido a cada posição, então qualquer
   * instância sabe se a moto continua fora desde aquele prazo; voltar para a área apaga.
   */
  outOfArea?: { rentalId: string; deadline: number };
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

/** Folga do TTL do prazo persistido além do próprio prazo. */
const OUT_OF_AREA_KEY_GRACE_MS = 60 * 60_000;
/** Índice das motos com prazo de "fora da área" armado (varredura). */
const OUT_OF_AREA_INDEX = 'geofence:out-of-area:index';

/**
 * Transições de cerca (ENTER/EXIT) a partir das posições, com as regras do produto:
 * - `reduced_speed`: ENTER → limite da zona; EXIT → menor limite das zonas que ainda contêm a moto, senão 32;
 * - fora da área = fora de **todas** as zonas `operation`: só então sai o EXIT de `operation` (alerta imediato e `zone.notice`
 *   pelos consumidores de `geofence.transition`); trocar de uma zona `operation` para outra é silencioso;
 * - com aluguel e fora da área (avaliado a cada posição, não só na transição) → bloqueio seguro após `OUT_OF_AREA_LOCK_MINUTES`,
 *   cancelado se a moto voltar antes. O prazo fica no estado da moto e em `geofence:out-of-area:{vehicleId}` (índice
 *   `geofence:out-of-area:index`): qualquer instância cumpre o prazo (timer local ou varredura) e só uma dispara (consome a chave).
 *
 * Estado por moto no Redis (`geofence:inside:{vehicleId}`), lido a cada posição e alterado sob o lock da moto
 * (`geofence:lock:{vehicleId}`): com várias instâncias (lacunas T5), posições da mesma moto processadas em instâncias diferentes
 * não reemitem nem perdem transições, e um deploy não reemite nada. Limite em vigor por moto em `geofence:limit:{thingName}`.
 */
export class GeofenceService {
  private readonly logger = new Logger('GeofenceService');
  /** Cópia local do estado: fallback quando o Redis falha e candidatos do `zone.changed` vistos por este processo. */
  private readonly byVehicle = new Map<string, VehicleZones>();
  private readonly limitByThing = new Map<string, number>();
  /** Última posição vista por este processo (só memória; depois de um reinício vale a posição gravada no Postgres). */
  private readonly lastPosition = new Map<string, VehiclePosition>();
  /** Timers locais do prazo de "fora da área" (a varredura cobre os perdidos e os de outras instâncias). */
  private readonly outOfArea = new Map<string, { handle: TimerHandle; rentalId: string; deadline: number }>();
  private readonly mutex: RedisMutex;

  constructor(
    private readonly engine: GeofenceEngine,
    private readonly commander: GeofenceCommander,
    private readonly rentals: RentalLookup,
    private readonly events: EventEmitter2,
    private readonly clock: Clock,
    private readonly redis: RedisStore,
    private readonly opts: { outOfAreaLockMinutes: number },
    private readonly positions?: ZoneVehiclePositions,
  ) {
    // O lock cobre a avaliação inteira, inclusive o comando de limite da zona (que espera a confirmação por alguns segundos).
    this.mutex = new RedisMutex(redis, { ttlMs: 30_000, waitMs: 10_000 });
  }

  /**
   * Limite em vigor pelas zonas (resolver do `unlock` e do teto dos comandos manuais), gravado por qualquer instância.
   * Redis fora do ar → a cópia local; sem nenhuma → 32 (nenhuma zona conhecida).
   */
  async effectiveLimit(thingName: string): Promise<number> {
    try {
      const raw = await this.redis.get(this.limitKey(thingName));
      const n = raw === null ? NaN : Number(raw);
      if (Number.isInteger(n) && n >= 0 && n <= MAX_SPEED_KMH) return n;
    } catch {
      /* cópia local abaixo */
    }
    return this.limitByThing.get(thingName) ?? MAX_SPEED_KMH;
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

  private lockKey(vehicleId: string): string {
    return `geofence:lock:${vehicleId}`;
  }

  private limitKey(thingName: string): string {
    return `geofence:limit:${thingName}`;
  }

  private outOfAreaKey(vehicleId: string): string {
    return `geofence:out-of-area:${vehicleId}`;
  }

  /** Estado da moto no Redis (fonte da verdade entre instâncias); Redis fora do ar → a cópia local. */
  private async load(vehicleId: string): Promise<VehicleZones | undefined> {
    let raw: string | null;
    try {
      raw = await this.redis.get(this.key(vehicleId));
    } catch {
      return this.byVehicle.get(vehicleId);
    }
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
    await this.withVehicleLock(p.vehicleId, () => this.evaluateLocked(p));
  }

  /**
   * Lock da moto no Redis; se ele não puder ser obtido (Redis fora do ar, ou preso), degrada para a fila local e avalia com o
   * estado local (lacunas T5, fix 1): limite de zona nunca deixa de ser aplicado por falta do Redis (falhar fechado numa
   * redução seria falhar aberto). Erro dentro da avaliação propaga como veio.
   */
  private async withVehicleLock<T>(vehicleId: string, fn: () => Promise<T>): Promise<T> {
    const key = this.lockKey(vehicleId);
    try {
      return await this.mutex.run(key, fn);
    } catch (err) {
      if (!(err instanceof LockUnavailableError)) throw err;
      this.warnDegraded(err.message);
      return this.mutex.runLocal(key, fn);
    }
  }

  private degradedSince?: number;
  /** Um aviso por minuto enquanto o lock do Redis estiver indisponível (sem inundar o log). */
  private warnDegraded(error: string): void {
    const now = Date.now();
    if (this.degradedSince !== undefined && now - this.degradedSince < 60_000) return;
    this.degradedSince = now;
    this.logger.warn({ msg: 'geofence_lock_degraded_local', error });
  }

  private async evaluateLocked(p: PositionInput): Promise<void> {
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

    const reduced = zones.filter((z) => z.type === 'reduced_speed' && z.speedLimitKmh !== null);
    const limit = effectiveZoneLimit(reduced.map((z) => z.speedLimitKmh!));
    // Sempre grava (sob o lock da moto): o valor compartilhado é a fonte da verdade do `unlock` e do teto dos comandos manuais.
    // Comparar com a cópia desta instância deixava o Redis velho quando outra instância tinha gravado outro limite (revisão C1).
    this.limitByThing.set(p.thingName, limit);
    await this.redis.set(this.limitKey(p.thingName), String(limit)).catch(() => undefined);

    const state: VehicleZones = { zones, appliedLimit: prev?.appliedLimit, outOfArea: prev?.outOfArea };
    const zonesChanged = prevIds.size !== nowIds.size || [...nowIds].some((id) => !prevIds.has(id));
    // Regra de velocidade: o conjunto de zonas de velocidade reduzida mudou, ou o limite efetivo mudou com as mesmas zonas
    // (QA-03: cerca editada de 20 para 6 com a moto dentro). Sem limite aplicado registrado, vale 32 (nada a corrigir).
    const reducedChanged = [...exits, ...enters].some((z) => z.type === 'reduced_speed');
    const applied = reducedChanged ? state.appliedLimit : (state.appliedLimit ?? MAX_SPEED_KMH);
    const limitChanged = applied !== limit;
    if (!exits.length && !enters.length && !limitChanged) {
      const areaChanged = await this.evaluateOutOfArea(p.vehicleId, state, opNow);
      if (!prev || zonesChanged || areaChanged) await this.save(p.vehicleId, state);
      return;
    }

    const rentalId = await this.rentals.openRentalId(p.vehicleId);
    for (const z of exits) this.emit(p, z, 'EXIT', rentalId);
    for (const z of enters) this.emit(p, z, 'ENTER', rentalId);

    if (limitChanged) {
      state.appliedLimit = limit;
      await this.commander
        .setSpeedLimit(p.vehicleId, limit, { rentalId, purpose: 'zone_speed_limit' })
        .catch((err) => this.logger.error({ msg: 'zone_speed_limit_failed', vehicleId: p.vehicleId, error: (err as Error).message }));
    }
    await this.evaluateOutOfArea(p.vehicleId, state, opNow, rentalId);
    await this.save(p.vehicleId, state);
  }

  /**
   * A cada posição (sob o lock da moto): com aluguel e fora de todas as zonas operation → arma (prazo novo, ou o já guardado no
   * estado para o mesmo aluguel); dentro, ou sem aluguel → desarma. Altera `state.outOfArea` e devolve se mudou (quem chama grava).
   */
  private async evaluateOutOfArea(vehicleId: string, state: VehicleZones, insideOperation: boolean, knownRentalId?: string): Promise<boolean> {
    const armed = state.outOfArea;
    if (insideOperation) {
      if (!armed) return false;
      await this.disarm(vehicleId, state, 'back_inside');
      return true;
    }
    const rentalId = knownRentalId ?? (await this.rentals.openRentalId(vehicleId));
    if (armed && armed.rentalId === rentalId) {
      // Mesmo aluguel, ainda fora: vale o prazo guardado (deploy, outra instância); garante o timer local.
      this.armLocalTimer(vehicleId, armed.rentalId, armed.deadline);
      return false;
    }
    // Armado para outro aluguel (ou nenhum): o prazo de A nunca vale para B.
    if (armed) await this.disarm(vehicleId, state, 'rental_changed');
    if (!rentalId) return !!armed;
    const now = this.clock.now();
    const deadline = now + this.opts.outOfAreaLockMinutes * 60_000;
    state.outOfArea = { rentalId, deadline };
    await this.redis.set(this.outOfAreaKey(vehicleId), JSON.stringify({ rentalId, deadline }), deadline - now + OUT_OF_AREA_KEY_GRACE_MS).catch(() => undefined);
    await this.redis.sadd(OUT_OF_AREA_INDEX, vehicleId).catch(() => undefined);
    this.armLocalTimer(vehicleId, rentalId, deadline);
    this.logger.log({ msg: 'out_of_area_lock_armed', vehicleId, rentalId, inMs: deadline - now });
    return true;
  }

  private async disarm(vehicleId: string, state: VehicleZones, why: string): Promise<void> {
    const armed = state.outOfArea;
    state.outOfArea = undefined;
    this.clearLocalTimer(vehicleId);
    await this.redis.del(this.outOfAreaKey(vehicleId)).catch(() => undefined);
    await this.redis.srem(OUT_OF_AREA_INDEX, vehicleId).catch(() => undefined);
    if (armed) this.logger.log({ msg: 'out_of_area_lock_canceled', vehicleId, rentalId: armed.rentalId, why });
  }

  /** `rental.changed` com o aluguel encerrado: desarma e apaga o prazo persistido. */
  async onRentalEnded(vehicleId: string): Promise<void> {
    this.rentals.invalidate(vehicleId);
    await this.withVehicleLock(vehicleId, async () => {
      const state = await this.load(vehicleId);
      if (state?.outOfArea) {
        await this.disarm(vehicleId, state, 'rental_ended');
        await this.save(vehicleId, state);
        return;
      }
      this.clearLocalTimer(vehicleId);
      await this.redis.del(this.outOfAreaKey(vehicleId)).catch(() => undefined);
      await this.redis.srem(OUT_OF_AREA_INDEX, vehicleId).catch(() => undefined);
    });
  }

  private emit(p: PositionInput, z: ZoneRef, transition: 'ENTER' | 'EXIT', rentalId?: string): void {
    const ev: GeofenceTransitionEvent = { vehicleId: p.vehicleId, zoneId: z.id, zoneType: z.type, transition, ts: p.ts };
    if (rentalId) ev.rentalId = rentalId;
    if (z.speedLimitKmh !== null && z.speedLimitKmh !== undefined) ev.speedLimitKmh = z.speedLimitKmh;
    this.logger.log({ msg: 'geofence_transition', vehicleId: p.vehicleId, zoneId: z.id, zoneType: z.type, transition });
    this.events.emit(EV.GEOFENCE_TRANSITION, sortKeys(ev));
  }

  private armLocalTimer(vehicleId: string, rentalId: string, deadline: number): void {
    const cur = this.outOfArea.get(vehicleId);
    if (cur && cur.rentalId === rentalId && cur.deadline === deadline) return;
    this.clearLocalTimer(vehicleId);
    const handle = this.clock.setTimeout(() => outsideLock(() => this.fireOutOfAreaLock(vehicleId)), Math.max(0, deadline - this.clock.now()));
    this.outOfArea.set(vehicleId, { handle, rentalId, deadline });
  }

  private clearLocalTimer(vehicleId: string): void {
    const cur = this.outOfArea.get(vehicleId);
    if (cur) this.clock.clearTimeout(cur.handle);
    this.outOfArea.delete(vehicleId);
  }

  /**
   * Prazos vencidos de qualquer instância (timer perdido num deploy, moto parada sem posição nova), a cada ~15 s. Quem consome
   * a chave do prazo é quem dispara; as outras desistem.
   */
  async sweepOutOfArea(): Promise<void> {
    const now = this.clock.now();
    for (const vehicleId of await this.redis.smembers(OUT_OF_AREA_INDEX)) {
      const raw = await this.redis.get(this.outOfAreaKey(vehicleId));
      if (!raw) {
        await this.redis.srem(OUT_OF_AREA_INDEX, vehicleId);
        continue;
      }
      const stored = parseDeadline(raw);
      if (stored && stored.deadline <= now) await this.fireOutOfAreaLock(vehicleId);
    }
  }

  /**
   * Prazo vencido: consome a chave do prazo (só uma instância passa daqui), confere no estado compartilhado que a moto continua
   * fora da área com o mesmo aluguel e o mesmo prazo, e só então pede o bloqueio seguro (a rampa nunca corta em movimento).
   * Voltou para a área, aluguel trocado/encerrado, prazo rearmado ou já disparado por outra instância → nada.
   */
  private async fireOutOfAreaLock(vehicleId: string): Promise<void> {
    const local = this.outOfArea.get(vehicleId);
    this.outOfArea.delete(vehicleId);
    const armedRentalId = await this.withVehicleLock(vehicleId, async (): Promise<string | null> => {
      let raw: string | null;
      try {
        raw = await this.redis.get(this.outOfAreaKey(vehicleId));
      } catch {
        // Redis fora: decide pelo estado local (o bloqueio seguro reduz a potência; outra instância que também dispare só repete o pedido).
        const state = this.byVehicle.get(vehicleId);
        if (!local || !state || state.zones.some((z) => z.type === 'operation')) return null;
        if (state.outOfArea?.rentalId !== local.rentalId || state.outOfArea.deadline !== local.deadline) return null;
        state.outOfArea = undefined;
        return local.rentalId;
      }
      const stored = raw ? parseDeadline(raw) : null;
      if (!raw || !stored) return null;
      if (stored.deadline > this.clock.now()) {
        this.armLocalTimer(vehicleId, stored.rentalId, stored.deadline); // prazo rearmado depois deste timer
        return null;
      }
      if (!(await this.redis.delIfEquals(this.outOfAreaKey(vehicleId), raw).catch(() => false))) return null;
      await this.redis.srem(OUT_OF_AREA_INDEX, vehicleId).catch(() => undefined);
      const state = await this.load(vehicleId);
      if (!state || state.zones.some((z) => z.type === 'operation')) return null;
      if (state.outOfArea?.rentalId !== stored.rentalId || state.outOfArea.deadline !== stored.deadline) return null;
      state.outOfArea = undefined;
      await this.save(vehicleId, state);
      return stored.rentalId;
    });
    if (!armedRentalId) return;
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

function parseDeadline(raw: string): { rentalId: string; deadline: number } | null {
  try {
    const v = JSON.parse(raw) as { rentalId?: unknown; deadline?: unknown };
    return typeof v.rentalId === 'string' && typeof v.deadline === 'number' && Number.isFinite(v.deadline) ? { rentalId: v.rentalId, deadline: v.deadline } : null;
  } catch {
    return null;
  }
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
