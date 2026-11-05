import type { TrackerConsoleRisk } from './tracker-console.dto';

/** Texto do console: 1–99 caracteres seguros + `#` final (no máximo 100 no total). */
const TEXT_PATTERN = /^[A-Za-z0-9,.\-_:]{1,99}#$/;
/** Leitura sempre e só sem vírgula (com vírgula, recusados). */
const READ_ONLY = new Set(['STATUS', 'PARAM', 'WHERE', 'VERSION', 'GPRSSET']);
/** Sem vírgula = leitura; com vírgula = `connection` (APN/SERVER) ou `change` (TIMER). */
const READ_OR_SET = new Map<string, TrackerConsoleRisk>([
  ['APN', 'connection'],
  ['SERVER', 'connection'],
  ['TIMER', 'change'],
]);
/** Relé/motor: nunca pelo console (o bloqueio seguro é gradual e só abaixo de 3 km/h — CLAUDE.md). */
const RELAY_KEYWORDS = new Set(['RELAY', 'DYD', 'HFYD', 'STOP', 'RESUME']);
export const CONSOLE_DENIED_REASON = 'Comando não permitido pelo console.';
export const CONSOLE_RELAY_REASON = 'Use Bloquear/Desbloquear da ficha da moto.';

export type ConsoleClassification = { ok: true; text: string; keyword: string; risk: TrackerConsoleRisk } | { ok: false; reason: string };

/**
 * Política do console do rastreador (J16/GT06). `text` só passa por `trim` (os argumentos mantêm a caixa: `APN,indica.algar.br#`).
 * ALLOWLIST (palavra-chave sem diferenciar caixa): `STATUS`/`PARAM`/`WHERE`/`VERSION`/`GPRSSET` sem vírgula = `read`;
 * `APN`/`SERVER`/`TIMER` sem vírgula = `read`; `TIMER` com vírgula = `change`; `APN`/`SERVER` com vírgula e `RESET` (sem
 * vírgula) = `connection`. Qualquer outro é recusado — `RELAY`/`DYD`/`HFYD`/`STOP`/`RESUME` com o motivo de usar o
 * Bloquear/Desbloquear da ficha (o console nunca corta nem libera o relé fora do bloqueio seguro).
 */
export function classifyConsoleText(input: string): ConsoleClassification {
  const text = (input ?? '').trim();
  if (!text) return { ok: false, reason: 'Informe o comando.' };
  if (text.length > 100) return { ok: false, reason: 'O comando deve ter no máximo 100 caracteres.' };
  if (!TEXT_PATTERN.test(text)) return { ok: false, reason: 'Comando inválido: use só letras, números e , . - _ : e termine com #.' };
  const body = text.slice(0, -1);
  const comma = body.indexOf(',');
  const keyword = (comma === -1 ? body : body.slice(0, comma)).toUpperCase();
  if (!keyword) return { ok: false, reason: 'Comando inválido: falta a palavra-chave.' };
  if (RELAY_KEYWORDS.has(keyword)) return { ok: false, reason: CONSOLE_RELAY_REASON };
  const hasArgs = comma !== -1;
  let risk: TrackerConsoleRisk;
  if (READ_ONLY.has(keyword) && !hasArgs) risk = 'read';
  else if (READ_OR_SET.has(keyword)) risk = hasArgs ? READ_OR_SET.get(keyword)! : 'read';
  else if (keyword === 'RESET' && !hasArgs) risk = 'connection';
  else return { ok: false, reason: CONSOLE_DENIED_REASON };
  return { ok: true, text, keyword, risk };
}
