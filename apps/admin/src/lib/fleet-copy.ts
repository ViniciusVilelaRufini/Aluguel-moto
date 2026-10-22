import type { CommandType, S } from './types';
type AlertType = S<'AlertType'>;
import { ALERT_TYPE, AUDIT_ACTION_LABEL } from './labels';

/** "GPS / 4G" em texto, como no design (ui_kits/admin/AdminMap.jsx: "4G forte" / "4G fraco"). */
export function signalLabel(online: boolean | undefined, signal: number | undefined): string {
  if (online === false) return 'Sem sinal';
  if (signal == null) return '—';
  if (signal <= 0) return 'Sem sinal';
  return signal >= 4 ? '4G forte' : '4G fraco';
}

/** Toast de comando enviado, com o complemento do design (FleetView.jsx). */
export function commandSentMessage(type: CommandType, extra: { speedLimitKmh?: number; on?: boolean } = {}): string {
  switch (type) {
    case 'lock': return 'Bloqueio enviado · reduz potência e trava abaixo de 3 km/h';
    case 'unlock': return 'Desbloqueio enviado';
    case 'horn': return 'Buzina acionada';
    case 'speed_limit': return extra.speedLimitKmh != null ? `Limite de ${extra.speedLimitKmh} km/h aplicado` : 'Limite de velocidade aplicado';
    case 'stolen_mode': return extra.on === false ? 'Modo roubada desligado' : 'Modo roubada: bloqueio + posição a cada 5 s';
  }
}

export interface AuditRow { id: string; at: string; what: string; who: string; why: string }

interface AuditLike {
  id: string; actorType: 'customer' | 'staff' | 'system'; actorName?: string; action: string; reason?: string; createdAt: string;
  metadata?: Record<string, unknown>;
}

/** Texto do evento de auditoria da moto ("Bloqueio", "Modo serviço", ...); cai na própria ação se desconhecida. */
export function auditWhat(action: string, metadata?: Record<string, unknown>): string {
  const exact = AUDIT_ACTION_LABEL[action];
  if (exact) return exact;
  if (action.startsWith('vehicle.command.')) {
    const t = (metadata?.type as string | undefined) ?? action.slice('vehicle.command.'.length);
    return AUDIT_ACTION_LABEL[`vehicle.command.${t}`] ?? 'Comando';
  }
  return action;
}

export function toAuditRows(items: AuditLike[]): AuditRow[] {
  return items.map((a) => ({
    id: a.id,
    at: a.createdAt,
    what: auditWhat(a.action, a.metadata),
    who: a.actorName ?? (a.actorType === 'system' ? 'Sistema' : a.actorType === 'customer' ? 'Cliente' : 'Equipe'),
    why: a.reason ?? '—',
  }));
}

/** "Queda detectada e moto em movimento sem aluguel exigem ação imediata." */
export function criticalBanner(types: AlertType[]): string {
  const uniq = [...new Set(types)].map((t) => ALERT_TYPE[t]?.[0] ?? t);
  if (uniq.length === 0) return 'Exigem ação imediata.';
  const parts = uniq.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1)));
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
  return `${list} ${parts.length === 1 ? 'exige' : 'exigem'} ação imediata.`;
}

/** Período do replay por aluguel: do início até o fim (ou agora, se em andamento). */
export function rentalWindow(r: { startedAt: string; endedAt?: string }, now: Date = new Date()): { from: string; to: string } {
  return { from: r.startedAt, to: r.endedAt ?? now.toISOString() };
}
