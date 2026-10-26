'use client';

import { useEffect, useState } from 'react';

/** Valor com atraso: filtros de texto só consultam a API depois que a digitação para. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}
