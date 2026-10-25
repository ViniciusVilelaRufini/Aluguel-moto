import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Prisma, PrismaClient } from '@prisma/client';
import { ProblemException } from '../../common/problem';
import type { Principal } from '../auth/principal';
import { DepotsService } from './depots.service';

const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
const OTHER_ID = '8a1c6b0d-3a2e-4d7a-9b44-0c1d2e3f4a5b';
const now = new Date('2026-10-22T13:00:00Z');

const customer: Principal = { pool: 'customer', sub: 'c', email: 'c@example.com', groups: [], userId: 'cust', customerId: 'cust' };
const operacao: Principal = { pool: 'staff', sub: 's', email: 's@volti.com.br', groups: ['operacao'], userId: 'staff', staffId: 'staff' };

const depotRow = (over: Record<string, unknown> = {}) => ({
  id: DEPOT_ID,
  name: 'Galpão Volti Pinheiros',
  address: 'R. Fradique Coutinho, 1500',
  district: 'Pinheiros',
  lat: -23.5617,
  lng: -46.6908,
  timezone: 'America/Sao_Paulo',
  openingHours: [{ weekday: 4, opensAt: '08:00', closesAt: '20:00' }],
  pickupNowWindowMinutes: 120,
  maxScheduleDays: 7,
  scheduledGraceMinutes: 30,
  swapStationId: null,
  active: true,
  createdAt: now,
  updatedAt: now,
  ...over,
});

const validInput = () => ({
  name: 'Galpão Teste',
  address: 'Rua A, 1',
  lat: -23.5,
  lng: -46.6,
  openingHours: [{ weekday: 1, opensAt: '08:00', closesAt: '20:00' }],
});

function setup() {
  const prisma: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new DepotsService(prisma as any, audit as any);
  prisma.depot.findUnique.mockResolvedValue(depotRow() as any);
  prisma.vehicle.findMany.mockResolvedValue([]);
  (prisma.vehicle.groupBy as any).mockResolvedValue([] as any);
  prisma.reservation.findMany.mockResolvedValue([]);
  prisma.subscription.findMany.mockResolvedValue([]);
  return { prisma, audit, service };
}

async function problemOf(p: Promise<unknown>): Promise<ProblemException> {
  try {
    await p;
  } catch (e) {
    return e as ProblemException;
  }
  throw new Error('esperava erro');
}

describe('DepotsService', () => {
  describe('vehicles()', () => {
    it('cliente: só motos free deste galpão (nunca reserved/awaiting_pickup), bateria desc, mesmo pedindo outro status', async () => {
      const { service, prisma } = setup();
      await service.vehicles(DEPOT_ID, customer, { status: 'reserved' });
      const args = prisma.vehicle.findMany.mock.calls[0][0]!;
      expect(args.where).toEqual({ depotId: DEPOT_ID, status: 'free' });
      expect(args.orderBy).toEqual([{ batteryPct: 'desc' }, { code: 'asc' }]);
    });

    it('cliente: filtra o que vier do banco por segurança (outro galpão ou status) e mapeia sem campos de staff', async () => {
      const { service, prisma } = setup();
      const base = { code: 'VLT-1', model: 'Volti S1', lat: 0, lng: 0, batteryPct: 80, speedLimitKmh: 32, thingName: 't', online: true, locked: true, ignition: false, stolenMode: false, odometerKm: 0, usageHours: 0, createdAt: now, updatedAt: now };
      prisma.vehicle.findMany.mockResolvedValue([
        { ...base, id: 'a', status: 'free', depotId: DEPOT_ID },
        { ...base, id: 'b', status: 'reserved', depotId: DEPOT_ID },
        { ...base, id: 'c', status: 'awaiting_pickup', depotId: DEPOT_ID },
        { ...base, id: 'd', status: 'free', depotId: OTHER_ID },
      ] as any);
      const { items } = await service.vehicles(DEPOT_ID, customer, {});
      expect(items.map((v) => v.id)).toEqual(['a']);
      expect(items[0]).toMatchObject({ depotId: DEPOT_ID, status: 'free' });
      expect(items[0]).not.toHaveProperty('thingName');
    });

    it('cliente: esconde moto fixa da assinatura vigente de OUTRO cliente; a própria moto fixa continua visível', async () => {
      const { service, prisma } = setup();
      const base = { code: 'VLT-1', model: 'Volti S1', status: 'free', depotId: DEPOT_ID, lat: 0, lng: 0, batteryPct: 80, speedLimitKmh: 32, createdAt: now, updatedAt: now };
      prisma.vehicle.findMany.mockResolvedValue([{ ...base, id: 'mine' }, { ...base, id: 'theirs' }, { ...base, id: 'loose' }] as any);
      prisma.subscription.findMany.mockResolvedValue([{ assignedVehicleId: 'theirs' }] as any);
      const { items } = await service.vehicles(DEPOT_ID, customer, {});
      expect(items.map((v) => v.id)).toEqual(['mine', 'loose']);
      const where = prisma.subscription.findMany.mock.calls[0][0]!.where as any;
      expect(where).toMatchObject({ assignedVehicleId: { in: ['mine', 'theirs', 'loose'] }, customerId: { not: 'cust' }, status: { in: ['active', 'paused'] } });
      expect(where.currentPeriodEnd.gt).toBeInstanceOf(Date);
    });

    it('staff: não consulta motos fixas (vê todas)', async () => {
      const { service, prisma } = setup();
      await service.vehicles(DEPOT_ID, operacao, {});
      expect(prisma.subscription.findMany).not.toHaveBeenCalled();
    });

    it('cliente: galpão inativo → 404', async () => {
      const { service, prisma } = setup();
      prisma.depot.findUnique.mockResolvedValue(depotRow({ active: false }) as any);
      expect((await problemOf(service.vehicles(DEPOT_ID, customer, {}))).getStatus()).toBe(404);
    });

    it('staff: todas as motos do galpão, com filtro opcional de status e modelo', async () => {
      const { service, prisma } = setup();
      await service.vehicles(DEPOT_ID, operacao, {});
      expect(prisma.vehicle.findMany.mock.calls[0][0]!.where).toEqual({ depotId: DEPOT_ID });
      await service.vehicles(DEPOT_ID, operacao, { status: 'awaiting_pickup', vehicleModelId: OTHER_ID });
      expect(prisma.vehicle.findMany.mock.calls[1][0]!.where).toEqual({ depotId: DEPOT_ID, status: 'awaiting_pickup', vehicleModelId: OTHER_ID });
    });
  });

  describe('create()', () => {
    it.each([
      ['opensAt depois de closesAt', [{ weekday: 1, opensAt: '20:00', closesAt: '08:00' }]],
      ['opensAt igual a closesAt', [{ weekday: 1, opensAt: '08:00', closesAt: '08:00' }]],
      ['HH:MM inválido', [{ weekday: 1, opensAt: '8:00', closesAt: '20:00' }]],
      ['hora 24', [{ weekday: 1, opensAt: '08:00', closesAt: '24:00' }]],
      ['weekday 7', [{ weekday: 7, opensAt: '08:00', closesAt: '20:00' }]],
      ['weekday negativo', [{ weekday: -1, opensAt: '08:00', closesAt: '20:00' }]],
      ['dia repetido', [{ weekday: 1, opensAt: '08:00', closesAt: '12:00' }, { weekday: 1, opensAt: '13:00', closesAt: '20:00' }]],
    ])('openingHours com %s → 400 validation-error', async (_name, openingHours) => {
      const { service, prisma } = setup();
      const e = await problemOf(service.create(operacao, { ...validInput(), openingHours } as any));
      expect(e.getStatus()).toBe(400);
      expect(e.slug).toBe('validation-error');
      expect(prisma.depot.create).not.toHaveBeenCalled();
    });

    it('fuso inválido → 400', async () => {
      const { service } = setup();
      const e = await problemOf(service.create(operacao, { ...validInput(), timezone: 'Marte/Olimpo' } as any));
      expect(e.getStatus()).toBe(400);
    });

    it('nome repetido → 409 conflict', async () => {
      const { service, prisma } = setup();
      prisma.depot.findUnique.mockResolvedValue(depotRow() as any);
      const e = await problemOf(service.create(operacao, validInput() as any));
      expect(e.getStatus()).toBe(409);
    });

    it('corrida no nome único (P2002) → 409 com mensagem do galpão', async () => {
      const { service, prisma } = setup();
      prisma.depot.findUnique.mockResolvedValue(null);
      prisma.depot.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x', meta: { target: ['name'] } }));
      const e = await problemOf(service.create(operacao, validInput() as any));
      expect(e.getStatus()).toBe(409);
      expect(e.detail).toBe('Já existe um galpão com este nome.');
    });

    it('cria, grava depot.create e devolve com contagem zero', async () => {
      const { service, prisma, audit } = setup();
      prisma.depot.findUnique.mockResolvedValue(null);
      prisma.depot.create.mockImplementation((async (args: any) => depotRow({ ...args.data, id: OTHER_ID })) as any);
      const d = await service.create(operacao, validInput() as any);
      expect(d).toMatchObject({ id: OTHER_ID, name: 'Galpão Teste', availableVehicleCount: 0 });
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'depot.create', entityType: 'Depot', entityId: OTHER_ID }), prisma);
    });
  });

  describe('update()', () => {
    it('valida openingHours quando enviado e grava depot.update', async () => {
      const { service, prisma, audit } = setup();
      expect((await problemOf(service.update(operacao, DEPOT_ID, { openingHours: [{ weekday: 2, opensAt: '18:00', closesAt: '09:00' }] } as any))).getStatus()).toBe(400);
      prisma.depot.update.mockResolvedValue(depotRow({ active: false }) as any);
      const d = await service.update(operacao, DEPOT_ID, { active: false } as any);
      expect(d.active).toBe(false);
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'depot.update', entityId: DEPOT_ID }), prisma);
    });

    it('galpão inexistente → 404', async () => {
      const { service, prisma } = setup();
      prisma.depot.findUnique.mockResolvedValue(null);
      expect((await problemOf(service.update(operacao, DEPOT_ID, { active: true } as any))).getStatus()).toBe(404);
    });

    it('liga à estação (existente) e desliga com clearSwapStation; os dois juntos → 400 (Task 12 das lacunas)', async () => {
      const { service, prisma } = setup();
      const STATION = 'd0000000-0000-4000-8000-000000000001';
      prisma.swapStation.findUnique.mockResolvedValue({ id: STATION } as any);
      prisma.depot.update.mockResolvedValue(depotRow({ swapStationId: STATION }) as any);
      expect((await service.update(operacao, DEPOT_ID, { swapStationId: STATION } as any)).swapStationId).toBe(STATION);
      expect(prisma.depot.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ swapStationId: STATION }) }));

      prisma.depot.update.mockResolvedValue(depotRow() as any);
      await service.update(operacao, DEPOT_ID, { clearSwapStation: true } as any);
      const data = prisma.depot.update.mock.calls.at(-1)![0].data as Record<string, unknown>;
      expect(data.swapStationId).toBeNull();
      expect(data).not.toHaveProperty('clearSwapStation');

      const both = await problemOf(service.update(operacao, DEPOT_ID, { clearSwapStation: true, swapStationId: STATION } as any));
      expect(both.getStatus()).toBe(400);
      prisma.swapStation.findUnique.mockResolvedValue(null);
      expect((await problemOf(service.update(operacao, DEPOT_ID, { swapStationId: STATION } as any))).getStatus()).toBe(400);
    });
  });

  describe('requireActive()', () => {
    it('ativo → devolve o galpão; inativo → 422 depot-inactive; inexistente → 404', async () => {
      const { service, prisma } = setup();
      await expect(service.requireActive(DEPOT_ID)).resolves.toMatchObject({ id: DEPOT_ID });
      prisma.depot.findUnique.mockResolvedValue(depotRow({ active: false }) as any);
      const e = await problemOf(service.requireActive(DEPOT_ID));
      expect(e.getStatus()).toBe(422);
      expect(e.slug).toBe('depot-inactive');
      prisma.depot.findUnique.mockResolvedValue(null);
      expect((await problemOf(service.requireActive(DEPOT_ID))).getStatus()).toBe(404);
    });
  });

  describe('list() e get()', () => {
    it('cliente nunca vê inativos; staff com includeInactive vê todos', async () => {
      const { service, prisma } = setup();
      prisma.depot.findMany.mockResolvedValue([]);
      await service.list(customer, { includeInactive: true });
      expect(prisma.depot.findMany.mock.calls[0][0]!.where).toEqual({ active: true });
      await service.list(operacao, { includeInactive: true });
      expect(prisma.depot.findMany.mock.calls[1][0]!.where).toEqual({});
    });

    it('com lat/lng ordena pelo mais perto e preenche distanceM; conta motos free', async () => {
      const { service, prisma } = setup();
      prisma.depot.findMany.mockResolvedValue([depotRow({ id: 'far', name: 'A', lat: -23.0, lng: -46.0 }), depotRow({ id: 'near', name: 'B' })] as any);
      (prisma.vehicle.groupBy as any).mockResolvedValue([{ depotId: 'near', _count: { _all: 4 } }] as any);
      const { items } = await service.list(customer, { lat: -23.5617, lng: -46.6908 });
      expect(items.map((d) => d.id)).toEqual(['near', 'far']);
      expect(items[0]).toMatchObject({ distanceM: 0, availableVehicleCount: 4 });
      expect(items[1].availableVehicleCount).toBe(0);
      expect((prisma.vehicle.groupBy as any).mock.calls[0][0]).toMatchObject({ where: { status: 'free', depotId: { in: ['far', 'near'] } } });
    });

    it('availableVehicleCount exclui toda moto fixa de assinatura vigente, de qualquer cliente', async () => {
      const { service, prisma } = setup();
      prisma.depot.findMany.mockResolvedValue([depotRow()] as any);
      prisma.subscription.findMany.mockResolvedValue([{ assignedVehicleId: 'fixed-1' }, { assignedVehicleId: 'fixed-2' }] as any);
      await service.list(customer, {});
      const subWhere = prisma.subscription.findMany.mock.calls[0][0]!.where as any;
      expect(subWhere).toMatchObject({ assignedVehicleId: { not: null }, status: { in: ['active', 'paused'] } });
      expect(subWhere.customerId).toBeUndefined();
      expect((prisma.vehicle.groupBy as any).mock.calls[0][0].where).toEqual({ status: 'free', depotId: { in: [DEPOT_ID] }, id: { notIn: ['fixed-1', 'fixed-2'] } });
    });

    it('get: cliente com galpão inativo → 404; staff vê', async () => {
      const { service, prisma } = setup();
      prisma.depot.findUnique.mockResolvedValue(depotRow({ active: false }) as any);
      expect((await problemOf(service.get(DEPOT_ID, customer))).getStatus()).toBe(404);
      await expect(service.get(DEPOT_ID, operacao)).resolves.toMatchObject({ active: false });
    });
  });

  describe('pickups()', () => {
    it('reservas do dia no fuso do galpão (agendadas por pickupAt, agora por createdAt), filtro de status e ordem por horário', async () => {
      const { service, prisma } = setup();
      const res = (id: string, mode: 'now' | 'scheduled', at: string, status = 'active') => ({
        id, customerId: 'c', vehicleId: 'v', status, depositId: null, endedAt: null, depotId: DEPOT_ID, pickupMode: mode,
        pickupAt: mode === 'scheduled' ? new Date(at) : null, createdAt: mode === 'now' ? new Date(at) : new Date('2026-10-20T10:00:00Z'),
        expiresAt: new Date(at), updatedAt: now, customer: { name: 'Bruno Lima' }, vehicle: null, handovers: [],
      });
      prisma.reservation.findMany.mockResolvedValue([res('late', 'scheduled', '2026-10-22T20:00:00Z'), res('early', 'now', '2026-10-22T12:00:00Z', 'converted')] as any);
      const out = await service.pickups(DEPOT_ID, { date: '2026-10-22', status: undefined });
      expect(out.date).toBe('2026-10-22');
      expect(out.items.map((i) => i.id)).toEqual(['early', 'late']);
      expect(out.items[0]).toMatchObject({ customerFirstName: 'Bruno' });
      const where = prisma.reservation.findMany.mock.calls[0][0]!.where;
      const range = { gte: new Date('2026-10-22T03:00:00Z'), lt: new Date('2026-10-23T03:00:00Z') };
      expect(where).toEqual({ depotId: DEPOT_ID, OR: [{ pickupMode: 'scheduled', pickupAt: range }, { pickupMode: 'now', createdAt: range }] });

      await service.pickups(DEPOT_ID, { date: '2026-10-22', status: 'handover' });
      expect(prisma.reservation.findMany.mock.calls[1][0]!.where).toMatchObject({ status: 'handover' });
    });

    it.each(['2026-02-31', '2026-04-31', '2025-02-29', '2026-13-01'])('data impossível %s → 400 validation-error', async (date) => {
      const { service, prisma } = setup();
      const e = await problemOf(service.pickups(DEPOT_ID, { date }));
      expect(e.getStatus()).toBe(400);
      expect(e.slug).toBe('validation-error');
      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    });

    it('29/02 de ano bissexto é aceito', async () => {
      const { service } = setup();
      await expect(service.pickups(DEPOT_ID, { date: '2028-02-29' })).resolves.toMatchObject({ date: '2028-02-29' });
    });

    it('galpão inexistente → 404', async () => {
      const { service, prisma } = setup();
      prisma.depot.findUnique.mockResolvedValue(null);
      expect((await problemOf(service.pickups(DEPOT_ID, { date: '2026-10-22' }))).getStatus()).toBe(404);
    });
  });
});
