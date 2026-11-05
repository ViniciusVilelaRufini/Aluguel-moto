import { Prisma, PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { ProblemException } from '../../common/problem';
import type { Principal } from '../auth/principal';
import { SimCardsService } from './sim-cards.service';

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const admin: Principal = { pool: 'staff', sub: 's', email: 'a@volti.com.br', groups: ['admin'], userId: ADMIN_ID, staffId: ADMIN_ID };
const SIM_ID = '55555555-5555-4555-8555-555555555555';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const TRACKER_ID = '66666666-6666-4666-8666-666666666666';
const OTHER_TRACKER_ID = '77777777-7777-4777-8777-777777777777';
const ICCID = '8955170110123456789';
const MSISDN = '+5511999998888';
const now = new Date('2026-11-05T12:00:00Z');

const simRow = (over: Record<string, unknown> = {}) => ({
  id: SIM_ID,
  iccid: ICCID,
  msisdn: MSISDN,
  carrier: 'Algar',
  apn: 'indica.algar.br',
  status: 'active',
  notes: null,
  trackerId: null,
  createdAt: now,
  updatedAt: now,
  ...over,
});
const withVehicle = (row: object, linked: boolean) => ({ ...row, tracker: linked ? { vehicle: { id: VEHICLE_ID, code: 'VLT-0001' } } : null });

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new SimCardsService(prisma as any, audit as any);
  return { prisma, audit, service };
}

const p2002 = () => new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'x' });
const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ProblemException);
    return (e as ProblemException).getStatus();
  }
  throw new Error('não lançou');
};

describe('Chips (SimCards)', () => {
  describe('create', () => {
    it('com vehicleId vincula ao rastreador da moto e devolve vehicleId/vehicleCode', async () => {
      const { prisma, service } = setup();
      prisma.tracker.findUnique.mockResolvedValue({ id: TRACKER_ID, vehicleId: VEHICLE_ID, simCard: null } as any);
      prisma.simCard.create.mockImplementation((async (a: any) => withVehicle(simRow({ trackerId: a.data.trackerId }), true)) as any);
      const out = await service.create({ iccid: ICCID, carrier: 'Algar', msisdn: MSISDN, vehicleId: VEHICLE_ID }, admin);
      expect(prisma.tracker.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { vehicleId: VEHICLE_ID } }));
      expect(prisma.simCard.create.mock.calls[0][0].data).toMatchObject({ iccid: ICCID, trackerId: TRACKER_ID, status: 'active' });
      expect(out).toMatchObject({ id: SIM_ID, iccid: ICCID, vehicleId: VEHICLE_ID, vehicleCode: 'VLT-0001', createdAt: now.toISOString() });
    });

    it('sem vehicleId cria solto (trackerId null)', async () => {
      const { prisma, service } = setup();
      prisma.simCard.create.mockResolvedValue(withVehicle(simRow(), false) as any);
      const out = await service.create({ iccid: ICCID, carrier: 'Algar' }, admin);
      expect(prisma.simCard.create.mock.calls[0][0].data).toMatchObject({ trackerId: null });
      expect(out).toMatchObject({ vehicleId: null, vehicleCode: null });
    });

    it('ICCID repetido (P2002) -> 409', async () => {
      const { prisma, service } = setup();
      prisma.simCard.create.mockRejectedValue(p2002());
      expect(await status(service.create({ iccid: ICCID, carrier: 'Algar' }, admin))).toBe(409);
    });

    it('moto sem rastreador -> 409; moto inexistente -> 404', async () => {
      const { prisma, service } = setup();
      prisma.tracker.findUnique.mockResolvedValue(null);
      prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID } as any);
      expect(await status(service.create({ iccid: ICCID, carrier: 'Algar', vehicleId: VEHICLE_ID }, admin))).toBe(409);
      prisma.vehicle.findUnique.mockResolvedValue(null);
      expect(await status(service.create({ iccid: ICCID, carrier: 'Algar', vehicleId: VEHICLE_ID }, admin))).toBe(404);
      expect(prisma.simCard.create).not.toHaveBeenCalled();
    });

    it('rastreador que já tem chip -> 409', async () => {
      const { prisma, service } = setup();
      prisma.tracker.findUnique.mockResolvedValue({ id: TRACKER_ID, simCard: { id: 'outro' } } as any);
      expect(await status(service.create({ iccid: ICCID, carrier: 'Algar', vehicleId: VEHICLE_ID }, admin))).toBe(409);
    });

    it('audita sim_card.create sem ICCID/linha no metadata', async () => {
      const { prisma, audit, service } = setup();
      prisma.simCard.create.mockResolvedValue(withVehicle(simRow(), false) as any);
      await service.create({ iccid: ICCID, carrier: 'Algar', msisdn: MSISDN }, admin);
      expect(audit.record).toHaveBeenCalledTimes(1);
      const [entry] = audit.record.mock.calls[0];
      expect(entry).toMatchObject({ actor: admin, action: 'sim_card.create', entityType: 'SimCard', entityId: SIM_ID });
      const meta = JSON.stringify(entry.metadata);
      expect(meta).not.toContain(ICCID);
      expect(meta).not.toContain('99998888');
    });
  });

  describe('update', () => {
    it('vincular a rastreador que já tem outro chip -> 409', async () => {
      const { prisma, service } = setup();
      prisma.simCard.findUnique.mockResolvedValue(simRow() as any);
      prisma.tracker.findUnique.mockResolvedValue({ id: TRACKER_ID, simCard: { id: 'outro-chip' } } as any);
      expect(await status(service.update(SIM_ID, { vehicleId: VEHICLE_ID }, admin))).toBe(409);
      expect(prisma.simCard.update).not.toHaveBeenCalled();
    });

    it('chip já vinculado a outro rastreador, mover para moto nova -> 409', async () => {
      const { prisma, service } = setup();
      prisma.simCard.findUnique.mockResolvedValue(simRow({ trackerId: OTHER_TRACKER_ID }) as any);
      prisma.tracker.findUnique.mockResolvedValue({ id: TRACKER_ID, simCard: null } as any);
      expect(await status(service.update(SIM_ID, { vehicleId: VEHICLE_ID }, admin))).toBe(409);
      expect(prisma.simCard.update).not.toHaveBeenCalled();
    });

    it('vehicleId null desvincula e vincular de novo depois funciona', async () => {
      const { prisma, service } = setup();
      prisma.simCard.findUnique.mockResolvedValueOnce(simRow({ trackerId: TRACKER_ID }) as any);
      prisma.simCard.update.mockResolvedValueOnce(withVehicle(simRow({ trackerId: null }), false) as any);
      const unlinked = await service.update(SIM_ID, { vehicleId: null }, admin);
      expect(prisma.simCard.update.mock.calls[0][0].data).toMatchObject({ trackerId: null });
      expect(unlinked).toMatchObject({ vehicleId: null, vehicleCode: null });

      prisma.simCard.findUnique.mockResolvedValueOnce(simRow({ trackerId: null }) as any);
      prisma.tracker.findUnique.mockResolvedValue({ id: OTHER_TRACKER_ID, simCard: null } as any);
      prisma.simCard.update.mockResolvedValueOnce(withVehicle(simRow({ trackerId: OTHER_TRACKER_ID }), true) as any);
      const relinked = await service.update(SIM_ID, { vehicleId: VEHICLE_ID }, admin);
      expect(prisma.simCard.update.mock.calls[1][0].data).toMatchObject({ trackerId: OTHER_TRACKER_ID });
      expect(relinked).toMatchObject({ vehicleId: VEHICLE_ID, vehicleCode: 'VLT-0001' });
    });

    it('revincular ao mesmo rastreador é permitido (idempotente)', async () => {
      const { prisma, service } = setup();
      prisma.simCard.findUnique.mockResolvedValue(simRow({ trackerId: TRACKER_ID }) as any);
      prisma.tracker.findUnique.mockResolvedValue({ id: TRACKER_ID, simCard: { id: SIM_ID } } as any);
      prisma.simCard.update.mockResolvedValue(withVehicle(simRow({ trackerId: TRACKER_ID }), true) as any);
      await expect(service.update(SIM_ID, { vehicleId: VEHICLE_ID }, admin)).resolves.toMatchObject({ vehicleId: VEHICLE_ID });
    });

    it('chip inexistente -> 404; ICCID repetido (P2002) -> 409', async () => {
      const { prisma, service } = setup();
      prisma.simCard.findUnique.mockResolvedValueOnce(null);
      expect(await status(service.update(SIM_ID, { carrier: 'Vivo' }, admin))).toBe(404);
      prisma.simCard.findUnique.mockResolvedValueOnce(simRow() as any);
      prisma.simCard.update.mockRejectedValueOnce(p2002());
      expect(await status(service.update(SIM_ID, { iccid: '8955170110123456780' }, admin))).toBe(409);
    });

    it('só envia os campos informados (null limpa apn)', async () => {
      const { prisma, service } = setup();
      prisma.simCard.findUnique.mockResolvedValue(simRow() as any);
      prisma.simCard.update.mockResolvedValue(withVehicle(simRow({ apn: null }), false) as any);
      await service.update(SIM_ID, { apn: null }, admin);
      expect(prisma.simCard.update.mock.calls[0][0].data).toEqual({ apn: null });
    });

    it('audita sim_card.update sem ICCID/linha no metadata', async () => {
      const { prisma, audit, service } = setup();
      prisma.simCard.findUnique.mockResolvedValue(simRow() as any);
      prisma.simCard.update.mockResolvedValue(withVehicle(simRow(), false) as any);
      await service.update(SIM_ID, { iccid: '8955170110123456780', msisdn: '+5511911112222' }, admin);
      const [entry] = audit.record.mock.calls[0];
      expect(entry).toMatchObject({ action: 'sim_card.update', entityType: 'SimCard', entityId: SIM_ID });
      const meta = JSON.stringify(entry.metadata);
      expect(meta).not.toContain('8955170110123456780');
      expect(meta).not.toContain('11911112222');
    });
  });

  describe('list', () => {
    it('aplica q (ICCID/linha), status e unlinked', async () => {
      const { prisma, service } = setup();
      prisma.simCard.findMany.mockResolvedValue([withVehicle(simRow(), false)] as any);
      const out = await service.list({ q: '8955', status: 'active', unlinked: true });
      expect(prisma.simCard.findMany.mock.calls[0][0]!.where).toEqual({
        OR: [{ iccid: { contains: '8955' } }, { msisdn: { contains: '8955' } }],
        status: 'active',
        trackerId: null,
      });
      expect(out.items).toHaveLength(1);
    });
  });
});
