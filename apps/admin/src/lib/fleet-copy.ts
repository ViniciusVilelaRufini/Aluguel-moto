import type { CommandType, S } from './types';
import { ALERT_TYPE, AUDIT_ACTION_LABEL } from './labels';
import type { TrackerControlMode } from './tracker';

type AlertType = S<'AlertType'>;

/** "GPS / 4G" em texto, como no design (ui_kits/admin/AdminMap.jsx: "4G forte" / "4G fraco"). */
export function signalLabel(online: boolean | undefined, signal: number | undefined): string {
  if (online === false) return 'Sem sinal';
  if (signal == null) return '—';
  if (signal <= 0) return 'Sem sinal';
  return signal >= 4 ? '4G forte' : '4G fraco';
}

/** Toast de comando enviado, com o complemento do design (FleetView.jsx). */
export function commandSentMessage(type: CommandType, extra: { speedLimitKmh?: number; on?: boolean } = {}, mode?: TrackerControlMode): string {
  switch (type) {
    case 'lock': return mode === 'relay_only' ? 'Bloqueio enviado · aguarda a moto parar e corta o relé' : 'Bloqueio enviado · reduz potência e trava abaixo de 3 km/h';
    case 'unlock': return 'Desbloqueio enviado';
    case 'horn': return 'Buzina acionada';
    case 'speed_limit': return extra.speedLimitKmh != null ? `Limite de ${extra.speedLimitKmh} km/h aplicado` : 'Limite de velocidade aplicado';
    case 'stolen_mode':
      if (extra.on === false) return 'Modo roubada desligado';
      return mode === 'relay_only' ? 'Modo roubada ligado · use Bloquear para cortar o relé com a moto parada' : 'Modo roubada: bloqueio + posição a cada 5 s';
  }
}

/**
 * P1-1: texto do diálogo do modo roubada. O rastreador só relé (J16) não bloqueia sozinho nem muda a frequência da posição pelo
 * modo roubada (spec GT06 §11): só marca a moto; o corte é pelo Bloquear, que espera a moto parar.
 */
export function stolenModeDescription(mode?: TrackerControlMode): string {
  return mode === 'relay_only'
    ? 'Marca a moto como roubada no sistema. Este rastreador só corta o relé: o modo roubada não bloqueia a moto nem muda a frequência da posição. Para cortar, use Bloquear (espera a moto parar).'
    : 'Bloqueia a moto e passa a enviar a posição a cada 5 segundos.';
}

/** "1 moto", "2 motos" (P2-8). */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** P2-11: "sem sinal" = rastreador desconectado (`online === false`); sem o campo (API antiga), o status `offline`. */
export function signalCount(vehicles: Array<{ online?: boolean; status: string }>): number {
  return vehicles.filter((v) => (v.online === undefined ? v.status === 'offline' : v.online === false)).length;
}

export function fleetBadgeText(total: number, noSignal: number): string {
  return `${plural(total, 'moto', 'motos')} · ${noSignal} sem sinal`;
}

const AUDIT_TIME = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** P3: hora do log com o dia ("03/11 09:34"): só a hora confundia eventos de dias diferentes. */
export function auditTime(iso: string): string {
  return AUDIT_TIME.format(new Date(iso)).replace(',', '');
}

/** P3: "Ver auditoria completa" já filtrada pela moto. */
export function auditHref(entityId: string): string {
  return `/team?tab=audit&entity=${encodeURIComponent(entityId)}`;
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

/** Responsável pré-selecionado no modal de atribuição: a escolha, senão quem está logado, senão o primeiro da lista. */
export function pickAssignee(people: { id: string }[], meId: string | undefined, picked: string): string {
  if (picked && people.some((p) => p.id === picked)) return picked;
  if (meId && people.some((p) => p.id === meId)) return meId;
  return people[0]?.id ?? '';
}

/** Toast após atribuir: "a você" quando é o próprio usuário, senão com o nome. */
export function assignToast(assigneeId: string, meId: string | undefined, name?: string): string {
  return assigneeId === meId ? 'Alerta atribuído a você' : `Alerta atribuído a ${name ?? 'outra pessoa'}`;
}

/**
 * Alertas pendentes = não resolvidos (abertos + atribuídos): total do servidor (`/reports/dashboard`) somado às
 * variações do tempo real desde a última consulta. Nunca negativo.
 */
export function pendingAlertCount(serverTotal: number | undefined, delta: number): number | null {
  // P2-3: sem o total do servidor (carregando/erro) → `null` ("—"), nunca 0.
  if (serverTotal === undefined) return null;
  return Math.max(0, serverTotal + delta);
}
