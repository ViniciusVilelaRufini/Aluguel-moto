import type { TrackerConsoleRisk } from './tracker-console.dto';

/** Texto do console: 1–99 caracteres seguros + `#` final (no máximo 100 no total). */
const TEXT_PATTERN = /^[A-Za-z0-9,.\-_:]{1,99}#$/;
/** Comandos que mudam credencial/fuso/formatação do aparelho: nunca pelo painel. */
const DENIED = new Set(['GMT', 'FACTORY', 'FORMAT', 'PWD', 'PASSWORD']);

export type ConsoleClassification = { ok: true; text: string; keyword: string; risk: TrackerConsoleRisk } | { ok: false; reason: string };

/**
 * Política do console do rastreador (J16/GT06). `text` só passa por `trim` (os argumentos mantêm a caixa: `APN,indica.algar.br#`).
 * Risco: `read` = sem vírgula e ≠ `RESET`; `connection` = `RESET`, ou `APN`/`SERVER` com vírgula; `change` = demais com vírgula.
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
  if (DENIED.has(keyword)) return { ok: false, reason: `O comando ${keyword} não é permitido pelo painel.` };
  const hasArgs = comma !== -1;
  let risk: TrackerConsoleRisk;
  if (keyword === 'RESET' || (hasArgs && (keyword === 'APN' || keyword === 'SERVER'))) risk = 'connection';
  else if (hasArgs) risk = 'change';
  else risk = 'read';
  return { ok: true, text, keyword, risk };
}
