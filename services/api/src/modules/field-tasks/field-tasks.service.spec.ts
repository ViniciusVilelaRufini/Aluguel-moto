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

const DEPOT = { id: '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c', lat: -23.5654, lng: -46.6847, active: true };

describe('Recolhimento (collect) devolve a moto ao galpão', () => {
  function collectSetup(vehicleStatus = 'awaiting_pickup') {
    const ctx = setup();
    ctx.prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'collect', status: 'in_progress', vehicleId: VEHICLE_ID, assigneeId: campo.userId, createdAt: new Date(), updatedAt: new Date() } as any);
    ctx.prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: vehicleStatus, code: 'VLT-0001' } as any);
    ctx.prisma.depot.findUnique.mockResolvedValue(DEPOT as any);
    ctx.prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.fieldTask.findMany.mockResolvedValue([]);
    ctx.prisma.staffUser.findMany.mockResolvedValue([]);
    ctx.prisma.battery.findMany.mockResolvedValue([]);
    ctx.prisma.vehicle.findMany.mockResolvedValue([]);
    return ctx;
  }

  it('concluir collect com depotId → moto free, com o depotId e nas coordenadas do galpão', async () => {
    const { service, prisma } = collectSetup();
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
      where: { id: VEHICLE_ID, status: { in: ['awaiting_pickup', 'free', 'maintenance', 'blocked'] } },
      data: { status: 'free', depotId: DEPOT.id, lat: DEPOT.lat, lng: DEPOT.lng },
    });
    expect(prisma.fieldTask.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: TASK_ID }, data: expect.objectContaining({ status: 'done' }) }));
  });

  it('collect com depotId e vehicleStatus maintenance → chega ao galpão em manutenção', async () => {
    const { service, prisma } = collectSetup();
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id, vehicleStatus: 'maintenance' });
    expect((prisma.vehicle.updateMany.mock.calls[0][0] as any).data).toEqual({ status: 'maintenance', depotId: DEPOT.id, lat: DEPOT.lat, lng: DEPOT.lng });
  });

  it('moto offline: guarda o status de retorno (free) e já fica no galpão', async () => {
    const { service, prisma } = collectSetup('offline');
    prisma.vehicle.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id });
    expect(prisma.vehicle.updateMany.mock.calls[1][0]).toEqual({
      where: { id: VEHICLE_ID, status: 'offline' },
      data: { statusBeforeOffline: 'free', depotId: DEPOT.id, lat: DEPOT.lat, lng: DEPOT.lng },
    });
  });

  it('galpão inexistente → 404 e a tarefa não é concluída', async () => {
    const { service, prisma } = collectSetup();
    prisma.depot.findUnique.mockResolvedValue(null);
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 404 });
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
  });

  it('moto alugada/reservada no meio do caminho → 409 e a tarefa não é concluída', async () => {
    const { service, prisma } = collectSetup('rented');
    prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
  });

  it('collect de moto awaiting_pickup sem depotId → 422 (a moto ficaria presa)', async () => {
    const { service, prisma } = collectSetup();
    await expect(service.complete(campo, TASK_ID, {})).rejects.toMatchObject({ status: 422, slug: 'validation-error' });
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
  });

  it('depotId em tarefa que não é collect → 422', async () => {
    const { service, prisma } = collectSetup();
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'reposition', status: 'in_progress', vehicleId: VEHICLE_ID } as any);
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 422 });
  });
});
