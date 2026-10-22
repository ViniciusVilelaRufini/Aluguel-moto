import type { S } from './types';
import type { Tone } from './status';

export type Battery = S<'Battery'>;
export type BatteryStatus = S<'BatteryStatus'>;

export const BATTERY_STATUSES: BatteryStatus[] = ['in_vehicle', 'in_van', 'in_station', 'charging', 'retired'];

export const BATTERY_STATUS: Record<BatteryStatus, [string, Tone]> = {
  in_vehicle: ['Na moto', 'info'],
  in_van: ['Na van', 'warning'],
  in_station: ['Na estação', 'success'],
  charging: ['Carregando', 'neutral'],
  retired: ['Descartada', 'neutral'],
};

export const MAX_TRANSFER = 50;

/**
 * Lista de séries digitada ou colada (espaço, vírgula, ponto e vírgula ou quebra de linha):
 * maiúsculas, sem repetidas, 3 a 64 caracteres, até 50 por transferência (contrato `BatteryTransferRequest`).
 */
export function parseSerials(text: string): { serials: string[]; error?: string } {
  const serials = [...new Set(text.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (serials.length === 0) return { serials, error: 'Informe ao menos um número de série' };
  const bad = serials.find((s) => s.length < 3 || s.length > 64);
  if (bad) return { serials, error: `Série inválida: ${bad}` };
  if (serials.length > MAX_TRANSFER) return { serials, error: `No máximo ${MAX_TRANSFER} baterias por vez` };
  return { serials };
}

/** Onde a bateria está, em texto curto para a tabela. */
export function batteryLocation(b: Battery, names: { stations?: Map<string, string>; staff?: Map<string, string> } = {}): string {
  switch (b.status) {
    case 'in_vehicle': return b.vehicleCode ?? 'Moto';
    case 'in_van': return b.holderId ? `Van · ${names.staff?.get(b.holderId) ?? 'operador'}` : 'Van';
    case 'in_station': return (b.stationId && names.stations?.get(b.stationId)) || 'Estação';
    case 'charging': return 'Carregador';
    case 'retired': return '—';
  }
}

export function countByStatus(items: Battery[]): Record<BatteryStatus, number> {
  const out = Object.fromEntries(BATTERY_STATUSES.map((s) => [s, 0])) as Record<BatteryStatus, number>;
  for (const b of items) out[b.status] = (out[b.status] ?? 0) + 1;
  return out;
}

/** Carregada = 90% ou mais (mesma regra do `VanStock.chargedCount`). */
export function chargeTone(pct: number): Tone {
  if (pct >= 90) return 'success';
  if (pct > 20) return 'warning';
  return 'danger';
}
