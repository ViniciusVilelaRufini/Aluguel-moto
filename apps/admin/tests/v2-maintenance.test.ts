import { describe, expect, it } from 'vitest';
import { customerNameFor, formatHours, formatKm, loadOpenTasks, maintenanceOrigin, nextServiceLabel, type ServiceInfo } from '@/lib/maintenance';

const base: ServiceInfo = {
  odometerKm: 5412, usageHours: 420, kmSinceService: 412, hoursSinceService: 38, serviceIntervalKm: 1000, serviceIntervalHours: 100,
  nextServiceAtKm: 6000, nextServiceAtHours: 482, kmUntilService: 588, hoursUntilService: 62, status: 'ok',
};

describe('manutenção por km/horas', () => {
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

  it('origem: operação vê só o primeiro nome do cliente; admin e suporte, o nome inteiro', () => {
    expect(maintenanceOrigin({ source: 'customer', customerName: 'Ana Paula Souza' }, false)).toBe('Cliente · Ana');
    expect(maintenanceOrigin({ source: 'customer', customerName: 'Ana Paula Souza' }, true)).toBe('Cliente · Ana Paula Souza');
    expect(customerNameFor('  Ana Paula Souza ', ['operacao'])).toBe('Ana');
    expect(customerNameFor('Ana Paula Souza', ['suporte'])).toBe('Ana Paula Souza');
    expect(customerNameFor('Ana Paula Souza', ['admin'])).toBe('Ana Paula Souza');
    expect(customerNameFor('Ana Paula Souza', ['operacao', 'suporte'])).toBe('Ana Paula Souza');
    expect(customerNameFor(undefined, ['operacao'])).toBeUndefined();
  });

  it('em aberto: junta agendadas e em andamento consultadas já filtradas no servidor', async () => {
    // O servidor tem 200 concluídas na frente; a lista sem filtro esconderia as abertas.
    const calls: (string | undefined)[] = [];
    const t = (id: string, status: 'scheduled' | 'in_progress', scheduledFor?: string) => ({ id, vehicleId: 'v', kind: 'preventive' as const, title: 'Revisão', status, scheduledFor, createdAt: 'x', updatedAt: 'x' });
    const get = async (status: 'scheduled' | 'in_progress', cursor?: string) => {
      calls.push(status);
      if (status === 'scheduled') return cursor ? { items: [t('s2', 'scheduled', '2026-10-25T12:00:00Z')] } : { items: [t('s1', 'scheduled', '2026-10-24T12:00:00Z')], nextCursor: 'c2' };
      return { items: [t('p1', 'in_progress', '2026-10-23T12:00:00Z'), t('s1', 'scheduled', '2026-10-24T12:00:00Z')] };
    };
    const r = await loadOpenTasks(get);
    expect(r.items.map((x) => x.id)).toEqual(['p1', 's1', 's2']);
    expect(r.capped).toBe(false);
    expect(calls.every((c) => c === 'scheduled' || c === 'in_progress')).toBe(true);
  });

  it('em aberto: avisa quando passa do limite de páginas', async () => {
    let n = 0;
    const get = async () => ({ items: [{ id: `x${n++}`, vehicleId: 'v', kind: 'preventive' as const, title: 'R', status: 'scheduled' as const, createdAt: 'x', updatedAt: 'x' }], nextCursor: 'more' });
    const r = await loadOpenTasks(get, 3);
    expect(r.capped).toBe(true);
  });

  it('origem: painel, cliente com nome, automática', () => {
    expect(maintenanceOrigin({ source: 'staff' })).toBe('Painel');
    expect(maintenanceOrigin({})).toBe('Painel');
    expect(maintenanceOrigin({ source: 'customer', customerName: 'Ana' })).toBe('Cliente · Ana');
    expect(maintenanceOrigin({ source: 'customer' })).toBe('Cliente');
    expect(maintenanceOrigin({ source: 'system' })).toBe('Automática');
  });
});
