import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import type { Principal } from '../auth/principal';
import { VehiclesService } from './vehicles.service';

const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const operacao: Principal = { pool: 'staff', sub: 'o', email: 'o@volti.com.br', groups: ['operacao'], userId: 'bbbbbbbb-0000-4000-8000-000000000003', staffId: 'bbbbbbbb-0000-4000-8000-000000000003' };

function setup(redisState: { keys?: string[]; index?: Record<string, Record<string, string>> } = {}) {
  const prisma = mockDeep<PrismaClient>();
  prisma.vehicle.findUnique.mockImplementation((async (a: any) =>
    a.where.id ? { id: VEHICLE_ID, status: 'maintenance', thingName: 'moto-0001', online: true } : null) as any);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.reservation.findFirst.mockResolvedValue(null);
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
  prisma.vehicle.findUniqueOrThrow.mockResolvedValue({ id: VEHICLE_ID, status: 'free' } as any);
  prisma.vehicle.update.mockResolvedValue({ id: VEHICLE_ID } as any);
  const redis = {
    exists: jest.fn(async (k: string) => (redisState.keys ?? []).includes(k)),
    hgetall: jest.fn(async (k: string) => redisState.index?.[k] ?? {}),
  };
  const commands = { isLockedByStaff: jest.fn().mockResolvedValue(false) };
  const usage = { reset: jest.fn() };
  const service = new VehiclesService(prisma as any, { record: jest.fn() } as any, commands as any, new EventEmitter2(), redis as any, {} as any, usage as any, {} as any);
  jest.spyOn(service as any, 'enrich').mockResolvedValue([{ id: VEHICLE_ID }]);
  return { prisma, service, redis };
}

describe('Auditoria run-4: setStatus condicionado ao status lido', () => {
  it('grava com updateMany condicionado ao status lido', async () => {
    const { service, prisma } = setup();
    await service.setStatus(operacao, VEHICLE_ID, { status: 'free', reason: 'ok' } as any);
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'maintenance' }, data: { status: 'free' } });
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
  });

  it('status mudou entre a leitura e a escrita (count 0) → 409 vehicle-unavailable', async () => {
    const { service, prisma } = setup();
    prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.setStatus(operacao, VEHICLE_ID, { status: 'free', reason: 'ok' } as any)).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
  });
});
