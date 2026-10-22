import { lerp } from './motion';

/** Valor exibido no quadro `t` (0..1) do ticker; inteiros ficam inteiros durante a animação. */
export function tickerValue(from: number, to: number, t: number, integer = true): number {
  const v = lerp(from, to, t);
  if (t >= 1) return to;
  return integer ? Math.round(v) : v;
}

/** Variação ao vivo em texto curto ("+2", "−1"); `null` quando não mudou. Usa o sinal de menos tipográfico. */
export function formatDelta(prev: number, next: number, format: (n: number) => string = String): string | null {
  const d = next - prev;
  if (!Number.isFinite(d) || d === 0) return null;
  return (d > 0 ? '+' : '−') + format(Math.abs(d));
}

/** Tom da variação: depende se subir é bom (receita) ou ruim (alertas). */
export function deltaTone(prev: number, next: number, goodWhen: 'up' | 'down'): 'success' | 'danger' | null {
  if (next === prev) return null;
  const up = next > prev;
  return up === (goodWhen === 'up') ? 'success' : 'danger';
}
