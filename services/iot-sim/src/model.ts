import { distanceM, lerp, type LatLng } from './geo';
import type { Route } from './routes';

/** Contran 996/2023: autopropelido até 32 km/h. O firmware nunca passa disso. */
export const MAX_SPEED_KMH = 32;
/** Trava só abaixo disto. */
export const SAFE_LOCK_SPEED_KMH = 3;
/** Taxas do controlador (km/h por segundo). A redução é gradual: nunca corte brusco do motor. */
export const ACCEL_KMH_PER_S = 3;
export const DECEL_KMH_PER_S = 4;
/** Consumo simulado da bateria (pontos percentuais por km). */
const BATTERY_PCT_PER_KM = 1.5;
const CRITICAL_BATTERY_PCT = 10;

export type DeviceEventType = 'queda' | 'violacao' | 'bateria_critica' | 'movimento_sem_aluguel';

export interface DesiredDelta {
  travada?: boolean;
  limite_kmh?: number;
  modo_roubada?: boolean;
}

export interface ReportedChange {
  travada?: boolean;
  limite_kmh?: number;
  modo_roubada?: boolean;
}

export interface MotoInit {
  thingName: string;
  route: Route;
  /** Ponto inicial na rota (índice) e fração até o próximo. */
  startIndex?: number;
  startFraction?: number;
  cruiseKmh?: number;
  locked?: boolean;
  /** Há um "piloto" andando com a moto (destravada). */
  riding?: boolean;
  /** Ao destravar pelo shadow, o piloto simulado começa a andar. */
  rideOnUnlock?: boolean;
  batteryPct?: number;
  signal?: number;
  firmware?: string;
  limitKmh?: number;
}

export interface MotoState {
  thingName: string;
  speedKmh: number;
  limitKmh: number;
  locked: boolean;
  pendingLock: boolean;
  stolenMode: boolean;
  batteryPct: number;
  ignition: boolean;
  signal: number;
  firmware: string;
  riding: boolean;
  cruiseKmh: number;
}

export interface StepResult {
  /** Publicar `reported.velocidade_kmh` (desacelerando para o limite, trava pendente ou cruzou 3 km/h). */
  reportSpeed: boolean;
  /** A trava pendente acabou de engatar (publicar `reported.travada: true`). */
  lockedNow: boolean;
  /** Eventos gerados pelo próprio rastreador neste passo (ex.: bateria crítica). */
  events: DeviceEventType[];
}

/**
 * Modelo de uma moto virtual: comportamento do firmware descrito em docs/firmware-bloqueio-seguro.md.
 * - aplica `limite_kmh` 0..32 (inteiro) e recusa qualquer outro valor;
 * - nunca acelera acima de `min(limite, 32)`; ao baixar o limite, desacelera na taxa do controlador;
 * - `travada: true` com velocidade ≥ 3 fica pendente e só engata abaixo de 3 km/h;
 * - travada, a moto não anda.
 */
export class VirtualMoto {
  readonly state: MotoState;
  private readonly route: Route;
  private segment: number;
  private fraction: number;
  private criticalSent = false;
  private readonly rideOnUnlock: boolean;

  constructor(init: MotoInit) {
    this.route = init.route;
    this.segment = (init.startIndex ?? 0) % init.route.points.length;
    this.fraction = init.startFraction ?? 0;
    this.rideOnUnlock = init.rideOnUnlock ?? true;
    const locked = init.locked ?? true;
    this.state = {
      thingName: init.thingName,
      speedKmh: 0,
      limitKmh: init.limitKmh ?? MAX_SPEED_KMH,
      locked,
      pendingLock: false,
      stolenMode: false,
      batteryPct: init.batteryPct ?? 90,
      ignition: !locked,
      signal: init.signal ?? 4,
      firmware: init.firmware ?? 'sim-1.0.0',
      riding: init.riding ?? false,
      cruiseKmh: init.cruiseKmh ?? 22,
    };
  }

  position(): LatLng {
    const pts = this.route.points;
    return lerp(pts[this.segment], pts[(this.segment + 1) % pts.length], this.fraction);
  }

  /** Aplica o delta do shadow. Devolve o que deve ser reportado (vazio = nada aplicado agora). */
  applyDesired(delta: DesiredDelta): ReportedChange {
    const out: ReportedChange = {};
    const s = this.state;
    if (delta.limite_kmh !== undefined) {
      const v = delta.limite_kmh;
      if (Number.isInteger(v) && v >= 0 && v <= MAX_SPEED_KMH) {
        s.limitKmh = v;
        out.limite_kmh = v;
      }
    }
    if (delta.modo_roubada !== undefined && typeof delta.modo_roubada === 'boolean') {
      s.stolenMode = delta.modo_roubada;
      out.modo_roubada = s.stolenMode;
    }
    if (delta.travada === false) {
      s.locked = false;
      s.pendingLock = false;
      s.ignition = true;
      if (this.rideOnUnlock) s.riding = true;
      out.travada = false;
    } else if (delta.travada === true) {
      if (s.locked) out.travada = true;
      else if (s.speedKmh < SAFE_LOCK_SPEED_KMH) {
        this.engageLock();
        out.travada = true;
      } else {
        s.pendingLock = true; // firmware: nunca trava em movimento
      }
    }
    return out;
  }

  private engageLock(): void {
    const s = this.state;
    s.locked = true;
    s.pendingLock = false;
    s.speedKmh = 0;
    s.ignition = false;
    s.riding = false;
  }

  private target(): number {
    const s = this.state;
    if (s.locked || !s.riding) return 0;
    return Math.min(s.cruiseKmh, s.limitKmh, MAX_SPEED_KMH);
  }

  step(dtSec: number): StepResult {
    const s = this.state;
    const before = s.speedKmh;
    const target = this.target();
    if (s.speedKmh < target) s.speedKmh = Math.min(target, s.speedKmh + ACCEL_KMH_PER_S * dtSec);
    else if (s.speedKmh > target) s.speedKmh = Math.max(target, s.speedKmh - DECEL_KMH_PER_S * dtSec);
    s.speedKmh = Math.min(s.speedKmh, MAX_SPEED_KMH);

    let lockedNow = false;
    if (s.pendingLock && s.speedKmh < SAFE_LOCK_SPEED_KMH) {
      this.engageLock();
      lockedNow = true;
    }

    // Deslocamento (velocidade média do passo).
    const meters = (((before + s.speedKmh) / 2) * dtSec) / 3.6;
    if (!s.locked && meters > 0) this.advance(meters);
    s.batteryPct = Math.max(0, s.batteryPct - (meters / 1000) * BATTERY_PCT_PER_KM);

    const events: DeviceEventType[] = [];
    if (!this.criticalSent && s.batteryPct < CRITICAL_BATTERY_PCT) {
      this.criticalSent = true;
      events.push('bateria_critica');
    }
    const crossed = before >= SAFE_LOCK_SPEED_KMH && s.speedKmh < SAFE_LOCK_SPEED_KMH;
    const reportSpeed = !lockedNow && (s.speedKmh > s.limitKmh || s.pendingLock || crossed || (before > s.limitKmh && s.speedKmh <= s.limitKmh));
    return { reportSpeed, lockedNow, events };
  }

  private advance(meters: number): void {
    const pts = this.route.points;
    let left = meters;
    for (let guard = 0; guard < 1000 && left > 0; guard++) {
      const a = pts[this.segment];
      const b = pts[(this.segment + 1) % pts.length];
      const len = distanceM(a, b);
      const remaining = len * (1 - this.fraction);
      if (left < remaining) {
        this.fraction += left / len;
        return;
      }
      left -= remaining;
      this.segment = (this.segment + 1) % pts.length;
      this.fraction = 0;
    }
  }

  /** Mensagem de `motos/{thingName}/telemetria`. */
  telemetry(now: Date) {
    const [lat, lng] = this.position();
    const s = this.state;
    return {
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      velocidade_kmh: Math.round(s.speedKmh * 10) / 10,
      bateria_pct: Math.round(s.batteryPct),
      travada: s.locked,
      ignicao: s.ignition,
      sinal: s.signal,
      timestamp: now.toISOString(),
    };
  }

  /** `state.reported` completo (na conexão). */
  fullReported() {
    const s = this.state;
    return { travada: s.locked, limite_kmh: s.limitKmh, modo_roubada: s.stolenMode, firmware: s.firmware, velocidade_kmh: Math.round(s.speedKmh * 10) / 10 };
  }
}
