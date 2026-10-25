import { describe, expect, it } from 'vitest';
import { formatCompactBRL, moneyDelta, percentDelta, pointsDelta, previousRange } from '@/lib/finance-delta';

describe('previousRange', () => {
  it('pega a janela anterior com a mesma duração', () => {
    const r = previousRange('2026-10-15T03:00:00.000Z', '2026-10-22T03:00:00.000Z');
    expect(r).toEqual({ from: '2026-10-08T03:00:00.000Z', to: '2026-10-15T03:00:00.000Z' });
  });
});

describe('percentDelta', () => {
  it('formata alta e queda', () => {
    expect(percentDelta(112, 100)).toEqual({ text: '+12% vs. período anterior', trend: 'up' });
    expect(percentDelta(95, 100)).toEqual({ text: '−5% vs. período anterior', trend: 'down' });
    expect(percentDelta(102, 100)?.text).toBe('+2% vs. período anterior');
    expect(percentDelta(102.5, 100)?.text).toBe('+2,5% vs. período anterior');
  });
  it('sem base ou sem dado não mostra delta', () => {
    expect(percentDelta(10, 0)).toBeNull();
    expect(percentDelta(null, 5)).toBeNull();
    expect(percentDelta(5, null)).toBeNull();
  });
});

describe('pointsDelta e moneyDelta', () => {
  it('pontos percentuais', () => {
    expect(pointsDelta(68, 63.8)).toEqual({ text: '+4,2 p.p.', trend: 'up' });
    expect(pointsDelta(60, 63)?.trend).toBe('down');
  });
  it('reais', () => {
    expect(moneyDelta(7410, 7090)).toEqual({ text: '+R$ 3,20', trend: 'up' });
    expect(moneyDelta(7000, 7100)).toEqual({ text: '−R$ 1,00', trend: 'down' });
    expect(moneyDelta(null, 1)).toBeNull();
  });
  it('variação zero é neutra, sem sinal nem seta', () => {
    expect(moneyDelta(0, 0)).toEqual({ text: 'Sem variação', trend: 'flat' });
    expect(pointsDelta(60, 60)?.trend).toBe('flat');
    expect(percentDelta(100, 100)).toEqual({ text: '0% vs. período anterior', trend: 'flat' });
  });
});

describe('formatCompactBRL', () => {
  it('usa mil a partir de R$ 1.000', () => {
    expect(formatCompactBRL(3830000)).toBe('R$ 38,3 mil');
    expect(formatCompactBRL(7410)).toBe('R$ 74,10');
  });
});
