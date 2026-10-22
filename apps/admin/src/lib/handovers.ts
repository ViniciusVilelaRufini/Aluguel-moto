import { canOpen } from './permissions';
import type { Tone } from './status';
import type { S, StaffGroup } from './types';

export type HandoverStatus = S<'HandoverStatus'>;
export type HandoverType = S<'HandoverType'>;
type ChecklistItem = S<'HandoverChecklistItem'>;

export const HANDOVER_STATUS: Record<HandoverStatus, { label: string; tone: Tone }> = {
  pending_customer: { label: 'Aguardando o cliente', tone: 'warning' },
  accepted: { label: 'Aceita', tone: 'success' },
  disputed: { label: 'Problema apontado', tone: 'danger' },
  canceled: { label: 'Cancelada', tone: 'neutral' },
};
export const HANDOVER_STATUSES = Object.keys(HANDOVER_STATUS) as HandoverStatus[];

export const HANDOVER_TYPE_LABEL: Record<HandoverType, string> = { pickup: 'Saída', return_depot: 'Chegada' };

const CHECKLIST_LABEL: Record<string, string> = {
  freios: 'Freios', pneus: 'Pneus', luzes: 'Luzes', carenagem: 'Carenagem', retrovisor: 'Retrovisor', bateria: 'Bateria',
  buzina: 'Buzina', painel: 'Painel', limpeza: 'Limpeza', capacete: 'Capacete',
};

export function checklistLabel(code: string): string {
  if (CHECKLIST_LABEL[code]) return CHECKLIST_LABEL[code];
  const t = code.replace(/[_-]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function checklistSummary(list: ChecklistItem[]): { ok: number; total: number; issues: ChecklistItem[] } {
  const issues = list.filter((i) => !i.ok);
  return { ok: list.length - issues.length, total: list.length, issues };
}

const ERROR_LABEL: Record<string, string> = {
  'payment-declined': 'Pagamento não aprovado',
  'gateway-unavailable': 'Pagamento indisponível no momento',
};

export function lastErrorLabel(slug?: string | null): string | null {
  if (!slug) return null;
  return ERROR_LABEL[slug] ?? slug;
}

/**
 * "Abrir no suporte": o contrato não liga a entrega à conversa/ticket (sem `customerId` nem id de ticket em
 * `Handover`), então leva à fila de atendimento de Clientes > Suporte. Quem não abre Clientes não vê o link.
 */
export function supportHref(groups: StaffGroup[]): string | null {
  return canOpen(groups, 'customers') ? '/customers?tab=support' : null;
}
