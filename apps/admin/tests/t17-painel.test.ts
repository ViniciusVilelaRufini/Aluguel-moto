import { describe, expect, it } from 'vitest';
import { AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_OPTIONS, auditActionLabel, auditEntityLabel } from '@/lib/audit-labels';
import { fitPoints } from '@/lib/fleet-fit';
import { moneyDelta } from '@/lib/finance-delta';

describe('rótulos da Auditoria', () => {
  it('ações e entidades conhecidas saem em pt-BR', () => {
    expect(auditActionLabel('wallet.adjustment')).toBe('Ajuste de carteira');
    expect(auditActionLabel('battery.retire')).toBe('Baixa de bateria');
    expect(auditActionLabel('battery.create')).toBe('Bateria cadastrada');
    expect(auditEntityLabel('SwapStation')).toBe('Estação de troca');
    expect(auditEntityLabel('Battery')).toBe('Bateria');
  });
  it('comando remoto desconhecido e ação nova caem num texto legível / no identificador', () => {
    expect(auditActionLabel('vehicle.command.limit_speed')).toBe('Comando remoto: limit_speed');
    expect(auditActionLabel('algo.novo')).toBe('algo.novo');
    expect(auditEntityLabel('Coisa')).toBe('Coisa');
    expect(auditEntityLabel('vehicle')).toBe('Moto');
  });
  it('filtros: "todas" primeiro, valor técnico preservado', () => {
    expect(AUDIT_ACTION_OPTIONS[0]).toEqual({ value: '', label: 'Todas as ações' });
    expect(AUDIT_ACTION_OPTIONS).toContainEqual({ value: 'battery.mark_charged', label: 'Bateria marcada como carregada' });
    expect(AUDIT_ENTITY_OPTIONS).toContainEqual({ value: 'Depot', label: 'Galpão' });
  });
});

describe('enquadramento do mapa da Frota', () => {
  it('ignora motos sem sinal (posição antiga fora da cidade)', () => {
    const v = [{ lat: -23.5, lng: -46.6, status: 'free' }, { lat: 0, lng: 0, status: 'offline' }];
    expect(fitPoints(v)).toEqual([v[0]]);
  });
  it('sem nenhuma moto com sinal usa todas', () => {
    const v = [{ lat: 1, lng: 1, status: 'offline' }];
    expect(fitPoints(v)).toEqual(v);
  });
});

describe('variação em reais sem mudança', () => {
  it('diz "Sem variação" em vez de repetir R$ 0,00', () => {
    expect(moneyDelta(0, 0)).toEqual({ text: 'Sem variação', trend: 'flat' });
  });
});
