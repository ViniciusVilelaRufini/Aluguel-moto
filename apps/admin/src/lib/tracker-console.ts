/** Console do rastreador J16 (GT06): presets, risco do texto e leitura do APN da resposta. */

export const CONSOLE_PRESETS: { label: string; text: string }[] = [
  { label: 'Estado', text: 'STATUS#' },
  { label: 'Parâmetros', text: 'PARAM#' },
  { label: 'Posição', text: 'WHERE#' },
  { label: 'APN', text: 'APN#' },
  { label: 'Servidor', text: 'SERVER#' },
  { label: 'Versão', text: 'VERSION#' },
];

/** Mesma política da API: sem vírgula e ≠ RESET lê; RESET ou APN/SERVER com vírgula mexem na conexão; demais com vírgula alteram. */
export function consoleRisk(text: string): 'read' | 'change' | 'connection' {
  const t = text.trim();
  const end = t.search(/[,#]/);
  const keyword = (end < 0 ? t : t.slice(0, end)).toUpperCase();
  const hasComma = t.includes(',');
  if (keyword === 'RESET') return 'connection';
  if (!hasComma) return 'read';
  return keyword === 'APN' || keyword === 'SERVER' ? 'connection' : 'change';
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
