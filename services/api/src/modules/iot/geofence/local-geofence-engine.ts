import type { PrismaClient } from '@prisma/client';
import type { ZoneType } from '../../../common/enums';
import type { ZoneChangedEvent } from '../../../common/events';
import type { GeofenceEngine, ZoneRef } from './geofence-engine';

/**
 * GEOFENCE_MODE=local: zonas ativas que contêm o ponto, calculadas pelo PostGIS (`ST_Contains` sobre `Zone.geom`,
 * com índice GIST). A tabela é a fonte, então não há o que sincronizar além do cache curto de consultas.
 */
export class LocalGeofenceEngine implements GeofenceEngine {
  constructor(private readonly prisma: Pick<PrismaClient, '$queryRaw'>) {}

  async containing(lat: number, lng: number): Promise<ZoneRef[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; type: ZoneType; speedLimitKmh: number | null }>>`
      SELECT "id"::text AS "id", "type"::text AS "type", "speedLimitKmh"
      FROM "Zone"
      WHERE "active" = true AND "deletedAt" IS NULL AND "geom" IS NOT NULL
        AND ST_Contains("geom", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      ORDER BY "id"`;
    return rows.map((r) => ({ id: r.id, type: r.type, speedLimitKmh: r.speedLimitKmh }));
  }

  async updatePosition(): Promise<void> {
    /* local: a posição já vai para o Redis/Postgres pelo módulo vehicles */
  }

  async sync(_ev: ZoneChangedEvent): Promise<void> {
    /* local: a próxima consulta já enxerga a zona alterada */
  }

  async syncAll(): Promise<void> {}
}
