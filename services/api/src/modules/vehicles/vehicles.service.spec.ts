import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import type { Principal } from '../auth/principal';
import { VehiclesService } from './vehicles.service';

const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_VEHICLE_ID = '44444444-4444-4444-8444-444444444444';
const TASK_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const campo: Principal = { pool: 'staff', sub: 'c', email: 'c@volti.com.br', groups: ['campo'], userId: 'bbbbbbbb-0000-4000-8000-000000000002', staffId: 'bbbbbbbb-0000-4000-8000-000000000002' };
const operacao: Principal = { pool: 'staff', sub: 'o', email: 'o@volti.com.br', groups: ['operacao'], userId: 'bbbbbbbb-0000-4000-8000-000000000003', staffId: 'bbbbbbbb-0000-4000-8000-000000000003' };

function setup() {
  const prisma = mockDeep<PrismaClient>();
  prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'free', online: true } as any);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.reservation.findFirst.mockResolvedValue(null);
  prisma.fieldTask.findUnique.mockResolvedValue(null);
  const commands = { dispatch: jest.fn().mockResolvedValue({ id: 'cmd-1', type: 'unlock', status: 'pending' }), isLockedByStaff: jest.fn().mockResolvedValue(false) };
  const service = new VehiclesService(prisma as any, { record: jest.fn() } as any, commands as any, new EventEmitter2(), {} as any, {} as any, {} as any, {} as any);
  return { prisma, commands, service };
}

describe('Mudar status (revisão final item 6)', () => {
  it('manutenção → livre com trava da equipe/sistema → 409 vehicle-unavailable, nada muda', async () => {
    const { service, prisma, commands } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'maintenance', thingName: 'moto-0001', stolenMode: false, online: true } as any);
    commands.isLockedByStaff.mockResolvedValue(true);
    await expect(service.setStatus(operacao, VEHICLE_ID, { status: 'free', reason: 'conserto feito' } as any)).rejects.toMatchObject({
      status: 409,
      slug: 'vehicle-unavailable',
      detail: 'A moto está bloqueada pela equipe; libere-a antes de devolver à frota.',
    });
    expect(commands.isLockedByStaff).toHaveBeenCalledWith(expect.objectContaining({ id: VEHICLE_ID, thingName: 'moto-0001' }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
  });

  it('livre → manutenção com trava da equipe → permitido (não consulta a trava)', async () => {
    const { service, prisma, commands } = setup();
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
    prisma.vehicle.update.mockResolvedValue({ id: VEHICLE_ID, status: 'maintenance' } as any);
    jest.spyOn(service as any, 'enrich').mockResolvedValue([{ id: VEHICLE_ID }]);
    commands.isLockedByStaff.mockResolvedValue(true);
    await service.setStatus(operacao, VEHICLE_ID, { status: 'maintenance', reason: 'revisão' } as any);
    expect(prisma.vehicle.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'maintenance' } }));
  });
});

describe('Destravar em modo serviço (item 5 da auditoria)', () => {
  it('moto offline com aluguel pausado aberto → 409 vehicle-unavailable, sem comando', async () => {
    const { service, prisma, commands } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'offline', statusBeforeOffline: 'paused', online: false } as any);
    prisma.rental.findFirst.mockResolvedValue({ id: 'r1', vehicleId: VEHICLE_ID, status: 'paused' } as any);
    await expect(service.serviceUnlock(campo, VEHICLE_ID, 'teste servico')).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('moto offline com reserva ativa → 409 vehicle-unavailable, sem comando', async () => {
    const { service, prisma, commands } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'offline', statusBeforeOffline: 'reserved', online: false } as any);
    prisma.reservation.findFirst.mockResolvedValue({ id: 'res1', vehicleId: VEHICLE_ID, status: 'active' } as any);
    await expect(service.serviceUnlock(campo, VEHICLE_ID, 'teste servico')).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('tarefa de outra moto → 409, sem comando', async () => {
    const { service, prisma, commands } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, vehicleId: OTHER_VEHICLE_ID, assigneeId: campo.userId } as any);
    await expect(service.serviceUnlock(campo, VEHICLE_ID, 'teste servico', TASK_ID)).rejects.toMatchObject({ status: 409 });
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('campo com tarefa atribuída a outro operador → 403, sem comando', async () => {
    const { service, prisma, commands } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, vehicleId: VEHICLE_ID, assigneeId: operacao.userId } as any);
    await expect(service.serviceUnlock(campo, VEHICLE_ID, 'teste servico', TASK_ID)).rejects.toMatchObject({ status: 403 });
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('campo com tarefa sem responsável → 403, sem comando', async () => {
    const { service, prisma, commands } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, vehicleId: VEHICLE_ID, assigneeId: null } as any);
    await expect(service.serviceUnlock(campo, VEHICLE_ID, 'teste servico', TASK_ID)).rejects.toMatchObject({ status: 403 });
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('operacao com tarefa de outro responsável → destrava', async () => {
    const { service, prisma, commands } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, vehicleId: VEHICLE_ID, assigneeId: campo.userId } as any);
    await service.serviceUnlock(operacao, VEHICLE_ID, 'teste servico', TASK_ID);
    expect(commands.dispatch).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: VEHICLE_ID, type: 'unlock' }));
  });

  it('campo com a própria tarefa da moto livre → destrava', async () => {
    const { service, prisma, commands } = setup();
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, vehicleId: VEHICLE_ID, assigneeId: campo.userId } as any);
    await service.serviceUnlock(campo, VEHICLE_ID, 'teste servico', TASK_ID);
    expect(commands.dispatch).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: VEHICLE_ID, type: 'unlock', context: { fieldTaskId: TASK_ID, purpose: 'service_unlock' } }));
  });
});
