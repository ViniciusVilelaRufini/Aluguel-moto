import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import type { Principal } from '../auth/principal';
import { FieldTasksService } from './field-tasks.service';
import { EV } from '../../common/events';

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
  const events = new EventEmitter2();
  const service = new FieldTasksService(prisma as any, alerts as any, audit as any, storage, loadConfig(), events);
  return { prisma, alerts, service, events };
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

describe('Troca de bateria na tarefa: movimentações (2026-10-24)', () => {
  const BAT_OLD = { id: 'b-old', serial: 'BAT-OLD', status: 'in_vehicle', vehicleId: VEHICLE_ID, depotId: null, stationId: null, holderId: null, chargePct: 12, cycleCount: 40 };
  const BAT_NEW = { id: 'b-new', serial: 'BAT-NEW', status: 'charged', vehicleId: null, depotId: 'd0000000-0000-4000-8000-0000000000d1', stationId: null, holderId: null, chargePct: 100, cycleCount: 7 };
  const swap = { removedBatterySerial: 'BAT-OLD', installedBatterySerial: 'BAT-NEW', recordedAt: new Date().toISOString() };

  function swapSetup(newStatus = 'charged', stray: any[] = []) {
    const ctx = setup();
    ctx.prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'battery_swap', status: 'in_progress', vehicleId: VEHICLE_ID } as any);
    ctx.prisma.vehicle.findUnique.mockResolvedValue({ batteryPct: 12 } as any);
    ctx.prisma.battery.findUnique.mockImplementation((async (a: any) => (a.where.serial === 'BAT-OLD' ? BAT_OLD : a.where.serial === 'BAT-NEW' ? { ...BAT_NEW, status: newStatus } : null)) as any);
    ctx.prisma.battery.upsert.mockImplementation((async (a: any) => ({ ...(a.where.serial === 'BAT-OLD' ? BAT_OLD : BAT_NEW), ...a.update })) as any);
    ctx.prisma.battery.findMany.mockResolvedValue(stray as any);
    ctx.prisma.batterySwap.create.mockImplementation((async (a: any) => ({ id: 'swap-1', createdAt: new Date(), ...a.data })) as any);
    return ctx;
  }

  it('retirada → van e instalada → moto gravam movimentações do operador; saída de `charged` avisa o estoque do galpão', async () => {
    const { service, prisma, events } = swapSetup();
    const seen: any[] = [];
    events.on(EV.BATTERY_CHARGED_STOCK_DECREASED, (e) => seen.push(e));
    await service.submitBatterySwap(campo, TASK_ID, swap);
    const data = prisma.batteryMovement.createMany.mock.calls.flatMap((c: any) => c[0].data);
    expect(data).toEqual([
      expect.objectContaining({ batteryId: 'b-old', fromStatus: 'in_vehicle', toStatus: 'in_van', vehicleId: VEHICLE_ID, actorId: campo.userId }),
      expect.objectContaining({ batteryId: 'b-new', fromStatus: 'charged', toStatus: 'in_vehicle', vehicleId: VEHICLE_ID, depotId: BAT_NEW.depotId }),
    ]);
    expect(prisma.battery.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { serial: 'BAT-NEW' }, update: expect.objectContaining({ depotId: null }) }));
    expect(seen).toEqual([{ depotIds: [BAT_NEW.depotId] }]);
  });

  it('outra bateria registrada na moto (série divergente) vai para `charging` com movimentação', async () => {
    const stray = { ...BAT_OLD, id: 'b-stray', serial: 'BAT-STRAY' };
    const { service, prisma } = swapSetup('in_van', [stray]);
    await service.submitBatterySwap(campo, TASK_ID, swap);
    const data = prisma.batteryMovement.createMany.mock.calls.flatMap((c: any) => c[0].data);
    expect(data).toEqual(expect.arrayContaining([expect.objectContaining({ batteryId: 'b-stray', fromStatus: 'in_vehicle', toStatus: 'charging', vehicleId: VEHICLE_ID })]));
    expect(prisma.battery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ['b-stray'] } }), data: { vehicleId: null, status: 'charging' } }));
  });

  it.each(['defective', 'retired'])('retirada registrada como `%s` (série errada ou registro inconsistente) → 409, nada gravado', async (status) => {
    const { service, prisma } = swapSetup('in_van');
    prisma.battery.findUnique.mockImplementation((async (a: any) => (a.where.serial === 'BAT-OLD' ? { ...BAT_OLD, status } : a.where.serial === 'BAT-NEW' ? { ...BAT_NEW, status: 'in_van' } : null)) as any);
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409 });
    expect(prisma.battery.upsert).not.toHaveBeenCalled();
    expect(prisma.batterySwap.create).not.toHaveBeenCalled();
  });

  it.each(['defective', 'retired'])('instalar bateria `%s` → 409 (fora de uso), nada gravado', async (status) => {
    const { service, prisma } = swapSetup(status);
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409 });
    expect(prisma.batterySwap.create).not.toHaveBeenCalled();
  });
});

const DEPOT = { id: '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c', lat: -23.5654, lng: -46.6847, active: true };

describe('Recolhimento (collect) devolve a moto ao galpão', () => {
  function collectSetup(vehicleStatus = 'awaiting_pickup', statusBeforeOffline: string | null = null) {
    const ctx = setup();
    ctx.prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'collect', status: 'in_progress', vehicleId: VEHICLE_ID, assigneeId: campo.userId, createdAt: new Date(), updatedAt: new Date() } as any);
    ctx.prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: vehicleStatus, statusBeforeOffline, code: 'VLT-0001' } as any);
    ctx.prisma.depot.findUnique.mockResolvedValue(DEPOT as any);
    ctx.prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.fieldTask.findMany.mockResolvedValue([]);
    ctx.prisma.staffUser.findMany.mockResolvedValue([]);
    ctx.prisma.battery.findMany.mockResolvedValue([]);
    ctx.prisma.vehicle.findMany.mockResolvedValue([]);
    const emitted: string[] = [];
    ctx.events.on(EV.VEHICLE_STATUS_CHANGED, (e: { status: string }) => emitted.push(e.status));
    return { ...ctx, emitted };
  }

  it('concluir collect com depotId → moto free, com o depotId e nas coordenadas do galpão', async () => {
    const { service, prisma } = collectSetup();
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
      where: { id: VEHICLE_ID, status: 'awaiting_pickup' },
      data: { status: 'free', depotId: DEPOT.id, lat: DEPOT.lat, lng: DEPOT.lng },
    });
    expect(prisma.fieldTask.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: TASK_ID }, data: expect.objectContaining({ status: 'done' }) }));
  });

  it('collect com depotId e vehicleStatus maintenance → chega ao galpão em manutenção', async () => {
    const { service, prisma } = collectSetup();
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id, vehicleStatus: 'maintenance' });
    expect((prisma.vehicle.updateMany.mock.calls[0][0] as any).data).toEqual({ status: 'maintenance', depotId: DEPOT.id, lat: DEPOT.lat, lng: DEPOT.lng });
  });

  it('moto offline: guarda o status de retorno (free), já fica no galpão e o evento não mente (fix 4: nada emitido)', async () => {
    const { service, prisma, emitted } = collectSetup('offline', 'awaiting_pickup');
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.vehicle.updateMany.mock.calls[0][0]).toEqual({
      where: { id: VEHICLE_ID, status: 'offline', statusBeforeOffline: 'awaiting_pickup' },
      data: { statusBeforeOffline: 'free', depotId: DEPOT.id, lat: DEPOT.lat, lng: DEPOT.lng },
    });
    expect(emitted).toEqual([]);
  });

  it('moto online: o evento leva o status em que a moto chegou', async () => {
    const { service, emitted } = collectSetup();
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id });
    expect(emitted).toEqual(['free']);
  });

  it('fix 2: moto bloqueada continua bloqueada no galpão (recolher não desbloqueia)', async () => {
    const { service, prisma } = collectSetup('blocked');
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id });
    expect(prisma.vehicle.updateMany.mock.calls[0][0]).toEqual({
      where: { id: VEHICLE_ID, status: 'blocked' },
      data: { status: 'blocked', depotId: DEPOT.id, lat: DEPOT.lat, lng: DEPOT.lng },
    });
  });

  it('fix 2: moto bloqueada com vehicleStatus explícito muda para ele', async () => {
    const { service, prisma } = collectSetup('blocked');
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id, vehicleStatus: 'maintenance' });
    expect((prisma.vehicle.updateMany.mock.calls[0][0] as any).data.status).toBe('maintenance');
  });

  it('fix 2: moto offline que estava bloqueada volta bloqueada', async () => {
    const { service, prisma } = collectSetup('offline', 'blocked');
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id });
    expect((prisma.vehicle.updateMany.mock.calls[0][0] as any).data.statusBeforeOffline).toBe('blocked');
  });

  it('moto offline durante um aluguel → 409', async () => {
    const { service, prisma } = collectSetup('offline', 'rented');
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
  });

  it('fix 3: galpão inativo → 422 depot-inactive e a tarefa não é concluída', async () => {
    const { service, prisma } = collectSetup();
    prisma.depot.findUnique.mockResolvedValue({ ...DEPOT, active: false } as any);
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 422, slug: 'depot-inactive' });
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
  });

  it('a moto mudou entre a leitura e a gravação → 409', async () => {
    const { service, prisma } = collectSetup();
    prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 409 });
  });

  it('galpão inexistente → 404 e a tarefa não é concluída', async () => {
    const { service, prisma } = collectSetup();
    prisma.depot.findUnique.mockResolvedValue(null);
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 404 });
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
  });

  it('moto alugada/reservada no meio do caminho → 409 e a tarefa não é concluída', async () => {
    const { service, prisma } = collectSetup('rented');
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
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

describe('Recolhimento: cancelamento e criação manual (fix 5)', () => {
  const admin: Principal = { pool: 'staff', sub: 'a', email: 'a@volti.com.br', groups: ['admin'], userId: 'cccccccc-0000-4000-8000-000000000003', staffId: 'cccccccc-0000-4000-8000-000000000003' };
  function cancelSetup(vehicle: { status: string; statusBeforeOffline?: string | null }) {
    const ctx = setup();
    ctx.prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'collect', status: 'assigned', vehicleId: VEHICLE_ID, createdAt: new Date(), updatedAt: new Date() } as any);
    ctx.prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, statusBeforeOffline: null, ...vehicle } as any);
    ctx.prisma.fieldTask.count.mockResolvedValue(0);
    ctx.prisma.fieldTask.findMany.mockResolvedValue([]);
    ctx.prisma.vehicle.findMany.mockResolvedValue([]);
    ctx.prisma.staffUser.findMany.mockResolvedValue([]);
    ctx.prisma.battery.findMany.mockResolvedValue([]);
    return ctx;
  }

  it('cancelar collect com a moto awaiting_pickup → 409 com mensagem clara', async () => {
    const { service, prisma } = cancelSetup({ status: 'awaiting_pickup' });
    await expect(service.update(TASK_ID, { status: 'canceled' })).rejects.toMatchObject({ status: 409, detail: 'Moto aguardando recolhimento; conclua a tarefa.' });
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
  });

  it('cancelar collect com a moto offline que estava awaiting_pickup → 409', async () => {
    const { service } = cancelSetup({ status: 'offline', statusBeforeOffline: 'awaiting_pickup' });
    await expect(service.update(TASK_ID, { status: 'canceled' })).rejects.toMatchObject({ status: 409 });
  });

  it('cancelar collect de moto awaiting_pickup é permitido se houver outra collect aberta para ela', async () => {
    const { service, prisma } = cancelSetup({ status: 'awaiting_pickup' });
    prisma.fieldTask.count.mockResolvedValue(1);
    await service.update(TASK_ID, { status: 'canceled' });
    expect((prisma.fieldTask.count.mock.calls[0][0] as any).where).toEqual({ vehicleId: VEHICLE_ID, type: 'collect', status: { notIn: ['done', 'canceled'] }, id: { not: TASK_ID } });
    expect(prisma.fieldTask.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'canceled' }) }));
  });

  it('cancelar collect de moto que já está free é permitido', async () => {
    const { service, prisma } = cancelSetup({ status: 'free' });
    await service.update(TASK_ID, { status: 'canceled' });
    expect(prisma.fieldTask.update).toHaveBeenCalled();
  });

  it('collect criada pelo painel usa o mesmo lock por moto e não duplica uma collect aberta', async () => {
    const { service, prisma } = cancelSetup({ status: 'awaiting_pickup' });
    prisma.fieldTask.findFirst.mockResolvedValue({ id: 'aberta' } as any);
    await expect(service.create(admin, { type: 'collect', vehicleId: VEHICLE_ID, priority: 'high' })).rejects.toMatchObject({ status: 409 });
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.fieldTask.create).not.toHaveBeenCalled();

    prisma.fieldTask.findFirst.mockResolvedValue(null);
    prisma.fieldTask.create.mockResolvedValue({ id: TASK_ID } as any);
    await service.create(admin, { type: 'collect', vehicleId: VEHICLE_ID, priority: 'high' });
    expect(prisma.fieldTask.create).toHaveBeenCalledTimes(1);
  });

  it('tarefas de outro tipo não pegam o lock', async () => {
    const { service, prisma } = cancelSetup({ status: 'free' });
    prisma.fieldTask.create.mockResolvedValue({ id: TASK_ID } as any);
    await service.create(admin, { type: 'reposition', vehicleId: VEHICLE_ID, priority: 'low' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
