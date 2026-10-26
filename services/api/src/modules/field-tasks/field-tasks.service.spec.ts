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
  const events = new EventEmitter2();
  const commands = { isLockedByStaff: jest.fn().mockResolvedValue(false) };
  const service = new FieldTasksService(prisma as any, alerts as any, audit as any, storage, loadConfig(), events, commands as any);
  return { prisma, alerts, commands, service, events };
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

describe('Troca de bateria na tarefa: movimentações (2026-10-24) e custódia (2026-10-26)', () => {
  const BAT_OLD = { id: 'b-old', serial: 'BAT-OLD', status: 'in_vehicle', vehicleId: VEHICLE_ID, depotId: null, stationId: null, holderId: null, chargePct: 12, cycleCount: 40 };
  const BAT_NEW = { id: 'b-new', serial: 'BAT-NEW', status: 'in_van', vehicleId: null, depotId: null, stationId: null, holderId: campo.userId, chargePct: 88, cycleCount: 7 };
  const swap = { removedBatterySerial: 'BAT-OLD', installedBatterySerial: 'BAT-NEW', recordedAt: new Date().toISOString() };

  function swapSetup(newOverrides: Record<string, unknown> | null = {}, onVehicle: any[] = [BAT_OLD]) {
    const ctx = setup();
    ctx.prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'battery_swap', status: 'in_progress', vehicleId: VEHICLE_ID, assigneeId: campo.userId } as any);
    ctx.prisma.vehicle.findUnique.mockResolvedValue({ batteryPct: 12, batterySerial: 'BAT-OLD' } as any);
    ctx.prisma.battery.findUnique.mockImplementation((async (a: any) =>
      a.where.serial === 'BAT-OLD' ? BAT_OLD : a.where.serial === 'BAT-NEW' ? (newOverrides ? { ...BAT_NEW, ...newOverrides } : null) : null) as any);
    ctx.prisma.battery.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.battery.create.mockImplementation((async (a: any) => ({ id: `b-created-${a.data.serial}`, cycleCount: 0, ...a.data })) as any);
    ctx.prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.battery.findMany.mockResolvedValue(onVehicle as any);
    ctx.prisma.batterySwap.findFirst.mockResolvedValue(null);
    ctx.prisma.batterySwap.create.mockImplementation((async (a: any) => ({ id: 'swap-1', createdAt: new Date(), ...a.data })) as any);
    return ctx;
  }

  function expectNothingWritten(prisma: ReturnType<typeof setup>['prisma']) {
    expect(prisma.battery.upsert).not.toHaveBeenCalled();
    expect(prisma.battery.updateMany).not.toHaveBeenCalled();
    expect(prisma.battery.create).not.toHaveBeenCalled();
    expect(prisma.batterySwap.create).not.toHaveBeenCalled();
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  }

  it('retirada → van e instalada (da van do operador) → moto gravam movimentações do operador', async () => {
    const { service, prisma } = swapSetup();
    const out = await service.submitBatterySwap(campo, TASK_ID, swap);
    const data = prisma.batteryMovement.createMany.mock.calls.flatMap((c: any) => c[0].data);
    expect(data).toEqual([
      expect.objectContaining({ batteryId: 'b-old', fromStatus: 'in_vehicle', toStatus: 'in_van', vehicleId: VEHICLE_ID, actorId: campo.userId }),
      expect.objectContaining({ batteryId: 'b-new', fromStatus: 'in_van', toStatus: 'in_vehicle', vehicleId: VEHICLE_ID }),
    ]);
    // Guarda de corrida: a instalada só sai da van se ainda estiver na van deste operador; a retirada pelo status lido.
    expect(prisma.battery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'b-new', status: 'in_van', holderId: campo.userId } }));
    expect(prisma.battery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'b-old', status: 'in_vehicle', vehicleId: VEHICLE_ID } }));
    expect(prisma.battery.upsert).not.toHaveBeenCalled();
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, batterySerial: 'BAT-OLD' }, data: { batterySerial: 'BAT-NEW', batteryPct: 88 } });
    expect(out).toMatchObject({ removedBatteryCycleCount: 40, installedBatteryCycleCount: 8 });
  });

  it('outra bateria registrada na moto (série divergente) vai para `charging` com movimentação', async () => {
    const stray = { ...BAT_OLD, id: 'b-stray', serial: 'BAT-STRAY' };
    const { service, prisma } = swapSetup({}, [BAT_OLD, stray]);
    await service.submitBatterySwap(campo, TASK_ID, swap);
    const data = prisma.batteryMovement.createMany.mock.calls.flatMap((c: any) => c[0].data);
    expect(data).toEqual(expect.arrayContaining([expect.objectContaining({ batteryId: 'b-stray', fromStatus: 'in_vehicle', toStatus: 'charging', vehicleId: VEHICLE_ID })]));
    expect(prisma.battery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ['b-stray'] } }), data: { vehicleId: null, status: 'charging' } }));
  });

  it.each(['defective', 'retired'])('retirada registrada como `%s` (série errada ou registro inconsistente) → 409, nada gravado', async (status) => {
    const { service, prisma } = swapSetup();
    prisma.battery.findUnique.mockImplementation((async (a: any) => (a.where.serial === 'BAT-OLD' ? { ...BAT_OLD, status } : a.where.serial === 'BAT-NEW' ? BAT_NEW : null)) as any);
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409 });
    expectNothingWritten(prisma);
  });

  it.each(['defective', 'retired'])('instalar bateria `%s` → 409 (fora de uso), nada gravado', async (status) => {
    const { service, prisma } = swapSetup({ status, holderId: null });
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409 });
    expectNothingWritten(prisma);
  });

  it.each([
    ['na van de outro operador', { status: 'in_van', holderId: OTHER_ID }],
    ['numa estação', { status: 'in_station', holderId: null, stationId: 'st-1' }],
    ['carregando no galpão', { status: 'charging', holderId: null, depotId: 'd-1' }],
    ['carregada no galpão', { status: 'charged', holderId: null, depotId: 'd-1' }],
  ])('instalada %s → 409 battery-not-in-van, nada gravado', async (_label, over) => {
    const { service, prisma } = swapSetup(over);
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409, slug: 'battery-not-in-van' });
    expectNothingWritten(prisma);
  });

  it('instalada que consta em outra moto → 409 battery-serial-mismatch (a moto B não fica órfã)', async () => {
    const { service, prisma } = swapSetup({ status: 'in_vehicle', holderId: null, vehicleId: '44444444-4444-4444-8444-444444444444' });
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409, slug: 'battery-serial-mismatch' });
    expectNothingWritten(prisma);
  });

  it('a instalada saiu da van durante a operação (corrida) → 409 battery-not-in-van', async () => {
    const { service, prisma } = swapSetup();
    prisma.battery.updateMany.mockImplementation((async (a: any) => ({ count: a.where.id === 'b-new' ? 0 : 1 })) as any);
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409, slug: 'battery-not-in-van' });
    expect(prisma.batterySwap.create).not.toHaveBeenCalled();
  });

  it('série retirada diferente da bateria da moto (Vehicle.batterySerial) → 409 battery-serial-mismatch, nada gravado', async () => {
    const { service, prisma } = swapSetup();
    await expect(service.submitBatterySwap(campo, TASK_ID, { ...swap, removedBatterySerial: 'BAT-OUTRA' })).rejects.toMatchObject({ status: 409, slug: 'battery-serial-mismatch' });
    expectNothingWritten(prisma);
  });

  it('moto sem batterySerial: a retirada precisa ser a linha `in_vehicle` dela → 409 se diferente', async () => {
    const { service, prisma } = swapSetup();
    prisma.vehicle.findUnique.mockResolvedValue({ batteryPct: 12, batterySerial: null } as any);
    await expect(service.submitBatterySwap(campo, TASK_ID, { ...swap, removedBatterySerial: 'BAT-OUTRA' })).rejects.toMatchObject({ status: 409, slug: 'battery-serial-mismatch' });
    expectNothingWritten(prisma);
  });

  it('retirada que consta instalada em outra moto → 409 battery-serial-mismatch', async () => {
    const { service, prisma } = swapSetup({}, []);
    prisma.vehicle.findUnique.mockResolvedValue({ batteryPct: 12, batterySerial: null } as any);
    prisma.battery.findUnique.mockImplementation((async (a: any) =>
      a.where.serial === 'BAT-OLD' ? { ...BAT_OLD, vehicleId: '44444444-4444-4444-8444-444444444444' } : a.where.serial === 'BAT-NEW' ? BAT_NEW : null) as any);
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409, slug: 'battery-serial-mismatch' });
    expectNothingWritten(prisma);
  });

  it('installedBatteryPct não sobrescreve a carga gravada da bateria existente', async () => {
    const { service, prisma } = swapSetup();
    await service.submitBatterySwap(campo, TASK_ID, { ...swap, installedBatteryPct: 5 });
    const newUpdate = prisma.battery.updateMany.mock.calls.find((c: any) => c[0].where.id === 'b-new')![0] as any;
    expect(newUpdate.data.chargePct).toBeUndefined();
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { batterySerial: 'BAT-NEW', batteryPct: 88 } }));
  });

  it('bateria nova (sem cadastro) entra na moto com installedBatteryPct, como antes', async () => {
    const { service, prisma } = swapSetup(null);
    await service.submitBatterySwap(campo, TASK_ID, { ...swap, installedBatteryPct: 77 });
    expect(prisma.battery.create).toHaveBeenCalledWith({ data: expect.objectContaining({ serial: 'BAT-NEW', status: 'in_vehicle', vehicleId: VEHICLE_ID, chargePct: 77, cycleCount: 1 }) });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { batterySerial: 'BAT-NEW', batteryPct: 77 } }));
  });

  it('a moto trocou de bateria durante a operação (corrida) → 409 battery-serial-mismatch', async () => {
    const { service, prisma } = swapSetup();
    prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409, slug: 'battery-serial-mismatch' });
  });

  it('tarefa que não é de troca de bateria → 409 task-type-mismatch, nada gravado', async () => {
    const { service, prisma } = swapSetup();
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'inspection', status: 'in_progress', vehicleId: VEHICLE_ID, assigneeId: campo.userId } as any);
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409, slug: 'task-type-mismatch' });
    expectNothingWritten(prisma);
  });

  it('segunda troca na mesma tarefa → 409 battery-swap-already-recorded, nada gravado', async () => {
    const { service, prisma } = swapSetup();
    prisma.batterySwap.findFirst.mockResolvedValue({ id: 'swap-anterior' } as any);
    await expect(service.submitBatterySwap(campo, TASK_ID, swap)).rejects.toMatchObject({ status: 409, slug: 'battery-swap-already-recorded' });
    expectNothingWritten(prisma);
  });

  it('reenvio com a mesma Idempotency-Key devolve a troca registrada (não vira battery-swap-already-recorded)', async () => {
    const { service, prisma } = swapSetup();
    prisma.batterySwap.findUnique.mockResolvedValue({ id: 'swap-1', fieldTaskId: TASK_ID, vehicleId: VEHICLE_ID, operatorId: campo.userId, ...swap, recordedAt: new Date(), createdAt: new Date() } as any);
    prisma.batterySwap.findFirst.mockResolvedValue({ id: 'swap-1' } as any);
    await expect(service.submitBatterySwap(campo, TASK_ID, swap, 'idem-1')).resolves.toMatchObject({ id: 'swap-1' });
    expectNothingWritten(prisma);
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

  it('auditoria (galpão): collect chegando como free com trava da equipe/sistema → 409 e a moto não muda; em manutenção passa', async () => {
    const { service, prisma, commands } = collectSetup();
    commands.isLockedByStaff.mockResolvedValue(true);
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(prisma.fieldTask.update).not.toHaveBeenCalled();
    await service.complete(campo, TASK_ID, { depotId: DEPOT.id, vehicleStatus: 'maintenance' });
    expect((prisma.vehicle.updateMany.mock.calls[0][0] as any).data).toMatchObject({ status: 'maintenance', depotId: DEPOT.id });
  });

  it('auditoria (galpão): collect chegando como free com aluguel aberto → 409 (moto em uso, consultado no banco)', async () => {
    const { service, prisma } = collectSetup('offline', 'awaiting_pickup');
    prisma.rental.findFirst.mockResolvedValue({ id: 'r-aberto' } as any);
    await expect(service.complete(campo, TASK_ID, { depotId: DEPOT.id })).rejects.toMatchObject({ status: 409 });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
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
    prisma.fieldTask.findUnique.mockResolvedValue({ id: TASK_ID, type: 'reposition', status: 'in_progress', vehicleId: VEHICLE_ID, assigneeId: campo.userId } as any);
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
