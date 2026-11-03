import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { EV, type VehicleStateChangedEvent } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { VehiclesService } from './vehicles.service';

/**
 * Bancada do J16 (2026-11-03): a ficha do painel mostrava trava, "visto por último" e online velhos, porque só a telemetria
 * (a cada 30 s) gravava o Postgres e o status/heartbeat do rastreador (`reported`) ficava só no Redis. Agora `locked` (e
 * `batteryKnown`) vão para o banco na hora em que mudam e `lastSeenAt` no máximo a cada 15 s, com `vehicle.state` na sala `fleet`.
 */
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const T = 'moto-0059';
/** Recente: `online` do `vehicle.state` é derivado do último sinal (janela de 180 s), como no REST. */
const T0 = Math.floor(Date.now() / 1000) * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

function setup() {
  const prisma = mockDeep<PrismaClient>();
  const events = new EventEmitter2();
  const states: VehicleStateChangedEvent[] = [];
  events.on(EV.VEHICLE_STATE_CHANGED, (e: VehicleStateChangedEvent) => states.push(e));
  const usage = { record: jest.fn().mockResolvedValue(undefined), take: jest.fn().mockResolvedValue({ km: 0, hours: 0 }) };
  const service = new VehiclesService(prisma as any, { record: jest.fn() } as any, {} as any, events, new MemoryRedisStore(), { ensure: jest.fn() } as any, usage as any, {} as any);
  prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
  prisma.battery.updateMany.mockResolvedValue({ count: 0 });
  const row = { locked: true, online: true, lastSeenAt: new Date(T0), batteryKnown: true };
  prisma.vehicle.findUnique.mockImplementation((async () => row) as any);
  /** Chamadas `vehicle.updateMany` cujo `data` tem exatamente estas chaves. */
  const writes = (...keys: string[]) =>
    prisma.vehicle.updateMany.mock.calls.map((c) => c[0] as any).filter((a) => Object.keys(a.data).sort().join() === [...keys].sort().join());
  return { prisma, service, states, row, writes };
}

const reported = (over: Partial<{ locked: boolean; heard: boolean; ts: string }> = {}) => ({ thingName: T, vehicleId: VEHICLE_ID, heard: true, ts: iso(T0), ...over });
const telemetry = (over: Record<string, unknown> = {}) => ({
  thingName: T, vehicleId: VEHICLE_ID, lat: -23.56, lng: -46.69, speedKmh: 0, batteryPct: 81, batteryKnown: true, locked: true, ignition: false, signal: 4,
  ts: iso(T0 - 2_000), receivedAt: iso(T0), ...over,
});

describe('VehiclesService: estado do rastreador no banco e vehicle.state', () => {
  it('reported com travada que mudou → Vehicle.locked na hora (escrita condicional) e vehicle.state com o estado do banco', async () => {
    const s = setup();
    s.prisma.vehicle.updateMany.mockImplementation((async (a: any) => ({ count: 'locked' in a.data ? 1 : 0 })) as any);
    await s.service.onReported(reported({ locked: true }));
    expect(s.writes('locked')).toEqual([{ where: { id: VEHICLE_ID, locked: false }, data: { locked: true } }]);
    expect(s.states).toEqual([{ vehicleId: VEHICLE_ID, locked: true, online: true, lastSeenAt: iso(T0), batteryKnown: true, ts: expect.any(String) }]);
  });

  it('nada mudou no banco (trava igual, lastSeenAt recente) → nenhum vehicle.state', async () => {
    const s = setup();
    await s.service.onReported(reported({ locked: true }));
    expect(s.states).toEqual([]);
  });

  it('lastSeenAt pelo status/heartbeat: no máximo a cada 15 s por moto, condicionado ao banco (lastSeenAt < agora − 15 s)', async () => {
    const s = setup();
    s.prisma.vehicle.updateMany.mockImplementation((async (a: any) => ({ count: 'lastSeenAt' in a.data ? 1 : 0 })) as any);
    await s.service.onReported(reported());
    expect(s.writes('lastSeenAt')).toEqual([
      { where: { id: VEHICLE_ID, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(T0 - 15_000) } }] }, data: { lastSeenAt: new Date(T0) } },
    ]);
    expect(s.states).toHaveLength(1);
    await s.service.onReported(reported({ ts: iso(T0 + 10_000) }));
    expect(s.writes('lastSeenAt')).toHaveLength(1); // 10 s depois: nem vai ao banco
    await s.service.onReported(reported({ ts: iso(T0 + 15_000) }));
    expect(s.writes('lastSeenAt')).toHaveLength(2);
    expect(s.states).toHaveLength(2);
  });

  it('reported lido do shadow (polling, heard: false) grava a trava mas nunca o lastSeenAt', async () => {
    const s = setup();
    await s.service.onReported(reported({ locked: false, heard: false }));
    expect(s.writes('locked')).toHaveLength(1);
    expect(s.writes('lastSeenAt')).toEqual([]);
  });

  it('telemetria: lastSeenAt pela hora do servidor (receivedAt), não pelo relógio do rastreador; trava que mudou vai na hora', async () => {
    const s = setup();
    s.prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    await s.service.onTelemetry(telemetry({ locked: false, ts: iso(T0 + 120_000) }) as any);
    expect(s.writes('lastSeenAt')[0].data).toEqual({ lastSeenAt: new Date(T0) });
    expect(s.writes('locked')).toEqual([{ where: { id: VEHICLE_ID, locked: true }, data: { locked: false } }]);
    // Gravação de 30 s: posição e telemetria, sem lastSeenAt (dono: o estado do rastreador).
    const full = s.prisma.vehicle.updateMany.mock.calls.map((c) => c[0] as any).find((a) => 'lat' in a.data);
    expect(full.data).not.toHaveProperty('lastSeenAt');
    expect(full.data).toMatchObject({ batteryPct: 81, batteryKnown: true, locked: false });
  });

  it('bateria desconhecida (bateria_conhecida: false) → batteryKnown false no banco na hora, batteryPct 0 e a bateria instalada não vira 0%', async () => {
    const s = setup();
    s.prisma.vehicle.updateMany.mockImplementation((async (a: any) => ({ count: 'batteryKnown' in a.data && !('lat' in a.data) ? 1 : 0 })) as any);
    s.row.batteryKnown = false;
    await s.service.onTelemetry(telemetry({ batteryPct: 0, batteryKnown: false }) as any);
    expect(s.writes('batteryKnown')).toEqual([{ where: { id: VEHICLE_ID, batteryKnown: true }, data: { batteryKnown: false } }]);
    const full = s.prisma.vehicle.updateMany.mock.calls.map((c) => c[0] as any).find((a) => 'lat' in a.data);
    expect(full.data).toMatchObject({ batteryPct: 0, batteryKnown: false });
    expect(s.prisma.battery.updateMany).not.toHaveBeenCalled();
    expect(s.states.at(-1)).toMatchObject({ batteryKnown: false });
  });

  it('online/offline: vehicle.state na transição', async () => {
    const s = setup();
    s.prisma.vehicle.findUnique.mockResolvedValueOnce({ id: VEHICLE_ID, status: 'free', online: true } as any);
    Object.assign(s.row, { online: false });
    await s.service.onConnectivity({ thingName: T, vehicleId: VEHICLE_ID, online: false, ts: iso(T0 + 180_000) });
    expect(s.states).toEqual([{ vehicleId: VEHICLE_ID, locked: true, online: false, lastSeenAt: iso(T0), batteryKnown: true, ts: expect.any(String) }]);
  });

  it('offline não avança o lastSeenAt (a vigia marca offline 180 s depois do último sinal)', async () => {
    const s = setup();
    s.prisma.vehicle.findUnique.mockResolvedValueOnce({ id: VEHICLE_ID, status: 'free', online: true } as any);
    await s.service.onConnectivity({ thingName: T, vehicleId: VEHICLE_ID, online: false, ts: iso(T0 + 180_000) });
    expect((s.prisma.vehicle.update.mock.calls[0][0] as any).data).not.toHaveProperty('lastSeenAt');
  });
});
