import { BatchDeleteGeofenceCommand, BatchPutGeofenceCommand, BatchUpdateDevicePositionCommand, ListGeofencesCommand, PutGeofenceCommand } from '@aws-sdk/client-location';
import { AwsLocationGeofenceEngine, counterClockwise } from './aws-location-geofence-engine';
import type { GeofenceEngine } from './geofence-engine';

// Quadrado no sentido horário (visto no plano lng/lat) — o Amazon Location exige o anel externo anti-horário.
const CW = [[-46.70, -23.56], [-46.69, -23.56], [-46.69, -23.57], [-46.70, -23.57], [-46.70, -23.56]];

function setup(zones: Record<string, any>) {
  const sent: any[] = [];
  const client = {
    send: jest.fn(async (cmd: any) => {
      sent.push(cmd);
      if (cmd instanceof ListGeofencesCommand) return { Entries: [{ GeofenceId: 'stale-zone' }, { GeofenceId: 'z1' }] };
      return {};
    }),
  };
  const prisma = {
    zone: {
      findUnique: jest.fn(async ({ where }: any) => zones[where.id] ?? null),
      findMany: jest.fn(async () => Object.values(zones).filter((z: any) => z.active && !z.deletedAt)),
    },
  };
  const local: GeofenceEngine = { containing: jest.fn(async () => []), updatePosition: jest.fn(), sync: jest.fn(), syncAll: jest.fn() };
  const engine = new AwsLocationGeofenceEngine(prisma as any, client as any, { trackerName: 'volti-dev-tracker', collectionName: 'volti-dev-geofences' }, local);
  return { engine, sent, local };
}

describe('AwsLocationGeofenceEngine', () => {
  it('anel externo vira anti-horário (e um anti-horário fica igual)', () => {
    const ccw = counterClockwise(CW);
    expect(ccw).toEqual([...CW].reverse());
    expect(counterClockwise(ccw)).toEqual(ccw);
  });

  it('zone.changed (criada/atualizada e ativa) → PutGeofence com o polígono', async () => {
    const { engine, sent } = setup({ z1: { id: 'z1', active: true, deletedAt: null, geometry: { type: 'Polygon', coordinates: [CW] } } });
    await engine.sync({ zoneId: 'z1', action: 'updated' });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(PutGeofenceCommand);
    expect(sent[0].input).toEqual({ CollectionName: 'volti-dev-geofences', GeofenceId: 'z1', Geometry: { Polygon: [counterClockwise(CW)] } });
  });

  it('zone.changed deleted ou inativa → BatchDeleteGeofence', async () => {
    const { engine, sent } = setup({ z2: { id: 'z2', active: false, deletedAt: new Date(), geometry: { type: 'Polygon', coordinates: [CW] } } });
    await engine.sync({ zoneId: 'z2', action: 'deleted' });
    expect(sent[0]).toBeInstanceOf(BatchDeleteGeofenceCommand);
    expect(sent[0].input).toEqual({ CollectionName: 'volti-dev-geofences', GeofenceIds: ['z2'] });
  });

  it('syncAll: BatchPutGeofence das ativas e apaga cercas que não existem mais', async () => {
    const { engine, sent } = setup({ z1: { id: 'z1', active: true, deletedAt: null, geometry: { type: 'Polygon', coordinates: [CW] } } });
    await engine.syncAll();
    expect(sent.find((c) => c instanceof BatchPutGeofenceCommand)!.input.Entries).toEqual([{ GeofenceId: 'z1', Geometry: { Polygon: [counterClockwise(CW)] } }]);
    expect(sent.find((c) => c instanceof BatchDeleteGeofenceCommand)!.input.GeofenceIds).toEqual(['stale-zone']);
  });

  it('posição → BatchUpdateDevicePosition no tracker; contenção delega ao PostGIS (mesma fonte)', async () => {
    const { engine, sent, local } = setup({});
    await engine.updatePosition('moto-0001', -23.56, -46.69, '2026-10-21T15:00:00.000Z');
    expect(sent[0]).toBeInstanceOf(BatchUpdateDevicePositionCommand);
    expect(sent[0].input).toEqual({ TrackerName: 'volti-dev-tracker', Updates: [{ DeviceId: 'moto-0001', Position: [-46.69, -23.56], SampleTime: new Date('2026-10-21T15:00:00.000Z') }] });
    await engine.containing(-23.56, -46.69);
    expect(local.containing).toHaveBeenCalledWith(-23.56, -46.69);
  });
});
