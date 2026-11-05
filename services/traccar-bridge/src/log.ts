/** Logs JSON por linha, sem dado pessoal; IMEI só mascarado (spec GT06 §6.5). */
export interface Logger {
  info(entry: Record<string, unknown>): void;
  warn(entry: Record<string, unknown>): void;
  error(entry: Record<string, unknown>): void;
}

/** Mostra só os 4 últimos dígitos. Todo log que cite um IMEI deve passar por aqui. */
export function maskImei(imei: string): string {
  return imei.length <= 4 ? '****' : `${'*'.repeat(imei.length - 4)}${imei.slice(-4)}`;
}

/**
 * O `thingName` de rastreador em estoque é `gt06-<IMEI>`: todo valor de texto de um log que contenha 10+ dígitos seguidos
 * (IMEI = 15) passa por `maskImei` antes de sair. Raso: as entradas da ponte são planas.
 */
export function maskLogger(inner: Logger): Logger {
  const clean = (entry: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(entry).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/\d{10,}/g, (m) => maskImei(m)) : v]));
  return { info: (e) => inner.info(clean(e)), warn: (e) => inner.warn(clean(e)), error: (e) => inner.error(clean(e)) };
}

export function createLogger(service = 'traccar-bridge', write: (line: string) => void = (l) => void process.stdout.write(l)): Logger {
  const at = (level: 'info' | 'warn' | 'error') => (entry: Record<string, unknown>) => write(`${JSON.stringify({ ts: new Date().toISOString(), level, service, ...entry })}\n`);
  return { info: at('info'), warn: at('warn'), error: at('error') };
}

export const silentLogger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined };
