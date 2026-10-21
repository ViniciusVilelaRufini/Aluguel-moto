import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { LiveStateStore } from './live-state.store';
import type { DesiredState, IotTransport } from './shadow-transport';
import { TelemetryService } from './telemetry.service';

class FakeTransport implements IotTransport {
  desired: Array<{ thingName: string; desired: DesiredState }> = [];
  async updateDesired(thingName: string, desired: DesiredState) {
    this.desired.push({ thingName, desired });
  }
  async publishCommand() {}
  async start() {}
  async stop() {}
}
class TestGateway extends BaseIotGateway {}

const T = 'moto-0001';
const VEHICLE_ID = '11111111-1111-4111-8111-111111111111';
const RENTAL_ID = '22222222-2222-4222-8222-222222222222';
const msg = (over: Record<string, unknown> = {}) => ({
  lat: -23.5614, lng: -46.6914, velocidade_kmh: 12.5, bateria_pct: 81, travada: false, ignicao: true, sinal: 4, timestamp: '2026-10-21T15:00:00.000Z', ...over,
});

function setup(opts: { rentalId?: string } = {}) {
  const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
  const events = new EventEmitter2();
  const emitted: Record<string, any[]> = {};
  for (const name of [EV.IOT_TELEMETRY, EV.IOT_DEVICE_EVENT, EV.IOT_CONNECTIVITY]) {
    emitted[name] = [];
    events.on(name, (e: unknown) => emitted[name].push(e));
  }
  const transport = new FakeTransport();
  const live = new LiveStateStore(new MemoryRedisStore(), clock, 180_000);
  const gateway = new TestGateway(transport, live, clock, events, { confirmWaitMs: 1000, commandTimeoutMs: 30_000 });
  const geofence = { onPosition: jest.fn().mockResolvedValue(undefined) };
  const rentals = { openRentalId: jest.fn().mockResolvedValue(opts.rentalId), invalidate: jest.fn() };
  const prisma = {
    vehicle: { findUnique: jest.fn(async ({ where }: any) => (where.thingName === T ? { id: VEHICLE_ID } : null)) },
    trackPoint: { create: jest.fn().mockResolvedValue({}) },
  };
  const svc = new TelemetryService(gateway, geofence, rentals, prisma as any, events, clock, { trackRetentionDays: 90 });
  return { clock, events, emitted, transport, live, gateway, geofence, rentals, prisma, svc };
}

describe('TelemetryService', () => {
  it('telemetria válida → iot.telemetry com vehicleId e cercas avaliadas', async () => {
    const { svc, emitted, geofence } = setup();
    await svc.telemetry(T, msg());
    expect(emitted[EV.IOT_TELEMETRY]).toEqual([
      { thingName: T, vehicleId: VEHICLE_ID, lat: -23.5614, lng: -46.6914, speedKmh: 12.5, batteryPct: 81, locked: false, ignition: true, signal: 4, ts: '2026-10-21T15:00:00.000Z' },
    ]);
    expect(geofence.onPosition).toHaveBeenCalledWith({ vehicleId: VEHICLE_ID, thingName: T, lat: -23.5614, lng: -46.6914, ts: '2026-10-21T15:00:00.000Z' });
  });

  it('payload inválido ou rastreador desconhecido → descartado', async () => {
    const { svc, emitted, prisma } = setup();
    await svc.telemetry(T, msg({ sinal: 9 }));
    await svc.telemetry('moto-9999', msg());
    expect(emitted[EV.IOT_TELEMETRY]).toEqual([]);
    expect(prisma.trackPoint.create).not.toHaveBeenCalled();
  });

  it('com aluguel em andamento grava TrackPoint com expiresAt = recordedAt + 90 dias', async () => {
    const { svc, prisma } = setup({ rentalId: RENTAL_ID });
    await svc.telemetry(T, msg());
    expect(prisma.trackPoint.create).toHaveBeenCalledWith({
      data: {
        rentalId: RENTAL_ID, vehicleId: VEHICLE_ID, lat: -23.5614, lng: -46.6914, speedKmh: 12.5,
        recordedAt: new Date('2026-10-21T15:00:00.000Z'),
        expiresAt: new Date('2027-01-19T15:00:00.000Z'),
      },
    });
  });

  it('sem aluguel (LGPD) não grava trajeto — só o estado da frota (iot.telemetry → Redis)', async () => {
    const { svc, prisma, emitted } = setup({ rentalId: undefined });
    await svc.telemetry(T, msg());
    expect(prisma.trackPoint.create).not.toHaveBeenCalled();
    expect(emitted[EV.IOT_TELEMETRY]).toHaveLength(1);
  });

  it('timestamp do rastreador muito fora do relógio do servidor → usa a hora do servidor', async () => {
    const { svc, prisma } = setup({ rentalId: RENTAL_ID });
    await svc.telemetry(T, msg({ timestamp: '2030-01-01T00:00:00.000Z' }));
    const data = prisma.trackPoint.create.mock.calls[0][0].data;
    expect(data.recordedAt).toEqual(new Date('2026-10-21T15:00:00.000Z'));
    expect(data.expiresAt).toEqual(new Date('2027-01-19T15:00:00.000Z'));
  });

  it('primeira telemetria → iot.connectivity online; inatividade → offline; volta → online', async () => {
    const { svc, emitted, clock } = setup();
    await svc.telemetry(T, msg());
    await svc.telemetry(T, msg());
    expect(emitted[EV.IOT_CONNECTIVITY]).toEqual([{ thingName: T, vehicleId: VEHICLE_ID, online: true, ts: '2026-10-21T15:00:00.000Z' }]);
    await clock.advance(180_000);
    await svc.sweepStale();
    expect(emitted[EV.IOT_CONNECTIVITY][1]).toEqual(expect.objectContaining({ online: false }));
    await svc.telemetry(T, msg());
    expect(emitted[EV.IOT_CONNECTIVITY][2]).toEqual(expect.objectContaining({ online: true }));
  });

  it('presença (LWT) desconectada → offline imediato', async () => {
    const { svc, emitted, gateway } = setup();
    await svc.telemetry(T, msg());
    await svc.presence(T, false);
    expect(emitted[EV.IOT_CONNECTIVITY][1]).toEqual(expect.objectContaining({ online: false }));
    expect((await gateway.getLiveState(T))!.online).toBe(false);
  });

  it('evento do rastreador → iot.device-event', async () => {
    const { svc, emitted } = setup();
    await svc.deviceEvent(T, { tipo: 'queda', timestamp: '2026-10-21T15:00:01.000Z' });
    await svc.deviceEvent(T, { tipo: 'inexistente', timestamp: '2026-10-21T15:00:01.000Z' });
    expect(emitted[EV.IOT_DEVICE_EVENT]).toEqual([{ thingName: T, vehicleId: VEHICLE_ID, type: 'queda', ts: '2026-10-21T15:00:01.000Z' }]);
  });

  it('a velocidade da telemetria alimenta a rampa: moto andando para abaixo de 3 → travada publicada', async () => {
    const { svc, gateway, transport, clock } = setup();
    await svc.telemetry(T, msg({ velocidade_kmh: 25 }));
    const p = gateway.lock({ commandId: 'c1', thingName: T });
    await clock.advance(1000);
    await p;
    expect(transport.desired.some((d) => d.desired.travada)).toBe(false);
    await svc.telemetry(T, msg({ velocidade_kmh: 2 }));
    expect(transport.desired[transport.desired.length - 1].desired).toEqual({ travada: true });
  });

  it('reported do shadow chega ao gateway (confirma comando)', async () => {
    const { svc, gateway, clock, emitted, events } = setup();
    const updates: unknown[] = [];
    events.on(EV.IOT_COMMAND_UPDATED, (e: unknown) => updates.push(e));
    await svc.telemetry(T, msg());
    const p = gateway.setSpeedLimit({ commandId: 'c1', thingName: T }, 6);
    await clock.advance(1000);
    await p;
    await svc.reported(T, { limite_kmh: 6 });
    expect(updates).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
    expect(emitted[EV.IOT_CONNECTIVITY]).toHaveLength(1);
  });
});
