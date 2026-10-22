import type { ZoneType } from './types';

export const ZONE_TYPES: ZoneType[] = ['operation', 'return', 'forbidden', 'reduced_speed'];

export type LayerVisibility = Record<ZoneType, boolean>;

export const allLayers = (on = true): LayerVisibility => ({ operation: on, return: on, forbidden: on, reduced_speed: on });

export function toggleLayer(v: LayerVisibility, t: ZoneType): LayerVisibility {
  return { ...v, [t]: !v[t] };
}

export const visibleCount = (v: LayerVisibility) => ZONE_TYPES.filter((t) => v[t]).length;

/** Mantém só as cercas dos tipos ligados no menu "Camadas". */
export function filterByLayers<T extends { type: ZoneType }>(zones: T[], v: LayerVisibility): T[] {
  return zones.filter((z) => v[z.type]);
}

/** Texto do tooltip da cerca: nome e tipo (com o limite, quando houver). */
export function zoneTooltip(z: { name: string; type: ZoneType; speedLimitKmh?: number }, typeLabel: Record<ZoneType, string>): { title: string; detail: string } {
  return { title: z.name, detail: `${typeLabel[z.type]}${z.speedLimitKmh !== undefined ? ` · ${z.speedLimitKmh} km/h` : ''}` };
}
