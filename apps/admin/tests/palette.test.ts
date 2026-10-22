import { describe, expect, it } from 'vitest';
import { moveActive, normalize, paletteResults, scoreItem, sectionItems, vehicleItems } from '@/lib/palette';
import { MENU, menuFor } from '@/lib/permissions';
import { STATUS_LABEL } from '@/lib/status';
import type { VehicleStatus } from '@/lib/types';

const vehicles = vehicleItems(
  [
    { id: 'v1', code: 'VLT-0001', status: 'free' },
    { id: 'v2', code: 'VLT-0012', status: 'rented' },
    { id: 'v3', code: 'VLT-0100', status: 'offline' },
  ],
  (s) => STATUS_LABEL[s as VehicleStatus],
);
const sections = sectionItems(MENU);
const base = { vehicles, sections, canSearchCustomers: true, canSearchFleet: true };

describe('paleta de comandos (Ctrl+K)', () => {
  it('normaliza acento e caixa', () => {
    expect(normalize('  Operação ')).toBe('operacao');
  });
  it('sem consulta mostra as seções', () => {
    expect(paletteResults('', base).map((r) => r.label)).toEqual(MENU.map((m) => m.label));
  });
  it('código exato abre a moto primeiro (como a busca antiga)', () => {
    const r = paletteResults('vlt-0001', base);
    expect(r[0].href).toBe('/fleet?vehicle=v1');
    expect(r.at(-1)?.id).toBe('search:customers');
  });
  it('final do código também encontra a moto', () => {
    expect(scoreItem(vehicles[0], '0001')).toBeGreaterThan(0);
    expect(paletteResults('0012', base).some((r) => r.href === '/fleet?vehicle=v2')).toBe(true);
  });
  it('texto livre vira busca de clientes no topo', () => {
    const r = paletteResults('Maria', base);
    expect(r[0]).toMatchObject({ id: 'search:customers', href: '/customers?q=Maria' });
  });
  it('nome de seção vem antes da busca livre', () => {
    expect(paletteResults('financ', base)[0].id).toBe('section:finance');
  });
  it('seção sem acento e status da moto entram na busca', () => {
    expect(paletteResults('operacao', base).some((r) => r.id === 'section:tasks')).toBe(true);
    expect(paletteResults('sem sinal', base).some((r) => r.href === '/fleet?vehicle=v3')).toBe(true);
  });
  it('perfil sem clientes busca a moto pelo código no mapa', () => {
    const r = paletteResults('XYZ', { ...base, sections: sectionItems(menuFor(['operacao'])), canSearchCustomers: false });
    expect(r[0]).toMatchObject({ id: 'search:fleet', href: '/fleet?code=XYZ' });
  });
  it('setas circulam pela lista', () => {
    expect(moveActive(0, -1, 3)).toBe(2);
    expect(moveActive(2, 1, 3)).toBe(0);
    expect(moveActive(0, 1, 0)).toBe(-1);
  });
});
