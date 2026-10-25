import { reasonError, type Built } from './admin-forms';
import { timeAgo } from './format';
import type { S, VehicleStatus } from './types';

/**
 * Seção "Motos" do painel (docs/decisoes.md, 2026-10-25): cadastro com galpão, transferência de galpão e mudança de
 * status. Funções puras, testadas em `tests/motos.test.tsx`.
 */

const CODE_NUM = /^VLT-(\d+)$/i;

/** Próximo código `VLT-NNNN` a partir dos códigos já cadastrados (maior número + 1, com 4 dígitos no mínimo). */
export function nextVehicleCode(codes: readonly string[]): string {
  const max = codes.reduce((m, c) => {
    const n = CODE_NUM.exec(c.trim());
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `VLT-${String(max + 1).padStart(4, '0')}`;
}

/** Sugestão de rastreador para um código (`VLT-0061` → `moto-0061`), na convenção do seed e do simulador. */
export function suggestThingName(code: string): string {
  const n = CODE_NUM.exec(code.trim());
  return n ? `moto-${n[1]}` : '';
}

/** QR que a API grava quando o campo vem vazio. */
export function defaultQr(code: string): string {
  return CODE_NUM.test(code.trim()) ? `volti://v/${code.trim()}` : 'volti://v/<código>';
}

/** Baterias que podem ir na moto no cadastro: carregadas e livres (sem moto). */
export function freeBatteries(items: readonly S<'Battery'>[]): S<'Battery'>[] {
  return items.filter((b) => b.status === 'charged' && !b.vehicleId).sort((a, b) => b.chargePct - a.chargePct || a.serial.localeCompare(b.serial));
}

/** Transferir de galpão: só moto livre ou em manutenção e sem aluguel (a reserva a API confere). */
export function transferBlockReason(v: Pick<S<'Vehicle'>, 'status' | 'currentRentalId'>): string | null {
  if (v.currentRentalId) return 'A moto está num aluguel.';
  if (v.status !== 'free' && v.status !== 'maintenance') return 'Só dá para transferir moto livre ou em manutenção.';
  return null;
}

export function buildDepotTransfer(depotId: string, reason: string, current?: string | null): Built<S<'VehicleDepotTransfer'>> {
  if (!depotId) return { ok: false, error: 'Escolha o galpão de destino' };
  if (current && depotId === current) return { ok: false, error: 'A moto já está neste galpão' };
  const e = reasonError(reason);
  return e ? { ok: false, error: e } : { ok: true, body: { depotId, reason: reason.trim() } };
}

/** Status que o time define manualmente (`POST /vehicles/{id}/status`): alterna livre e manutenção. */
export function statusTargets(status: VehicleStatus): S<'ServiceVehicleStatus'>[] {
  if (status === 'free') return ['maintenance'];
  if (status === 'maintenance') return ['free'];
  return [];
}

export interface VehicleFilters {
  q: string;
  depotId: string;
  status: VehicleStatus | '';
  vehicleModelId: string;
}

export const EMPTY_FILTERS: VehicleFilters = { q: '', depotId: '', status: '', vehicleModelId: '' };

/** Filtros da tela → query de `GET /vehicles` (só os preenchidos). */
export function vehicleListQuery(f: VehicleFilters, cursor?: string) {
  const q = f.q.trim().slice(0, 64);
  return {
    limit: 25,
    ...(cursor ? { cursor } : {}),
    ...(q ? { q } : {}),
    ...(f.depotId ? { depotId: f.depotId } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.vehicleModelId ? { vehicleModelId: f.vehicleModelId } : {}),
  };
}

/** "Online · há 2 min" / "Sem sinal · há 3 h" / "Nunca conectou". */
export function signalSummary(v: Pick<S<'Vehicle'>, 'online' | 'lastSeenAt'>, now = Date.now()): string {
  if (!v.lastSeenAt) return v.online ? 'Online' : 'Nunca conectou';
  return `${v.online ? 'Online' : 'Sem sinal'} · ${timeAgo(v.lastSeenAt, now)}`;
}

export function depotName(depots: readonly Pick<S<'Depot'>, 'id' | 'name'>[], id?: string | null): string {
  if (!id) return 'Na rua';
  return depots.find((d) => d.id === id)?.name ?? 'Galpão removido';
}
