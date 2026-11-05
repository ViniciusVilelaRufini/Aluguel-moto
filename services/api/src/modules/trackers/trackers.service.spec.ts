import { Prisma, PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { ProblemException } from '../../common/problem';
import { MemoryRedisStore } from '../../redis/redis-store';
import type { Principal } from '../auth/principal';
import { stockThingName } from './trackers.mapper';
import { TrackersService } from './trackers.service';

const OP_ID = 'bbbbbbbb-0000-4000-8000-000000000003';
const operacao: Principal = { pool: 'staff', sub: 'o', email: 'o@volti.com.br', groups: ['operacao'], userId: OP_ID, staffId: OP_ID };
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_VEHICLE_ID = '44444444-4444-4444-8444-444444444444';
const TRACKER_ID = '66666666-6666-4666-8666-666666666666';
const OLD_TRACKER_ID = '77777777-7777-4777-8777-777777777777';
const SIM_ID = '55555555-5555-4555-8555-555555555555';
const IMEI = '869890080273430';
const OLD_IMEI = '869890080270059';
const NOW = new Date('2026-11-05T12:00:00Z');

const VEHICLE_SEEN = new Date('2026-11-05T11:58:00Z');
const vehicleRow = { id: VEHICLE_ID, code: 'VLT-0059', thingName: 'moto-0059', lastSeenAt: VEHICLE_SEEN };
const simSummary = { id: SIM_ID, iccid: '8955170110123456789', msisdn: null, carrier: 'Algar', apn: null, status: 'active' };

const trackerRow = (over: Record<string, unknown> = {}) => ({
  id: TRACKER_ID,
  thingName: stockThingName(IMEI),
  imei: IMEI,
  vehicleId: null,
  controlMode: 'relay_only',
  protocol: 'gt06',
  model: 'J16',
  certificateArn: null,
  lastSeenAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  vehicle: null,
  simCard: null,
  ...over,
});
const installedRow = (over: Record<string, unknown> = {}) =>
  trackerRow({ vehicleId: VEHICLE_ID, thingName: 'moto-0059', vehicle: { id: VEHICLE_ID, code: 'VLT-0059', online: true, lastSeenAt: NOW }, ...over });

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  prisma.$queryRaw.mockResolvedValue([] as any);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.reservation.findFirst.mockResolvedValue(null);
  prisma.vehicleCommand.findFirst.mockResolvedValue(null);
  prisma.vehicle.findUnique.mockResolvedValue(vehicleRow as any);
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const redis = new MemoryRedisStore();
  const modes = { byVehicle: jest.fn(), invalidate: jest.fn() };
  const live = { setOnline: jest.fn().mockResolvedValue({}) };
  const service = new TrackersService(prisma as any, audit as any, redis, modes, live);
  jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());
  return { prisma, audit, redis, modes, live, service };
}

afterEach(() => jest.restoreAllMocks());

const p2002 = () => new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'x' });
async function problem(p: Promise<unknown>): Promise<ProblemException> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ProblemException);
    return e as ProblemException;
  }
  throw new Error('não lançou');
}

/** `tracker.findUnique` por id (o rastreador escolhido) e por vehicleId (o atual da moto). */
function trackers(prisma: ReturnType<typeof setup>['prisma'], byId: Record<string, unknown> | null, current: Record<string, unknown> | null) {
  prisma.tracker.findUnique.mockImplementation((async (a: any) => (a.where.id ? byId : a.where.vehicleId ? current : null)) as any);
}

describe('TrackersService', () => {
  it('stockThingName = gt06-<IMEI>', () => {
    expect(stockThingName(IMEI)).toBe('gt06-869890080273430');
  });

  describe('create', () => {
    it('grava gt06-<IMEI>, relay_only, gt06, J16 sem moto', async () => {
      const { prisma, service } = setup();
      prisma.tracker.create.mockResolvedValue(trackerRow() as any);
      prisma.tracker.findUniqueOrThrow.mockResolvedValue(trackerRow() as any);
      const out = await service.create({ imei: IMEI, model: 'J16' }, operacao);
      expect(prisma.tracker.create.mock.calls[0][0].data).toEqual({
        thingName: 'gt06-869890080273430',
        imei: IMEI,
        controlMode: 'relay_only',
        protocol: 'gt06',
        model: 'J16',
        vehicleId: null,
      });
      expect(out).toMatchObject({ id: TRACKER_ID, imei: IMEI, model: 'J16', installed: false, vehicleId: null, vehicleCode: null, simCard: null, online: false, lastSeenAt: null });
    });

    it('IMEI com 14 dígitos → 400; modelo fora da lista → 400', async () => {
      const { prisma, service } = setup();
      expect((await problem(service.create({ imei: '86989008027343', model: 'J16' }, operacao))).getStatus()).toBe(400);
      expect((await problem(service.create({ imei: IMEI, model: 'X9' as any }, operacao))).getStatus()).toBe(400);
      expect(prisma.tracker.create).not.toHaveBeenCalled();
    });

    it('IMEI repetido → 409', async () => {
      const { prisma, service } = setup();
      prisma.tracker.create.mockRejectedValue(p2002());
      const e = await problem(service.create({ imei: IMEI, model: 'J16' }, operacao));
      expect(e.getStatus()).toBe(409);
      expect(e.detail).toBe('Já existe um rastreador com este IMEI.');
    });

    it('com simCardId vincula o chip', async () => {
      const { prisma, service } = setup();
      prisma.simCard.findUnique.mockResolvedValue({ id: SIM_ID, trackerId: null } as any);
      prisma.tracker.create.mockResolvedValue(trackerRow() as any);
      prisma.tracker.findUniqueOrThrow.mockResolvedValue(trackerRow({ simCard: simSummary }) as any);
      const out = await service.create({ imei: IMEI, model: 'J16', simCardId: SIM_ID }, operacao);
      expect(prisma.simCard.update).toHaveBeenCalledWith({ where: { id: SIM_ID }, data: { trackerId: TRACKER_ID } });
      expect(out.simCard).toMatchObject({ id: SIM_ID });
    });

    it('chip já vinculado → 409; chip inexistente → 404', async () => {
      const { prisma, service } = setup();
      prisma.simCard.findUnique.mockResolvedValueOnce({ id: SIM_ID, trackerId: OLD_TRACKER_ID } as any);
      expect((await problem(service.create({ imei: IMEI, model: 'J16', simCardId: SIM_ID }, operacao))).getStatus()).toBe(409);
      prisma.simCard.findUnique.mockResolvedValueOnce(null);
      expect((await problem(service.create({ imei: IMEI, model: 'J16', simCardId: SIM_ID }, operacao))).getStatus()).toBe(404);
      expect(prisma.tracker.create).not.toHaveBeenCalled();
    });

    it('audita tracker.create só com imeiLast4', async () => {
      const { prisma, audit, service } = setup();
      prisma.tracker.create.mockResolvedValue(trackerRow() as any);
      prisma.tracker.findUniqueOrThrow.mockResolvedValue(trackerRow() as any);
      await service.create({ imei: IMEI, model: 'J16' }, operacao);
      const [entry] = audit.record.mock.calls[0];
      expect(entry).toMatchObject({ actor: operacao, action: 'tracker.create', entityType: 'Tracker', entityId: TRACKER_ID, metadata: { imeiLast4: '3430' } });
      expect(Object.keys(entry.metadata)).toEqual(['imeiLast4']);
      expect(JSON.stringify(entry)).not.toContain(IMEI);
    });
  });

  describe('install', () => {
    it('moto sem rastreador: o rastreador assume o thingName da moto e a moto', async () => {
      const { prisma, modes, service } = setup();
      trackers(prisma, trackerRow(), null);
      prisma.tracker.update.mockResolvedValue(installedRow() as any);
      const out = await service.install(VEHICLE_ID, TRACKER_ID, operacao);
      expect(prisma.tracker.update).toHaveBeenCalledTimes(1);
      expect(prisma.tracker.update.mock.calls[0][0]).toMatchObject({ where: { id: TRACKER_ID }, data: { thingName: 'moto-0059', vehicleId: VEHICLE_ID } });
      expect(out).toMatchObject({ id: TRACKER_ID, installed: true, vehicleId: VEHICLE_ID, vehicleCode: 'VLT-0059', online: true });
      expect(modes.invalidate).toHaveBeenCalledWith(VEHICLE_ID);
      // Sinal herdado zerado: o novo só aparece online depois de falar.
      expect(prisma.vehicle.update).toHaveBeenCalledWith({ where: { id: VEHICLE_ID }, data: { lastSeenAt: null } });
    });

    it('moto com outro rastreador: o antigo volta ao estoque ANTES do novo assumir o thingName', async () => {
      const { prisma, audit, service } = setup();
      const old = trackerRow({ id: OLD_TRACKER_ID, imei: OLD_IMEI, vehicleId: VEHICLE_ID, thingName: 'moto-0059' });
      trackers(prisma, trackerRow(), old);
      const order: string[] = [];
      prisma.tracker.update.mockImplementation((async (a: any) => {
        order.push(`${a.where.id}:${a.data.thingName}:${a.data.vehicleId}`);
        return a.where.id === TRACKER_ID ? installedRow() : trackerRow({ id: OLD_TRACKER_ID, imei: OLD_IMEI });
      }) as any);
      await service.install(VEHICLE_ID, TRACKER_ID, operacao);
      expect(order).toEqual([`${OLD_TRACKER_ID}:gt06-${OLD_IMEI}:null`, `${TRACKER_ID}:moto-0059:${VEHICLE_ID}`]);
      // M3: o antigo leva o último sinal da moto para o estoque.
      expect(prisma.tracker.update.mock.calls[0][0].data).toMatchObject({ lastSeenAt: VEHICLE_SEEN });
      expect(prisma.vehicle.update).toHaveBeenCalledWith({ where: { id: VEHICLE_ID }, data: { lastSeenAt: null } });
      const actions = audit.record.mock.calls.map(([e]) => [e.action, e.entityId, e.metadata]);
      expect(actions).toEqual([
        ['tracker.remove', OLD_TRACKER_ID, { imeiLast4: '0059', vehicleId: VEHICLE_ID }],
        ['tracker.install', TRACKER_ID, { imeiLast4: '3430', vehicleId: VEHICLE_ID }],
      ]);
    });

    it('o mesmo rastreador já instalado na moto: retorna sem escrever', async () => {
      const { prisma, audit, service } = setup();
      trackers(prisma, installedRow(), installedRow());
      const out = await service.install(VEHICLE_ID, TRACKER_ID, operacao);
      expect(out).toMatchObject({ id: TRACKER_ID, installed: true, vehicleId: VEHICLE_ID });
      expect(prisma.tracker.update).not.toHaveBeenCalled();
      expect(prisma.vehicle.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('rastreador instalado em outra moto → 409 com o código da moto', async () => {
      const { prisma, service } = setup();
      trackers(prisma, trackerRow({ vehicleId: OTHER_VEHICLE_ID, thingName: 'moto-0060', vehicle: { id: OTHER_VEHICLE_ID, code: 'VLT-0060', online: true, lastSeenAt: NOW } }), null);
      const e = await problem(service.install(VEHICLE_ID, TRACKER_ID, operacao));
      expect(e.getStatus()).toBe(409);
      expect(e.detail).toBe('Este rastreador está instalado na VLT-0060. Remova de lá primeiro.');
      expect(prisma.tracker.update).not.toHaveBeenCalled();
    });

    it('rastreador inexistente ou com certificado (MQTT) → 404; moto inexistente → 404', async () => {
      const { prisma, service } = setup();
      trackers(prisma, null, null);
      expect((await problem(service.install(VEHICLE_ID, TRACKER_ID, operacao))).getStatus()).toBe(404);
      trackers(prisma, trackerRow({ certificateArn: 'arn:aws:iot:x:cert/abc' }), null);
      expect((await problem(service.install(VEHICLE_ID, TRACKER_ID, operacao))).getStatus()).toBe(404);
      trackers(prisma, trackerRow(), null);
      prisma.vehicle.findUnique.mockResolvedValue(null);
      expect((await problem(service.install(VEHICLE_ID, TRACKER_ID, operacao))).getStatus()).toBe(404);
      expect(prisma.tracker.update).not.toHaveBeenCalled();
    });

    it('moto com rastreador MQTT (certificado) não é trocada por aqui → 409', async () => {
      const { prisma, service } = setup();
      trackers(prisma, trackerRow(), trackerRow({ id: OLD_TRACKER_ID, imei: null, controlMode: 'speed_control', certificateArn: 'arn:aws:iot:x:cert/abc', vehicleId: VEHICLE_ID, thingName: 'moto-0059' }));
      expect((await problem(service.install(VEHICLE_ID, TRACKER_ID, operacao))).getStatus()).toBe(409);
      expect(prisma.tracker.update).not.toHaveBeenCalled();
    });

    it.each([
      ['aluguel aberto', (s: ReturnType<typeof setup>) => s.prisma.rental.findFirst.mockResolvedValue({ id: 'r-1' } as any)],
      ['reserva em uso', (s: ReturnType<typeof setup>) => s.prisma.reservation.findFirst.mockResolvedValue({ id: 'res-1' } as any)],
      ['lock em andamento (<5 min)', (s: ReturnType<typeof setup>) => s.prisma.vehicleCommand.findFirst.mockResolvedValue({ id: 'cmd-1' } as any)],
      ['trava no Redis', async (s: ReturnType<typeof setup>) => s.redis.set('iot:relay-lock:moto-0059', '{}')],
    ])('%s → 409 e nada é gravado', async (_name, arrange) => {
      const s = setup();
      trackers(s.prisma, trackerRow(), null);
      await arrange(s);
      expect((await problem(s.service.install(VEHICLE_ID, TRACKER_ID, operacao))).getStatus()).toBe(409);
      expect(s.prisma.tracker.update).not.toHaveBeenCalled();
      expect(s.prisma.vehicle.update).not.toHaveBeenCalled();
      expect(s.audit.record).not.toHaveBeenCalled();
    });

    it('lock antigo (>5 min) não bloqueia: o filtro de createdAt é de 5 min', async () => {
      const { prisma, service } = setup();
      trackers(prisma, trackerRow(), null);
      prisma.tracker.update.mockResolvedValue(installedRow() as any);
      await service.install(VEHICLE_ID, TRACKER_ID, operacao);
      expect((prisma.vehicleCommand.findFirst.mock.calls[0][0] as any).where.createdAt).toEqual({ gte: new Date(NOW.getTime() - 5 * 60_000) });
    });

    it('corrida de unicidade (P2002) → 409', async () => {
      const { prisma, service } = setup();
      trackers(prisma, trackerRow(), null);
      prisma.tracker.update.mockRejectedValue(p2002());
      expect((await problem(service.install(VEHICLE_ID, TRACKER_ID, operacao))).getStatus()).toBe(409);
    });
  });

  describe('depois de instalar/trocar/remover (I1/I2)', () => {
    it('instalar: moto offline no estado ao vivo e marca tracker-installed:<thing> (10 min)', async () => {
      const { prisma, redis, live, service } = setup();
      trackers(prisma, trackerRow(), null);
      prisma.tracker.update.mockResolvedValue(installedRow() as any);
      const set = jest.spyOn(redis, 'set');
      await service.install(VEHICLE_ID, TRACKER_ID, operacao);
      expect(live.setOnline).toHaveBeenCalledWith('moto-0059', false);
      expect(set).toHaveBeenCalledWith('tracker-installed:moto-0059', String(NOW.getTime()), 10 * 60_000);
    });

    it('trocar: também marca e derruba o estado ao vivo', async () => {
      const { prisma, redis, live, service } = setup();
      trackers(prisma, trackerRow(), trackerRow({ id: OLD_TRACKER_ID, imei: OLD_IMEI, vehicleId: VEHICLE_ID, thingName: 'moto-0059' }));
      prisma.tracker.update.mockResolvedValue(installedRow() as any);
      await service.install(VEHICLE_ID, TRACKER_ID, operacao);
      expect(live.setOnline).toHaveBeenCalledWith('moto-0059', false);
      expect(await redis.get('tracker-installed:moto-0059')).toBe(String(NOW.getTime()));
    });

    it('remover: moto offline no estado ao vivo, sem marca de instalação', async () => {
      const { prisma, redis, live, service } = setup();
      trackers(prisma, null, installedRow());
      prisma.tracker.update.mockResolvedValue(trackerRow() as any);
      await service.remove(VEHICLE_ID, operacao);
      expect(live.setOnline).toHaveBeenCalledWith('moto-0059', false);
      expect(await redis.get('tracker-installed:moto-0059')).toBeNull();
    });

    it('o mesmo rastreador (nada gravado) e a recusa (409) não mexem no estado ao vivo', async () => {
      const s = setup();
      trackers(s.prisma, installedRow(), installedRow());
      await s.service.install(VEHICLE_ID, TRACKER_ID, operacao);
      trackers(s.prisma, trackerRow(), null);
      s.prisma.rental.findFirst.mockResolvedValue({ id: 'r-1' } as any);
      await problem(s.service.install(VEHICLE_ID, TRACKER_ID, operacao));
      expect(s.live.setOnline).not.toHaveBeenCalled();
      expect(await s.redis.get('tracker-installed:moto-0059')).toBeNull();
    });

    it('falha do Redis depois do commit não derruba a resposta', async () => {
      const { prisma, redis, live, service } = setup();
      trackers(prisma, trackerRow(), null);
      prisma.tracker.update.mockResolvedValue(installedRow() as any);
      jest.spyOn(redis, 'set').mockRejectedValue(new Error('redis fora'));
      live.setOnline.mockRejectedValue(new Error('redis fora'));
      await expect(service.install(VEHICLE_ID, TRACKER_ID, operacao)).resolves.toMatchObject({ installed: true });
    });
  });

  describe('remove', () => {
    it('devolve ao estoque (gt06-<IMEI>, sem moto) e mantém o chip', async () => {
      const { prisma, audit, modes, service } = setup();
      trackers(prisma, null, installedRow({ simCard: simSummary }));
      prisma.tracker.update.mockResolvedValue(trackerRow({ simCard: simSummary }) as any);
      const out = await service.remove(VEHICLE_ID, operacao);
      expect(prisma.tracker.update.mock.calls[0][0]).toMatchObject({ where: { id: TRACKER_ID }, data: { thingName: 'gt06-869890080273430', vehicleId: null, lastSeenAt: VEHICLE_SEEN } });
      expect(prisma.simCard.update).not.toHaveBeenCalled();
      expect(prisma.simCard.updateMany).not.toHaveBeenCalled();
      expect(out).toMatchObject({ installed: false, vehicleId: null, simCard: { id: SIM_ID } });
      expect(audit.record.mock.calls[0][0]).toMatchObject({ action: 'tracker.remove', entityId: TRACKER_ID, metadata: { imeiLast4: '3430', vehicleId: VEHICLE_ID } });
      expect(modes.invalidate).toHaveBeenCalledWith(VEHICLE_ID);
      expect(prisma.vehicle.update).toHaveBeenCalledWith({ where: { id: VEHICLE_ID }, data: { lastSeenAt: null } });
    });

    it('moto sem rastreador → 404; moto inexistente → 404', async () => {
      const { prisma, service } = setup();
      trackers(prisma, null, null);
      const e = await problem(service.remove(VEHICLE_ID, operacao));
      expect(e.getStatus()).toBe(404);
      expect(e.detail).toBe('Esta moto não tem rastreador.');
      prisma.vehicle.findUnique.mockResolvedValue(null);
      expect((await problem(service.remove(VEHICLE_ID, operacao))).getStatus()).toBe(404);
    });

    it.each([
      ['aluguel aberto', (s: ReturnType<typeof setup>) => s.prisma.rental.findFirst.mockResolvedValue({ id: 'r-1' } as any)],
      ['reserva em uso', (s: ReturnType<typeof setup>) => s.prisma.reservation.findFirst.mockResolvedValue({ id: 'res-1' } as any)],
      ['lock em andamento (<5 min)', (s: ReturnType<typeof setup>) => s.prisma.vehicleCommand.findFirst.mockResolvedValue({ id: 'cmd-1' } as any)],
      ['trava no Redis', async (s: ReturnType<typeof setup>) => s.redis.hset('iot:safe-lock:index', { 'moto-0059': '{}' })],
    ])('%s → 409 e nada é gravado', async (_name, arrange) => {
      const s = setup();
      trackers(s.prisma, null, installedRow());
      await arrange(s);
      expect((await problem(s.service.remove(VEHICLE_ID, operacao))).getStatus()).toBe(409);
      expect(s.prisma.tracker.update).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('filtra relay_only com IMEI e sem certificado; q, installed e vehicleId', async () => {
      const { prisma, service } = setup();
      prisma.tracker.findMany.mockResolvedValue([] as any);
      await service.list({ q: '3430', installed: false });
      expect(prisma.tracker.findMany.mock.calls[0][0]!.where).toEqual({
        controlMode: 'relay_only',
        imei: { not: null, contains: '3430' },
        certificateArn: null,
        vehicleId: null,
      });
      await service.list({ installed: true });
      expect(prisma.tracker.findMany.mock.calls[1][0]!.where).toEqual({ controlMode: 'relay_only', imei: { not: null }, certificateArn: null, vehicleId: { not: null } });
      await service.list({ vehicleId: VEHICLE_ID });
      expect(prisma.tracker.findMany.mock.calls[2][0]!.where).toMatchObject({ vehicleId: VEHICLE_ID });
      expect(prisma.tracker.findMany.mock.calls[0][0]!.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('online pela moto quando instalado e pelo Tracker.lastSeenAt no estoque (mesma janela de 180 s)', async () => {
      const { prisma, service } = setup();
      const ago = (ms: number) => new Date(NOW.getTime() - ms);
      prisma.tracker.findMany.mockResolvedValue([
        installedRow({ id: 'a', lastSeenAt: null, vehicle: { id: VEHICLE_ID, code: 'VLT-0059', online: true, lastSeenAt: ago(30_000) } }),
        installedRow({ id: 'b', lastSeenAt: ago(1_000), vehicle: { id: VEHICLE_ID, code: 'VLT-0059', online: true, lastSeenAt: ago(600_000) } }),
        trackerRow({ id: 'c', lastSeenAt: ago(179_999) }),
        trackerRow({ id: 'd', lastSeenAt: ago(180_000) }),
        trackerRow({ id: 'e', lastSeenAt: null }),
      ] as any);
      const { items } = await service.list({});
      expect(items.map((i) => [i.id, i.online, i.lastSeenAt])).toEqual([
        ['a', true, ago(30_000).toISOString()],
        ['b', false, ago(600_000).toISOString()],
        ['c', true, ago(179_999).toISOString()],
        ['d', false, ago(180_000).toISOString()],
        ['e', false, null],
      ]);
    });
  });
});

describe('janela do online (IOT_OFFLINE_AFTER_MS)', () => {
  const prev = process.env.IOT_OFFLINE_AFTER_MS;
  afterEach(() => {
    if (prev === undefined) delete process.env.IOT_OFFLINE_AFTER_MS;
    else process.env.IOT_OFFLINE_AFTER_MS = prev;
  });

  it('estoque e instalado usam a mesma janela configurada', async () => {
    process.env.IOT_OFFLINE_AFTER_MS = '60000';
    const { prisma, service } = setup();
    const ago = (ms: number) => new Date(NOW.getTime() - ms);
    prisma.tracker.findMany.mockResolvedValue([
      trackerRow({ id: 'stock', lastSeenAt: ago(90_000) }),
      installedRow({ id: 'inst', vehicle: { id: VEHICLE_ID, code: 'VLT-0059', online: true, lastSeenAt: ago(90_000) } }),
    ] as any);
    const { items } = await service.list({});
    expect(items.map((i) => i.online)).toEqual([false, false]);
  });
});
