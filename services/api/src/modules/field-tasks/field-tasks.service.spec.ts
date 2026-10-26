import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import type { Principal } from '../auth/principal';
import { FieldTasksService } from './field-tasks.service';

const TASK_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const campo: Principal = { pool: 'staff', sub: 'c', email: 'c@volti.com.br', groups: ['campo'], userId: 'bbbbbbbb-0000-4000-8000-000000000002', staffId: 'bbbbbbbb-0000-4000-8000-000000000002' };

const ok = { ok: true };
const baseInspection = { brakes: ok, tires: ok, lights: ok, bell: ok, photoObjectKeys: ['field/x/1.jpg'], recordedAt: new Date().toISOString() };

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'inspection', status: 'in_progress', vehicleId: VEHICLE_ID, assigneeId: campo.userId } as any);
  prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'free', code: 'VLT-0001' } as any);
  prisma.inspection.create.mockImplementation((async (a: any) => ({ id: 'insp-1', createdAt: new Date(), ...a.data })) as any);
  prisma.maintenanceTask.create.mockResolvedValue({ id: 'mt-1' } as any);
  prisma.vehicle.findMany.mockResolvedValue([]);
  prisma.staffUser.findMany.mockResolvedValue([]);
  prisma.battery.findMany.mockResolvedValue([]);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.reservation.findFirst.mockResolvedValue(null);
  const alerts = { create: jest.fn().mockResolvedValue({ id: 'alert-1' }) };
  const audit = { record: jest.fn() };
  const storage = { presignPut: jest.fn(), presignGet: jest.fn(), putObject: jest.fn(), deleteObject: jest.fn() };
  const service = new FieldTasksService(prisma as any, alerts as any, audit as any, storage, loadConfig(), new EventEmitter2());
  return { prisma, alerts, service };
}

describe('Inspeção (limitador como observação, decisão #13)', () => {
  it('configuredMaxKmh 45 com ok: true → 422 speed-limiter-noncompliant e nada é gravado', async () => {
    const { service, prisma } = setup();
    await expect(
      service.submitInspection(campo, TASK_ID, { ...baseInspection, speedLimiter: { ok: true, configuredMaxKmh: 45 } } as any),
    ).rejects.toMatchObject({ status: 422, slug: 'speed-limiter-noncompliant' });
    expect(prisma.inspection.create).not.toHaveBeenCalled();
  });

  it('configuredMaxKmh 45 com ok: false → registra, abre manutenção corretiva + alerta e muda a moto para maintenance', async () => {
    const { service, prisma, alerts } = setup();
    const insp = await service.submitInspection(campo, TASK_ID, { ...baseInspection, speedLimiter: { ok: false, configuredMaxKmh: 45 } } as any);
    expect(insp.passed).toBe(false);
    expect(insp.maintenanceTaskId).toBe('mt-1');
    expect(insp.alertId).toBe('alert-1');
    expect(prisma.maintenanceTask.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kind: 'corrective', vehicleId: VEHICLE_ID }) }));
    expect(alerts.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'speed_limiter_noncompliant', vehicleId: VEHICLE_ID }), expect.anything());
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'maintenance' } }));
  });

  it('configuredMaxKmh 32 com tudo ok → aprovada, sem manutenção', async () => {
    const { service, prisma } = setup();
    const insp = await service.submitInspection(campo, TASK_ID, { ...baseInspection, speedLimiter: { ok: true, configuredMaxKmh: 32 } } as any);
    expect(insp.passed).toBe(true);
    expect(prisma.maintenanceTask.create).not.toHaveBeenCalled();
  });

  it('troca de bateria com números de série iguais → 422 battery-serials-must-differ', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'battery_swap', status: 'in_progress', vehicleId: VEHICLE_ID } as any);
    await expect(
      service.submitBatterySwap(campo, TASK_ID, { removedBatterySerial: 'BAT-1', installedBatterySerial: 'BAT-1', recordedAt: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 422, slug: 'battery-serials-must-differ' });
  });
});

describe('Concluir tarefa com vehicleStatus (item 7 da auditoria)', () => {
  const pickup = { id: TASK_ID, type: 'pickup', status: 'in_progress', priority: 'medium', vehicleId: VEHICLE_ID, assigneeId: campo.userId, createdAt: new Date(), updatedAt: new Date() };

  it('moto offline com aluguel aberto → 409 vehicle-unavailable e a moto não muda', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(pickup as any);
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'offline', statusBeforeOffline: 'rented', online: false } as any);
    prisma.rental.findFirst.mockResolvedValue({ id: 'r1', vehicleId: VEHICLE_ID, status: 'active' } as any);
    await expect(service.complete(campo, TASK_ID, { vehicleStatus: 'free' } as any)).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('moto offline sem aluguel → 409 (só alterna entre livre e manutenção) e a moto não muda', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(pickup as any);
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'offline', online: false } as any);
    prisma.rental.findFirst.mockResolvedValue(null);
    prisma.reservation.findFirst.mockResolvedValue(null);
    await expect(service.complete(campo, TASK_ID, { vehicleStatus: 'free' } as any)).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('moto em manutenção sem aluguel nem reserva → vira livre', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(pickup as any);
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'maintenance', online: true } as any);
    prisma.rental.findFirst.mockResolvedValue(null);
    prisma.reservation.findFirst.mockResolvedValue(null);
    prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    await service.complete(campo, TASK_ID, { vehicleStatus: 'free' } as any);
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: { in: ['free', 'maintenance'] } }, data: { status: 'free' } });
  });
});
