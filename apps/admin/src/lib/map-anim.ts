import { lerp } from './motion';

export type LngLat = [number, number];
export interface Positioned { id: string; lng: number; lat: number }

/**
 * Posição intermediária de cada moto entre a última posição desenhada (`from`) e a nova (`to`).
 * Motos novas aparecem direto no destino; saltos longos (> `maxJumpDeg`, ~1 km) não são animados
 * para a moto não "atravessar" a cidade depois de um período sem sinal.
 */
export function interpolatePositions<T extends Positioned>(from: ReadonlyMap<string, LngLat>, to: readonly T[], t: number, maxJumpDeg = 0.01): T[] {
  return to.map((v) => {
    const p = from.get(v.id);
    if (!p || t >= 1) return v;
    if (Math.abs(p[0] - v.lng) > maxJumpDeg || Math.abs(p[1] - v.lat) > maxJumpDeg) return v;
    return { ...v, lng: lerp(p[0], v.lng, t), lat: lerp(p[1], v.lat, t) };
  });
}

/** `true` se alguma moto mudou de posição (evita animar quando só status/bateria mudaram). */
export function anyMoved(from: ReadonlyMap<string, LngLat>, to: readonly Positioned[], eps = 1e-7): boolean {
  return to.some((v) => {
    const p = from.get(v.id);
    return !!p && (Math.abs(p[0] - v.lng) > eps || Math.abs(p[1] - v.lat) > eps);
  });
}

export function positionsOf(list: readonly Positioned[]): Map<string, LngLat> {
  return new Map(list.map((v) => [v.id, [v.lng, v.lat] as LngLat]));
}

/** Cor do anel de bateria no pin (mesma regra da BatteryPill: >50 verde, 21–50 sol, ≤20 coral). */
export function batteryHex(pct: number): string {
  if (pct > 50) return '#34C25C';
  if (pct > 20) return '#FBC531';
  return '#F2665A';
}
