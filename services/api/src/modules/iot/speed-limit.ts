import { MAX_SPEED_KMH } from '../../common/enums';
import { InvalidSpeedLimitError } from '../../ports/iot-gateway.port';

/** Valida um limite de velocidade (inteiro 0..32). Nunca trunca: fora da faixa lança `InvalidSpeedLimitError`. */
export function assertSpeedLimit(kmh: number): number {
  if (typeof kmh !== 'number' || !Number.isInteger(kmh) || kmh < 0 || kmh > MAX_SPEED_KMH) {
    throw new InvalidSpeedLimitError(`Limite inválido: ${kmh} (permitido: inteiro de 0 a ${MAX_SPEED_KMH} km/h)`);
  }
  return kmh;
}

/**
 * Limite em vigor para uma moto dado o conjunto de zonas `reduced_speed` que a contêm:
 * o menor limite entre elas; sem zona → 32. Nunca devolve mais que 32.
 */
export function effectiveZoneLimit(zoneLimits: number[]): number {
  const valid = zoneLimits.filter((v) => Number.isFinite(v) && v >= 0);
  return Math.min(MAX_SPEED_KMH, ...valid);
}

/** Menor degrau que a rampa publica sem velocidade fresca < 3 nem hold confirmado (0 só depois do degrau 3 confirmado). */
export const SAFE_LOCK_MIN_START_KMH = 3;

/**
 * Degraus da rampa (lacunas T5, fix 2): o **primeiro** sai da velocidade medida agora (fresca) e do máximo regulatório — o menor
 * degrau da escada 15/8 que não fica abaixo da velocidade (sem velocidade ou acima de 15: 15) —, limitado pelo teto confirmado (zona) mas
 * **nunca abaixo de 3**: um teto guardado (velho ou não) jamais vira um corte de potência de uma vez numa moto em movimento.
 * Só um hold confirmado (limite já segurado em 0) começa em 0. Depois desce 8 → 3 → 0 (o 0 só após o 3 confirmado).
 */
export function rampSteps(speedKmh: number | null, ceilingKmh: number, holdConfirmed: boolean): number[] {
  if (holdConfirmed) return [0];
  // 3 nunca é o primeiro degrau de uma moto andando (≥ 3 km/h): começa em 8 ou 15, sempre ≥ a velocidade (acima de 15, 15).
  const ladder = [8, 15];
  let first = 15;
  if (speedKmh !== null && Number.isFinite(speedKmh)) first = ladder.find((s) => s >= speedKmh) ?? 15;
  const cap = Number.isFinite(ceilingKmh) ? Math.max(SAFE_LOCK_MIN_START_KMH, Math.floor(ceilingKmh)) : 15;
  first = Math.min(first, cap);
  return safeLockSteps(first);
}

/** Degraus da rampa do bloqueio seguro: `min(atual, 15) → 8 → 3 → 0`, só decrescentes (nunca sobe o limite). */
export function safeLockSteps(currentLimitKmh: number): number[] {
  const first = Math.min(Math.max(0, Math.floor(currentLimitKmh)), 15);
  const steps = [first];
  for (const s of [8, 3, 0]) if (s < steps[steps.length - 1]) steps.push(s);
  return steps;
}
