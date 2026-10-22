import type { PlanCode, StationSwapStatus } from '@prisma/client';
import { distanceM } from '../../common/util';
import type { VehicleLiveState } from '../../ports/iot-gateway.port';
import type { StationEventType } from '../../ports/station-gateway.port';

/** Distância máxima do celular até a estação (spec da troca por QR). */
export const SWAP_MAX_DISTANCE_M = 50;
/** Prazo de cada etapa (abrir vaga, devolver, liberar). Vencido → a troca é cancelada ou falha, sem liberar bateria. */
export const SWAP_STEP_TIMEOUT_MS = 3 * 60 * 1000;
/** Taxa de sistema (`Fee.code`) e valor padrão. */
export const SWAP_FEE_CODE = 'battery_swap_fee';
export const SWAP_FEE_DEFAULT_CENTS = 500;

export const OPEN_SWAP_STATUSES: StationSwapStatus[] = ['opening_slot', 'awaiting_return', 'returned', 'releasing'];
/** O cliente cancela só antes de devolver a bateria. */
export const CANCELABLE_SWAP_STATUSES: StationSwapStatus[] = ['opening_slot', 'awaiting_return'];

/**
 * Moto parada para a troca — mesma regra do bloqueio seguro: velocidade desconhecida ou velha (`null`) = em movimento,
 * nunca 0 por padrão. Vale: moto travada e online (só trava abaixo de 3 km/h) ou velocidade fresca exatamente 0.
 * Velocidade conhecida > 0 recusa mesmo com a trava reportada. Fix 1 (I3): o aluguel `paused` sozinho não basta (a trava da
 * pausa pode não ter sido confirmada); vale a mesma regra, `rentalStatus` fica só para registro.
 */
export function vehicleStationary(input: { rentalStatus: string; live: VehicleLiveState | null; knownSpeedKmh: number | null }): boolean {
  if (input.knownSpeedKmh !== null && input.knownSpeedKmh > 0) return false;
  if (input.live?.online && input.live.locked) return true;
  return input.knownSpeedKmh === 0;
}

export function withinSwapRange(phone: { lat: number; lng: number }, station: { lat: number; lng: number }): { ok: boolean; distanceM: number } {
  const d = Math.round(distanceM(phone, station));
  return { ok: d <= SWAP_MAX_DISTANCE_M, distanceM: d };
}

/** Grátis nos planos diário/semanal/mensal; taxa configurada (`battery_swap_fee`) nos planos por minuto e por hora. */
export function swapFeeCents(planCode: PlanCode, configuredCents: number): number {
  if (planCode !== 'minute' && planCode !== 'hour') return 0;
  return Math.max(0, Math.round(configuredCents));
}

// ───────────── horário da estação (texto livre, ex.: "Seg a sáb, 7h às 22h") ─────────────

const DAY_INDEX: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
const TZ = 'America/Sao_Paulo';

function localNow(now: Date): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { weekday, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function parseDays(text: string): Set<number> | null {
  if (/todos os dias|diariamente/.test(text)) return new Set([0, 1, 2, 3, 4, 5, 6]);
  const range = /\b(dom|seg|ter|qua|qui|sex|sab)\w*\s*(?:a|-|–|ate)\s*(dom|seg|ter|qua|qui|sex|sab)/.exec(text);
  if (!range) return null;
  const days = new Set<number>();
  let d = DAY_INDEX[range[1]];
  const end = DAY_INDEX[range[2]];
  for (let i = 0; i < 7; i++) {
    days.add(d);
    if (d === end) break;
    d = (d + 1) % 7;
  }
  return days;
}

function parseHours(text: string): { from: number; to: number } | 'all_day' | null {
  if (/\b24\s*h\b/.test(text)) return 'all_day';
  const m = /(\d{1,2})\s*h\s*(\d{2})?\s*(?:as|a|-|–|ate)\s*(\d{1,2})\s*h\s*(\d{2})?/.exec(text);
  if (!m) return null;
  const from = Number(m[1]) * 60 + Number(m[2] ?? 0);
  const to = Number(m[3]) * 60 + Number(m[4] ?? 0);
  if (from > 24 * 60 || to > 24 * 60) return null;
  return { from, to };
}

/**
 * Aberta agora? `open24h` → sim. Senão interpreta `openingHours` no fuso de São Paulo (dias "seg a sáb" / "todos os dias";
 * horário "7h às 22h", "7h30 - 12h", "24 h"; virada da noite "18h às 2h" conta no dia em que abre). Texto que não dá para
 * interpretar → libera (decisão da spec: só recusa quando o horário é legível e está fechado).
 */
export function isStationOpen(station: { open24h: boolean; openingHours: string }, now: Date): boolean {
  if (station.open24h) return true;
  const text = (station.openingHours ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hours = parseHours(text);
  if (!hours) return true;
  const days = parseDays(text) ?? new Set([0, 1, 2, 3, 4, 5, 6]);
  const { weekday, minutes } = localNow(now);
  if (hours === 'all_day') return days.has(weekday);
  if (hours.from < hours.to) return days.has(weekday) && minutes >= hours.from && minutes < hours.to;
  // Vira a noite: aberta depois de `from` no dia listado ou antes de `to` no dia seguinte a um dia listado.
  return (days.has(weekday) && minutes >= hours.from) || (days.has((weekday + 6) % 7) && minutes < hours.to);
}

// ───────────── máquina de estados ─────────────

/**
 * Próximo status de uma troca ao receber um evento da estação, ou `null` (ignorar: repetido, fora de ordem, troca
 * encerrada). Regra de segurança: `battery_released` só completa uma troca em `releasing` (a API só pede a liberação
 * depois de a devolução registrada e a vaga fechada).
 */
export function nextStepAfter(status: StationSwapStatus, event: StationEventType): StationSwapStatus | null {
  switch (event) {
    case 'slot_opened':
      return status === 'opening_slot' ? 'awaiting_return' : null;
    case 'battery_returned':
      return status === 'opening_slot' || status === 'awaiting_return' ? 'returned' : null;
    case 'slot_closed':
      if (status === 'returned') return 'releasing';
      return status === 'opening_slot' || status === 'awaiting_return' ? 'canceled' : null;
    case 'battery_released':
      return status === 'releasing' ? 'completed' : null;
  }
}
