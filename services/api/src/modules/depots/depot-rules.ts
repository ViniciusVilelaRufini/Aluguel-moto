export type OpeningHours = { weekday: number; opensAt: string; closesAt: string }[];

export interface DepotRulesInput {
  openingHours: OpeningHours;
  timezone: string;
  pickupNowWindowMinutes: number;
  maxScheduleDays: number;
  scheduledGraceMinutes: number;
}

export type PickupMode = 'now' | 'scheduled';
export type PickupErrorCode =
  | 'depot-closed'
  | 'pickup-outside-hours'
  | 'pickup-too-far-ahead'
  | 'pickup-in-past'
  | 'pickup-at-required';

const MINUTE = 60_000;
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

function localParts(timezone: string, at: Date): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(at)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS[p.weekday],
  };
}

/** Converts a wall-clock time in the given timezone to a UTC instant. */
function localToUtc(timezone: string, year: number, month: number, day: number, minutesOfDay: number): Date {
  const wall = Date.UTC(year, month - 1, day, 0, minutesOfDay);
  let result = wall;
  for (let i = 0; i < 2; i++) {
    const p = localParts(timezone, new Date(result));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    result += wall - shown;
  }
  return new Date(result);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function hoursFor(depot: DepotRulesInput, weekday: number) {
  return depot.openingHours.find((h) => h.weekday === weekday);
}

export function isOpenAt(depot: DepotRulesInput, at: Date): boolean {
  const p = localParts(depot.timezone, at);
  const h = hoursFor(depot, p.weekday);
  if (!h) return false;
  const m = p.hour * 60 + p.minute;
  return m >= toMinutes(h.opensAt) && m < toMinutes(h.closesAt);
}

function closingToday(depot: DepotRulesInput, now: Date): Date | null {
  const p = localParts(depot.timezone, now);
  const h = hoursFor(depot, p.weekday);
  if (!h) return null;
  return localToUtc(depot.timezone, p.year, p.month, p.day, toMinutes(h.closesAt));
}

export function pickupExpiry(depot: DepotRulesInput, mode: PickupMode, now: Date, pickupAt?: Date): Date {
  if (mode === 'scheduled') {
    if (!pickupAt) throw new Error('pickupAt is required for scheduled pickups');
    return new Date(pickupAt.getTime() + depot.scheduledGraceMinutes * MINUTE);
  }
  const windowEnd = new Date(now.getTime() + depot.pickupNowWindowMinutes * MINUTE);
  const closing = closingToday(depot, now);
  return closing && closing < windowEnd ? closing : windowEnd;
}

export function validatePickup(
  depot: DepotRulesInput,
  mode: PickupMode,
  now: Date,
  pickupAt?: Date,
): { ok: true } | { ok: false; code: PickupErrorCode } {
  if (mode === 'now') {
    return isOpenAt(depot, now) ? { ok: true } : { ok: false, code: 'depot-closed' };
  }
  if (!pickupAt) return { ok: false, code: 'pickup-at-required' };
  if (pickupAt.getTime() <= now.getTime()) return { ok: false, code: 'pickup-in-past' };
  if (pickupAt.getTime() > now.getTime() + depot.maxScheduleDays * 24 * 60 * MINUTE) {
    return { ok: false, code: 'pickup-too-far-ahead' };
  }
  if (!isOpenAt(depot, pickupAt)) return { ok: false, code: 'pickup-outside-hours' };
  return { ok: true };
}

/** Bookable slots (ISO UTC) for a local day (YYYY-MM-DD); past and too-far-ahead slots are dropped. */
export function slotsForDay(depot: DepotRulesInput, day: string, now: Date, stepMinutes = 30): string[] {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  // Noon avoids any day-boundary ambiguity when resolving the weekday in the depot timezone.
  const weekday = localParts(depot.timezone, localToUtc(depot.timezone, year, month, dayOfMonth, 12 * 60)).weekday;
  const h = hoursFor(depot, weekday);
  if (!h) return [];
  const latest = now.getTime() + depot.maxScheduleDays * 24 * 60 * MINUTE;
  const slots: string[] = [];
  for (let m = toMinutes(h.opensAt); m + stepMinutes <= toMinutes(h.closesAt); m += stepMinutes) {
    const at = localToUtc(depot.timezone, year, month, dayOfMonth, m);
    if (at.getTime() > now.getTime() && at.getTime() <= latest) slots.push(at.toISOString());
  }
  return slots;
}
