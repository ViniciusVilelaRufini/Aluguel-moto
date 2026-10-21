import { MAX_SPEED_KMH } from './types';

/** Limite de velocidade de comando: inteiro de 0 a 32 km/h. Lança com a mensagem de tela. */
export function assertSpeedLimit(n: number | undefined): asserts n is number {
  if (n === undefined || Number.isNaN(n)) throw new Error('Informe o limite de velocidade');
  if (n > MAX_SPEED_KMH) throw new Error(`Máximo de ${MAX_SPEED_KMH} km/h`);
  if (n < 0 || !Number.isInteger(n)) throw new Error('Informe um número inteiro de 0 a 32 km/h');
}
