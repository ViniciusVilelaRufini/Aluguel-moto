export type MapLoadState = 'loading' | 'ready' | 'failed';

/** Tempo máximo (com a aba visível) esperando o 'load' do mapa antes de mostrar a falha. */
export const MAP_LOAD_TIMEOUT_MS = 15_000;

export interface MapLike {
  on(event: 'load' | 'error', cb: (e?: unknown) => void): unknown;
  remove(): void;
}
interface DocLike {
  hidden: boolean;
  addEventListener(t: 'visibilitychange', cb: () => void): void;
  removeEventListener(t: 'visibilitychange', cb: () => void): void;
}

/**
 * Máquina de estados do carregamento do mapa: loading -> ready | failed.
 * - Erro do estilo antes do 'load', ou 15 s com a aba visível sem 'load' -> failed.
 * - Um 'load' tardio ainda recupera: vai a ready e chama onReady.
 * - Aba oculta pausa a contagem; ao voltar, reinicia.
 * Devolve a função que desmonta (remove o mapa e cancela tudo).
 */
export function startMapLoad<M extends MapLike>(o: {
  createMap: () => Promise<M>;
  onState: (s: MapLoadState) => void;
  onReady: (map: M) => void;
  onDestroy?: () => void;
  timeoutMs?: number;
  doc?: DocLike;
}): () => void {
  const timeoutMs = o.timeoutMs ?? MAP_LOAD_TIMEOUT_MS;
  const doc = o.doc ?? (typeof document !== 'undefined' ? document : undefined);
  let map: M | undefined;
  let cancelled = false;
  let ready = false;
  let failed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => { if (timer !== undefined) { clearTimeout(timer); timer = undefined; } };
  const fail = () => { if (ready || failed || cancelled) return; failed = true; stop(); o.onState('failed'); };
  const arm = () => { stop(); if (!ready && !failed && !cancelled && !doc?.hidden) timer = setTimeout(fail, timeoutMs); };
  const onVisibility = () => { if (doc?.hidden) stop(); else if (!timer) arm(); };

  doc?.addEventListener('visibilitychange', onVisibility);
  arm();

  (async () => {
    try {
      const m = await o.createMap();
      if (cancelled) { m.remove(); return; }
      map = m;
      // Falha de tile isolada não derruba o mapa; erro do estilo/fonte antes do 'load' sim.
      m.on('error', (e) => { if (!ready && !(e as { tile?: unknown } | undefined)?.tile) fail(); });
      m.on('load', () => {
        if (cancelled || ready) return;
        ready = true;
        stop();
        o.onState('ready');
        o.onReady(m);
      });
    } catch {
      fail();
    }
  })();

  return () => {
    cancelled = true;
    stop();
    doc?.removeEventListener('visibilitychange', onVisibility);
    o.onDestroy?.();
    map?.remove();
  };
}
