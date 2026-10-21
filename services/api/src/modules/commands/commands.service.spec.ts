import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { createHarness, Harness, staffToken, STAFF_ID } from '../../../test/helpers/http-harness';
import { ProblemException } from '../../common/problem';
import { IOT_GATEWAY, IotGateway } from '../../ports/iot-gateway.port';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';

const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const vehicle = { id: VEHICLE_ID, code: 'VLT-0001', thingName: 'moto-0001', status: 'free' };
const operator: Principal = { pool: 'staff', sub: 's', email: 'op@volti.com.br', groups: ['operacao'], userId: STAFF_ID, staffId: STAFF_ID };

function iotMock(): jest.Mocked<IotGateway> {
  const ok: any = (req: { commandId: string }) => Promise.resolve({ commandId: req.commandId, status: 'confirmed' as const });
  return {
    lock: jest.fn(ok),
    unlock: jest.fn(ok),
    horn: jest.fn(ok),
    setSpeedLimit: jest.fn(ok),
    setStolenMode: jest.fn(ok),
    getLiveState: jest.fn().mockResolvedValue(null),
  };
}

describe('Comandos remotos', () => {
  let h: Harness;
  let iot: jest.Mocked<IotGateway>;
  let audit: { record: jest.Mock };

  beforeAll(async () => {
    iot = iotMock();
    h = await createHarness({
      controllers: [CommandsController],
      providers: [CommandsService, { provide: IOT_GATEWAY, useValue: iot }],
    });
  });
  afterAll(() => h.app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    h.prisma.vehicle.findUnique.mockResolvedValue(vehicle as any);
    let lastCreated: any = {};
    h.prisma.vehicleCommand.create.mockImplementation((async (args: any) => (lastCreated = {
      id: '44444444-4444-4444-8444-444444444444',
      vehicleId: VEHICLE_ID,
      status: 'pending',
      statusReason: null,
      requestedByType: 'staff',
      requestedByName: null,
      confirmedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...args.data,
    })) as any);
    h.prisma.vehicleCommand.update.mockImplementation((async (args: any) => ({
      id: '44444444-4444-4444-8444-444444444444',
      vehicleId: VEHICLE_ID,
      type: 'horn',
      reason: 'x',
      payload: {},
      requestedById: STAFF_ID,
      requestedByType: 'staff',
      requestedByName: null,
      statusReason: null,
      confirmedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...lastCreated,
      ...args.data,
    })) as any);
  });

  const post = async (body: object) =>
    request(h.app.getHttpServer())
      .post(`/vehicles/${VEHICLE_ID}/commands`)
      .set('Authorization', `Bearer ${await staffToken(['operacao'])}`)
      .send(body);

  it('speed_limit com 33 → 400 (validação) e o IotGateway nunca é chamado', async () => {
    const res = await post({ type: 'speed_limit', reason: 'Teste de limite', speedLimitKmh: 33 });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/speed-limit-out-of-range');
    expect(iot.setSpeedLimit).not.toHaveBeenCalled();
    expect(h.prisma.vehicleCommand.create).not.toHaveBeenCalled();
  });

  it('speed_limit negativo → 400 e IoT não chamado', async () => {
    const res = await post({ type: 'speed_limit', reason: 'Teste de limite', speedLimitKmh: -1 });
    expect(res.status).toBe(400);
    expect(iot.setSpeedLimit).not.toHaveBeenCalled();
  });

  it('speed_limit sem speedLimitKmh → 400', async () => {
    const res = await post({ type: 'speed_limit', reason: 'Teste de limite' });
    expect(res.status).toBe(400);
    expect(iot.setSpeedLimit).not.toHaveBeenCalled();
  });

  it('stolen_mode sem `on` → 400', async () => {
    const res = await post({ type: 'stolen_mode', reason: 'Moto furtada' });
    expect(res.status).toBe(400);
    expect(iot.setStolenMode).not.toHaveBeenCalled();
  });

  it('reason vazio → 400', async () => {
    const res = await post({ type: 'lock', reason: '' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: { field: string }) => e.field === 'reason')).toBe(true);
    expect(iot.lock).not.toHaveBeenCalled();
  });

  it('reason ausente → 400', async () => {
    const res = await post({ type: 'lock' });
    expect(res.status).toBe(400);
    expect(iot.lock).not.toHaveBeenCalled();
  });

  it('speed_limit 20 → 202, IoT chamado com 20 e resposta no formato VehicleCommand', async () => {
    const res = await post({ type: 'speed_limit', reason: 'Zona escolar', speedLimitKmh: 20 });
    expect(res.status).toBe(202);
    expect(iot.setSpeedLimit).toHaveBeenCalledWith({ commandId: '44444444-4444-4444-8444-444444444444', thingName: 'moto-0001' }, 20);
    expect(res.body).toMatchObject({ vehicleId: VEHICLE_ID, type: 'speed_limit', status: 'confirmed', speedLimitKmh: 20 });
  });

  describe('CommandsService.dispatch', () => {
    let service: CommandsService;
    beforeEach(() => {
      audit = { record: jest.fn().mockResolvedValue(undefined) };
      service = new CommandsService(h.prisma as any, audit as unknown as AuditService, iot, new EventEmitter2());
    });

    it.each([
      ['lock', {}],
      ['unlock', {}],
      ['horn', {}],
      ['speed_limit', { speedLimitKmh: 6 }],
      ['stolen_mode', { on: true }],
    ])('%s grava AuditLog com quem, motivo e entidade', async (type, extra) => {
      await service.dispatch({ vehicleId: VEHICLE_ID, type: type as any, reason: 'Motivo do operador', actor: operator, ...extra });
      expect(audit.record).toHaveBeenCalledTimes(1);
      const entry = audit.record.mock.calls[0][0];
      expect(entry).toMatchObject({
        actor: operator,
        action: `vehicle.command.${type}`,
        entityType: 'Vehicle',
        entityId: VEHICLE_ID,
        reason: 'Motivo do operador',
      });
      expect(entry.metadata.commandId).toBe('44444444-4444-4444-8444-444444444444');
    });

    it('defesa em profundidade: speed_limit 33 no serviço → 400 sem chamar o IoT nem gravar', async () => {
      await expect(
        service.dispatch({ vehicleId: VEHICLE_ID, type: 'speed_limit', reason: 'Teste', speedLimitKmh: 33, actor: operator }),
      ).rejects.toMatchObject({ slug: 'speed-limit-out-of-range' });
      expect(iot.setSpeedLimit).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('reason vazio no serviço → 400', async () => {
      await expect(service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: '  ', actor: operator })).rejects.toBeInstanceOf(
        ProblemException,
      );
      expect(iot.lock).not.toHaveBeenCalled();
    });

    it('moto offline → comando pending/offline (aplicado ao reconectar)', async () => {
      iot.lock.mockResolvedValueOnce({ commandId: 'x', status: 'pending', reason: 'offline' });
      const cmd = await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio', actor: operator });
      expect(cmd.status).toBe('pending');
      expect(cmd.statusReason).toBe('offline');
    });
  });
});
