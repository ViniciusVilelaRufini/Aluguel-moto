import { lerp, tween } from './motion';

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

interface TickerOpts {
  initial: number;
  duration: number;
  onShow: (n: number) => void;
  integer?: boolean;
  /** Lido a cada animação (preferência pode mudar). */
  reduced?: () => boolean;
  raf?: (cb: (ts: number) => void) => number;
  caf?: (id: number) => void;
  now?: () => number;
}

/**
 * Controlador do ticker. O valor exibido fica guardado aqui e só muda em `onShow` (a cada quadro):
 * toda animação parte do que está na tela. Assim, o efeito duplo do StrictMode (inicia, cancela,
 * inicia de novo) ainda chega ao alvo, e uma mudança no meio da animação continua de onde está.
 */
export function createTicker(o: TickerOpts) {
  let shown = o.initial;
  let cancel: () => void = () => {};
  return {
    get shown() { return shown; },
    to(target: number) {
      cancel();
      const start = shown;
      if (start === target) { cancel = () => {}; return; }
      cancel = tween({
        duration: o.duration, reduced: o.reduced?.() ?? false, raf: o.raf, caf: o.caf, now: o.now,
        onUpdate: (t) => { shown = tickerValue(start, target, t, o.integer ?? true); o.onShow(shown); },
      });
    },
    stop() { cancel(); cancel = () => {}; },
  };
}
