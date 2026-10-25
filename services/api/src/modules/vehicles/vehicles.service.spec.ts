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

describe('QA-19 (Task 14): bateria informada no cadastro da moto', () => {
  const admin: Principal = { ...operacao, groups: ['admin'] };
  function forCreate() {
    const s = setup();
    (s.prisma.$transaction as any).mockImplementation(async (fn: any) => fn(s.prisma));
    s.prisma.vehicle.findFirst.mockResolvedValue(null);
    s.prisma.vehicle.create.mockResolvedValue({ id: VEHICLE_ID, code: 'VLT-9001', batteryPct: 100 } as any);
    s.prisma.battery.create.mockResolvedValue({ id: 'b1' } as any);
    jest.spyOn(s.service as any, 'enrich').mockResolvedValue([{ id: VEHICLE_ID }]);
    return s;
  }

  it('cria a bateria instalada na moto (in_vehicle, 1 ciclo) e a movimentação de cadastro', async () => {
    const { prisma, service } = forCreate();
    prisma.battery.findUnique.mockResolvedValue(null);
    await service.create(admin, { code: 'VLT-9001', model: 'Volti S1', thingName: 'vlt-9001', batterySerial: ' QA-BAT-9001 ' } as any);
    expect((prisma.vehicle.create.mock.calls[0][0] as any).data.batterySerial).toBe('QA-BAT-9001');
    expect(prisma.battery.create).toHaveBeenCalledWith({ data: { serial: 'QA-BAT-9001', status: 'in_vehicle', vehicleId: VEHICLE_ID, chargePct: 100, cycleCount: 1 } });
    expect(prisma.batteryMovement.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ batteryId: 'b1', fromStatus: null, toStatus: 'in_vehicle', vehicleId: VEHICLE_ID, reason: 'Cadastrada com a moto' })],
    });
  });

  it('série já cadastrada (estoque, van, estação ou outra moto) → 409 sem criar a moto', async () => {
    const { prisma, service } = forCreate();
    prisma.battery.findUnique.mockResolvedValue({ id: 'b0' } as any);
    await expect(service.create(admin, { code: 'VLT-9001', model: 'Volti S1', thingName: 'vlt-9001', batterySerial: 'QA-BAT-9001' } as any)).rejects.toMatchObject({ status: 409 });
    expect(prisma.vehicle.create).not.toHaveBeenCalled();
  });

  it('sem série: nenhuma bateria criada', async () => {
    const { prisma, service } = forCreate();
    await service.create(admin, { code: 'VLT-9001', model: 'Volti S1', thingName: 'vlt-9001' } as any);
    expect(prisma.battery.create).not.toHaveBeenCalled();
  });
});

describe('Cadastro no painel (2026-10-25): galpão no cadastro, bateria livre e transferência de galpão', () => {
  const admin: Principal = { ...operacao, groups: ['admin'] };
  const DEPOT2 = '7c1e9b2d-3f4a-4b8e-9c55-6f4a5b1d2e3c';
  const depot = { id: DEPOT_ID, lat: -23.5, lng: -46.6, active: true };
  const base = { code: 'VLT-0061', model: 'Volti S1', thingName: 'moto-0061' };

  function withTx() {
    const s = setup();
    (s.prisma.$transaction as any).mockImplementation(async (fn: any) => fn(s.prisma));
    s.prisma.vehicle.findFirst.mockResolvedValue(null);
    s.prisma.vehicle.create.mockImplementation((async (a: any) => ({ id: VEHICLE_ID, batteryPct: 100, ...a.data })) as any);
    jest.spyOn(s.service as any, 'enrich').mockImplementation(async (rows: any) => rows);
    const emitted: Array<[string, unknown]> = [];
    jest.spyOn((s.service as any).events, 'emit').mockImplementation(((ev: string, p: unknown) => emitted.push([ev, p])) as any);
    return { ...s, emitted };
  }

  it('com galpão ativo: nasce free com depotId e a posição do galpão, QR padrão e aviso de status', async () => {
    const { prisma, service, emitted } = withTx();
    prisma.depot.findUnique.mockResolvedValue(depot as any);
    await service.create(admin, { ...base, depotId: DEPOT_ID } as any);
    const data = (prisma.vehicle.create.mock.calls[0][0] as any).data;
    expect(data).toMatchObject({ status: 'free', depotId: DEPOT_ID, lat: -23.5, lng: -46.6, qrCode: 'volti://v/VLT-0061' });
    expect(emitted).toContainEqual(['vehicle.status-changed', expect.objectContaining({ vehicleId: VEHICLE_ID, status: 'free' })]);
    expect((service as any).audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'vehicle.create', metadata: { code: 'VLT-0061', depotId: DEPOT_ID } }), prisma);
  });

  it('sem galpão: continua nascendo em manutenção, sem depotId', async () => {
    const { prisma, service } = withTx();
    await service.create(admin, base as any);
    const data = (prisma.vehicle.create.mock.calls[0][0] as any).data;
    expect(data.status).toBe('maintenance');
    expect(data).not.toHaveProperty('depotId');
    expect(prisma.depot.findUnique).not.toHaveBeenCalled();
  });

  it('galpão inexistente → 404; inativo → 422 depot-inactive; a moto não é criada', async () => {
    const { prisma, service } = withTx();
    prisma.depot.findUnique.mockResolvedValueOnce(null);
    await expect(service.create(admin, { ...base, depotId: DEPOT_ID } as any)).rejects.toMatchObject({ status: 404 });
    prisma.depot.findUnique.mockResolvedValueOnce({ ...depot, active: false } as any);
    await expect(service.create(admin, { ...base, depotId: DEPOT_ID } as any)).rejects.toMatchObject({ status: 422, slug: 'depot-inactive' });
    expect(prisma.vehicle.create).not.toHaveBeenCalled();
  });

  it('bateria charged livre no galpão: instalada na moto (+1 ciclo), movimentação e aviso de estoque do galpão', async () => {
    const { prisma, service, emitted } = withTx();
    prisma.depot.findUnique.mockResolvedValue(depot as any);
    prisma.battery.findUnique.mockResolvedValue({ id: 'b9', serial: 'BT-9', status: 'charged', vehicleId: null, depotId: DEPOT2, stationId: null, chargePct: 97 } as any);
    prisma.battery.updateMany.mockResolvedValue({ count: 1 });
    await service.create(admin, { ...base, depotId: DEPOT_ID, batterySerial: 'BT-9' } as any);
    expect((prisma.vehicle.create.mock.calls[0][0] as any).data.batteryPct).toBe(97);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({
      where: { id: 'b9', status: 'charged', vehicleId: null },
      data: expect.objectContaining({ status: 'in_vehicle', vehicleId: VEHICLE_ID, depotId: null, cycleCount: { increment: 1 } }),
    });
    expect(prisma.battery.create).not.toHaveBeenCalled();
    expect(prisma.batteryMovement.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ batteryId: 'b9', fromStatus: 'charged', toStatus: 'in_vehicle', depotId: DEPOT2, vehicleId: VEHICLE_ID })],
    });
    expect(emitted).toContainEqual(['battery.charged-stock-decreased', { depotIds: [DEPOT2] }]);
  });

  it('bateria em outra situação (carregando, numa moto) → 409 sem criar a moto', async () => {
    const { prisma, service } = withTx();
    prisma.battery.findUnique.mockResolvedValue({ id: 'b9', status: 'charging', vehicleId: null } as any);
    await expect(service.create(admin, { ...base, batterySerial: 'BT-9' } as any)).rejects.toMatchObject({ status: 409 });
    prisma.battery.findUnique.mockResolvedValue({ id: 'b9', status: 'charged', vehicleId: 'outra' } as any);
    await expect(service.create(admin, { ...base, batterySerial: 'BT-9' } as any)).rejects.toMatchObject({ status: 409 });
    expect(prisma.vehicle.create).not.toHaveBeenCalled();
  });

  describe('transferDepot', () => {
    function forTransfer(vehicle: Record<string, unknown>) {
      const s = withTx();
      s.prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, status: 'free', depotId: DEPOT_ID, ...vehicle } as any);
      s.prisma.depot.findUnique.mockResolvedValue({ id: DEPOT2, lat: -22.9, lng: -43.2, active: true } as any);
      s.prisma.rental.findFirst.mockResolvedValue(null);
      s.prisma.reservation.findFirst.mockResolvedValue(null);
      s.prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
      s.prisma.vehicle.findUniqueOrThrow.mockResolvedValue({ id: VEHICLE_ID, depotId: DEPOT2 } as any);
      return s;
    }
    const dto = { depotId: DEPOT2, reason: 'Rebalanceamento da frota' };

    it('moto livre: muda galpão e posição (condicionado ao estado lido) e grava AuditLog com motivo e origem/destino', async () => {
      const { prisma, service } = forTransfer({});
      await service.transferDepot(admin, VEHICLE_ID, dto);
      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'free', depotId: DEPOT_ID }, data: { depotId: DEPOT2, lat: -22.9, lng: -43.2 } });
      expect((service as any).audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'vehicle.transfer_depot', reason: dto.reason, metadata: { fromDepotId: DEPOT_ID, toDepotId: DEPOT2, status: 'free' } }),
        prisma,
      );
    });

    it('moto em manutenção e sem galpão também pode ser transferida', async () => {
      const { prisma, service } = forTransfer({ status: 'maintenance', depotId: null });
      await service.transferDepot(admin, VEHICLE_ID, dto);
      expect((prisma.vehicle.updateMany.mock.calls[0][0] as any).where).toEqual({ id: VEHICLE_ID, status: 'maintenance', depotId: null });
    });

    it.each(['rented', 'reserved', 'paused', 'offline', 'awaiting_pickup', 'blocked'])('moto %s → 409 vehicle-unavailable', async (status) => {
      const { prisma, service } = forTransfer({ status });
      await expect(service.transferDepot(admin, VEHICLE_ID, dto)).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });

    it('com aluguel aberto ou reserva ativa/em entrega → 409', async () => {
      const a = forTransfer({});
      a.prisma.rental.findFirst.mockResolvedValue({ id: 'r1' } as any);
      await expect(a.service.transferDepot(admin, VEHICLE_ID, dto)).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
      const b = forTransfer({});
      b.prisma.reservation.findFirst.mockResolvedValue({ id: 'res1' } as any);
      await expect(b.service.transferDepot(admin, VEHICLE_ID, dto)).rejects.toMatchObject({ status: 409 });
      expect((b.prisma.reservation.findFirst.mock.calls[0][0] as any).where.status).toEqual({ in: ['active', 'handover'] });
    });

    it('mesmo galpão → 409; galpão inativo → 422; inexistente → 404; moto inexistente → 404', async () => {
      const same = forTransfer({ depotId: DEPOT2 });
      await expect(same.service.transferDepot(admin, VEHICLE_ID, dto)).rejects.toMatchObject({ status: 409 });
      const inactive = forTransfer({});
      inactive.prisma.depot.findUnique.mockResolvedValue({ id: DEPOT2, lat: 0, lng: 0, active: false } as any);
      await expect(inactive.service.transferDepot(admin, VEHICLE_ID, dto)).rejects.toMatchObject({ status: 422, slug: 'depot-inactive' });
      const missing = forTransfer({});
      missing.prisma.depot.findUnique.mockResolvedValue(null);
      await expect(missing.service.transferDepot(admin, VEHICLE_ID, dto)).rejects.toMatchObject({ status: 404 });
      const noVehicle = forTransfer({});
      noVehicle.prisma.vehicle.findUnique.mockResolvedValue(null);
      await expect(noVehicle.service.transferDepot(admin, VEHICLE_ID, dto)).rejects.toMatchObject({ status: 404 });
    });

    it('estado mudou entre a leitura e a gravação → 409', async () => {
      const { prisma, service } = forTransfer({});
      prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.transferDepot(admin, VEHICLE_ID, dto)).rejects.toMatchObject({ status: 409 });
    });
  });

  it('lista: filtros por galpão e modelo e busca também pelo QR', async () => {
    const s = setup();
    (s.service as any).redis = { hgetall: jest.fn().mockResolvedValue({}) };
    s.prisma.vehicle.findMany.mockResolvedValue([]);
    s.prisma.rental.findMany.mockResolvedValue([]);
    jest.spyOn(s.service as any, 'enrich').mockResolvedValue([]);
    await s.service.list({ depotId: DEPOT_ID, vehicleModelId: 'm1', q: 'volti://v/VLT-00' } as any);
    const where = (s.prisma.vehicle.findMany.mock.calls[0][0] as any).where;
    expect(where).toMatchObject({ depotId: DEPOT_ID, vehicleModelId: 'm1' });
    expect(where.OR).toContainEqual({ qrCode: { contains: 'volti://v/VLT-00', mode: 'insensitive' } });
  });
});
