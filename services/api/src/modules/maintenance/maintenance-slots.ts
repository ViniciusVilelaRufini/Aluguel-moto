/**
 * Janelas de manutenção para o cliente do plano semanal/mensal (contrato v2): 1 h, segunda a sábado, 08:00–18:00 em
 * America/Sao_Paulo (UTC−3 fixo: o Brasil não tem horário de verão desde 2019), começando na próxima hora cheia com
 * pelo menos 2 h de antecedência.
 */
export const SLOT_MINUTES = 60;
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 18;
export const MIN_LEAD_MS = 2 * 3600_000;
const SP_OFFSET_MS = -3 * 3600_000;
const HOUR_MS = 3600_000;

export interface Slot {
  startsAt: Date;
  endsAt: Date;
}

/** Hora local de São Paulo e dia da semana (0 = domingo). */
function local(d: Date): { hour: number; minute: number; weekday: number } {
  const l = new Date(d.getTime() + SP_OFFSET_MS);
  return { hour: l.getUTCHours(), minute: l.getUTCMinutes(), weekday: l.getUTCDay() };
}

const isOpen = (d: Date) => {
  const l = local(d);
  return l.weekday !== 0 && l.minute === 0 && l.hour >= OPEN_HOUR && l.hour < CLOSE_HOUR && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
};

export function generateSlots(now: Date, days: number): Slot[] {
  const first = Math.ceil((now.getTime() + MIN_LEAD_MS) / HOUR_MS) * HOUR_MS;
  const end = now.getTime() + days * 24 * HOUR_MS;
  const out: Slot[] = [];
  for (let t = first; t < end; t += HOUR_MS) {
    const s = new Date(t);
    if (isOpen(s)) out.push({ startsAt: s, endsAt: new Date(t + SLOT_MINUTES * 60_000) });
  }
  return out;
}

/** `startsAt` é o início de uma janela válida dentro do horizonte (14 dias). */
export function isValidSlotStart(startsAt: Date, now: Date, maxDays = 14): boolean {
  if (Number.isNaN(startsAt.getTime())) return false;
  if (startsAt.getTime() < now.getTime() + MIN_LEAD_MS || startsAt.getTime() > now.getTime() + maxDays * 24 * HOUR_MS) return false;
  return isOpen(startsAt);
}
