import { describe, expect, it } from 'vitest';
import { can, menuFor, canSeeFullCpf, homeFor } from '@/lib/permissions';

const keys = (g: string[]) => menuFor(g as never).map((m) => m.key);

describe('menu by group', () => {
  it('admin sees the 13 sections in design order', () => {
    expect(keys(['admin'])).toEqual(['fleet', 'vehicles', 'alerts', 'zones', 'customers', 'tasks', 'finance', 'settings', 'depots', 'stations', 'pickups', 'handovers', 'team']);
  });
  it('estações (Task 12 das lacunas): admin e operação; suporte, financeiro e campo não', () => {
    expect(keys(['operacao'])).toContain('stations');
    for (const g of ['suporte', 'financeiro', 'campo']) expect(keys([g])).not.toContain('stations');
    for (const a of ['station.edit', 'station.qr'] as const) {
      expect(can(['admin'], a)).toBe(true);
      expect(can(['operacao'], a)).toBe(true);
      expect(can(['suporte'], a)).toBe(false);
      expect(can(['financeiro'], a)).toBe(false);
    }
  });
  it('operacao sees fleet, zones, alerts and field', () => {
    const k = keys(['operacao']);
    expect(k).toEqual(expect.arrayContaining(['fleet', 'zones', 'alerts', 'tasks']));
    expect(k).not.toContain('finance');
    expect(k).not.toContain('customers');
    expect(k).not.toContain('team');
  });
  it('financeiro sees finance and pricing but not fleet', () => {
    const k = keys(['financeiro']);
    expect(k).toEqual(expect.arrayContaining(['finance', 'settings']));
    expect(k).not.toContain('fleet');
    expect(k).not.toContain('zones');
  });
  it('suporte sees customers, alerts and payments', () => {
    const k = keys(['suporte']);
    expect(k).toEqual(expect.arrayContaining(['customers', 'alerts']));
    expect(k).toContain('finance'); // Task 18: só a lista de Pagamentos (ver finance-tabs)
    expect(k).not.toContain('zones');
  });
  it('merges multiple groups', () => {
    const k = keys(['operacao', 'financeiro']);
    expect(k).toEqual(expect.arrayContaining(['fleet', 'finance']));
  });
  it('galpão: operacao vê galpões, agenda e entregas; suporte só entregas; financeiro só galpões (leitura)', () => {
    expect(keys(['operacao'])).toEqual(expect.arrayContaining(['depots', 'pickups', 'handovers']));
    const sup = keys(['suporte']);
    expect(sup).toContain('handovers');
    expect(sup).not.toContain('depots');
    expect(sup).not.toContain('pickups');
    const fin = keys(['financeiro']);
    expect(fin).toContain('depots');
    expect(fin).not.toContain('pickups');
    expect(fin).not.toContain('handovers');
    // Tela inicial: financeiro continua abrindo em Financeiro (Alertas entrou no menu dele na Task 14, mas não é início).
    expect(homeFor(['financeiro'])).toBe('/finance');
  });
  it('campo has no panel menu', () => {
    expect(keys(['campo'])).toEqual([]);
  });
});

describe('actions by group', () => {
  it('financeiro and suporte cannot send vehicle commands', () => {
    expect(can(['financeiro'], 'vehicle.command')).toBe(false);
    expect(can(['suporte'], 'vehicle.command')).toBe(false);
    expect(can(['operacao'], 'vehicle.command')).toBe(true);
    expect(can(['admin'], 'vehicle.command')).toBe(true);
  });
  it('zone edits are for admin and operacao', () => {
    expect(can(['operacao'], 'zone.edit')).toBe(true);
    expect(can(['suporte'], 'zone.edit')).toBe(false);
  });
  it('force end is admin and suporte; refunds admin and financeiro', () => {
    expect(can(['suporte'], 'rental.forceEnd')).toBe(true);
    expect(can(['financeiro'], 'rental.forceEnd')).toBe(false);
    expect(can(['financeiro'], 'payment.refund')).toBe(true);
    expect(can(['suporte'], 'payment.refund')).toBe(false);
  });
  it('depots: admin and operacao edit; only admin deactivates', () => {
    expect(can(['admin'], 'depot.edit')).toBe(true);
    expect(can(['operacao'], 'depot.edit')).toBe(true);
    expect(can(['financeiro'], 'depot.edit')).toBe(false);
    expect(can(['suporte'], 'depot.edit')).toBe(false);
    expect(can(['campo'], 'depot.edit')).toBe(false);
    expect(can(['admin'], 'depot.deactivate')).toBe(true);
    expect(can(['operacao'], 'depot.deactivate')).toBe(false);
  });
  it('full CPF only for admin', () => {
    expect(canSeeFullCpf(['admin'])).toBe(true);
    expect(canSeeFullCpf(['suporte'])).toBe(false);
    expect(canSeeFullCpf(['suporte', 'financeiro'])).toBe(false);
  });
});
