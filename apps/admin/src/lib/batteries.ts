import type { S } from './types';
import type { Tone } from './status';

export type Battery = S<'Battery'>;
export type BatteryStatus = S<'BatteryStatus'>;

export const BATTERY_STATUSES: BatteryStatus[] = ['in_vehicle', 'in_van', 'in_station', 'charging', 'charged', 'defective', 'retired'];

export const BATTERY_STATUS: Record<BatteryStatus, [string, Tone]> = {
  in_vehicle: ['Na moto', 'info'],
  in_van: ['Na van', 'warning'],
  in_station: ['Na estação', 'success'],
  charging: ['Carregando', 'neutral'],
  charged: ['Carregada', 'success'],
  defective: ['Com defeito', 'danger'],
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
export function batteryLocation(b: Battery, names: { stations?: Map<string, string>; staff?: Map<string, string>; depots?: Map<string, string> } = {}): string {
  const depot = b.depotId ? names.depots?.get(b.depotId) : undefined;
  switch (b.status) {
    case 'in_vehicle': return b.vehicleCode ?? 'Moto';
    case 'in_van': return b.holderId ? `Van · ${names.staff?.get(b.holderId) ?? 'operador'}` : 'Van';
    case 'in_station': return (b.stationId && names.stations?.get(b.stationId)) || 'Estação';
    case 'charging': return depot ? `Carregador · ${depot}` : 'Carregador';
    case 'charged': return depot ?? 'Galpão';
    case 'defective': return depot ? `Fora de uso · ${depot}` : 'Fora de uso';
    case 'retired': return depot ? `Descartada · ${depot}` : '—';
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

export type BatteryStatusCounts = S<'BatteryStatusCounts'>;

/** Contagens do resumo: `statusCounts` do servidor (já respeita o galpão), com zeros se ainda não chegou. */
export function countsFromPage(c?: BatteryStatusCounts): Record<BatteryStatus, number> {
  const out = Object.fromEntries(BATTERY_STATUSES.map((s) => [s, 0])) as Record<BatteryStatus, number>;
  if (c) for (const s of BATTERY_STATUSES) out[s] = c[s] ?? 0;
  return out;
}

/** Ações do ciclo de vida que a situação atual permite (espelha as regras de `409` do contrato). */
export function batteryActions(status: BatteryStatus): { markCharged: boolean; reportDefect: boolean; retire: boolean } {
  return {
    markCharged: status === 'charging',
    reportDefect: status === 'charging' || status === 'charged' || status === 'in_van' || status === 'in_station',
    retire: status === 'defective' || status === 'charging' || status === 'charged',
  };
}

export const REASON_MIN = 3;
export const REASON_MAX = 500;

/** Motivo do defeito: obrigatório, 3 a 500 caracteres (`BatteryDefectRequest`). */
export function validateReason(text: string, required = true): { reason?: string; error?: string } {
  const reason = text.trim();
  if (!reason) return required ? { error: 'Informe o motivo' } : {};
  if (reason.length < REASON_MIN) return { error: `O motivo precisa ter ao menos ${REASON_MIN} caracteres` };
  if (reason.length > REASON_MAX) return { error: `O motivo pode ter no máximo ${REASON_MAX} caracteres` };
  return { reason };
}

export interface BatteryCreateForm { serial: string; status: S<'BatteryInitialStatus'>; depotId: string; chargePct: string }

/** `POST /batteries`: série em maiúsculas (3 a 64), galpão obrigatório; carga só vale com `charging`. */
export function buildBatteryCreate(f: BatteryCreateForm): { ok: true; body: S<'BatteryCreateRequest'> } | { ok: false; error: string } {
  const serial = f.serial.trim().toUpperCase();
  if (serial.length < 3 || serial.length > 64) return { ok: false, error: 'A série precisa ter de 3 a 64 caracteres' };
  if (/\s/.test(serial)) return { ok: false, error: 'A série não pode ter espaços' };
  if (!f.depotId) return { ok: false, error: 'Escolha o galpão' };
  if (f.status === 'charged') return { ok: true, body: { serial, status: 'charged', depotId: f.depotId } };
  const raw = f.chargePct.trim();
  if (!raw) return { ok: true, body: { serial, status: 'charging', depotId: f.depotId } };
  if (!/^\d+$/.test(raw) || Number(raw) > 100) return { ok: false, error: 'Carga de 0 a 100%' };
  return { ok: true, body: { serial, status: 'charging', depotId: f.depotId, chargePct: Number(raw) } };
}

/** Texto curto de uma movimentação: "Carregando → Carregada". Cadastro (sem origem) vira "Cadastrada · Carregando". */
export function movementTitle(m: S<'BatteryMovement'>): string {
  const to = BATTERY_STATUS[m.toStatus][0];
  return m.fromStatus ? `${BATTERY_STATUS[m.fromStatus][0]} → ${to}` : `Cadastrada · ${to}`;
}

/**
 * Corpo do descarregamento da van: `depot:<id>` → carregar no galpão; outro valor → estação; `charging` = padrão da API
 * (carregador do galpão), que só é inequívoco com um galpão: com vários a API responde 422 `depot-required`, então o painel pede a escolha.
 */
export function unloadDestination(dest: string, depotCount: number): { body: { stationId?: string; depotId?: string } } | { error: string } {
  if (dest.startsWith('depot:')) return { body: { depotId: dest.slice(6) } };
  if (dest === 'charging') return depotCount > 1 ? { error: 'Escolha o galpão ou a estação de destino' } : { body: {} };
  return { body: { stationId: dest } };
}
