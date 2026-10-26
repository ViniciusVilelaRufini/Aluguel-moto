'use client';

import { useCallback, useRef, useState } from 'react';

/** Trava síncrona: a segunda chamada enquanto a primeira não terminou é descartada (duplo clique). */
export function createSubmitLock() {
  let locked = false;
  return async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (locked) return undefined;
    locked = true;
    try { return await fn(); } finally { locked = false; }
  };
}

/**
 * `run(fn)` executa `fn` no máximo uma vez por vez (trava síncrona via ref, que vale já no segundo clique
 * do mesmo tick) e expõe `busy` para `disabled` + `aria-busy` nos botões.
 */
export function useSubmitGuard() {
  const lock = useRef(createSubmitLock());
  const [busy, setBusy] = useState(false);
  const run = useCallback(<T,>(fn: () => Promise<T>) => lock.current(async () => {
    setBusy(true);
    try { return await fn(); } finally { setBusy(false); }
  }), []);
  return { busy, run };
}

/** E-mail simples: algo@dominio.tld, sem espaços. */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
