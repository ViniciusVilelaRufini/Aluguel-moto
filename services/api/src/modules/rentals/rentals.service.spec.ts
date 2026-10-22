import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { RentalsService } from './rentals.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const RENTAL_ID = '88888888-8888-4888-8888-888888888888';
const OLD_ID = '33333333-3333-4333-8333-333333333333';
const NEW_ID = '44444444-4444-4444-8444-444444444444';
const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
const user = { pool: 'customer', sub: 's', email: 'e@example.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID } as any;
const here = { lat: -23.5614, lng: -46.6559 };

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const commands = { dispatch: jest.fn().mockResolvedValue({ id: 'c', status: 'confirmed' }) };
  const iot = { getLiveState: jest.fn().mockResolvedValue(null) };
  const svc = new RentalsService(prisma as any, commands as any, {} as any, { emit: jest.fn() } as any, {} as any, iot as any, {} as any);
  prisma.rental.findUnique.mockResolvedValue({ id: RENTAL_ID, customerId: CUSTOMER_ID, status: 'active', vehicleId: OLD_ID, vehicle: { id: OLD_ID, thingName: 't', ...here } } as any);
  return { prisma, commands, svc };
}

describe('RentalsService.swap — moto do galpão (Task 6)', () => {
  it.each([
    ['com depotId (no galpão)', { status: 'free', depotId: DEPOT_ID }],
    ['awaiting_pickup (esperando recolhimento)', { status: 'awaiting_pickup', depotId: null }],
  ])('moto alvo %s → 409 vehicle-unavailable, sem trocar nem destravar', async (_n, over) => {
    const { prisma, commands, svc } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ id: NEW_ID, speedLimitKmh: 20, ...here, ...over } as any);
    await expect(svc.swap(user, RENTAL_ID, { newVehicleId: NEW_ID, reason: 'Pneu furado' } as any)).rejects.toMatchObject({ slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('a reivindicação da moto alvo exige depotId nulo (corrida com a volta ao galpão)', async () => {
    const { prisma, svc } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ id: NEW_ID, status: 'free', depotId: null, speedLimitKmh: 20, ...here } as any);
    prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.swap(user, RENTAL_ID, { newVehicleId: NEW_ID, reason: 'Pneu furado' } as any)).rejects.toMatchObject({ slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: NEW_ID, status: 'free', depotId: null }, data: { status: 'rented' } });
  });
});
