import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import type { Principal } from '../auth/principal';
import { FieldTasksService } from './field-tasks.service';

const TASK_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const campo: Principal = { pool: 'staff', sub: 'c', email: 'c@volti.com.br', groups: ['campo'], userId: 'bbbbbbbb-0000-4000-8000-000000000002', staffId: 'bbbbbbbb-0000-4000-8000-000000000002' };

const OTHER_ID = 'bbbbbbbb-0000-4000-8000-000000000009';
const operacao: Principal = { pool: 'staff', sub: 'o', email: 'o@volti.com.br', groups: ['operacao'], userId: 'bbbbbbbb-0000-4000-8000-000000000003', staffId: 'bbbbbbbb-0000-4000-8000-000000000003' };

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
  const commands = { isLockedByStaff: jest.fn().mockResolvedValue(false) };
  const service = new FieldTasksService(prisma as any, alerts as any, audit as any, storage, loadConfig(), new EventEmitter2(), commands as any);
  return { prisma, alerts, commands, service };
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
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'battery_swap', status: 'in_progress', vehicleId: VEHICLE_ID, assigneeId: campo.userId } as any);
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

  it('revisão final item 10: moto em manutenção com aluguel aberto → 409 vehicle-unavailable e nenhum updateMany', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(pickup as any);
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'maintenance', online: true } as any);
    prisma.rental.findFirst.mockResolvedValue({ id: 'r1', vehicleId: VEHICLE_ID, status: 'active' } as any);
    await expect(service.complete(campo, TASK_ID, { vehicleStatus: 'free' } as any)).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
  });

  it('revisão final item 10: moto livre com reserva ativa → 409 vehicle-unavailable e nenhum updateMany', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(pickup as any);
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'free', online: true } as any);
    prisma.reservation.findFirst.mockResolvedValue({ id: 'res1', vehicleId: VEHICLE_ID, status: 'active' } as any);
    await expect(service.complete(campo, TASK_ID, { vehicleStatus: 'maintenance' } as any)).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('revisão final item 6: moto em manutenção com trava da equipe/sistema → 409 ao devolver como livre, nada muda', async () => {
    const { service, prisma, commands } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(pickup as any);
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'maintenance', thingName: 'moto-0001', stolenMode: false, online: true } as any);
    commands.isLockedByStaff.mockResolvedValue(true);
    await expect(service.complete(campo, TASK_ID, { vehicleStatus: 'free' } as any)).rejects.toMatchObject({
      status: 409,
      slug: 'vehicle-unavailable',
      detail: 'A moto está bloqueada pela equipe; libere-a antes de devolver à frota.',
    });
    expect(commands.isLockedByStaff).toHaveBeenCalledWith(expect.objectContaining({ id: VEHICLE_ID, thingName: 'moto-0001' }));
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
  });

  it('revisão final item 6: trava da equipe não impede mandar para manutenção', async () => {
    const { service, prisma, commands } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(pickup as any);
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'free', thingName: 'moto-0001', stolenMode: false, online: true } as any);
    prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    commands.isLockedByStaff.mockResolvedValue(true);
    await service.complete(campo, TASK_ID, { vehicleStatus: 'maintenance' } as any);
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'maintenance' } }));
  });
});

describe('Responsável da tarefa (item 13 da auditoria: só-campo age só nas próprias)', () => {
  const others = { id: TASK_ID, type: 'pickup', status: 'in_progress', priority: 'medium', vehicleId: VEHICLE_ID, assigneeId: OTHER_ID, createdAt: new Date(), updatedAt: new Date() };

  it('campo concluindo tarefa de outro operador → 403 e nada muda', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(others as any);
    await expect(service.complete(campo, TASK_ID, { vehicleStatus: 'free' } as any)).rejects.toMatchObject({ status: 403 });
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('campo registrando inspeção na tarefa de outro operador → 403 e nada é gravado', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ ...others, type: 'inspection' } as any);
    await expect(service.submitInspection(campo, TASK_ID, { ...baseInspection, speedLimiter: { ok: false, configuredMaxKmh: 45 } } as any)).rejects.toMatchObject({ status: 403 });
    expect(prisma.inspection.create).not.toHaveBeenCalled();
    expect(prisma.maintenanceTask.create).not.toHaveBeenCalled();
  });

  it('campo registrando troca de bateria na tarefa de outro operador → 403 e o inventário não muda', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ ...others, type: 'battery_swap' } as any);
    await expect(
      service.submitBatterySwap(campo, TASK_ID, { removedBatterySerial: 'BAT-1', installedBatterySerial: 'BAT-2', recordedAt: new Date().toISOString() }),
    ).rejects.toMatchObject({ status: 403 });
    expect(prisma.battery.upsert).not.toHaveBeenCalled();
  });

  it('campo vendo o detalhe da tarefa de outro operador → 403', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(others as any);
    await expect(service.get(campo, TASK_ID)).rejects.toMatchObject({ status: 403 });
  });

  it('campo vê o detalhe de tarefa aberta sem responsável (pode assumir com start)', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ ...others, status: 'open', assigneeId: null } as any);
    await expect(service.get(campo, TASK_ID)).resolves.toMatchObject({ id: TASK_ID });
  });

  it('campo concluindo tarefa sem responsável → 403', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ ...others, assigneeId: null } as any);
    await expect(service.complete(campo, TASK_ID, {} as any)).rejects.toMatchObject({ status: 403 });
  });

  it('operacao conclui e vê tarefa de outro operador', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue(others as any);
    await expect(service.get(operacao, TASK_ID)).resolves.toMatchObject({ id: TASK_ID });
    await expect(service.complete(operacao, TASK_ID, {} as any)).resolves.toMatchObject({ id: TASK_ID });
  });

  it('lista de campo ignora assigneeId de outro operador e filtra pelo próprio', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findMany.mockResolvedValue([]);
    await service.list(campo, { assigneeId: OTHER_ID } as any);
    expect(prisma.fieldTask.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assigneeId: campo.userId }) }));
  });

  it('lista de operacao respeita o assigneeId pedido', async () => {
    const { service, prisma } = setup();
    prisma.fieldTask.findMany.mockResolvedValue([]);
    await service.list(operacao, { assigneeId: OTHER_ID } as any);
    expect(prisma.fieldTask.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assigneeId: OTHER_ID }) }));
  });
});
