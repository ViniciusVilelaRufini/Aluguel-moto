/** Comparação com o período anterior no Financeiro (design: "+12% vs. período anterior", "+4,2 p.p.", "+R$ 3,20"). */

export interface Delta { text: string; trend: 'up' | 'down' | 'flat' }

/** Período imediatamente anterior, com a mesma duração: [from - (to - from), from). */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const f = new Date(from).getTime();
  const t = new Date(to).getTime();
  return { from: new Date(f - (t - f)).toISOString(), to: new Date(f).toISOString() };
}

const num = (n: number, digits: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const signed = (n: number) => (n < 0 ? '−' : n > 0 ? '+' : '');
const trendOf = (n: number): Delta['trend'] => (n < 0 ? 'down' : n > 0 ? 'up' : 'flat');

/** Variação percentual. Sem base (anterior 0) não há percentual: devolve null. */
export function percentDelta(cur: number | null, prev: number | null, suffix = ' vs. período anterior'): Delta | null {
  if (cur == null || prev == null || prev === 0) return null;
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const shown = Math.abs(pct) >= 10 ? Math.round(Math.abs(pct)) : Math.round(Math.abs(pct) * 10) / 10;
  return { text: `${signed(pct)}${num(shown, Number.isInteger(shown) ? 0 : 1)}%${suffix}`, trend: trendOf(shown === 0 ? 0 : pct) };
}

/** Variação em pontos percentuais (ocupação). */
export function pointsDelta(cur: number | null, prev: number | null): Delta | null {
  if (cur == null || prev == null) return null;
  const d = Math.round((cur - prev) * 10) / 10;
  return { text: `${signed(d)}${num(Math.abs(d), 1)} p.p.`, trend: trendOf(d) };
}

/** Variação em reais a partir de centavos (receita por moto/dia, inadimplência). */
export function moneyDelta(curCents: number | null, prevCents: number | null): Delta | null {
  if (curCents == null || prevCents == null) return null;
  const d = curCents - prevCents;
  if (d === 0) return { text: 'Sem variação', trend: 'flat' };
  return { text: `${signed(d)}R$ ${num(Math.abs(d) / 100, 2)}`, trend: trendOf(d) };
}

/** "R$ 38,3 mil" para a receita (valores abaixo de mil ficam em reais cheios). */
export function formatCompactBRL(cents: number): string {
  const reais = cents / 100;
  if (Math.abs(reais) < 1000) return `R$ ${num(reais, 2)}`;
  return `R$ ${num(reais / 1000, 1)} mil`;
}

