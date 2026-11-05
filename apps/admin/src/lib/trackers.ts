import { timeAgo } from './format';
import type { S } from './types';

/** Rastreador do estoque ou instalado numa moto (`TrackerDevice` do contrato). */
export type TrackerDevice = S<'TrackerDevice'>;

/** Instalado e sem sinal por mais que isto (desde a instalação ou a abertura da ficha): para de esperar e orienta a conferir. */
export const TRACKER_NO_SIGNAL_AFTER_MS = 5 * 60_000;

/** Passou o prazo de espera do primeiro sinal? `since` ausente = sem referência (nunca vence). */
function waitExpired(now: number, since?: number): boolean {
  return since !== undefined && now - since > TRACKER_NO_SIGNAL_AFTER_MS;
}

/**
 * "Online", "Offline · último sinal há 5 min", "Aguardando o primeiro sinal (até ~1 min)" (instalado e ainda sem sinal: a ponte
 * cria o aparelho no Traccar em até ~1 min; depois de 5 min desde `since` vira "Sem sinal. Confira…") ou "Nunca conectou" (estoque).
 */
export function trackerStatusLabel(t: Pick<TrackerDevice, 'online' | 'lastSeenAt'> & { installed?: boolean }, now: number, since?: number): string {
  if (!t.lastSeenAt) {
    if (!t.installed) return 'Nunca conectou';
    return waitExpired(now, since) ? 'Sem sinal. Confira se o aparelho está ligado e com chip.' : 'Aguardando o primeiro sinal (até ~1 min)';
  }
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

/**
 * Rastreador da moto instalado e offline: o bloco "Rastreador e chip" recarrega a cada 10 s até ele aparecer online — e para depois
 * de 5 min desde `since` (instalação ou abertura da ficha).
 */
export const TRACKER_OFFLINE_REFETCH_MS = 10_000;

export function trackerRefetchInterval(t: Pick<TrackerDevice, 'installed' | 'online'> | undefined, now = Date.now(), since?: number): number | false {
  if (!t || !t.installed || t.online || waitExpired(now, since)) return false;
  return TRACKER_OFFLINE_REFETCH_MS;
}
