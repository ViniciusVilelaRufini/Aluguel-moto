/**
 * `attributes.noQueue` (Command.KEY_NO_QUEUE) só existe a partir do Traccar 6.7.0. Antes disso o Traccar ignora o atributo e
 * ENFILEIRA o comando de um dispositivo sem sessão, entregando-o na reconexão — um `engineStop` em qualquer velocidade.
 */
export const MIN_TRACCAR_NOQUEUE = '6.7.0';

const MIN = [6, 7, 0];

/** `version` de `GET /api/server`. Desconhecida, ilegível ou < 6.7.0 → `false` (a ponte não manda comando de motor). */
export function supportsNoQueue(version: unknown): boolean {
  if (typeof version !== 'string') return false;
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?(?:[-+.].*)?$/.exec(version.trim());
  if (!m) return false;
  const v = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  for (let i = 0; i < 3; i++) if (v[i] !== MIN[i]) return v[i] > MIN[i];
  return true;
}
