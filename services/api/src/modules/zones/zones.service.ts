import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, type Zone } from '@prisma/client';
import type { ZoneType } from '../../common/enums';
import { EV, ZoneChangedEvent } from '../../common/events';
import { badRequest, notFound, unprocessable } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import type { GeoZoneInputDto, ListZonesQuery } from './zones.dto';

/** Limite máximo em zonas de velocidade reduzida (pedestres 6, ciclovias 20). */
export const REDUCED_SPEED_MAX_KMH = 20;

export function toGeoZone(z: Zone) {
  return {
    id: z.id,
    name: z.name,
    type: z.type,
    ...(z.speedLimitKmh !== null && z.speedLimitKmh !== undefined ? { speedLimitKmh: z.speedLimitKmh } : {}),
    geometry: z.geometry as { type: 'Polygon'; coordinates: number[][][] },
    active: z.active,
    createdAt: z.createdAt.toISOString(),
    updatedAt: z.updatedAt.toISOString(),
  };
}

/** Regras de negócio da zona (decisão #15) e checagem estrutural do polígono. */
export function validateZoneInput(dto: Pick<GeoZoneInputDto, 'type' | 'speedLimitKmh' | 'geometry'>): void {
  if (dto.type === 'reduced_speed') {
    if (dto.speedLimitKmh === undefined || dto.speedLimitKmh === null) {
      throw unprocessable('zone-speed-limit-required', 'Zonas de velocidade reduzida exigem speedLimitKmh.');
    }
    if (dto.speedLimitKmh > REDUCED_SPEED_MAX_KMH) {
      throw unprocessable('zone-speed-limit-invalid', 'Em zonas de velocidade reduzida o limite máximo é 20 km/h.');
    }
  }
  for (const ring of dto.geometry.coordinates) {
    const [first, last] = [ring[0], ring[ring.length - 1]];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw unprocessable('zone-invalid-geometry', 'O anel do polígono precisa ser fechado (primeira posição = última).');
    }
    if (ring.some(([lng, lat]) => lng < -180 || lng > 180 || lat < -90 || lat > 90)) {
      throw unprocessable('zone-invalid-geometry', 'Coordenadas fora do intervalo válido.');
    }
  }
}

@Injectable()
export class ZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  /** Zona ativa do tipo que contém o ponto (PostGIS `ST_Contains`). */
  async findContaining(point: { lat: number; lng: number }, type: ZoneType): Promise<{ id: string; type: ZoneType; speedLimitKmh: number | null } | null> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; type: ZoneType; speedLimitKmh: number | null }>>`
      SELECT "id", "type", "speedLimitKmh" FROM "Zone"
      WHERE "active" = true AND "deletedAt" IS NULL AND "type" = ${type}::"ZoneType"
        AND ST_Contains("geom", ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326))
      LIMIT 1`;
    return rows[0] ?? null;
  }

  async list(q: ListZonesQuery, staff: boolean) {
    const where: Prisma.ZoneWhereInput = { deletedAt: null };
    if (!(staff && q.includeInactive)) where.active = true;
    if (q.type) where.type = q.type;
    if (q.bbox) {
      const parts = q.bbox.split(',').map(Number);
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
        throw badRequest('bbox deve ser minLng,minLat,maxLng,maxLat.', [{ field: 'bbox', message: 'formato inválido' }]);
      }
      const [minLng, minLat, maxLng, maxLat] = parts;
      const ids = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Zone" WHERE ST_Intersects("geom", ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))`;
      where.id = { in: ids.map((r) => r.id) };
    }
    const zones = await this.prisma.zone.findMany({ where, orderBy: [{ type: 'asc' }, { name: 'asc' }] });
    return { items: zones.map(toGeoZone) };
  }

  async get(id: string, staff: boolean) {
    const z = await this.prisma.zone.findUnique({ where: { id } });
    if (!z || z.deletedAt || (!staff && !z.active)) throw notFound('Zona não encontrada.');
    return toGeoZone(z);
  }

  private async assertValidGeometry(geometry: object): Promise<void> {
    const json = JSON.stringify(geometry);
    const rows = await this.prisma.$queryRaw<Array<{ valid: boolean }>>`
      SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON(${json}), 4326)) AS "valid"`;
    if (!rows[0]?.valid) throw unprocessable('zone-invalid-geometry', 'Polígono inválido (autointerseção ou anel degenerado).');
  }

  async create(dto: GeoZoneInputDto, actor: Principal) {
    validateZoneInput(dto);
    await this.assertValidGeometry(dto.geometry);
    const geometry = { type: 'Polygon', coordinates: dto.geometry.coordinates };
    const zone = await this.prisma.$transaction(async (tx) => {
      const z = await tx.zone.create({
        data: {
          name: dto.name,
          type: dto.type,
          speedLimitKmh: dto.type === 'reduced_speed' ? dto.speedLimitKmh : null,
          geometry,
          active: dto.active ?? true,
        },
      });
      await tx.$executeRaw`UPDATE "Zone" SET "geom" = ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326) WHERE "id" = ${z.id}::uuid`;
      await this.audit.record({ actor, action: 'zone.create', entityType: 'Zone', entityId: z.id, metadata: { type: z.type, speedLimitKmh: z.speedLimitKmh } }, tx as any);
      return z;
    });
    this.emit(zone, 'created');
    return toGeoZone(zone);
  }

  async update(id: string, dto: GeoZoneInputDto, actor: Principal) {
    const existing = await this.prisma.zone.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw notFound('Zona não encontrada.');
    validateZoneInput(dto);
    await this.assertValidGeometry(dto.geometry);
    const geometry = { type: 'Polygon', coordinates: dto.geometry.coordinates };
    const zone = await this.prisma.$transaction(async (tx) => {
      const z = await tx.zone.update({
        where: { id },
        data: {
          name: dto.name,
          type: dto.type,
          speedLimitKmh: dto.type === 'reduced_speed' ? dto.speedLimitKmh : null,
          geometry,
          active: dto.active ?? existing.active,
        },
      });
      await tx.$executeRaw`UPDATE "Zone" SET "geom" = ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326) WHERE "id" = ${id}::uuid`;
      await this.audit.record({ actor, action: 'zone.update', entityType: 'Zone', entityId: id, metadata: { type: z.type, speedLimitKmh: z.speedLimitKmh } }, tx as any);
      return z;
    });
    this.emit(zone, 'updated');
    return toGeoZone(zone);
  }

  /** Exclusão lógica (o histórico de eventos de cerca continua referenciando a zona). */
  async remove(id: string, actor: Principal): Promise<void> {
    const existing = await this.prisma.zone.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw notFound('Zona não encontrada.');
    const deleted = await this.prisma.$transaction(async (tx) => {
      const z = await tx.zone.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
      await this.audit.record({ actor, action: 'zone.delete', entityType: 'Zone', entityId: id }, tx as any);
      return z;
    });
    this.emit(deleted, 'deleted');
  }

  /** Leva o limite novo junto: o motor de cercas reavalia as motos que já estão dentro (QA-03). */
  private emit(z: Pick<Zone, 'id' | 'type' | 'speedLimitKmh' | 'active'>, action: ZoneChangedEvent['action']): void {
    this.events.emit(EV.ZONE_CHANGED, { zoneId: z.id, action, type: z.type, speedLimitKmh: z.speedLimitKmh, active: z.active } satisfies ZoneChangedEvent);
  }
}
