import { describe, expect, it } from 'vitest';
import { AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_OPTIONS, AUDIT_OTHER, auditFilterValue } from '@/lib/audit-labels';
import { batteryLocation, unloadDestination, type Battery } from '@/lib/batteries';
import { allowedFinanceTabs, resolveFinanceTab } from '@/lib/finance-tabs';
import { can, canOpen, homeFor, menuFor, paymentHref } from '@/lib/permissions';
import { linkedDepotNames, stationDepotHint } from '@/lib/stations';

const b = (over: Partial<Battery>): Battery => ({ id: 'b1', serial: 'BT-1', chargePct: 0, cycleCount: 3, status: 'retired', updatedAt: '2026-10-22T10:00:00Z', ...over });

describe('auditoria: filtro com "Outra…"', () => {
  it('as listas terminam em "Outra…" e a opção "todas" continua primeiro', () => {
    for (const o of [AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_OPTIONS]) {
      expect(o[0].value).toBe('');
      expect(o[o.length - 1]).toEqual({ value: AUDIT_OTHER, label: 'Outra…' });
    }
  });
  it('valor enviado: o do seletor, ou o texto digitado (sem espaços) em "Outra…"', () => {
    expect(auditFilterValue('wallet.adjustment', 'ignorado')).toBe('wallet.adjustment');
    expect(auditFilterValue(AUDIT_OTHER, '  vehicle.updated ')).toBe('vehicle.updated');
    expect(auditFilterValue(AUDIT_OTHER, '   ')).toBe('');
    expect(auditFilterValue('', 'x')).toBe('');
  });
});

describe('baterias: rótulo e destino de descarga', () => {
  it('descartada mostra o galpão; sem galpão, traço', () => {
    const depots = new Map([['d1', 'Galpão Pinheiros']]);
    expect(batteryLocation(b({ status: 'retired', depotId: 'd1' }), { depots })).toBe('Descartada · Galpão Pinheiros');
    expect(batteryLocation(b({ status: 'retired' }))).toBe('—');
  });
  it('com vários galpões o destino padrão é recusado antes de ir à API; com um, vale o padrão', () => {
    expect(unloadDestination('charging', 2)).toEqual({ error: 'Escolha o galpão ou a estação de destino' });
    expect(unloadDestination('charging', 1)).toEqual({ body: {} });
    expect(unloadDestination('charging', 0)).toEqual({ body: {} });
    expect(unloadDestination('depot:d2', 3)).toEqual({ body: { depotId: 'd2' } });
    expect(unloadDestination('s9', 3)).toEqual({ body: { stationId: 's9' } });
  });
});

describe('suporte: leitura de Pagamentos', () => {
  it('abre Financeiro só para pagamentos; relatórios, cauções e carteira seguem fechados', () => {
    expect(canOpen(['suporte'], 'finance')).toBe(true);
    expect(allowedFinanceTabs(['suporte'])).toEqual(['payments']);
    expect(can(['suporte'], 'payment.view')).toBe(true);
    expect(can(['suporte'], 'finance.reports')).toBe(false);
    expect(can(['suporte'], 'payment.refund')).toBe(false);
    expect(resolveFinanceTab('overview', ['suporte'])).toBe('payments');
    expect(resolveFinanceTab('wallet', ['suporte'])).toBe('payments');
  });
  it('tela inicial do suporte não muda; link de pagamento passa a existir', () => {
    expect(homeFor(['suporte'])).toBe('/fleet');
    expect(menuFor(['suporte']).map((m) => m.key)).toContain('finance');
    expect(paymentHref(['suporte'], 'p1')).toBe('/finance?tab=payments&payment=p1');
  });
  it('financeiro e admin mantêm as abas e a ordem; operação continua sem Financeiro', () => {
    expect(allowedFinanceTabs(['financeiro'])).toEqual(['overview', 'rentals', 'payments', 'deposits', 'wallet']);
    expect(allowedFinanceTabs(['admin'])).toEqual(['overview', 'rentals', 'payments', 'deposits', 'wallet']);
    expect(homeFor(['financeiro'])).toBe('/finance');
    expect(canOpen(['operacao'], 'finance')).toBe(false);
  });
  it('sem grupos carregados nenhuma aba é resolvida (a página não mostra a visão geral)', () => {
    expect(resolveFinanceTab('wallet', [])).toBeNull();
    expect(resolveFinanceTab(null, [])).toBeNull();
  });
});

describe('/estacoes: textos e vínculos', () => {
  it('galpões ligados por nome, "Galpão" para id desconhecido e "Nenhum" sem vínculo', () => {
    const names = new Map([['d1', 'Pinheiros']]);
    expect(linkedDepotNames({ depotIds: ['d1', 'd9'] }, names)).toBe('Pinheiros, Galpão');
    expect(linkedDepotNames({ depotIds: [] }, names)).toBe('Nenhum');
  });
  it('dica do vínculo não termina em espaço e muda para quem não abre Galpões', () => {
    expect(stationDepotHint(true)).toMatch(/Estação de troca do galpão/);
    expect(stationDepotHint(false)).toMatch(/acesso a Galpões/);
    for (const v of [true, false]) expect(stationDepotHint(v)).toBe(stationDepotHint(v).trim());
  });
});
