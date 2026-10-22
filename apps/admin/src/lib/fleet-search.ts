import { normalize } from './palette';

interface Searchable {
  code: string;
  model?: string;
  categoryLabel?: string;
  address?: string;
  batterySerial?: string;
}

/**
 * Busca da lista da frota: código ("0001" acha "VLT-0001"), endereço ("teodoro sampaio"),
 * modelo/categoria e série da bateria, sem acento nem caixa. Todas as palavras precisam casar.
 */
export function matchesVehicle(v: Searchable, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const hay = normalize([v.code, v.model, v.categoryLabel, v.address, v.batterySerial].filter(Boolean).join(' '));
  return q.split(/\s+/).every((w) => hay.includes(w));
}

/** Texto curto de endereço para tabelas: só a primeira parte ("R. Teodoro Sampaio, 1020"). */
export function shortAddress(address?: string): string {
  if (!address) return '—';
  return address.split(' · ')[0] || address;
}
