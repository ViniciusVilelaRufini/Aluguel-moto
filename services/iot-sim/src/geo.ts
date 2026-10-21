export type LatLng = [lat: number, lng: number];

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distância em metros (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Ponto a `fraction` (0..1) do caminho de `a` para `b` (interpolação linear; trechos curtos). */
export function lerp(a: LatLng, b: LatLng, fraction: number): LatLng {
  return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
}

/** PRNG determinístico (mulberry32) para rotas e eventos reproduzíveis. */
export function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
