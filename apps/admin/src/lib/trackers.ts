import { timeAgo } from './format';
import type { S } from './types';

/** Rastreador do estoque ou instalado numa moto (`TrackerDevice` do contrato). */
export type TrackerDevice = S<'TrackerDevice'>;

/** "Online", "Offline · último sinal há 5 min" ou "Nunca conectou" (tempo na linguagem de operação). */
export function trackerStatusLabel(t: Pick<TrackerDevice, 'online' | 'lastSeenAt'>, now: number): string {
  if (!t.lastSeenAt) return 'Nunca conectou';
  if (t.online) return 'Online';
  return `Offline · último sinal ${timeAgo(t.lastSeenAt, now)}`;
}

/** Final do IMEI para mostrar em confirmações ("final 3430"). */
export function imeiLast4(imei: string): string {
  return imei.slice(-4);
}

/** Só os dígitos da busca (a API filtra pelo IMEI). */
export function imeiQuery(q: string): string {
  return q.replace(/\D/g, '');
}
