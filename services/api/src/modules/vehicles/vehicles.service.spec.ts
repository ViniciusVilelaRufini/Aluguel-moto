import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import type { Principal } from '../auth/principal';
import { toVehicle } from './vehicles.mapper';
import { VehiclesService } from './vehicles.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
const customer: Principal = { pool: 'customer', sub: 'c', email: 'c@example.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID };
const operacao: Principal = { pool: 'staff', sub: 's', email: 's@volti.com.br', groups: ['operacao'], userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', staffId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };

function setup() {
  const prisma = mockDeep<PrismaClient>();
  prisma.$queryRaw.mockResolvedValue([] as any);
  const service = new VehiclesService(prisma as any, { record: jest.fn() } as any, {} as any, new EventEmitter2(), {} as any, { ensure: jest.fn() } as any, {} as any, {} as any);
  return { prisma, service };
}

/** SQL final (com placeholders) da chamada `$queryRaw` tagueada. */
function renderedSql(prisma: ReturnType<typeof setup>['prisma']): string {
  const [strings, ...values] = prisma.$queryRaw.mock.calls[0] as unknown as [TemplateStringsArray, ...unknown[]];
  return Prisma.sql(strings, ...(values as Prisma.Sql[])).sql.replace(/\s+/g, ' ');
}

describe('Retirada em galpão: moto fora da rua', () => {
  it('nearby do cliente só traz moto free sem depotId (exclui galpão e awaiting_pickup)', async () => {
    const { service, prisma } = setup();
    await service.nearby(customer, { lat: -23.56, lng: -46.65 } as any);
    const sql = renderedSql(prisma);
    expect(sql).toContain(`v."status" = 'free'::"VehicleStatus"`);
    expect(sql).toContain(`v."depotId" IS NULL`);
  });

  it('nearby de staff continua vendo todas (galpão e awaiting_pickup incluídos)', async () => {
    const { service, prisma } = setup();
    await service.nearby(operacao, { lat: -23.56, lng: -46.65 } as any);
    const sql = renderedSql(prisma);
    expect(sql).not.toContain('depotId');
    expect(sql).not.toContain(`'free'::"VehicleStatus"`);
  });

  it('rastreador volta online: moto awaiting_pickup continua esperando recolhimento (não vira free)', async () => {
    const { service, prisma } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'offline', online: false, statusBeforeOffline: 'awaiting_pickup', depotId: DEPOT_ID } as any);
    prisma.rental.findFirst.mockResolvedValue(null);
    prisma.reservation.findFirst.mockResolvedValue(null);
    await service.onConnectivity({ vehicleId: VEHICLE_ID, online: true, ts: new Date().toISOString() } as any);
    expect((prisma.vehicle.update.mock.calls[0][0] as any).data.status).toBe('awaiting_pickup');
  });

  it('a moto expõe o depotId (cliente e staff)', () => {
    const row: any = { id: VEHICLE_ID, code: 'VLT-0001', model: 'Volti S1', status: 'free', lat: 0, lng: 0, batteryPct: 90, speedLimitKmh: 32, depotId: DEPOT_ID, odometerKm: 0, usageHours: 0 };
    expect(toVehicle(row, { staff: false }).depotId).toBe(DEPOT_ID);
    expect(toVehicle(row, { staff: true }).depotId).toBe(DEPOT_ID);
    expect(toVehicle({ ...row, depotId: null }, { staff: false })).not.toHaveProperty('depotId');
  });
});
