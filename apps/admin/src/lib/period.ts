import { dayStartIso, localDay } from './format';

export type PeriodKind = 'today' | '7d' | '30d' | 'custom';

/** Maior intervalo livre aceito no painel (evita relatórios enormes por engano). */
export const MAX_CUSTOM_DAYS = 366;

export interface IsoRange { from: string; to: string }

/** Dia seguinte (`YYYY-MM-DD`) sem depender do fuso da máquina. */
export function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Período livre em dias de São Paulo: do início do primeiro dia (inclusive) ao início do dia seguinte ao último (o `to` do contrato é exclusivo).
 */
export function customRange(fromDay: string, toDay: string, today = localDay()): { ok: true; range: IsoRange } | { ok: false; error: string } {
  if (!DAY_RE.test(fromDay) || !DAY_RE.test(toDay) || Number.isNaN(Date.parse(`${fromDay}T00:00:00Z`)) || Number.isNaN(Date.parse(`${toDay}T00:00:00Z`))) {
    return { ok: false, error: 'Informe a data inicial e a final.' };
  }
  if (fromDay > toDay) return { ok: false, error: 'A data inicial não pode ser depois da final.' };
  if (toDay > today) return { ok: false, error: 'A data final não pode ser no futuro.' };
  if (daysBetween(fromDay, toDay) + 1 > MAX_CUSTOM_DAYS) return { ok: false, error: `O período pode ter no máximo ${MAX_CUSTOM_DAYS} dias.` };
  return { ok: true, range: { from: dayStartIso(fromDay), to: dayStartIso(nextDay(toDay)) } };
}

/** Intervalo UTC de um período pré-definido (até agora) ou livre; `null` se o livre ainda for inválido. */
export function periodRange(kind: PeriodKind, custom: { from: string; to: string }, now = new Date()): IsoRange | null {
  if (kind === 'custom') {
    const r = customRange(custom.from, custom.to, localDay(now));
    return r.ok ? r.range : null;
  }
  const days = kind === 'today' ? 0 : kind === '7d' ? 6 : 29;
  return { from: dayStartIso(localDay(new Date(now.getTime() - days * 86400_000))), to: now.toISOString() };
}

/** Nome do arquivo CSV com o período (`receita-2026-10-01_a_2026-10-24.csv`). */
export function csvName(base: string, range: IsoRange): string {
  const f = (iso: string, endExclusive: boolean) => localDay(new Date(Date.parse(iso) - (endExclusive ? 1 : 0)));
  return `${base}-${f(range.from, false)}_a_${f(range.to, true)}.csv`;
}
