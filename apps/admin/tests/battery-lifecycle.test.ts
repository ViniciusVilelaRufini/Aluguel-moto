import { describe, expect, it } from 'vitest';
import { batteryActions, batteryLocation, buildBatteryCreate, countsFromPage, movementTitle, validateReason, type Battery } from '@/lib/batteries';
import { depotCreateBody, depotUpdateBody, draftFromDepot, emptyDepotDraft, validateDepot } from '@/lib/depot-hours';
import { formatDateTimeIn } from '@/lib/format';
import { can } from '@/lib/permissions';
import { ALERT_TYPE } from '@/lib/labels';
import type { S } from '@/lib/types';

const b = (over: Partial<Battery>): Battery => ({ id: 'b1', serial: 'BT-1', chargePct: 100, cycleCount: 3, status: 'charged', updatedAt: '2026-10-22T10:00:00Z', ...over });

describe('baterias: contagens e local', () => {
  it('statusCounts do servidor viram o resumo, com zeros enquanto carrega', () => {
    expect(countsFromPage(undefined).charged).toBe(0);
    const c = countsFromPage({ in_vehicle: 1, in_van: 2, charging: 3, charged: 4, in_station: 5, defective: 6, retired: 7 });
    expect([c.charged, c.defective, c.retired]).toEqual([4, 6, 7]);
  });
  it('mostra o galpão de carregando, carregada e defeito', () => {
    const depots = new Map([['d1', 'Galpão Pinheiros']]);
    expect(batteryLocation(b({ status: 'charged', depotId: 'd1' }), { depots })).toBe('Galpão Pinheiros');
    expect(batteryLocation(b({ status: 'charging', depotId: 'd1' }), { depots })).toBe('Carregador · Galpão Pinheiros');
    expect(batteryLocation(b({ status: 'defective', depotId: 'd1' }), { depots })).toBe('Fora de uso · Galpão Pinheiros');
    expect(batteryLocation(b({ status: 'defective' }))).toBe('Fora de uso');
  });
});

describe('baterias: ações por situação e por grupo', () => {
  it('espelha as regras do contrato', () => {
    expect(batteryActions('charging')).toEqual({ markCharged: true, reportDefect: true, retire: true });
    expect(batteryActions('charged')).toEqual({ markCharged: false, reportDefect: true, retire: true });
    expect(batteryActions('defective')).toEqual({ markCharged: false, reportDefect: false, retire: true });
    expect(batteryActions('in_vehicle')).toEqual({ markCharged: false, reportDefect: false, retire: false });
    expect(batteryActions('retired')).toEqual({ markCharged: false, reportDefect: false, retire: false });
  });
  it('x-required-groups do contrato', () => {
    expect(can(['operacao'], 'battery.create')).toBe(true);
    expect(can(['campo'], 'battery.create')).toBe(false);
    expect(can(['campo'], 'battery.markCharged')).toBe(true);
    expect(can(['suporte'], 'battery.markCharged')).toBe(false);
    expect(can(['campo'], 'battery.reportDefect')).toBe(true);
    expect(can(['campo'], 'battery.retire')).toBe(false);
    expect(can(['admin'], 'battery.retire')).toBe(true);
    expect(can(['suporte'], 'battery.movements')).toBe(true);
    expect(can(['financeiro'], 'battery.movements')).toBe(false);
  });
});

describe('baterias: motivo e cadastro', () => {
  it('motivo do defeito é obrigatório, 3 a 500', () => {
    expect(validateReason('  ')).toEqual({ error: 'Informe o motivo' });
    expect(validateReason('ab').error).toMatch(/ao menos 3/);
    expect(validateReason('x'.repeat(501)).error).toMatch(/no máximo 500/);
    expect(validateReason(' Carcaça trincada ')).toEqual({ reason: 'Carcaça trincada' });
  });
  it('motivo da baixa é opcional', () => {
    expect(validateReason('', false)).toEqual({});
    expect(validateReason('ab', false).error).toBeDefined();
  });
  it('cadastra carregando com carga opcional e carregada sempre sem carga', () => {
    expect(buildBatteryCreate({ serial: ' bt-200001 ', status: 'charging', depotId: 'd1', chargePct: '' })).toEqual({ ok: true, body: { serial: 'BT-200001', status: 'charging', depotId: 'd1' } });
    expect(buildBatteryCreate({ serial: 'BT-2', status: 'charging', depotId: 'd1', chargePct: '40' })).toEqual({ ok: true, body: { serial: 'BT-2', status: 'charging', depotId: 'd1', chargePct: 40 } });
    expect(buildBatteryCreate({ serial: 'BT-3', status: 'charged', depotId: 'd1', chargePct: '40' })).toEqual({ ok: true, body: { serial: 'BT-3', status: 'charged', depotId: 'd1' } });
  });
  it('valida série, galpão e carga', () => {
    expect(buildBatteryCreate({ serial: 'B', status: 'charged', depotId: 'd1', chargePct: '' })).toMatchObject({ ok: false });
    expect(buildBatteryCreate({ serial: 'BT 1', status: 'charged', depotId: 'd1', chargePct: '' })).toMatchObject({ ok: false });
    expect(buildBatteryCreate({ serial: 'BT-1', status: 'charged', depotId: '', chargePct: '' })).toEqual({ ok: false, error: 'Escolha o galpão' });
    expect(buildBatteryCreate({ serial: 'BT-1', status: 'charging', depotId: 'd1', chargePct: '101' })).toEqual({ ok: false, error: 'Carga de 0 a 100%' });
  });
});

describe('baterias: movimentações', () => {
  const m = (over: Partial<S<'BatteryMovement'>>): S<'BatteryMovement'> => ({ id: 'm1', batteryId: 'b1', toStatus: 'charging', actorId: 'u1', at: '2026-10-22T13:30:00Z', ...over });
  it('título de cadastro e de mudança', () => {
    expect(movementTitle(m({}))).toBe('Cadastrada · Carregando');
    expect(movementTitle(m({ fromStatus: 'charging', toStatus: 'charged' }))).toBe('Carregando → Carregada');
  });
  it('horário no fuso do galpão, com São Paulo como padrão e fuso inválido tolerado', () => {
    expect(formatDateTimeIn('2026-10-22T13:30:00Z')).toBe('22/10/2026, 10:30');
    expect(formatDateTimeIn('2026-10-22T13:30:00Z', 'America/Manaus')).toBe('22/10/2026, 09:30');
    expect(formatDateTimeIn('2026-10-22T13:30:00Z', 'Nao/Existe')).toBe('22/10/2026, 10:30');
    expect(formatDateTimeIn(undefined)).toBe('—');
  });
});

describe('galpão: estoque mínimo de carregadas', () => {
  const base = { ...emptyDepotDraft(), name: 'G', address: 'R', lat: -23.5, lng: -46.6 };
  it('vazio = sem alerta: fora da criação e 0 na edição', () => {
    expect(depotCreateBody(base)).not.toHaveProperty('minChargedBatteries');
    expect(depotUpdateBody({ ...base, id: 'd1' })).toMatchObject({ minChargedBatteries: 0 });
  });
  it('envia o valor informado', () => {
    expect(depotCreateBody({ ...base, minChargedBatteries: '5' })).toMatchObject({ minChargedBatteries: 5 });
    expect(depotUpdateBody({ ...base, id: 'd1', minChargedBatteries: ' 12 ' })).toMatchObject({ minChargedBatteries: 12 });
  });
  it('valida 0 a 1000', () => {
    expect(validateDepot({ ...base, minChargedBatteries: '1001' }).minChargedBatteries).toBeDefined();
    expect(validateDepot({ ...base, minChargedBatteries: '-1' }).minChargedBatteries).toBeDefined();
    expect(validateDepot({ ...base, minChargedBatteries: '1,5' }).minChargedBatteries).toBeDefined();
    expect(validateDepot({ ...base, minChargedBatteries: '' }).minChargedBatteries).toBeUndefined();
    expect(validateDepot({ ...base, minChargedBatteries: '0' }).minChargedBatteries).toBeUndefined();
  });
  it('o formulário traz o valor do galpão (0 ou ausente = vazio)', () => {
    const depot = { id: 'd1', name: 'G', address: 'R', lat: 0, lng: 0, timezone: 'America/Sao_Paulo', openingHours: [], pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30, active: true } satisfies S<'Depot'>;
    expect(draftFromDepot({ ...depot, minChargedBatteries: 8 }).minChargedBatteries).toBe('8');
    expect(draftFromDepot({ ...depot, minChargedBatteries: 0 }).minChargedBatteries).toBe('');
    expect(draftFromDepot(depot).minChargedBatteries).toBe('');
  });
});

describe('alertas', () => {
  it('estoque baixo tem rótulo em português', () => {
    expect(ALERT_TYPE.battery_stock_low[0]).toBe('Poucas baterias carregadas no galpão');
  });
});
