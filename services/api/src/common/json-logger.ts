import { LoggerService } from '@nestjs/common';

/** Campos que nunca vão para o log (LGPD). */
const PII_KEYS = new Set(['cpf', 'email', 'name', 'fullName', 'phone', 'lat', 'lng', 'birthDate', 'token', 'authorization', 'cardToken']);

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = PII_KEYS.has(k) ? '[redacted]' : scrub(v, depth + 1);
  }
  return out;
}

/**
 * Defesa em profundidade (LGPD): o thingName do rastreador em estoque é `gt06-<IMEI>`; em qualquer ponto da linha (campo, texto,
 * stack) o IMEI sai só com os 4 últimos dígitos, como o `maskLogger` da ponte.
 */
export function maskStockThingNames(line: string): string {
  return line.replace(/gt06-(\d{11})(\d{4})/g, (_m, head: string, last4: string) => `gt06-${'*'.repeat(head.length)}${last4}`);
}

/** Logger JSON de uma linha por evento, sem dados pessoais. */
export class JsonLogger implements LoggerService {
  constructor(private readonly minLevel: 'debug' | 'info' = process.env.LOG_LEVEL === 'debug' ? 'debug' : 'info') {}

  private write(level: string, message: unknown, context?: string, extra?: Record<string, unknown>) {
    if (level === 'debug' && this.minLevel !== 'debug') return;
    const base: Record<string, unknown> = { level, time: new Date().toISOString(), context };
    const payload = typeof message === 'object' && message !== null ? (scrub(message) as Record<string, unknown>) : { msg: String(message) };
    const line = maskStockThingNames(JSON.stringify({ ...base, ...payload, ...(extra ?? {}) }));
    if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
  }

  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }
  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace && typeof trace === 'string' && trace.includes('\n') ? { stack: trace } : undefined);
  }
  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }
  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }
  verbose(message: unknown, context?: string) {
    this.write('debug', message, context);
  }
}
