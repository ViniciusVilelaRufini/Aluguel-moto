import { distanceM } from '../../common/util';

/**
 * Odômetro e horas de uso a partir da telemetria (contrato v2). O rastreador não reporta odômetro (`telemetria.schema.json`),
 * então a API soma a distância entre amostras consecutivas e o tempo com ignição ligada, descartando o que não é uso real.
 */
export interface UsageSample {
  lat: number;
  lng: number;
  /** epoch ms. */
  ts: number;
  ignition: boolean;
  speedKmh: number;
}

/** Lacuna maior que isto (rastreador offline, fila) não conta: não sabemos o que aconteceu no meio. */
export const MAX_GAP_MS = 10 * 60_000;
/** Velocidade implícita acima disto é salto de GPS (o limite legal é 32 km/h). */
export const MAX_IMPLIED_KMH = 45;
/** Deslocamento menor que isto é ruído do GPS parado. */
export const MIN_MOVE_M = 5;

export function accumulateUsage(prev: UsageSample | undefined, next: UsageSample): { km: number; hours: number } {
  if (!prev) return { km: 0, hours: 0 };
  const dt = next.ts - prev.ts;
  if (dt <= 0 || dt > MAX_GAP_MS) return { km: 0, hours: 0 };
  const hours = prev.ignition && next.ignition ? dt / 3_600_000 : 0;
  const moving = prev.ignition || next.ignition || prev.speedKmh > 0 || next.speedKmh > 0;
  const m = distanceM(prev, next);
  const impliedKmh = m / 1000 / (dt / 3_600_000);
  const km = moving && m >= MIN_MOVE_M && impliedKmh <= MAX_IMPLIED_KMH ? m / 1000 : 0;
  return { km, hours };
}
