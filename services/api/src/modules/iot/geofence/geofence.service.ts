import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { MAX_SPEED_KMH } from '../../../common/enums';
import { EV, GeofenceTransitionEvent, ZoneChangedEvent } from '../../../common/events';
import { LockUnavailableError, outsideLock, RedisMutex } from '../../../redis/redis-mutex';
import type { RedisStore } from '../../../redis/redis-store';
import type { Clock, TimerHandle } from '../clock';
import type { TrackerModeLookup } from '../tracker-mode';
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

/** Folga do TTL do prazo persistido além do próprio prazo. */
const OUT_OF_AREA_KEY_GRACE_MS = 60 * 60_000;
/** Índice das motos com prazo de "fora da área" armado (varredura). */
const OUT_OF_AREA_INDEX = 'geofence:out-of-area:index';
/**
 * Limite de falha fechada com posição conhecida e motor de cercas fora (auditoria): o de área de pedestres (6 km/h), o menor
 * limite positivo que uma zona impõe. Nunca 0 — publicado no unlock de uma moto em movimento cortaria o motor sem rampa.
 */
const ENGINE_FAILURE_FALLBACK_KMH = 6;

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
  /** Things cujo limite calculado por este processo não chegou ao Redis (o `effectiveLimit` usa a memória até gravar). */
  private readonly unsyncedLimit = new Set<string>();
  /** Things que receberam um limite de falha fechada (motor fora): a próxima avaliação reenvia o limite real. */
  private readonly forceResend = new Set<string>();

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
    /** Tipo do rastreador (spec GT06 §10): `relay_only` não recebe comando de limite; o ENTER vira aviso. */
    private readonly modes?: TrackerModeLookup,
  ) {
    // O lock cobre a avaliação inteira, inclusive o comando de limite da zona (que espera a confirmação por alguns segundos).
    this.mutex = new RedisMutex(redis, { ttlMs: 30_000, waitMs: 10_000 });
  }

  /**
   * Limite em vigor pelas zonas (resolver do `unlock` e do teto dos comandos manuais), igual em todas as instâncias:
   * 1. o gravado por qualquer instância (`geofence:limit:{thingName}`), salvo se a escrita deste processo falhou (vale a memória);
   * 2. Redis fora ou sem valor: a cópia local; senão a última posição conhecida avaliada contra as zonas;
   * 3. posição conhecida e motor de cercas fora: falha fechada em 6 km/h (nunca 0); 32 só sem posição alguma
   *    (log `zone_limit_unknown`). Nunca devolve mais que 32.
   */
  async effectiveLimit(thingName: string): Promise<number> {
    const mem = this.limitByThing.get(thingName);
    if (mem !== undefined && this.unsyncedLimit.has(thingName)) return mem;
    try {
      const raw = await this.redis.get(this.limitKey(thingName));
      const n = raw === null ? NaN : Number(raw);
      if (Number.isInteger(n) && n >= 0 && n <= MAX_SPEED_KMH) return n;
    } catch {
      /* cópia local abaixo */
    }
    if (mem !== undefined) return mem;
    const position = await this.knownPosition(thingName);
    if (!position) {
      this.logger.warn({ msg: 'zone_limit_unknown', thingName });
      return MAX_SPEED_KMH;
    }
    try {
      return zoneLimitOf(await this.engine.containing(position.lat, position.lng));
    } catch (err) {
      // Posição conhecida mas motor de cercas fora: zonas guardadas neste processo, se houver; senão o mais restritivo positivo.
      const stored = position.vehicleId ? this.byVehicle.get(position.vehicleId)?.zones : undefined;
      const limit = stored ? zoneLimitOf(stored) : ENGINE_FAILURE_FALLBACK_KMH;
      this.forceResend.add(thingName);
      this.logger.warn({ msg: 'zone_limit_engine_failed', thingName, limit, error: (err as Error).message });
      return limit;
    }
  }

  private async knownPosition(thingName: string): Promise<{ lat: number; lng: number; vehicleId?: string } | null> {
    for (const p of this.lastPosition.values()) if (p.thingName === thingName) return p;
    return (await this.live?.lastKnownPosition(thingName).catch(() => null)) ?? null;
  }

  /**
   * `zone.changed` → ressincroniza o motor e reavalia na hora as motos afetadas (QA-03): as que este processo viu dentro da
   * zona e as que, pela posição conhecida, estão dentro da geometria nova. Assim uma ciclovia que vira 6 km/h, ou uma cerca
   * que passa a cobrir uma moto parada, aplica o limite sem esperar a próxima posição. O limite enviado é sempre o efetivo
   * (menor das zonas que contêm a moto, nunca acima de 32).
   */
  async onZoneChanged(ev: ZoneChangedEvent): Promise<void> {
    await this.engine.sync(ev);
    const candidates = await this.zoneCandidates(ev);
    const ts = new Date(this.clock.now()).toISOString();
    for (const c of candidates.values()) {
      await this.evaluate({ ...c, ts }, false).catch((err) =>
        this.logger.error({ msg: 'zone_change_reevaluate_failed', vehicleId: c.vehicleId, zoneId: ev.zoneId, error: (err as Error).message }),
      );
    }
    if (candidates.size) this.logger.log({ msg: 'zone_change_reevaluated', zoneId: ev.zoneId, vehicles: candidates.size });
  }

  /**
   * Revisão final item 4: `zone.changed` vindo de outra instância. A origem já sincronizou o motor, reavaliou e mandou os
   * comandos (uma vez no cluster); aqui só se descarta o estado em memória das motos afetadas, para a próxima avaliação e o
   * `effectiveLimit` lerem o estado novo do Redis.
   */
  async onRemoteZoneChanged(ev: ZoneChangedEvent): Promise<void> {
    const candidates = await this.zoneCandidates(ev);
    for (const c of candidates.values()) {
      this.byVehicle.delete(c.vehicleId);
      // Um limite deste processo ainda não gravado continua valendo (falha fechada) até a próxima avaliação gravar.
      if (!this.unsyncedLimit.has(c.thingName)) this.limitByThing.delete(c.thingName);
    }
    if (candidates.size) this.logger.log({ msg: 'zone_change_invalidated', zoneId: ev.zoneId, vehicles: candidates.size });
  }

  /** Motos afetadas por uma zona alterada: as vistas dentro dela por este processo e as que a posição conhecida põe dentro. */
  private async zoneCandidates(ev: ZoneChangedEvent): Promise<Map<string, VehiclePosition>> {
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
    return candidates;
  }

  /**
   * Limite das zonas para subir o limite (unlock, teto dos comandos manuais) — fix 2, N3: com a posição atual, reavalia a zona
   * (PostGIS) em vez de confiar só em `geofence:limit` (que pode ter perdido uma escrita durante uma falha do Redis). Sem posição
   * ou com o motor indisponível, o valor gravado.
   */
  async verifiedLimit(thingName: string, position?: { lat: number; lng: number }): Promise<number> {
    if (!position) return this.effectiveLimit(thingName);
    const zones = await this.engine.containing(position.lat, position.lng).catch(() => null);
    if (!zones) return this.effectiveLimit(thingName);
    return zoneLimitOf(zones);
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

    const limit = zoneLimitOf(zones);
    // Rastreador só relé: o limite da zona continua gravado (unlock, monitor de velocidade), mas não vira comando. Erro de leitura
    // = speed_control (aplicar o limite nunca falha aberto).
    const relayOnly = (await this.modes?.byVehicle(p.vehicleId).catch(() => 'speed_control' as const)) === 'relay_only';
    // Sempre grava (sob o lock da moto) e antes do comando de zona: o valor compartilhado é a fonte da verdade do `unlock` e do
    // teto dos comandos manuais (comparar com a cópia desta instância deixava o Redis velho — revisão C1), e o teto QA-01 do
    // gateway já vê o limite novo ao sair de uma zona mais restritiva (auditoria). Escrita perdida → a memória vale.
    this.limitByThing.set(p.thingName, limit);
    try {
      await this.redis.set(this.limitKey(p.thingName), String(limit));
      this.unsyncedLimit.delete(p.thingName);
    } catch (err) {
      this.unsyncedLimit.add(p.thingName);
      this.logger.warn({ msg: 'zone_limit_persist_failed', vehicleId: p.vehicleId, error: (err as Error).message });
    }

    const state: VehicleZones = { zones, appliedLimit: prev?.appliedLimit, outOfArea: prev?.outOfArea };
    const zonesChanged = prevIds.size !== nowIds.size || [...nowIds].some((id) => !prevIds.has(id));
    // Regra de velocidade: o conjunto de zonas de velocidade reduzida mudou, ou o limite efetivo mudou com as mesmas zonas
    // (QA-03: cerca editada de 20 para 6 com a moto dentro). Sem limite aplicado registrado, vale 32 (nada a corrigir).
    const reducedChanged = [...exits, ...enters].some((z) => z.type === 'reduced_speed');
    const applied = reducedChanged ? state.appliedLimit : (state.appliedLimit ?? MAX_SPEED_KMH);
    // Auditoria, item 1: um desired acima da zona (ex.: unlock com limite antigo, em outra instância) é corrigido mesmo com
    // `appliedLimit` igual. Abaixo da zona (limite manual menor, rampa do bloqueio, hold em 0) fica como está.
    const desired = relayOnly ? null : await this.live?.desiredLimit(p.thingName).catch(() => null);
    const desiredAbove = desired !== undefined && desired !== null && desired > limit;
    // Depois de um limite de falha fechada (motor fora, nesta ou noutra instância): manda o limite real. Noutra instância isso
    // aparece como primeira avaliação (sem estado) com um desired conhecido diferente da zona; sem desired conhecido não força.
    const forced = this.forceResend.delete(p.thingName) || (!prev && desired !== undefined && desired !== null && desired !== limit);
    const limitChanged = applied !== limit || desiredAbove || forced;
    if (!exits.length && !enters.length && !limitChanged) {
      const areaChanged = await this.evaluateOutOfArea(p.vehicleId, state, opNow);
      if (!prev || zonesChanged || areaChanged) await this.save(p.vehicleId, state);
      return;
    }

    const rentalId = await this.rentals.openRentalId(p.vehicleId);
    for (const z of exits) this.emit(p, z, 'EXIT', rentalId, relayOnly);
    for (const z of enters) this.emit(p, z, 'ENTER', rentalId, relayOnly);

    if (limitChanged) {
      if (desiredAbove) this.logger.warn({ msg: 'zone_limit_resent_desired_above', vehicleId: p.vehicleId, desired, limit });
      state.appliedLimit = limit;
      // Estado gravado antes do comando (auditoria): outra instância que avalie a moto durante a confirmação já vê o limite novo.
      await this.save(p.vehicleId, state);
      if (relayOnly) {
        this.logger.log({ msg: 'zone_speed_limit_advisory', vehicleId: p.vehicleId, limit });
      } else {
        await this.commander
          .setSpeedLimit(p.vehicleId, limit, { rentalId, purpose: 'zone_speed_limit' })
          .catch((err) => this.logger.error({ msg: 'zone_speed_limit_failed', vehicleId: p.vehicleId, error: (err as Error).message }));
      }
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

  private emit(p: PositionInput, z: ZoneRef, transition: 'ENTER' | 'EXIT', rentalId?: string, relayOnly = false): void {
    const ev: GeofenceTransitionEvent = { vehicleId: p.vehicleId, zoneId: z.id, zoneType: z.type, transition, ts: p.ts };
    if (rentalId) ev.rentalId = rentalId;
    if (z.speedLimitKmh !== null && z.speedLimitKmh !== undefined) ev.speedLimitKmh = z.speedLimitKmh;
    if (relayOnly && z.type === 'reduced_speed') ev.advisory = true;
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
  if (ev.advisory) out.advisory = true;
  out.ts = ev.ts;
  return out as unknown as GeofenceTransitionEvent;
}
