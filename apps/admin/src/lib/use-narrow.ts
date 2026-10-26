'use client';

import { useEffect, useState } from 'react';

/** `true` quando a janela tem no máximo `maxPx` de largura (celular). No servidor e na 1ª pintura: `false`. */
export function useNarrow(maxPx = 640): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${maxPx}px)`);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [maxPx]);
  return narrow;
}
