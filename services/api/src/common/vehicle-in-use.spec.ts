import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { assertVehicleNotInUse, hasOpenRental } from './vehicle-in-use';

const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';

describe('assertVehicleNotInUse (regra única de moto em uso)', () => {
  const setup = () => {
    const prisma = mockDeep<PrismaClient>();
    prisma.rental.findFirst.mockResolvedValue(null);
    prisma.reservation.findFirst.mockResolvedValue(null);
    return prisma;
  };

  it('sem aluguel aberto nem reserva ativa → passa', async () => {
    const prisma = setup();
    await expect(assertVehicleNotInUse(prisma as any, VEHICLE_ID)).resolves.toBeUndefined();
    expect(prisma.rental.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { vehicleId: VEHICLE_ID, status: { in: ['active', 'paused', 'ending'] } } }));
    expect(prisma.reservation.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { vehicleId: VEHICLE_ID, status: 'active' } }));
  });

  it('aluguel aberto → 409 vehicle-unavailable', async () => {
    const prisma = setup();
    prisma.rental.findFirst.mockResolvedValue({ id: 'r1' } as any);
    await expect(assertVehicleNotInUse(prisma as any, VEHICLE_ID)).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable', detail: 'A moto está em uso por um cliente.' });
  });

  it('reserva ativa → 409 vehicle-unavailable', async () => {
    const prisma = setup();
    prisma.reservation.findFirst.mockResolvedValue({ id: 'res1' } as any);
    await expect(assertVehicleNotInUse(prisma as any, VEHICLE_ID)).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
  });

  it('hasOpenRental reflete o aluguel aberto da moto', async () => {
    const prisma = setup();
    expect(await hasOpenRental(prisma as any, VEHICLE_ID)).toBe(false);
    prisma.rental.findFirst.mockResolvedValue({ id: 'r1' } as any);
    expect(await hasOpenRental(prisma as any, VEHICLE_ID)).toBe(true);
  });
});
