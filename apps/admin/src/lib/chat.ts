import type { S } from './types';

export type SupportMessage = S<'SupportMessage'>;
export type MessageStatus = S<'SupportMessageStatus'>;

/** Estado da mensagem do atendente: enviada (um tique), entregue (dois) e lida (dois, em destaque). */
export const MESSAGE_STATUS: Record<MessageStatus, { label: string; icon: 'Check' | 'CheckCheck'; strong: boolean }> = {
  sent: { label: 'Enviada', icon: 'Check', strong: false },
  delivered: { label: 'Entregue', icon: 'CheckCheck', strong: false },
  read: { label: 'Lida', icon: 'CheckCheck', strong: true },
};

/** Estado da mensagem; sem `status`, deduz por `readAt`/`deliveredAt`. */
export function messageStatus(m: Pick<SupportMessage, 'status' | 'readAt' | 'deliveredAt'>): MessageStatus {
  if (m.status) return m.status;
  if (m.readAt) return 'read';
  if (m.deliveredAt) return 'delivered';
  return 'sent';
}

/**
 * Mensagem do cliente mais recente, se alguma do cliente ainda não foi lida (para `POST .../read`
 * com `upToMessageId`). `undefined` quando não há nada a marcar.
 */
export function lastUnreadFromCustomer(messages: SupportMessage[]): string | undefined {
  const fromCustomer = messages.filter((m) => m.authorType === 'customer');
  if (!fromCustomer.some((m) => messageStatus(m) !== 'read')) return undefined;
  const sorted = [...fromCustomer].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return sorted[sorted.length - 1]?.id;
}
