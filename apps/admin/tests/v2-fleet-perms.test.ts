import { describe, expect, it } from 'vitest';
import { matchesVehicle, shortAddress } from '@/lib/fleet-search';
import { paletteResults, vehicleItems } from '@/lib/palette';
import { can } from '@/lib/permissions';

const v = { code: 'VLT-0001', model: 'Volti Flash', categoryLabel: 'Urbana', address: 'R. Teodoro Sampaio, 1020 · Pinheiros, São Paulo', batterySerial: 'BT-190577' };

describe('busca da frota por endereço', () => {
  it('casa código, endereço sem acento, modelo e bateria', () => {
    expect(matchesVehicle(v, '0001')).toBe(true);
    expect(matchesVehicle(v, 'teodoro sampaio')).toBe(true);
    expect(matchesVehicle(v, 'sao paulo pinheiros')).toBe(true);
    expect(matchesVehicle(v, 'flash')).toBe(true);
    expect(matchesVehicle(v, 'bt-190577')).toBe(true);
    expect(matchesVehicle(v, 'augusta')).toBe(false);
    expect(matchesVehicle({ code: 'VLT-0002' }, 'teodoro')).toBe(false);
    expect(matchesVehicle(v, '  ')).toBe(true);
  });

  it('endereço curto para a tabela', () => {
    expect(shortAddress(v.address)).toBe('R. Teodoro Sampaio, 1020');
    expect(shortAddress(undefined)).toBe('—');
  });

  it('paleta (Ctrl+K) encontra a moto pelo endereço e mostra o endereço na dica', () => {
    const items = vehicleItems([{ id: '1', code: 'VLT-0001', status: 'free', address: v.address }, { id: '2', code: 'VLT-0002', status: 'free' }], () => 'Livre');
    expect(items[0].hint).toBe('Livre · R. Teodoro Sampaio, 1020');
    const r = paletteResults('teodoro', { vehicles: items, sections: [], canSearchCustomers: false, canSearchFleet: true });
    expect(r.map((x) => x.label)).toContain('VLT-0001');
    expect(r.map((x) => x.label)).not.toContain('VLT-0002');
  });
});

describe('permissões do contrato v2 (x-required-groups)', () => {
  it('catálogo: só admin edita', () => {
    expect(can(['admin'], 'catalog.edit')).toBe(true);
    expect(can(['financeiro'], 'catalog.edit')).toBe(false);
    expect(can(['operacao'], 'catalog.edit')).toBe(false);
  });
  it('baterias e manutenção: admin e operação', () => {
    for (const a of ['battery.view', 'battery.transfer', 'maintenance.view', 'maintenance.schedule', 'maintenance.update'] as const) {
      expect(can(['admin'], a)).toBe(true);
      expect(can(['operacao'], a)).toBe(true);
      expect(can(['suporte'], a)).toBe(false);
      expect(can(['financeiro'], a)).toBe(false);
    }
  });
  it('moto fixa da assinatura: admin e operação, não suporte nem financeiro', () => {
    expect(can(['admin'], 'subscription.assignVehicle')).toBe(true);
    expect(can(['operacao'], 'subscription.assignVehicle')).toBe(true);
    expect(can(['suporte'], 'subscription.assignVehicle')).toBe(false);
    expect(can(['financeiro'], 'subscription.assignVehicle')).toBe(false);
  });
});
