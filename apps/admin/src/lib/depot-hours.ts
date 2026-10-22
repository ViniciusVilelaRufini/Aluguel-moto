import type { S } from './types';

type Depot = S<'Depot'>;
type OpeningHours = S<'DepotOpeningHours'>;

/** 0 = domingo … 6 = sábado (contrato `DepotOpeningHours.weekday`). */
export const WEEKDAY_LABEL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
/** Ordem de exibição: a semana começa na segunda. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const DEPOT_TIMEZONE = 'America/Sao_Paulo';
export const DEFAULT_WINDOWS = { pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30 } as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isHHMM = (v: string) => HHMM.test(v);

export interface DayDraft { open: boolean; opensAt: string; closesAt: string }
/** Índice = weekday. */
export type HoursDraft = DayDraft[];

export const MSG_FORMAT = 'Use o formato HH:MM (ex.: 08:00)';
export const MSG_ORDER = 'A abertura precisa ser antes do fechamento';

export function hoursFromApi(list: OpeningHours[] = [], fallback: Omit<DayDraft, 'open'> = { opensAt: '08:00', closesAt: '18:00' }): HoursDraft {
  return Array.from({ length: 7 }, (_, wd) => {
    const h = list.find((x) => x.weekday === wd);
    return h ? { open: true, opensAt: h.opensAt, closesAt: h.closesAt } : { open: false, ...fallback };
  });
}

export function hoursToApi(d: HoursDraft): OpeningHours[] {
  return d.flatMap((day, weekday) => (day.open ? [{ weekday, opensAt: day.opensAt, closesAt: day.closesAt }] : []));
}

/** Erros por weekday; só os dias abertos são conferidos. "HH:MM" compara como texto. */
export function validateHours(d: HoursDraft): Record<number, string> {
  const errors: Record<number, string> = {};
  d.forEach((day, wd) => {
    if (!day.open) return;
    if (!isHHMM(day.opensAt) || !isHHMM(day.closesAt)) errors[wd] = MSG_FORMAT;
    else if (day.opensAt >= day.closesAt) errors[wd] = MSG_ORDER;
  });
  return errors;
}

/** "Seg–Sex 07:00–20:00 · Sáb 08:00–18:00 · Dom fechado". */
export function summarizeHours(list: OpeningHours[]): string {
  if (list.length === 0) return 'Fechado todos os dias';
  const text = (wd: number) => {
    const h = list.find((x) => x.weekday === wd);
    return h ? `${h.opensAt}–${h.closesAt}` : 'fechado';
  };
  const groups: { from: number; to: number; text: string }[] = [];
  for (const wd of WEEK_ORDER) {
    const t = text(wd);
    const last = groups[groups.length - 1];
    if (last && last.text === t) last.to = wd;
    else groups.push({ from: wd, to: wd, text: t });
  }
  return groups.map((g) => `${WEEKDAY_SHORT[g.from]}${g.from === g.to ? '' : `–${WEEKDAY_SHORT[g.to]}`} ${g.text}`).join(' · ');
}

export interface DepotDraft {
  id?: string;
  name: string;
  address: string;
  district: string;
  lat: number | null;
  lng: number | null;
  hours: HoursDraft;
  pickupNowWindowMinutes: string;
  maxScheduleDays: string;
  scheduledGraceMinutes: string;
  active: boolean;
}

export function emptyDepotDraft(): DepotDraft {
  return {
    name: '', address: '', district: '', lat: null, lng: null,
    // Segunda a sábado 08:00–18:00; domingo fechado.
    hours: hoursFromApi([1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: '08:00', closesAt: '18:00' }))),
    pickupNowWindowMinutes: String(DEFAULT_WINDOWS.pickupNowWindowMinutes),
    maxScheduleDays: String(DEFAULT_WINDOWS.maxScheduleDays),
    scheduledGraceMinutes: String(DEFAULT_WINDOWS.scheduledGraceMinutes),
    active: true,
  };
}

export function draftFromDepot(d: Depot): DepotDraft {
  return {
    id: d.id, name: d.name, address: d.address, district: d.district ?? '', lat: d.lat, lng: d.lng,
    hours: hoursFromApi(d.openingHours),
    pickupNowWindowMinutes: String(d.pickupNowWindowMinutes),
    maxScheduleDays: String(d.maxScheduleDays),
    scheduledGraceMinutes: String(d.scheduledGraceMinutes),
    active: d.active,
  };
}

type WindowField = 'pickupNowWindowMinutes' | 'maxScheduleDays' | 'scheduledGraceMinutes';
export type DepotErrors = Partial<Record<'name' | 'address' | 'point' | WindowField, string>> & { days?: Record<number, string> };

/** Limites de `DepotInput` no contrato. */
const WINDOW_RULES: Record<WindowField, { min: number; max: number; msg: string }> = {
  pickupNowWindowMinutes: { min: 15, max: 480, msg: 'Entre 15 e 480 minutos' },
  maxScheduleDays: { min: 0, max: 30, msg: 'Entre 0 e 30 dias' },
  scheduledGraceMinutes: { min: 0, max: 120, msg: 'Entre 0 e 120 minutos' },
};

const intIn = (v: string, min: number, max: number) => /^\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max;

export function validateDepot(d: DepotDraft): DepotErrors {
  const e: DepotErrors = {};
  if (!d.name.trim()) e.name = 'Informe o nome do galpão';
  if (!d.address.trim()) e.address = 'Informe o endereço';
  if (d.lat == null || d.lng == null) e.point = 'Clique no mapa para marcar o ponto do galpão';
  for (const f of Object.keys(WINDOW_RULES) as WindowField[]) {
    const r = WINDOW_RULES[f];
    if (!intIn(d[f], r.min, r.max)) e[f] = r.msg;
  }
  const days = validateHours(d.hours);
  if (Object.keys(days).length > 0) e.days = days;
  return e;
}

export function depotToBody(d: DepotDraft): S<'DepotInput'> {
  const district = d.district.trim();
  return {
    name: d.name.trim(),
    address: d.address.trim(),
    ...(district ? { district } : {}),
    lat: d.lat as number,
    lng: d.lng as number,
    timezone: DEPOT_TIMEZONE,
    openingHours: hoursToApi(d.hours),
    pickupNowWindowMinutes: Number(d.pickupNowWindowMinutes),
    maxScheduleDays: Number(d.maxScheduleDays),
    scheduledGraceMinutes: Number(d.scheduledGraceMinutes),
    active: d.active,
  };
}
