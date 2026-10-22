'use client';

import { useEffect, useState } from 'react';

/** Consulta do sistema operacional; o CSS (globals.css) usa a mesma media query. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type MatchMedia = (q: string) => { matches: boolean };

/** `true` quando o usuário pediu menos movimento. Seguro no export estático (retorna `false` sem `window`). */
export function prefersReducedMotion(mm: MatchMedia | undefined = typeof window !== 'undefined' ? window.matchMedia?.bind(window) : undefined): boolean {
  try {
    return !!mm && mm(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

/** Hook reativo: acompanha a troca da preferência sem recarregar a página. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/** Duração efetiva: zero quando o movimento está reduzido (o valor final é aplicado de uma vez). */
export function motionDuration(ms: number, reduced: boolean): number {
  return reduced ? 0 : Math.max(0, ms);
}

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
/** Equivalente numérico de `--ease-out` para animações feitas em JS. */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutCubic = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface TweenOpts {
  duration: number;
  onUpdate: (t: number) => void;
  onDone?: () => void;
  ease?: (t: number) => number;
  reduced?: boolean;
  /** Injetáveis para teste. */
  raf?: (cb: (ts: number) => void) => number;
  caf?: (id: number) => void;
  now?: () => number;
}

/**
 * Anima `t` de 0 a 1 com requestAnimationFrame. Com movimento reduzido ou duração 0, chama
 * `onUpdate(1)` na hora. Retorna a função que cancela.
 */
export function tween({ duration, onUpdate, onDone, ease = easeOutCubic, reduced = false, raf, caf, now }: TweenOpts): () => void {
  const r = raf ?? (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : undefined);
  const c = caf ?? (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : undefined);
  const clock = now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  if (reduced || duration <= 0 || !r) {
    onUpdate(1);
    onDone?.();
    return () => {};
  }
  const start = clock();
  let id = 0;
  let stopped = false;
  const step = () => {
    if (stopped) return;
    const t = clamp01((clock() - start) / duration);
    onUpdate(ease(t));
    if (t < 1) id = r(step);
    else onDone?.();
  };
  id = r(step);
  return () => {
    stopped = true;
    c?.(id);
  };
}
