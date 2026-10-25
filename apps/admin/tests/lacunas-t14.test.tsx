import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildWalletAdjustment, delinquencySummary, paymentCustomerLabel, paymentDebtLines } from '@/lib/admin-forms';
import { alertVisibleTo, can, canOpen, homeFor, paymentHref } from '@/lib/permissions';
import { ALERT_TYPE, DEBT_SETTLEMENT, PAYMENT_KIND } from '@/lib/labels';
import { HandoverDetail } from '@/components/depots/HandoverViews';
import type { S } from '@/lib/types';

/** `formatBRL` usa espaço não separável depois de R$ (Intl). */
const sp = <T,>(v: T): T => JSON.parse(JSON.stringify(v).replace(/ /g, ' '));

// Componentes com consulta: o cliente do painel vem do mock (saldo e dívida do `GET /customers/{id}`).
const customerData: { current: Partial<S<'Customer'>> | undefined } = { current: undefined };
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return {
    ...real,
    useQuery: () => ({ data: customerData.current, isLoading: !customerData.current, error: null, refetch() {} }),
    useQueryClient: () => ({ invalidateQueries() {} }),
  };
});

describe('QA-04: débito não passa do saldo da carteira', () => {
  it('com o saldo conhecido, recusa débito acima dele e aceita até o saldo', () => {
    expect(sp(buildWalletAdjustment('100,00', 'debit', 'Correção', 2550))).toEqual({ ok: false, error: 'O débito passa do saldo da carteira. Debite no máximo R$ 25,50.' });
    expect(buildWalletAdjustment('25,50', 'debit', 'Correção', 2550)).toEqual({ ok: true, body: { amountCents: -2550, reason: 'Correção' } });
    expect(buildWalletAdjustment('1,00', 'debit', 'Correção', 0)).toMatchObject({ ok: false, error: expect.stringMatching(/não tem saldo/) });
    expect(buildWalletAdjustment('1,00', 'debit', 'Correção', -500)).toMatchObject({ ok: false });
  });
  it('crédito não depende do saldo; sem saldo informado, a regra antiga vale', () => {
    expect(buildWalletAdjustment('100,00', 'credit', 'Bônus', 0)).toMatchObject({ ok: true, body: { amountCents: 10000 } });
    expect(buildWalletAdjustment('100,00', 'debit', 'Correção')).toMatchObject({ ok: true, body: { amountCents: -10000 } });
  });
  it('o diálogo mostra o saldo atual', async () => {
    customerData.current = { id: 'c1', walletBalanceCents: 2550 };
    const { WalletAdjustDialog } = await import('@/components/WalletAdjustDialog');
    const html = sp(renderToStaticMarkup(<WalletAdjustDialog customerId="c1" onClose={() => {}} />));
    expect(html).toContain('Saldo atual');
    expect(html).toContain('R$ 25,50');
  });
  it('sem o saldo (carregando), avisa', async () => {
    customerData.current = undefined;
    const { WalletAdjustDialog } = await import('@/components/WalletAdjustDialog');
    expect(renderToStaticMarkup(<WalletAdjustDialog customerId="c1" onClose={() => {}} />)).toContain('Carregando o saldo');
  });
});

describe('Inadimplência (Task 14)', () => {
  it('resumo da ficha: com valor para quem vê a dívida; em dia → nada', () => {
    expect(sp(delinquencySummary({ delinquent: true, debtCents: 7000 }))).toBe('Inadimplente · R$ 70,00 em aberto');
    expect(delinquencySummary({ delinquent: true })).toBe('Inadimplente');
    expect(delinquencySummary({ delinquent: false, debtCents: 0 })).toBeNull();
  });
  it('registrar quitação: admin e financeiro; suporte e operação não', () => {
    expect(can(['admin'], 'delinquency.clear')).toBe(true);
    expect(can(['financeiro'], 'delinquency.clear')).toBe(true);
    expect(can(['suporte'], 'delinquency.clear')).toBe(false);
    expect(can(['operacao'], 'delinquency.clear')).toBe(false);
  });
  it('o diálogo mostra quanto está em aberto e pede o motivo', async () => {
    customerData.current = { id: 'c1', delinquent: true, debtCents: 7000 };
    const { DelinquencyClearDialog } = await import('@/components/DelinquencyClearDialog');
    const html = sp(renderToStaticMarkup(<DelinquencyClearDialog customerId="c1" onClose={() => {}} />));
    expect(html).toContain('Registrar quitação');
    expect(html).toContain('R$ 70,00');
    expect(html).toContain('Motivo');
  });
  it('detalhe do pagamento: saldo devedor, quitação e o pagamento que a quitação cobre', () => {
    const fmt = (iso: string) => iso.slice(0, 10);
    expect(sp(paymentDebtLines({ outstandingCents: 7000 }, fmt))).toEqual([['Saldo devedor', 'R$ 70,00']]);
    expect(paymentDebtLines({ debtSettledAt: '2026-10-24T12:00:00.000Z', debtSettlement: 'manual' }, fmt)).toEqual([['Dívida quitada', 'Registrada pelo financeiro em 2026-10-24']]);
    expect(paymentDebtLines({ debtSettledAt: '2026-10-24T12:00:00.000Z', debtSettlement: 'payment' }, fmt)[0][1]).toMatch(/^Paga pelo cliente/);
    expect(paymentDebtLines({ settlesPaymentId: 'abcdef12-0000-4000-8000-000000000000' }, fmt)).toEqual([['Quita o pagamento', 'abcdef12']]);
    expect(paymentDebtLines({}, fmt)).toEqual([]);
  });
  it('rótulos pt-BR do tipo de pagamento e da quitação', () => {
    expect(PAYMENT_KIND.debt_settlement).toBe('Quitação de dívida');
    expect(DEBT_SETTLEMENT.manual).toMatch(/financeiro/);
  });
});

describe('QA-17: cliente no detalhe do pagamento', () => {
  it('nome quando a API manda; senão o início do id', () => {
    expect(paymentCustomerLabel({ customerId: '66e1857d-0000-4000-8000-000000000000', customerName: 'Maria Souza' })).toBe('Maria Souza');
    expect(paymentCustomerLabel({ customerId: '66e1857d-0000-4000-8000-000000000000' })).toBe('66e1857d');
  });
});

describe('Alerta payment_needs_review (Task 14)', () => {
  it('rótulo pt-BR e link para o pagamento só para quem abre o Financeiro', () => {
    expect(ALERT_TYPE.payment_needs_review[0]).toBe('Pagamento precisa de revisão');
    expect(paymentHref(['financeiro'], 'p1')).toBe('/finance?tab=payments&payment=p1');
    expect(paymentHref(['admin'], 'p1')).toBe('/finance?tab=payments&payment=p1');
    expect(paymentHref(['suporte'], 'p1')).toBe('/finance?tab=payments&payment=p1'); // Task 18: suporte lê Pagamentos (GET /payments)
  });
  it('financeiro abre Alertas (só os de pagamento) e resolve, mas começa no Financeiro', () => {
    expect(canOpen(['financeiro'], 'alerts')).toBe(true);
    expect(can(['financeiro'], 'alert.resolve')).toBe(true);
    expect(can(['financeiro'], 'alert.manage')).toBe(false);
    expect(homeFor(['financeiro'])).toBe('/finance');
    expect(homeFor(['operacao'])).toBe('/fleet');
    expect(homeFor(['suporte'])).toBe('/fleet');
  });
  it('contador ao vivo com o mesmo escopo da API', () => {
    expect(alertVisibleTo(['operacao'], 'payment_needs_review')).toBe(false);
    expect(alertVisibleTo(['operacao'], 'vehicle_offline')).toBe(true);
    expect(alertVisibleTo(['financeiro'], 'vehicle_offline')).toBe(false);
    expect(alertVisibleTo(['financeiro'], 'payment_needs_review')).toBe(true);
    expect(alertVisibleTo(['suporte'], 'payment_needs_review')).toBe(true);
    expect(alertVisibleTo(['admin'], 'payment_needs_review')).toBe(true);
  });
});

describe('QA-23: motivo do cancelamento da entrega', () => {
  const h = {
    id: 'h1', type: 'pickup', depotId: 'd1', vehicleId: 'v1', operatorId: 'o1', checklist: [], photoKeys: [], batteryPct: 90, status: 'canceled', createdAt: '2026-10-22T13:00:00.000Z',
    cancelReason: 'Cliente desistiu', canceledAt: '2026-10-24T13:00:00.000Z', canceledByName: 'Rafael Lima',
  } as S<'Handover'>;
  it('mostra motivo, quando e quem cancelou', () => {
    const html = renderToStaticMarkup(<HandoverDetail handover={h} supportHref={null} rentalHref={null} />);
    expect(html).toContain('Entrega cancelada');
    expect(html).toContain('Cliente desistiu');
    expect(html).toContain('24/10/2026');
    expect(html).toContain('por Rafael Lima');
  });
  it('sem informação de cancelamento (entrega antiga), nada aparece', () => {
    const { cancelReason: _r, canceledAt: _a, canceledByName: _n, ...old } = h;
    expect(renderToStaticMarkup(<HandoverDetail handover={old as S<'Handover'>} supportHref={null} rentalHref={null} />)).not.toContain('Entrega cancelada');
  });
});

describe('QA-18/QA-20: baterias', () => {
  it('cartões distinguem carregada no galpão e na estação (cadastro); o censo fica fora do prefixo das mutações', async () => {
    const { countCardLabel, BATTERY_CENSUS_KEY } = await import('@/components/BatteriesPanel');
    expect(countCardLabel('charged')).toBe('Carregada no galpão');
    expect(countCardLabel('in_station')).toBe('Na estação (cadastro)');
    expect(countCardLabel('defective')).toBe('Com defeito');
    expect(BATTERY_CENSUS_KEY.startsWith('batteries')).toBe(false);
  });
});
