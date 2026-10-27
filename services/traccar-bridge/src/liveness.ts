import { statSync, writeFileSync } from 'node:fs';

/** Arquivo de vida da ponte (mtime). O HEALTHCHECK do contêiner (`healthcheck.ts`) falha quando ele envelhece. */
export const LIVENESS_FILE_DEFAULT = '/tmp/bridge-alive';
/** Intervalo da sonda da fila de entrada. */
export const LIVENESS_INTERVAL_MS = 30_000;
/** Idade máxima do arquivo de vida para o contêiner ser saudável (4 sondas perdidas). */
export const LIVENESS_MAX_AGE_MS = 120_000;

export interface LivenessOptions {
  /** Conclui quando a fila de entrada processou tudo o que havia nela (`Bridge.probeInbound`). */
  probe: () => Promise<void>;
  /** Grava o arquivo de vida (mtime = agora). */
  touch: () => void;
  intervalMs?: number;
  onError?: (err: Error) => void;
}

/**
 * B-I3: toca o arquivo de vida no início e depois de cada sonda CONCLUÍDA. Com a fila de entrada travada a sonda não conclui,
 * o arquivo envelhece e o HEALTHCHECK reinicia o contêiner. Uma sonda por vez (fila travada não empilha sondas).
 * Devolve a função que para o laço.
 */
export function startLiveness(opts: LivenessOptions): () => void {
  const intervalMs = opts.intervalMs ?? LIVENESS_INTERVAL_MS;
  let inFlight = false;
  let stopped = false;
  const touch = () => {
    if (stopped) return;
    try {
      opts.touch();
    } catch (err) {
      opts.onError?.(err as Error);
    }
  };
  touch();
  const timer = setInterval(() => {
    if (inFlight) return;
    inFlight = true;
    opts
      .probe()
      .then(touch, (err: Error) => opts.onError?.(err))
      .finally(() => {
        inFlight = false;
      });
  }, intervalMs);
  timer.unref?.();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

/** Saudável: arquivo existe e tem idade ≤ `maxAgeMs` (um mtime no futuro além disso também é inválido). */
export function isAlive(mtimeMs: number | undefined, now: number, maxAgeMs = LIVENESS_MAX_AGE_MS): boolean {
  if (mtimeMs === undefined || !Number.isFinite(mtimeMs)) return false;
  return Math.abs(now - mtimeMs) <= maxAgeMs;
}

export function touchFile(path: string): void {
  writeFileSync(path, `${Date.now()}\n`);
}

export function fileMtimeMs(path: string): number | undefined {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return undefined;
  }
}
