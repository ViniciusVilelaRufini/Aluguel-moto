import {
  BatchDeleteGeofenceCommand,
  BatchPutGeofenceCommand,
  BatchUpdateDevicePositionCommand,
  ListGeofencesCommand,
  PutGeofenceCommand,
  type LocationClient,
} from '@aws-sdk/client-location';
import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { ZoneChangedEvent } from '../../../common/events';
import type { GeofenceEngine, ZoneRef } from './geofence-engine';

type Ring = number[][];

/** O Amazon Location exige o anel externo no sentido anti-horário (soma de Shoelace positiva no plano lng/lat). */
export function counterClockwise(ring: Ring): Ring {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return area < 0 ? [...ring].reverse() : ring;
}

function polygonOf(geometry: unknown): Ring[] | null {
  const g = geometry as { type?: string; coordinates?: Ring[] } | null;
  if (!g || g.type !== 'Polygon' || !Array.isArray(g.coordinates) || !g.coordinates.length) return null;
  const [outer, ...holes] = g.coordinates;
  // Buracos ficam no sentido horário.
  return [counterClockwise(outer), ...holes.map((h) => counterClockwise(h).slice().reverse())];
}

/**
 * GEOFENCE_MODE=aws: mantém a geofence collection do Amazon Location em sincronia com a tabela `Zone`
 * (PutGeofence/BatchPutGeofence/BatchDeleteGeofence) e envia as posições ao tracker (BatchUpdateDevicePosition).
 *
 * A contenção usada nas regras (ENTER/EXIT → limite, bloqueio fora da área) vem da mesma fonte (PostGIS), de forma síncrona:
 * os eventos ENTER/EXIT do Amazon Location chegam pelo EventBridge, que ainda não tem fila para a API (proposta em docs/decisoes.md).
 */
export class AwsLocationGeofenceEngine implements GeofenceEngine {
  private readonly logger = new Logger('AwsLocationGeofenceEngine');

  constructor(
    private readonly prisma: Pick<PrismaClient, 'zone'>,
    private readonly client: Pick<LocationClient, 'send'>,
    private readonly cfg: { trackerName: string; collectionName: string },
    private readonly local: GeofenceEngine,
  ) {}

  containing(lat: number, lng: number): Promise<ZoneRef[]> {
    return this.local.containing(lat, lng);
  }

  async updatePosition(thingName: string, lat: number, lng: number, ts: string): Promise<void> {
    await this.client.send(
      new BatchUpdateDevicePositionCommand({
        TrackerName: this.cfg.trackerName,
        Updates: [{ DeviceId: thingName, Position: [lng, lat], SampleTime: new Date(ts) }],
      }),
    );
  }

  async sync(ev: ZoneChangedEvent): Promise<void> {
    const zone = await this.prisma.zone.findUnique({ where: { id: ev.zoneId } });
    const polygon = zone ? polygonOf(zone.geometry) : null;
    if (!zone || ev.action === 'deleted' || zone.deletedAt || !zone.active || !polygon) {
      await this.client.send(new BatchDeleteGeofenceCommand({ CollectionName: this.cfg.collectionName, GeofenceIds: [ev.zoneId] }));
      this.logger.log({ msg: 'geofence_deleted', zoneId: ev.zoneId });
      return;
    }
    await this.client.send(new PutGeofenceCommand({ CollectionName: this.cfg.collectionName, GeofenceId: zone.id, Geometry: { Polygon: polygon } }));
    this.logger.log({ msg: 'geofence_put', zoneId: zone.id });
  }

  async syncAll(): Promise<void> {
    const zones = await this.prisma.zone.findMany({ where: { active: true, deletedAt: null } });
    const entries = zones.flatMap((z) => {
      const polygon = polygonOf(z.geometry);
      return polygon ? [{ GeofenceId: z.id, Geometry: { Polygon: polygon } }] : [];
    });
    for (let i = 0; i < entries.length; i += 10) {
      await this.client.send(new BatchPutGeofenceCommand({ CollectionName: this.cfg.collectionName, Entries: entries.slice(i, i + 10) }));
    }
    const keep = new Set(entries.map((e) => e.GeofenceId));
    const stale: string[] = [];
    let token: string | undefined;
    do {
      const res = await this.client.send(new ListGeofencesCommand({ CollectionName: this.cfg.collectionName, NextToken: token }));
      for (const e of res.Entries ?? []) if (e.GeofenceId && !keep.has(e.GeofenceId)) stale.push(e.GeofenceId);
      token = res.NextToken;
    } while (token);
    for (let i = 0; i < stale.length; i += 10) {
      await this.client.send(new BatchDeleteGeofenceCommand({ CollectionName: this.cfg.collectionName, GeofenceIds: stale.slice(i, i + 10) }));
    }
    this.logger.log({ msg: 'geofences_synced', put: entries.length, deleted: stale.length });
  }
}
