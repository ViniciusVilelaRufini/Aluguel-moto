import type { S, ZoneType } from './types';
import { MAX_REDUCED_SPEED_KMH, MAX_SPEED_KMH, MIN_REDUCED_SPEED_KMH } from './types';

export interface ZoneDraft {
  name: string;
  type: ZoneType;
  speedLimitKmh?: number | null;
  geometry?: S<'GeoJsonPolygon'>;
}

export interface ZoneErrors {
  name?: string;
  speedLimitKmh?: string;
  geometry?: string;
}

export function validateZone(z: ZoneDraft): ZoneErrors {
  const e: ZoneErrors = {};
  if (!z.name.trim()) e.name = 'Informe o nome da cerca';
  if (!z.geometry || (z.geometry.coordinates[0]?.length ?? 0) < 4) e.geometry = 'Desenhe o polígono no mapa';
  const limit = z.speedLimitKmh;
  const has = limit !== undefined && limit !== null && !Number.isNaN(limit);
  if (has && (limit as number) > MAX_SPEED_KMH) e.speedLimitKmh = `Máximo de ${MAX_SPEED_KMH} km/h`;
  else if (has && (limit as number) < 0) e.speedLimitKmh = 'O limite não pode ser negativo';
  else if (has && !Number.isInteger(limit) && !(z.type === 'reduced_speed' && (limit as number) < MIN_REDUCED_SPEED_KMH)) e.speedLimitKmh = 'O limite deve ser um número inteiro de km/h';
  else if (z.type === 'reduced_speed') {
    if (!has) e.speedLimitKmh = 'Informe o limite de velocidade';
    else if ((limit as number) < MIN_REDUCED_SPEED_KMH) e.speedLimitKmh = `Mínimo de ${MIN_REDUCED_SPEED_KMH} km/h em zona de velocidade reduzida`;
    else if ((limit as number) > MAX_REDUCED_SPEED_KMH) e.speedLimitKmh = `Máximo de ${MAX_REDUCED_SPEED_KMH} km/h em zona de velocidade reduzida`;
  }
  return e;
}
