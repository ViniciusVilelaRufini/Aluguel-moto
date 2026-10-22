import type { S, StaffGroup } from './types';
import { loadAllPages, type Page } from './paging';
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

/**
 * Nome do cliente para o grupo: admin e suporte veem o nome inteiro; operação (e os demais), só o
 * primeiro nome (mesma regra da API para `campo`).
 */
export function customerNameFor(name: string | undefined, groups: StaffGroup[]): string | undefined {
  if (!name) return undefined;
  const full = groups.includes('admin') || groups.includes('suporte');
  return full ? name.trim() : name.trim().split(/\s+/)[0];
}

/** Origem da manutenção: painel, pedido do cliente do plano (com o nome) ou regra automática. */
export function maintenanceOrigin(t: Pick<S<'MaintenanceTask'>, 'source' | 'customerName'>, fullName = true): string {
  const src = t.source ?? 'staff';
  if (src === 'customer') {
    if (!t.customerName) return 'Cliente';
    return `Cliente · ${fullName ? t.customerName.trim() : t.customerName.trim().split(/\s+/)[0]}`;
  }
  return MAINTENANCE_SOURCE[src];
}

type OpenStatus = 'scheduled' | 'in_progress';

/**
 * "Em aberto": consulta já filtrada no servidor por `scheduled` e por `in_progress` (todas as páginas, até o
 * limite) e junta por data, sem duplicar. Filtrar no navegador uma página sem filtro esconderia as abertas
 * atrás de páginas de concluídas.
 */
export async function loadOpenTasks(
  get: (status: OpenStatus, cursor?: string) => Promise<Page<S<'MaintenanceTask'>>>, maxPages = 10,
): Promise<{ items: S<'MaintenanceTask'>[]; capped: boolean }> {
  const [a, b] = await Promise.all((['scheduled', 'in_progress'] as const).map((st) => loadAllPages((c) => get(st, c), maxPages)));
  const seen = new Set<string>();
  const items = [...b.items, ...a.items].filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  items.sort((x, y) => (x.scheduledFor ?? '9999').localeCompare(y.scheduledFor ?? '9999'));
  return { items, capped: a.capped || b.capped };
}
