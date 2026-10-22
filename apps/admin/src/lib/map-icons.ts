import type { Map as MlMap } from 'maplibre-gl';

/** Imagens do mapa desenhadas em canvas (sem glifos externos): pin de moto e contagem dos clusters. */
export const BIKE_ICON = 'pin-bike';
const CLUSTER_PREFIX = 'cluster-';

export const clusterImageId = (count: number) => `${CLUSTER_PREFIX}${count}`;
export function parseClusterImageId(id: string): number | null {
  if (!id.startsWith(CLUSTER_PREFIX)) return null;
  const n = Number(id.slice(CLUSTER_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Diâmetro (px) do círculo do cluster pela quantidade de motos. */
export function clusterDiameter(count: number): number {
  return count >= 40 ? 52 : count >= 15 ? 40 : count >= 5 ? 32 : 26;
}

type Img = { width: number; height: number; data: Uint8ClampedArray };

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  return ctx ? [c, ctx] : null;
}

/** Ícone Bike (Lucide) em branco, 2x para telas densas. */
export function bikeImage(): Img | null {
  const size = 48;
  const made = canvas(size);
  if (!made) return null;
  const [, ctx] = made;
  const k = size / 24;
  ctx.scale(k, k);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [cx] of [[5.5], [18.5]]) { ctx.beginPath(); ctx.arc(cx, 17.5, 3.5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.stroke(new Path2D('M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2'));
  return ctx.getImageData(0, 0, size, size);
}

/** Círculo escuro com a contagem, no estilo do cluster anterior (fundo ink-900, anel branco). */
export function clusterImage(count: number): Img | null {
  const d = clusterDiameter(count);
  const px = d * 2;
  const made = canvas(px);
  if (!made) return null;
  const [, ctx] = made;
  ctx.scale(2, 2);
  ctx.fillStyle = 'rgba(21,24,26,0.9)';
  ctx.beginPath(); ctx.arc(d / 2, d / 2, d / 2 - 1, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${count >= 100 ? 11 : 13}px system-ui, sans-serif`;
  ctx.fillText(String(count), d / 2, d / 2 + 0.5);
  return ctx.getImageData(0, 0, px, px);
}

/** Registra o ícone da moto e gera as imagens de cluster sob demanda (`styleimagemissing`). */
export function registerFleetImages(map: MlMap) {
  const bike = bikeImage();
  if (bike && !map.hasImage(BIKE_ICON)) map.addImage(BIKE_ICON, bike, { pixelRatio: 2 });
  map.on('styleimagemissing', (e: { id: string }) => {
    const n = parseClusterImageId(e.id);
    if (n == null || map.hasImage(e.id)) return;
    const img = clusterImage(n);
    if (img) map.addImage(e.id, img, { pixelRatio: 2 });
  });
}
