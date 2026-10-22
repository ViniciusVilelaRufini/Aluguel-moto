import type { Tone } from './status';
import type { S } from './types';

type Reservation = S<'Reservation'>;
export type ReservationStatus = S<'ReservationStatus'>;
export type PickupModeFilter = 'all' | 'now' | 'scheduled';

const TZ = 'America/Sao_Paulo';

export const RESERVATION_STATUS: Record<ReservationStatus, { label: string; tone: Tone }> = {
  active: { label: 'Aguardando', tone: 'warning' },
  handover: { label: 'Em entrega', tone: 'info' },
  converted: { label: 'Retirada', tone: 'success' },
  canceled: { label: 'Cancelada', tone: 'neutral' },
  expired: { label: 'Expirada', tone: 'neutral' },
};
export const RESERVATION_STATUSES = Object.keys(RESERVATION_STATUS) as ReservationStatus[];

export const PICKUP_MODE_LABEL = { now: 'Agora', scheduled: 'Agendada' } as const;

/** "HH:MM" no fuso de São Paulo. */
export function formatHourMinute(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

/** Horário de retirada: `pickupAt` na agendada, `createdAt` em "retirar agora" (mesma regra da API). */
export function pickupInstant(r: Reservation): string {
  return r.pickupMode === 'scheduled' && r.pickupAt ? r.pickupAt : r.createdAt;
}

export function sortPickups(items: Reservation[]): Reservation[] {
  return [...items].sort((a, b) => pickupInstant(a).localeCompare(pickupInstant(b)) || a.id.localeCompare(b.id));
}

/** LGPD: a operação vê só o primeiro nome, mesmo que venha mais do que isso. */
export function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'Cliente';
}

export interface PickupRow {
  id: string;
  time: string;
  mode: 'now' | 'scheduled';
  modeLabel: string;
  customer: string;
  vehicleCode: string;
  status: ReservationStatus;
  statusLabel: string;
  tone: Tone;
  /** Prazo para retirar (`expiresAt`), em HH:MM. */
  deadline: string;
  handoverId?: string;
}

/** Só os campos que a agenda mostra: o `pickupCode` nunca entra (nem que a resposta o traga). */
export function toPickupRows(items: Reservation[], mode: PickupModeFilter): PickupRow[] {
  return sortPickups(items)
    .filter((r) => mode === 'all' || (r.pickupMode ?? 'now') === mode)
    .map((r) => {
      const m = r.pickupMode === 'scheduled' ? 'scheduled' : 'now';
      const st = RESERVATION_STATUS[r.status];
      return {
        id: r.id,
        time: formatHourMinute(pickupInstant(r)),
        mode: m,
        modeLabel: PICKUP_MODE_LABEL[m],
        customer: firstName(r.customerFirstName),
        vehicleCode: r.vehicle?.code ?? '—',
        status: r.status,
        statusLabel: st.label,
        tone: st.tone,
        deadline: formatHourMinute(r.expiresAt),
        ...(r.handoverId ? { handoverId: r.handoverId } : {}),
      };
    });
}
