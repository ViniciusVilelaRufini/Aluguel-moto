import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { csvName, customRange, MAX_CUSTOM_DAYS, nextDay, periodRange } from '@/lib/period';
import { PAYMENT_KIND_OPTIONS, PAYMENT_STATUS_OPTIONS, paymentColumns } from '@/components/PaymentsPanel';
import { ErrorNote } from '@/components/ui';
import { PAYMENT_KIND, PAYMENT_METHOD, PAYMENT_STATUS } from '@/lib/labels';
import { can, canOpen } from '@/lib/permissions';
import type { StaffGroup } from '@/lib/types';

describe('período livre (dias de São Paulo, to exclusivo)', () => {
  it('converte o dia local em limites UTC (UTC-3)', () => {
    const r = customRange('2026-10-01', '2026-10-03', '2026-10-24');
    expect(r).toEqual({ ok: true, range: { from: '2026-10-01T03:00:00.000Z', to: '2026-10-04T03:00:00.000Z' } });
  });
  it('um único dia cobre 24 h', () => {
    const r = customRange('2026-10-24', '2026-10-24', '2026-10-24');
    expect(r.ok && Date.parse(r.range.to) - Date.parse(r.range.from)).toBe(86400_000);
  });
  it('nextDay vira mês e ano', () => {
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
    expect(nextDay('2028-02-28')).toBe('2028-02-29');
  });
  it('rejeita datas vazias, invertidas, futuras e longas demais', () => {
    expect(customRange('', '2026-10-01', '2026-10-24')).toMatchObject({ ok: false });
    expect(customRange('2026-10-05', '2026-10-01', '2026-10-24')).toMatchObject({ ok: false });
    expect(customRange('2026-10-01', '2026-10-25', '2026-10-24')).toMatchObject({ ok: false });
    expect(customRange('2025-01-01', '2026-10-01', '2026-10-24')).toMatchObject({ ok: false });
    expect(customRange('2026-01-01', '2026-10-01', '2026-10-24').ok).toBe(true);
    expect(MAX_CUSTOM_DAYS).toBe(366);
  });
  it('períodos fixos terminam agora; livre inválido devolve null', () => {
    const now = new Date('2026-10-24T15:00:00.000Z');
    expect(periodRange('today', { from: '', to: '' }, now)).toEqual({ from: '2026-10-24T03:00:00.000Z', to: now.toISOString() });
    expect(periodRange('7d', { from: '', to: '' }, now)?.from).toBe('2026-10-18T03:00:00.000Z');
    expect(periodRange('custom', { from: '', to: '' }, now)).toBeNull();
    expect(periodRange('custom', { from: '2026-10-01', to: '2026-10-02' }, now)?.to).toBe('2026-10-03T03:00:00.000Z');
  });
  it('nome do CSV traz o período em dias locais', () => {
    expect(csvName('receita', { from: '2026-10-01T03:00:00.000Z', to: '2026-10-04T03:00:00.000Z' })).toBe('receita-2026-10-01_a_2026-10-03.csv');
  });
});

describe('pagamentos', () => {
  it('filtros cobrem todos os status e tipos do contrato', () => {
    expect(PAYMENT_STATUS_OPTIONS.map((o) => o.value).slice(1)).toEqual(Object.keys(PAYMENT_STATUS));
    expect(PAYMENT_KIND_OPTIONS.map((o) => o.value).slice(1)).toEqual(Object.keys(PAYMENT_KIND));
    expect(PAYMENT_METHOD).toEqual({ card: 'Cartão', pix: 'Pix', wallet: 'Carteira' });
  });
  it('colunas mostram valor em reais e fuso de São Paulo', () => {
    const p = { id: 'p1', customerId: 'c1', kind: 'rental', method: 'pix', status: 'paid', amountCents: 12345, refundedCents: 0, createdAt: '2026-10-24T02:30:00.000Z', updatedAt: '2026-10-24T02:30:00.000Z' } as never;
    const cells = paymentColumns().map((c) => (c.render ? renderToStaticMarkup(<>{c.render(p)}</>) : ''));
    expect(cells.join('|')).toContain('123,45');
    expect(cells[0]).toContain('23/10/2026');
    expect(cells[2]).toBe('Pix');
  });
});

describe('financeiro: acesso', () => {
  const fin: StaffGroup[] = ['financeiro'];
  it('financeiro ajusta carteira sem abrir Clientes; suporte não ajusta', () => {
    expect(can(fin, 'wallet.adjust')).toBe(true);
    expect(canOpen(fin, 'customers')).toBe(false);
    expect(can(['suporte'], 'wallet.adjust')).toBe(false);
  });
});

describe('ErrorNote', () => {
  it('mostra "Tentar de novo" só com onRetry', () => {
    expect(renderToStaticMarkup(<ErrorNote error={new Error('Falhou')} />)).not.toContain('Tentar de novo');
    expect(renderToStaticMarkup(<ErrorNote error={new Error('Falhou')} onRetry={() => {}} />)).toContain('Tentar de novo');
    expect(renderToStaticMarkup(<ErrorNote error={null} onRetry={() => {}} />)).toBe('');
  });
});
