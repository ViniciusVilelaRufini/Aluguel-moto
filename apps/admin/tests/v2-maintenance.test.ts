import { describe, expect, it } from 'vitest';
import { SERVICE_STATUS, formatHours, formatKm, maintenanceOrigin, nextServiceLabel, type ServiceInfo } from '@/lib/maintenance';

const base: ServiceInfo = {
  odometerKm: 5412, usageHours: 420, kmSinceService: 412, hoursSinceService: 38, serviceIntervalKm: 1000, serviceIntervalHours: 100,
  nextServiceAtKm: 6000, nextServiceAtHours: 482, kmUntilService: 588, hoursUntilService: 62, status: 'ok',
};

describe('manutenção por km/horas', () => {
  it('situação no vocabulário do design', () => {
    expect(SERVICE_STATUS.ok).toEqual(['Em dia', 'success']);
    expect(SERVICE_STATUS.due_soon).toEqual(['Próxima', 'warning']);
    expect(SERVICE_STATUS.overdue).toEqual(['Vencida', 'danger']);
  });

  it('formata km e horas sem casas e com separador pt-BR', () => {
    expect(formatKm(1012.4)).toBe('1.012 km');
    expect(formatHours(95.6)).toBe('96 h');
    expect(formatKm(undefined)).toBe('—');
  });

  it('próxima revisão: o que vence primeiro, proporcional ao intervalo', () => {
    expect(nextServiceLabel(base)).toBe('em 588 km');
    expect(nextServiceLabel({ ...base, kmUntilService: 700, hoursUntilService: 12 })).toBe('em 12 h');
  });

  it('vencida mostra "Atrasada" (status ou contador negativo)', () => {
    expect(nextServiceLabel({ ...base, status: 'overdue', kmUntilService: -12 })).toBe('Atrasada');
    expect(nextServiceLabel({ ...base, hoursUntilService: -1 })).toBe('Atrasada');
  });

  it('origem: painel, cliente com nome, automática', () => {
    expect(maintenanceOrigin({ source: 'staff' })).toBe('Painel');
    expect(maintenanceOrigin({})).toBe('Painel');
    expect(maintenanceOrigin({ source: 'customer', customerName: 'Ana' })).toBe('Cliente · Ana');
    expect(maintenanceOrigin({ source: 'customer' })).toBe('Cliente');
    expect(maintenanceOrigin({ source: 'system' })).toBe('Automática');
  });
});
