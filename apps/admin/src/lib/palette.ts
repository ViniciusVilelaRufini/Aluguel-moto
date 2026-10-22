import type { MenuItem } from './permissions';

export type PaletteGroup = 'Motos' | 'Seções' | 'Buscar';
export interface PaletteItem {
  id: string;
  group: PaletteGroup;
  label: string;
  hint?: string;
  icon: string;
  href: string;
  /** Texto extra usado só na busca. */
  keywords?: string;
}

interface VehicleLike { id: string; code: string; status: string; address?: string; model?: string }

/** Minúsculas e sem acento ("Operação" casa com "operacao"). */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Pontuação de um item para a consulta (0 = não casa). Código exato de moto vem sempre primeiro. */
export function scoreItem(item: PaletteItem, query: string): number {
  const q = normalize(query);
  if (!q) return 1;
  const label = normalize(item.label);
  const hay = `${label} ${normalize(item.keywords ?? '')}`;
  if (label === q) return 100;
  if (label.startsWith(q)) return 70;
  // "0001" encontra "VLT-0001"; "vlt1" não precisa casar.
  if (label.replace(/[^a-z0-9]/g, '').endsWith(q.replace(/[^a-z0-9]/g, '')) && /\d/.test(q)) return 60;
  if (hay.includes(q)) return 40;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => hay.includes(w))) return 20;
  return 0;
}

export function sectionItems(menu: MenuItem[]): PaletteItem[] {
  return menu.map((m) => ({ id: `section:${m.key}`, group: 'Seções', label: m.label, icon: m.icon, href: m.href, hint: 'Ir para a seção' }));
}

export function vehicleItems(vehicles: VehicleLike[], statusLabel: (s: string) => string): PaletteItem[] {
  // Endereço e modelo entram na busca ("Teodoro Sampaio" acha a moto que está lá) e o endereço aparece na dica.
  return vehicles.map((v) => ({
    id: `vehicle:${v.id}`, group: 'Motos', label: v.code,
    hint: v.address ? `${statusLabel(v.status)} · ${v.address.split(' · ')[0]}` : statusLabel(v.status),
    icon: 'Bike', href: `/fleet?vehicle=${v.id}`,
    keywords: [statusLabel(v.status), v.address, v.model].filter(Boolean).join(' '),
  }));
}

/**
 * Resultados da paleta (Ctrl+K). Sem consulta: as seções. Com consulta: motos e seções que casam,
 * ordenadas por pontuação, mais as buscas livres permitidas ao perfil (clientes, moto pelo código).
 */
export function paletteResults(
  query: string,
  opts: { vehicles: PaletteItem[]; sections: PaletteItem[]; canSearchCustomers: boolean; canSearchFleet: boolean; limit?: number },
): PaletteItem[] {
  const q = query.trim();
  const limit = opts.limit ?? 8;
  // Sem consulta: todas as seções do menu (são poucas e fixas).
  if (!q) return opts.sections;
  const ranked = [...opts.vehicles, ...opts.sections]
    .map((item) => ({ item, s: scoreItem(item, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.item.label.localeCompare(b.item.label, 'pt-BR'))
    .slice(0, limit)
    .map((x) => x.item);
  const free: PaletteItem[] = [];
  if (opts.canSearchCustomers) free.push({ id: 'search:customers', group: 'Buscar', label: `Clientes com "${q}"`, hint: 'Nome, CPF, e-mail ou telefone', icon: 'Users', href: `/customers?q=${encodeURIComponent(q)}` });
  else if (opts.canSearchFleet && !ranked.some((r) => r.group === 'Motos')) free.push({ id: 'search:fleet', group: 'Buscar', label: `Moto com código "${q}"`, icon: 'Search', href: `/fleet?code=${encodeURIComponent(q)}` });
  // Código exato de moto (comportamento da busca antiga) ou nome de seção: o item vem antes da busca livre.
  const strong = !!ranked[0] && scoreItem(ranked[0], q) >= 70;
  return strong ? [...ranked, ...free] : [...free, ...ranked];
}

/** Índice seguinte na lista ao usar as setas (com volta). */
export function moveActive(current: number, delta: number, count: number): number {
  if (count <= 0) return -1;
  return (current + delta + count) % count;
}
