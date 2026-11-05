import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { ProblemException } from '../../common/problem';
import type { Principal } from '../auth/principal';
import { TrackerConsoleService } from './tracker-console.service';

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const admin: Principal = { pool: 'staff', sub: 's', email: 'a@volti.com.br', groups: ['admin'], userId: ADMIN_ID, staffId: ADMIN_ID };
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const TRACKER_ID = '66666666-6666-4666-8666-666666666666';
const CMD_ID = '99999999-9999-4999-8999-999999999999';
const THING = 'moto-0001';
const now = new Date('2026-11-05T12:00:00Z');

const tracker = (over: Record<string, unknown> = {}) => ({ id: TRACKER_ID, vehicleId: VEHICLE_ID, thingName: THING, imei: '860000000000001', controlMode: 'relay_only', ...over });
const row = (over: Record<string, unknown> = {}) => ({
  id: CMD_ID, vehicleId: VEHICLE_ID, trackerId: TRACKER_ID, thingName: THING, text: 'STATUS#', risk: 'read', status: 'pending', failReason: null,
  response: null, requestedById: ADMIN_ID, createdAt: now, respondedAt: null, ...over,
});

function setup() {
  jest.useFakeTimers().setSystemTime(now);
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  prisma.tracker.findUnique.mockResolvedValue(tracker() as any);
  prisma.trackerConsoleCommand.updateMany.mockResolvedValue({ count: 0 } as any);
  prisma.trackerConsoleCommand.findFirst.mockResolvedValue(null);
  prisma.vehicleCommand.findFirst.mockResolvedValue(null);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.reservation.findFirst.mockResolvedValue(null);
  prisma.trackerConsoleCommand.create.mockImplementation((async (a: any) => row({ ...a.data })) as any);
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const iot = { publishConsole: jest.fn().mockResolvedValue(undefined) };
  const service = new TrackerConsoleService(prisma as any, audit as any, iot as any);
  return { prisma, audit, iot, service };
}
afterEach(() => jest.useRealTimers());

const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ProblemException);
    return (e as ProblemException).getStatus();
  }
  throw new Error('não lançou');
};

describe('TrackerConsoleService', () => {
  describe('send', () => {
    it('cria pending, publica e audita sem o texto', async () => {
      const { prisma, audit, iot, service } = setup();
      const out = await service.send(VEHICLE_ID, { text: 'STATUS#' }, admin);
      const data = prisma.trackerConsoleCommand.create.mock.calls[0][0].data as any;
      expect(data).toMatchObject({ vehicleId: VEHICLE_ID, trackerId: TRACKER_ID, thingName: THING, text: 'STATUS#', risk: 'read', requestedById: ADMIN_ID });
      expect(iot.publishConsole).toHaveBeenCalledWith(THING, CMD_ID, 'STATUS#');
      const rec = audit.record.mock.calls[0][0];
      expect(rec).toMatchObject({ action: 'tracker_console.send', metadata: { risk: 'read', keyword: 'STATUS' } });
      expect(JSON.stringify(rec)).not.toContain('STATUS#');
      expect(out).toMatchObject({ status: 'pending', text: 'STATUS#', statusReport: null, createdAt: now.toISOString() });
    });

    it('change/connection sem confirm → 400; com confirm passa', async () => {
      const { service, iot } = setup();
      expect(await status(service.send(VEHICLE_ID, { text: 'APN,x.y#' }, admin))).toBe(400);
      expect(await status(service.send(VEHICLE_ID, { text: 'TIMER,30,3600#', confirm: false }, admin))).toBe(400);
      expect(iot.publishConsole).not.toHaveBeenCalled();
      await service.send(VEHICLE_ID, { text: 'APN,x.y#', confirm: true }, admin);
      expect(iot.publishConsole).toHaveBeenCalledWith(THING, CMD_ID, 'APN,x.y#');
    });

    it('texto recusado → 400 com o motivo', async () => {
      const { service } = setup();
      await expect(service.send(VEHICLE_ID, { text: 'FACTORY#' }, admin)).rejects.toMatchObject({ detail: 'Comando não permitido pelo console.' });
      expect(await status(service.send(VEHICLE_ID, { text: 'FACTORY#' }, admin))).toBe(400);
      await expect(service.send(VEHICLE_ID, { text: 'relay,1#', confirm: true }, admin)).rejects.toMatchObject({ detail: 'Use Bloquear/Desbloquear da ficha da moto.' });
    });

    it('rastreador speed_control, sem imei ou moto sem rastreador → 409', async () => {
      const { prisma, service } = setup();
      prisma.tracker.findUnique.mockResolvedValue(tracker({ controlMode: 'speed_control' }) as any);
      expect(await status(service.send(VEHICLE_ID, { text: 'STATUS#' }, admin))).toBe(409);
      prisma.tracker.findUnique.mockResolvedValue(tracker({ imei: null }) as any);
      expect(await status(service.send(VEHICLE_ID, { text: 'STATUS#' }, admin))).toBe(409);
      prisma.tracker.findUnique.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID } as any);
      expect(await status(service.send(VEHICLE_ID, { text: 'STATUS#' }, admin))).toBe(409);
    });

    it('moto inexistente → 404', async () => {
      const { prisma, service } = setup();
      prisma.tracker.findUnique.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue(null);
      expect(await status(service.send(VEHICLE_ID, { text: 'STATUS#' }, admin))).toBe(404);
    });

    it('já existe pending recente → 409; pendente velho (> 90 s) é encerrado como timeout antes', async () => {
      const { prisma, service, iot } = setup();
      prisma.trackerConsoleCommand.findFirst.mockResolvedValue(row({ createdAt: new Date(now.getTime() - 10_000) }) as any);
      expect(await status(service.send(VEHICLE_ID, { text: 'STATUS#' }, admin))).toBe(409);
      expect(iot.publishConsole).not.toHaveBeenCalled();

      prisma.trackerConsoleCommand.findFirst.mockResolvedValue(null);
      await service.send(VEHICLE_ID, { text: 'STATUS#' }, admin);
      const upd = prisma.trackerConsoleCommand.updateMany.mock.calls.at(-1)![0] as any;
      expect(upd.where).toMatchObject({ vehicleId: VEHICLE_ID, status: 'pending', createdAt: { lt: new Date(now.getTime() - 90_000) } });
      expect(upd.data).toMatchObject({ status: 'failed', failReason: 'timeout' });
      expect(iot.publishConsole).toHaveBeenCalledTimes(1);
    });

    it('M4: serializa pela trava consultiva com $queryRaw (padrão do repo), nunca $executeRaw', async () => {
      const { prisma, service } = setup();
      await service.send(VEHICLE_ID, { text: 'STATUS#' }, admin);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [strings, key] = (prisma.$queryRaw as any).mock.calls[0];
      expect(strings.join('?')).toBe('SELECT pg_advisory_xact_lock(hashtext(?))::text');
      expect(key).toBe(`tracker-console:${VEHICLE_ID}`);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('I2: bloqueio/desbloqueio em andamento (pending/in_progress) → 409, nada publicado', async () => {
      const { prisma, service, iot } = setup();
      prisma.vehicleCommand.findFirst.mockResolvedValue({ id: 'cmd' } as any);
      await expect(service.send(VEHICLE_ID, { text: 'STATUS#' }, admin)).rejects.toMatchObject({ detail: 'Há um bloqueio/desbloqueio em andamento nesta moto.' });
      expect(await status(service.send(VEHICLE_ID, { text: 'STATUS#' }, admin))).toBe(409);
      expect(prisma.vehicleCommand.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { vehicleId: VEHICLE_ID, type: { in: ['lock', 'unlock'] }, status: { in: ['pending', 'in_progress'] }, createdAt: { gte: expect.any(Date) } } }),
      );
      expect(prisma.trackerConsoleCommand.create).not.toHaveBeenCalled();
      expect(iot.publishConsole).not.toHaveBeenCalled();
    });

    it('N1: só lock/unlock criado nos últimos 5 min bloqueia (linha antiga presa não trava o console)', async () => {
      const { prisma, service, iot } = setup();
      const rows = [{ id: 'old', createdAt: new Date(now.getTime() - 10 * 60_000) }];
      prisma.vehicleCommand.findFirst.mockImplementation((async (a: any) => rows.find((r) => r.createdAt >= a.where.createdAt.gte) ?? null) as any);
      await service.send(VEHICLE_ID, { text: 'STATUS#' }, admin);
      expect(iot.publishConsole).toHaveBeenCalledTimes(1);
      expect((prisma.vehicleCommand.findFirst.mock.calls[0][0] as any).where.createdAt).toEqual({ gte: new Date(now.getTime() - 5 * 60_000) });
      rows.push({ id: 'new', createdAt: new Date(now.getTime() - 60_000) });
      expect(await status(service.send(VEHICLE_ID, { text: 'STATUS#' }, admin))).toBe(409);
      expect(iot.publishConsole).toHaveBeenCalledTimes(1);
    });

    it('N5: change/connection com reserva em uso → 409 (aluguel ou reserva); leitura liberada', async () => {
      const { prisma, service, iot } = setup();
      prisma.reservation.findFirst.mockResolvedValue({ id: 'res1' } as any);
      await expect(service.send(VEHICLE_ID, { text: 'APN,x.y#', confirm: true }, admin)).rejects.toMatchObject({
        detail: 'A moto está em aluguel ou reserva; envie comandos de configuração depois do fim do aluguel ou da reserva.',
      });
      expect(prisma.reservation.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { vehicleId: VEHICLE_ID, status: { in: ['active', 'handover'] } } }));
      await service.send(VEHICLE_ID, { text: 'STATUS#' }, admin);
      expect(iot.publishConsole).toHaveBeenCalledTimes(1);
    });

    it('M5: change/connection com aluguel aberto → 409; leitura continua liberada', async () => {
      const { prisma, service, iot } = setup();
      prisma.rental.findFirst.mockResolvedValue({ id: 'r1' } as any);
      await expect(service.send(VEHICLE_ID, { text: 'TIMER,30,3600#', confirm: true }, admin)).rejects.toMatchObject({
        detail: 'A moto está em aluguel ou reserva; envie comandos de configuração depois do fim do aluguel ou da reserva.',
      });
      expect(await status(service.send(VEHICLE_ID, { text: 'RESET#', confirm: true }, admin))).toBe(409);
      expect(prisma.rental.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { vehicleId: VEHICLE_ID, status: { in: ['active', 'paused', 'ending'] } } }));
      expect(iot.publishConsole).not.toHaveBeenCalled();
      await service.send(VEHICLE_ID, { text: 'STATUS#' }, admin);
      expect(iot.publishConsole).toHaveBeenCalledWith(THING, CMD_ID, 'STATUS#');
    });

    it('falha ao publicar → comando fica failed/error', async () => {
      const { prisma, iot, service } = setup();
      iot.publishConsole.mockRejectedValue(new Error('mqtt'));
      prisma.trackerConsoleCommand.update.mockImplementation((async (a: any) => row(a.data)) as any);
      const out = await service.send(VEHICLE_ID, { text: 'STATUS#' }, admin);
      expect(out).toMatchObject({ status: 'failed', failReason: 'error' });
    });
  });

  describe('onDeviceEvent', () => {
    it('resposta → answered com response (truncada em 1000) e respondedAt', async () => {
      const { prisma, service } = setup();
      prisma.trackerConsoleCommand.updateMany.mockResolvedValue({ count: 1 } as any);
      await service.onDeviceEvent({ thingName: THING, comandoId: CMD_ID, kind: 'resposta', texto: 'x'.repeat(1500) });
      const a = prisma.trackerConsoleCommand.updateMany.mock.calls[0][0] as any;
      expect(a.where).toEqual({ id: CMD_ID, thingName: THING, status: 'pending' });
      expect(a.data).toMatchObject({ status: 'answered', respondedAt: now });
      expect(a.data.response).toHaveLength(1000);
    });
    it('falha offline → failed/offline; erro → error', async () => {
      const { prisma, service } = setup();
      prisma.trackerConsoleCommand.updateMany.mockResolvedValue({ count: 1 } as any);
      await service.onDeviceEvent({ thingName: THING, comandoId: CMD_ID, kind: 'falha', motivo: 'offline' });
      expect((prisma.trackerConsoleCommand.updateMany.mock.calls[0][0] as any).data).toMatchObject({ status: 'failed', failReason: 'offline' });
      await service.onDeviceEvent({ thingName: THING, comandoId: CMD_ID, kind: 'falha', motivo: 'erro' });
      expect((prisma.trackerConsoleCommand.updateMany.mock.calls[1][0] as any).data).toMatchObject({ failReason: 'error' });
    });
    it('desconhecido ou já encerrado (count 0) → ignorado sem erro', async () => {
      const { service } = setup();
      await expect(service.onDeviceEvent({ thingName: THING, comandoId: CMD_ID, kind: 'resposta', texto: 'ok' })).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('statusReport só para resposta de STATUS#; pendentes vencidos viram timeout', async () => {
      const { prisma, service } = setup();
      prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID } as any);
      prisma.trackerConsoleCommand.findMany.mockResolvedValue([
        row({ id: 'a', status: 'answered', response: 'Battery:4.27V;CSQ:18;', respondedAt: now }),
        row({ id: 'b', text: 'TIMER,30,3600#', risk: 'change', status: 'answered', response: 'Battery:4.27V;', respondedAt: now }),
      ] as any);
      const out = await service.list(VEHICLE_ID, 20);
      expect(out.items[0].statusReport).toMatchObject({ batteryVolts: 4.27, csq: 18 });
      expect(out.items[1].statusReport).toBeNull();
      const upd = prisma.trackerConsoleCommand.updateMany.mock.calls[0][0] as any;
      expect(upd.data).toMatchObject({ status: 'failed', failReason: 'timeout' });
      expect(prisma.trackerConsoleCommand.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { vehicleId: VEHICLE_ID }, orderBy: { createdAt: 'desc' }, take: 20 }));
    });
    it('moto inexistente → 404', async () => {
      const { prisma, service } = setup();
      prisma.vehicle.findUnique.mockResolvedValue(null);
      expect(await status(service.list(VEHICLE_ID, 20))).toBe(404);
    });
  });
});
