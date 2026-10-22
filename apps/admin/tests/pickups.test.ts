import { describe, expect, it } from 'vitest';
import { firstName, formatHourMinute, sortPickups, toPickupRows } from '@/lib/pickups';
import type { S } from '@/lib/types';

type R = S<'Reservation'>;

const base = (p: Partial<R>): R => ({ id: 'r', vehicleId: 'v', status: 'active', createdAt: '2026-10-22T12:00:00.000Z', expiresAt: '2026-10-22T14:00:00.000Z', depotId: 'd', ...p });

describe('agenda de retiradas', () => {
  it('mostra o horário em America/Sao_Paulo (UTC-3)', () => {
    expect(formatHourMinute('2026-10-22T12:05:00.000Z')).toBe('09:05');
    expect(formatHourMinute('2026-10-23T02:30:00.000Z')).toBe('23:30');
  });

  it('ordena por pickupAt (agendada) ou createdAt (agora)', () => {
    const items = [
      base({ id: 'b', pickupMode: 'scheduled', pickupAt: '2026-10-22T18:00:00.000Z', createdAt: '2026-10-20T10:00:00.000Z' }),
      base({ id: 'a', pickupMode: 'now', createdAt: '2026-10-22T11:00:00.000Z' }),
      base({ id: 'c', pickupMode: 'scheduled', pickupAt: '2026-10-22T13:00:00.000Z', createdAt: '2026-10-22T09:00:00.000Z' }),
    ];
    expect(sortPickups(items).map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('usa só o primeiro nome do cliente', () => {
    expect(firstName('Ana Maria Souza')).toBe('Ana');
    expect(firstName('  Bruno ')).toBe('Bruno');
    expect(firstName(undefined)).toBe('Cliente');
    expect(firstName('')).toBe('Cliente');
  });

  it('as linhas nunca levam o pickupCode nem o nome completo', () => {
    const rows = toPickupRows([
      base({ id: 'x', pickupMode: 'scheduled', pickupAt: '2026-10-22T17:30:00.000Z', customerFirstName: 'Carla Dias', pickupCode: 'v1.segredo.123.abc', vehicle: { id: 'v', code: 'VLT-0011', batteryPct: 90 } as never }),
    ], 'all');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'x', time: '14:30', customer: 'Carla', vehicleCode: 'VLT-0011', modeLabel: 'Agendada', statusLabel: 'Aguardando' });
    expect(JSON.stringify(rows)).not.toContain('segredo');
    expect(JSON.stringify(rows)).not.toContain('Dias');
  });

  it('filtra agora/agendada e traduz os status', () => {
    const items = [
      base({ id: 'n', pickupMode: 'now', status: 'handover' }),
      base({ id: 's', pickupMode: 'scheduled', pickupAt: '2026-10-22T15:00:00.000Z', status: 'expired' }),
    ];
    expect(toPickupRows(items, 'now').map((r) => r.id)).toEqual(['n']);
    expect(toPickupRows(items, 'scheduled').map((r) => r.id)).toEqual(['s']);
    const all = toPickupRows(items, 'all');
    expect(all.find((r) => r.id === 'n')).toMatchObject({ modeLabel: 'Agora', statusLabel: 'Em entrega', tone: 'info' });
    expect(all.find((r) => r.id === 's')).toMatchObject({ statusLabel: 'Expirada', tone: 'neutral' });
  });

  it('"agora" mostra o prazo de retirada; agendada mostra a tolerância', () => {
    const [r] = toPickupRows([base({ id: 'n', pickupMode: 'now', createdAt: '2026-10-22T12:00:00.000Z', expiresAt: '2026-10-22T14:00:00.000Z' })], 'all');
    expect(r.time).toBe('09:00');
    expect(r.deadline).toBe('11:00');
  });
});
