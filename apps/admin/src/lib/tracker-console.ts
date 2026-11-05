/** Console do rastreador J16 (GT06): presets, risco do texto e leitura do APN da resposta. */

export const CONSOLE_PRESETS: { label: string; text: string }[] = [
  { label: 'Estado', text: 'STATUS#' },
  { label: 'Parâmetros', text: 'PARAM#' },
  { label: 'Posição', text: 'WHERE#' },
  { label: 'APN', text: 'APN#' },
  { label: 'Servidor', text: 'SERVER#' },
  { label: 'Versão', text: 'VERSION#' },
];

type Risk = 'read' | 'change' | 'connection';

const TEXT_PATTERN = /^[A-Za-z0-9,.\-_:]{1,99}#$/;
const READ_ONLY = new Set(['STATUS', 'PARAM', 'WHERE', 'VERSION', 'GPRSSET']);
const READ_OR_SET = new Map<string, Risk>([['APN', 'connection'], ['SERVER', 'connection'], ['TIMER', 'change']]);
const RELAY_KEYWORDS = new Set(['RELAY', 'DYD', 'HFYD', 'STOP', 'RESUME']);
/** `TIMER,<em movimento 5–60>,<parado 10–3600>#`. */
function timerArgsOk(body: string): boolean {
  const m = /^TIMER,(\d{1,4}),(\d{1,4})$/i.exec(body);
  if (!m) return false;
  const moving = Number(m[1]);
  const parked = Number(m[2]);
  return moving >= 5 && moving <= 60 && parked >= 10 && parked <= 3600;
}

/**
 * Espelho da allowlist da API (`console-policy.ts`) só para mostrar o motivo antes de enviar; a API é a autoridade.
 * `STATUS`/`PARAM`/`WHERE`/`VERSION`/`GPRSSET` sem vírgula e `APN`/`SERVER`/`TIMER` sem vírgula = leitura; `TIMER` com
 * vírgula = alteração; `APN`/`SERVER` com vírgula e `RESET` = conexão; relé/motor e qualquer outro são recusados.
 */
export function classifyConsole(input: string): { ok: true; risk: Risk } | { ok: false; reason: string } {
  const t = input.trim();
  if (!t) return { ok: false, reason: 'Informe o comando.' };
  if (t.length > 100) return { ok: false, reason: 'O comando deve ter no máximo 100 caracteres.' };
  if (!TEXT_PATTERN.test(t)) return { ok: false, reason: 'Comando inválido: use só letras, números e , . - _ : e termine com #.' };
  const body = t.slice(0, -1);
  const comma = body.indexOf(',');
  const keyword = (comma === -1 ? body : body.slice(0, comma)).toUpperCase();
  if (RELAY_KEYWORDS.has(keyword)) return { ok: false, reason: 'Use Bloquear/Desbloquear da ficha da moto.' };
  const hasArgs = comma !== -1;
  if (READ_ONLY.has(keyword) && !hasArgs) return { ok: true, risk: 'read' };
  if (keyword === 'TIMER' && hasArgs && !timerArgsOk(body)) return { ok: false, reason: 'Intervalos permitidos: 5–60 s em movimento e 10–3600 s parado.' };
  const set = READ_OR_SET.get(keyword);
  if (set) return { ok: true, risk: hasArgs ? set : 'read' };
  if (keyword === 'RESET' && !hasArgs) return { ok: true, risk: 'connection' };
  return { ok: false, reason: 'Comando não permitido pelo console.' };
}

/** Risco de um texto aceito pela allowlist; recusado conta como alteração (pede confirmação; a API recusa mesmo assim). */
export function consoleRisk(text: string): Risk {
  const c = classifyConsole(text);
  return c.ok ? c.risk : 'change';
}

export const CHANGE_CONFIRM_TEXT =
  'Este comando muda a configuração do rastreador. Se o APN ou o servidor ficarem errados, o aparelho perde a conexão e só volta com acesso físico. Enviar mesmo assim?';

/** Lê `APN:<valor>,` da resposta; devolve o APN do aparelho quando difere (sem caixa) do cadastrado no chip. */
export function apnMismatch(simApn: string | null, response: string | null): string | null {
  if (!simApn || !response) return null;
  const m = /APN:([^,#\s]+)/i.exec(response);
  if (!m) return null;
  const device = m[1]!;
  return device.toLowerCase() === simApn.trim().toLowerCase() ? null : device;
}
