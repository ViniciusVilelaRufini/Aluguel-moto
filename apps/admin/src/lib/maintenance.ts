import type { S } from './types';
import type { Tone } from './status';

export type ServiceInfo = S<'VehicleServiceInfo'>;

/** Situação da revisão preventiva (contrato: `VehicleServiceStatus`), no vocabulário do design. */
export const SERVICE_STATUS: Record<S<'VehicleServiceStatus'>, [string, Tone]> = {
  ok: ['Em dia', 'success'],
  due_soon: ['Próxima', 'warning'],
  overdue: ['Vencida', 'danger'],
};

export const MAINTENANCE_SOURCE: Record<S<'MaintenanceSource'>, string> = {
  staff: 'Painel',
  customer: 'Cliente',
  system: 'Automática',
};

const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function formatKm(n?: number | null): string {
  return n === undefined || n === null ? '—' : `${int.format(Math.round(n))} km`;
}

export function formatHours(n?: number | null): string {
  return n === undefined || n === null ? '—' : `${int.format(Math.round(n))} h`;
}

/**
 * Coluna "Próxima revisão": "Atrasada" quando vencida; senão o que vence primeiro
 * (proporcionalmente ao intervalo), "em 588 km" ou "em 12 h".
 */
export function nextServiceLabel(s: ServiceInfo): string {
  if (s.status === 'overdue' || s.kmUntilService <= 0 || s.hoursUntilService <= 0) return 'Atrasada';
  const kmShare = s.kmUntilService / Math.max(1, s.serviceIntervalKm);
  const hShare = s.hoursUntilService / Math.max(1, s.serviceIntervalHours);
  return kmShare <= hShare ? `em ${formatKm(s.kmUntilService)}` : `em ${formatHours(s.hoursUntilService)}`;
}

/** Origem da manutenção: painel, pedido do cliente do plano (com o nome) ou regra automática. */
export function maintenanceOrigin(t: Pick<S<'MaintenanceTask'>, 'source' | 'customerName'>): string {
  const src = t.source ?? 'staff';
  if (src === 'customer') return t.customerName ? `Cliente · ${t.customerName}` : 'Cliente';
  return MAINTENANCE_SOURCE[src];
}
