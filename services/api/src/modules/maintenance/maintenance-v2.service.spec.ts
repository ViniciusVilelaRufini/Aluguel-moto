import { Prisma } from '@prisma/client';
import { ProblemException } from '../../common/problem';
import { loadV2Config } from '../../config/v2-config';
import { generateSlots } from './maintenance-slots';
import { isSerializationFailure, MaintenanceV2Service } from './maintenance-v2.service';

/** Fix round 1 (M3): agendamento do cliente refaz conflito de serialização e checa pedido aberto dentro da transação. */
describe('MaintenanceV2Service.createRequest', () => {
  const p2034 = () => new Prisma.PrismaClientKnownRequestError('serialization', { code: 'P2034', clientVersion: 'x' });
  const user: any = { pool: 'customer', customerId: 'c1', userId: 'c1', groups: [] };

  function setup(tx: any) {
    const prisma: any = {
      subscription: { findFirst: jest.fn(async () => ({ id: 's1', assignedVehicleId: 'v1' })) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));
    const svc = new MaintenanceV2Service(prisma, { record: jest.fn() } as any, loadV2Config());
    const slot = generateSlots(new Date(), 7)[0].startsAt.toISOString();
    return { svc, prisma, slot };
  }
  const okTx = () => ({
    maintenanceTask: {
      findFirst: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      create: jest.fn(async ({ data }: any) => ({ id: 'm1', status: 'scheduled', createdAt: new Date(), title: data.title, ...data, vehicle: { code: 'VLT-0001' } })),
    },
    auditLog: { create: jest.fn() },
  });

  it('detecta conflito de serialização', () => {
    expect(isSerializationFailure(p2034())).toBe(true);
    expect(isSerializationFailure(new Error('could not serialize access'))).toBe(true);
    expect(isSerializationFailure(new Error('outro'))).toBe(false);
  });

  it('refaz depois de P2034 e agenda', async () => {
    const tx = okTx();
    const { svc, prisma, slot } = setup(tx);
    prisma.$transaction.mockRejectedValueOnce(p2034()).mockRejectedValueOnce(p2034());
    const out = await svc.createRequest(user, { slotStartsAt: slot, description: 'Freio' });
    expect(out).toMatchObject({ id: 'm1', vehicleId: 'v1', status: 'scheduled' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('três conflitos seguidos → 409 maintenance-slot-unavailable', async () => {
    const { svc, prisma, slot } = setup(okTx());
    prisma.$transaction.mockRejectedValue(p2034());
    await expect(svc.createRequest(user, { slotStartsAt: slot, description: 'Freio' })).rejects.toMatchObject({ status: 409, slug: 'maintenance-slot-unavailable' });
  });

  it('pedido aberto é checado dentro da transação → 409 conflict', async () => {
    const tx = okTx();
    tx.maintenanceTask.findFirst.mockResolvedValue({ id: 'm0' } as any);
    const { svc, slot } = setup(tx);
    const err = await svc.createRequest(user, { slotStartsAt: slot, description: 'Freio' }).catch((e) => e);
    expect(err).toBeInstanceOf(ProblemException);
    expect((err as ProblemException).slug).toBe('conflict');
    expect(tx.maintenanceTask.create).not.toHaveBeenCalled();
  });
});
