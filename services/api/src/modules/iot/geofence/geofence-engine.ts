import type { ZoneType } from '../../../common/enums';
import type { ZoneChangedEvent } from '../../../common/events';

export const GEOFENCE_ENGINE = Symbol('GEOFENCE_ENGINE');

export interface ZoneRef {
  id: string;
  type: ZoneType;
  speedLimitKmh: number | null;
}

/**
 * Motor de cercas (GEOFENCE_MODE): diz quais zonas ativas contêm um ponto, acompanha a posição dos rastreadores
 * e mantém as cercas sincronizadas com a fonte (tabela `Zone`).
 */
export interface GeofenceEngine {
  containing(lat: number, lng: number): Promise<ZoneRef[]>;
  /** Posição do rastreador (aws: tracker do Amazon Location; local: nada). */
  updatePosition(thingName: string, lat: number, lng: number, ts: string): Promise<void>;
  /** `zone.changed` → ressincroniza (local: nada além do cache; aws: PutGeofence/BatchDeleteGeofence). */
  sync(ev: ZoneChangedEvent): Promise<void>;
  /** Sincronização completa (subida da API). */
  syncAll(): Promise<void>;
}
