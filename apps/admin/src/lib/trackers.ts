import { timeAgo } from './format';
import type { S } from './types';

/** Rastreador do estoque ou instalado numa moto (`TrackerDevice` do contrato). */
export type TrackerDevice = S<'TrackerDevice'>;

/**
 * "Online", "Offline · último sinal há 5 min", "Aguardando o primeiro sinal (até ~1 min)" (instalado e ainda sem sinal: a ponte
 * cria o aparelho no Traccar em até ~1 min) ou "Nunca conectou" (estoque).
 */
export function trackerStatusLabel(t: Pick<TrackerDevice, 'online' | 'lastSeenAt'> & { installed?: boolean }, now: number): string {
  if (!t.lastSeenAt) return t.installed ? 'Aguardando o primeiro sinal (até ~1 min)' : 'Nunca conectou';
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

/** Rastreador da moto instalado e offline: o bloco "Rastreador e chip" recarrega a cada 10 s até ele aparecer online. */
export const TRACKER_OFFLINE_REFETCH_MS = 10_000;

export function trackerRefetchInterval(t: Pick<TrackerDevice, 'installed' | 'online'> | undefined): number | false {
  return t && t.installed && !t.online ? TRACKER_OFFLINE_REFETCH_MS : false;
}
