/** Utilitários de mapeamento para o contrato (sem `null`: campos ausentes; decisão #3). */

export const iso = (d: Date | null | undefined): string | undefined => (d ? d.toISOString() : undefined);

/** Remove chaves `undefined`/`null` (o contrato não usa `nullable`). */
export function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null) out[k] = v;
  return out as T;
}

/** CPF mascarado para quem não é admin: `***.456.789-**`. */
export function maskCpf(cpf: string | null | undefined, isAdmin: boolean): string | undefined {
  if (!cpf) return undefined;
  if (isAdmin) return cpf;
  const d = cpf.replace(/\D/g, '').padStart(11, '0');
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** Distância em metros (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Autonomia estimada: 60 km com bateria cheia. */
export const KM_PER_FULL_BATTERY = 60;
export const estimatedRangeKm = (batteryPct: number): number => Math.round(((batteryPct / 100) * KM_PER_FULL_BATTERY) * 10) / 10;

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
