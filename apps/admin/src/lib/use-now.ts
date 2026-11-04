'use client';

import { useEffect, useState } from 'react';

/** Relógio que avança a cada `intervalMs` (P1-8: "Último sinal há X" não congela enquanto a tela fica aberta). */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
