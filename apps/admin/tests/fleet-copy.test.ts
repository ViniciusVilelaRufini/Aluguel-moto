import { describe, expect, it } from 'vitest';
import { pendingAlertCount, assignToast, pickAssignee, auditWhat, commandSentMessage, criticalBanner, rentalWindow, signalLabel, toAuditRows } from '@/lib/fleet-copy';
import { allLayers, filterByLayers, toggleLayer, visibleCount, zoneTooltip } from '@/lib/zone-layers';
import { clusterDiameter, clusterImageId, parseClusterImageId } from '@/lib/map-icons';

describe('signalLabel', () => {
  it('maps signal to the design copy', () => {
    expect(signalLabel(true, 5)).toBe('4G forte');
    expect(signalLabel(true, 4)).toBe('4G forte');
    expect(signalLabel(true, 2)).toBe('4G fraco');
    expect(signalLabel(true, 0)).toBe('Sem sinal');
    expect(signalLabel(false, 5)).toBe('Sem sinal');
    expect(signalLabel(undefined, undefined)).toBe('—');
  });
});

describe('commandSentMessage', () => {
  it('uses the design complement', () => {
    expect(commandSentMessage('lock')).toBe('Bloqueio enviado · reduz potência e trava abaixo de 3 km/h');
    expect(commandSentMessage('speed_limit', { speedLimitKmh: 20 })).toBe('Limite de 20 km/h aplicado');
    expect(commandSentMessage('stolen_mode', { on: true })).toBe('Modo roubada: bloqueio + posição a cada 5 s');
    expect(commandSentMessage('stolen_mode', { on: false })).toBe('Modo roubada desligado');
    expect(commandSentMessage('horn')).toBe('Buzina acionada');
  });
});

describe('audit rows', () => {
  it('labels system and field events', () => {
    expect(auditWhat('vehicle.service_unlock')).toBe('Modo serviço');
    expect(auditWhat('vehicle.command.lock', { type: 'lock' })).toBe('Bloqueio');
    expect(auditWhat('vehicle.command.gradual_lock', { type: 'gradual_lock' })).toBe('Comando');
    expect(auditWhat('zone.update')).toBe('zone.update');
    const [r] = toAuditRows([{ id: '1', actorType: 'system', action: 'vehicle.command.lock', createdAt: '2026-01-01T00:00:00Z' }]);
    expect(r).toMatchObject({ who: 'Sistema', why: '—', what: 'Bloqueio' });
  });
});

describe('criticalBanner', () => {
  it('cites the types of the critical alerts', () => {
    expect(criticalBanner(['fall_detected', 'movement_without_rental'])).toBe('Queda detectada e moto em movimento sem aluguel exigem ação imediata.');
    expect(criticalBanner(['fall_detected', 'fall_detected'])).toBe('Queda detectada exige ação imediata.');
    expect(criticalBanner(['fall_detected', 'tamper', 'battery_critical'])).toBe('Queda detectada, violação do rastreador e bateria crítica exigem ação imediata.');
  });
});

describe('rentalWindow', () => {
  it('ends at endedAt, or now when ongoing', () => {
    expect(rentalWindow({ startedAt: 'a', endedAt: 'b' })).toEqual({ from: 'a', to: 'b' });
    expect(rentalWindow({ startedAt: 'a' }, new Date('2026-01-01T00:00:00Z'))).toEqual({ from: 'a', to: '2026-01-01T00:00:00.000Z' });
  });
});

describe('zone layers', () => {
  const zones = [{ type: 'operation' as const }, { type: 'return' as const }, { type: 'forbidden' as const }];
  it('filters by visible type', () => {
    const v = toggleLayer(allLayers(), 'return');
    expect(visibleCount(v)).toBe(3);
    expect(filterByLayers(zones, v).map((z) => z.type)).toEqual(['operation', 'forbidden']);
    expect(filterByLayers(zones, allLayers(false))).toEqual([]);
  });
  it('builds the tooltip', () => {
    const L = { operation: 'Operação', return: 'Devolução', forbidden: 'Proibida', reduced_speed: 'Velocidade' };
    expect(zoneTooltip({ name: 'Escola', type: 'reduced_speed', speedLimitKmh: 6 }, L)).toEqual({ title: 'Escola', detail: 'Velocidade · 6 km/h' });
  });
});

describe('cluster images', () => {
  it('round-trips ids and scales the diameter', () => {
    expect(parseClusterImageId(clusterImageId(12))).toBe(12);
    expect(parseClusterImageId('pin-bike')).toBeNull();
    expect(parseClusterImageId('cluster-0')).toBeNull();
    expect(clusterDiameter(3)).toBeLessThan(clusterDiameter(20));
    expect(clusterDiameter(20)).toBeLessThan(clusterDiameter(80));
  });
});

describe('assign modal logic', () => {
  const people = [{ id: 'a' }, { id: 'me' }, { id: 'c' }];
  it('defaults to the logged user, then the first, and keeps a valid pick', () => {
    expect(pickAssignee(people, 'me', '')).toBe('me');
    expect(pickAssignee(people, 'zzz', '')).toBe('a');
    expect(pickAssignee(people, 'me', 'c')).toBe('c');
    expect(pickAssignee(people, 'me', 'gone')).toBe('me');
    expect(pickAssignee([], 'me', '')).toBe('');
  });
  it('words the toast for self vs other', () => {
    expect(assignToast('me', 'me', 'Eu')).toBe('Alerta atribuído a você');
    expect(assignToast('c', 'me', 'Campo Dev')).toBe('Alerta atribuído a Campo Dev');
    expect(assignToast('c', 'me')).toBe('Alerta atribuído a outra pessoa');
  });
});

describe('pendingAlertCount (QA-02)', () => {
  it('usa o total do servidor, sem o teto de 100 da página', () => {
    expect(pendingAlertCount(636, 0)).toBe(636);
    expect(pendingAlertCount(636, 2)).toBe(638);
  });
  it('sem dado ainda é 0 e nunca fica negativo', () => {
    expect(pendingAlertCount(undefined, 0)).toBe(0);
    expect(pendingAlertCount(1, -3)).toBe(0);
  });
});
