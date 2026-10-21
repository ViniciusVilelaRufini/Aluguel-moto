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

/** Degraus da rampa do bloqueio seguro: `min(atual, 15) → 8 → 3 → 0`, só decrescentes (nunca sobe o limite). */
export function safeLockSteps(currentLimitKmh: number): number[] {
  const first = Math.min(Math.max(0, Math.floor(currentLimitKmh)), 15);
  const steps = [first];
  for (const s of [8, 3, 0]) if (s < steps[steps.length - 1]) steps.push(s);
  return steps;
}
