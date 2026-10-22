import { describe, expect, it } from 'vitest';
import { STATUS_COLOR, STATUS_LABEL, VEHICLE_STATUSES, batteryColor, commandStateLabel, priorityTone } from '@/lib/status';

describe('status -> color', () => {
  it('maps every vehicle status to its design-system token', () => {
    expect(STATUS_COLOR.free).toBe('#34C25C');
    expect(STATUS_COLOR.rented).toBe('#2F7FE0');
    expect(STATUS_COLOR.reserved).toBe('#F07A2A');
    expect(STATUS_COLOR.paused).toBe('#FBC531');
    expect(STATUS_COLOR.blocked).toBe('#E04E42');
    expect(STATUS_COLOR.maintenance).toBe('#8B7CF6');
    expect(STATUS_COLOR.offline).toBe('#9AA0A6');
    expect(Object.keys(STATUS_COLOR).sort()).toEqual([...VEHICLE_STATUSES].sort());
  });
  it('awaiting_pickup has its own token (teal-500), distinct from every other status', () => {
    expect(STATUS_COLOR.awaiting_pickup).toBe('#13A8A8');
    const others = VEHICLE_STATUSES.filter((s) => s !== 'awaiting_pickup').map((s) => STATUS_COLOR[s]);
    expect(others).not.toContain(STATUS_COLOR.awaiting_pickup);
    expect(STATUS_LABEL.awaiting_pickup).toBe('Aguardando recolhimento');
  });
  it('has pt-BR labels', () => {
    expect(STATUS_LABEL.offline).toBe('Sem sinal');
    expect(STATUS_LABEL.free).toBe('Livre');
  });
  it('colors battery by level (>50 green, 21-50 yellow, <=20 coral)', () => {
    expect(batteryColor(80)).toBe('var(--battery-high)');
    expect(batteryColor(50)).toBe('var(--battery-mid)');
    expect(batteryColor(21)).toBe('var(--battery-mid)');
    expect(batteryColor(20)).toBe('var(--battery-low)');
  });
  it('maps alert priority to a tone', () => {
    expect(priorityTone('critical')).toBe('danger');
    expect(priorityTone('high')).toBe('warning');
    expect(priorityTone('medium')).toBe('info');
    expect(priorityTone('low')).toBe('neutral');
  });
});

describe('command state label', () => {
  it('shows pending as pendente', () => {
    expect(commandStateLabel('pending')).toBe('pendente');
  });
  it('shows offline hint when pending with reason offline', () => {
    expect(commandStateLabel('pending', 'offline')).toBe('moto offline — será aplicado ao reconectar');
  });
  it('shows confirmed, in progress and failed', () => {
    expect(commandStateLabel('confirmed')).toBe('confirmado');
    expect(commandStateLabel('in_progress')).toBe('em andamento');
    expect(commandStateLabel('failed', 'did_not_stop')).toBe('falhou: a moto não parou');
    expect(commandStateLabel('failed', 'timeout')).toBe('falhou: sem resposta da moto');
  });
});
