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

export function createLogger(service = 'traccar-bridge', write: (line: string) => void = (l) => void process.stdout.write(l)): Logger {
  const at = (level: 'info' | 'warn' | 'error') => (entry: Record<string, unknown>) => write(`${JSON.stringify({ ts: new Date().toISOString(), level, service, ...entry })}\n`);
  return { info: at('info'), warn: at('warn'), error: at('error') };
}

export const silentLogger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined };
