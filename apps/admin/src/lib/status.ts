import type { AlertPriority, CommandStatus, CommandStatusReason, VehicleStatus } from './types';

export const VEHICLE_STATUSES: VehicleStatus[] = ['free', 'rented', 'reserved', 'paused', 'blocked', 'maintenance', 'offline'];

/** Hex dos tokens `--status-*` (o MapLibre não lê variáveis CSS). */
export const STATUS_COLOR: Record<VehicleStatus, string> = {
  free: '#34C25C',
  rented: '#2F7FE0',
  reserved: '#F07A2A',
  paused: '#FBC531',
  blocked: '#E04E42',
  maintenance: '#8B7CF6',
  offline: '#9AA0A6',
};

export const STATUS_LABEL: Record<VehicleStatus, string> = {
  free: 'Livre',
  rented: 'Alugada',
  reserved: 'Reservada',
  paused: 'Pausada',
  blocked: 'Bloqueada',
  maintenance: 'Manutenção',
  offline: 'Sem sinal',
};

export function batteryColor(pct: number): string {
  if (pct > 50) return 'var(--battery-high)';
  if (pct > 20) return 'var(--battery-mid)';
  return 'var(--battery-low)';
}

export type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

export function priorityTone(p: AlertPriority): Tone {
  return p === 'critical' ? 'danger' : p === 'high' ? 'warning' : p === 'medium' ? 'info' : 'neutral';
}

export const PRIORITY_LABEL: Record<AlertPriority, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
export const PRIORITY_ORDER: Record<AlertPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function commandStateLabel(status: CommandStatus, reason?: CommandStatusReason): string {
  switch (status) {
    case 'pending':
      return reason === 'offline' ? 'moto offline — será aplicado ao reconectar' : 'pendente';
    case 'in_progress':
      return 'em andamento';
    case 'confirmed':
      return 'confirmado';
    case 'failed':
      if (reason === 'did_not_stop') return 'falhou: a moto não parou';
      if (reason === 'timeout') return 'falhou: sem resposta da moto';
      if (reason === 'invalid_limit') return 'falhou: limite inválido';
      return 'falhou';
  }
}

export function commandStateTone(status: CommandStatus, reason?: CommandStatusReason): Tone {
  if (status === 'confirmed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending' && reason === 'offline') return 'warning';
  return 'info';
}
