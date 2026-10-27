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
  const store: { row: any } = { row: null };

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
    h.prisma.staffUser.findMany.mockResolvedValue([]);
    h.prisma.customer.findMany.mockResolvedValue([]);
    let lastCreated: any = {};
    store.row = null;
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
    // Banco falso com estado: `updateMany` condicional (where.status.in) + leitura.
    store.row = null;
    h.prisma.vehicleCommand.updateMany.mockImplementation((async (args: any) => {
      const row = store.row ?? lastCreated;
      const allowed: string[] | undefined = args.where.status?.in;
      if (allowed && !allowed.includes(row.status)) return { count: 0 };
      store.row = { ...row, ...args.data };
      return { count: 1 };
    }) as any);
    // `update` incondicional (comportamento antigo) — mantido para evidenciar a regressão.
    h.prisma.vehicleCommand.update.mockImplementation((async (args: any) => (store.row = { ...(store.row ?? lastCreated), ...args.data })) as any);
    const read = (async () => store.row ?? lastCreated) as any;
    h.prisma.vehicleCommand.findUnique.mockImplementation(read);
    h.prisma.vehicleCommand.findUniqueOrThrow.mockImplementation(read);
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
    expect(iot.setSpeedLimit).toHaveBeenCalledWith({ commandId: '44444444-4444-4444-8444-444444444444', thingName: 'moto-0001', authority: 'staff' }, 20);
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

    it('evento terminal (confirmed) antes do retorno do gateway não é sobrescrito por in_progress', async () => {
      iot.lock.mockImplementationOnce((async (req: { commandId: string }) => {
        // iot.command-updated chega enquanto o gateway ainda não retornou
        await service.onIotCommandUpdated({ commandId: req.commandId, status: 'confirmed' } as any);
        return { commandId: req.commandId, status: 'in_progress' as const };
      }) as any);
      const cmd = await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio', actor: operator });
      expect(store.row.status).toBe('confirmed');
      expect(cmd.status).toBe('confirmed');
    });

    it('evento failed antes do retorno pending não volta o comando para pending', async () => {
      iot.lock.mockImplementationOnce((async (req: { commandId: string }) => {
        await service.onIotCommandUpdated({ commandId: req.commandId, status: 'failed', reason: 'timeout' } as any);
        return { commandId: req.commandId, status: 'pending' as const };
      }) as any);
      const cmd = await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio', actor: operator });
      expect(cmd.status).toBe('failed');
    });

    it('atualização atrasada in_progress não rebaixa um comando confirmado', async () => {
      await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio', actor: operator });
      expect(store.row.status).toBe('confirmed');
      await (service as any).applyOutcome(store.row, { status: 'in_progress' });
      expect(store.row.status).toBe('confirmed');
    });

    describe('rastreador relay_only (spec GT06 §3.3)', () => {
      const relayVehicle = { ...vehicle, tracker: { controlMode: 'relay_only' } };
      const system = { system: true as const, name: 'rental-end' };

      it.each([
        ['speed_limit', { speedLimitKmh: 6 }],
        ['horn', {}],
      ])('%s → failed/unsupported_by_tracker sem chamar o gateway', async (type, extra) => {
        h.prisma.vehicle.findUnique.mockResolvedValue(relayVehicle as any);
        const out = await service.dispatch({ vehicleId: VEHICLE_ID, type: type as any, reason: 'Teste relé', actor: operator, ...extra });
        expect(out).toMatchObject({ status: 'failed', statusReason: 'unsupported_by_tracker' });
        expect(iot.setSpeedLimit).not.toHaveBeenCalled();
        expect(iot.horn).not.toHaveBeenCalled();
      });

      it('lock (inclusive o do fim do aluguel) leva controlMode relay_only ao gateway', async () => {
        h.prisma.vehicle.findUnique.mockResolvedValue(relayVehicle as any);
        await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Encerramento do aluguel', actor: system, context: { rentalId: 'r1', purpose: 'rental_end' } });
        expect(iot.lock).toHaveBeenCalledWith(expect.objectContaining({ thingName: 'moto-0001', controlMode: 'relay_only', authority: 'system', lockOrigin: null }));
      });

      it('sem Tracker (ou speed_control) o pedido não leva controlMode (comportamento de sempre)', async () => {
        h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, tracker: { controlMode: 'speed_control' } } as any);
        await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio manual', actor: operator });
        expect(iot.lock.mock.calls[0][0]).not.toHaveProperty('controlMode');
      });

      it('tracker: null → caminho speed_control (sem controlMode; speed_limit chega ao gateway)', async () => {
        h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, tracker: null } as any);
        await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio manual', actor: operator });
        expect(iot.lock.mock.calls[0][0]).not.toHaveProperty('controlMode');
        const out = await service.dispatch({ vehicleId: VEHICLE_ID, type: 'speed_limit', speedLimitKmh: 6, reason: 'Zona', actor: operator });
        expect(iot.setSpeedLimit).toHaveBeenCalledTimes(1);
        expect(iot.setSpeedLimit.mock.calls[0][0]).not.toHaveProperty('controlMode');
        expect(out.status).toBe('confirmed');
      });

      it('gateway lança no lock só relé (Redis fora) → failed/timeout', async () => {
        h.prisma.vehicle.findUnique.mockResolvedValue(relayVehicle as any);
        iot.lock.mockRejectedValueOnce(new Error('redis down'));
        const out = await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio manual', actor: operator });
        expect(out).toMatchObject({ status: 'failed', statusReason: 'timeout' });
      });

      it('a leitura da moto inclui o controlMode do Tracker', async () => {
        await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio manual', actor: operator });
        expect(h.prisma.vehicle.findUnique).toHaveBeenCalledWith(expect.objectContaining({ include: { tracker: { select: { controlMode: true } } } }));
      });
    });

    describe('moto caiu durante a trava (revisão Task 3, N3)', () => {
      const inProgress = async () => {
        iot.lock.mockImplementationOnce((async (req: { commandId: string }) => ({ commandId: req.commandId, status: 'in_progress' as const })) as any);
        await service.dispatch({ vehicleId: VEHICLE_ID, type: 'lock', reason: 'Bloqueio', actor: operator });
        expect(store.row.status).toBe('in_progress');
      };

      it('in_progress → pending/offline pelo iot.command-updated (painel mostra "aguardando conexão")', async () => {
        await inProgress();
        await service.onIotCommandUpdated({ commandId: store.row.id, status: 'pending', reason: 'offline' });
        expect(store.row).toMatchObject({ status: 'pending', statusReason: 'offline' });
      });

      it('in_progress → pending sem o motivo offline continua proibido', async () => {
        await inProgress();
        await service.onIotCommandUpdated({ commandId: store.row.id, status: 'pending' });
        expect(store.row.status).toBe('in_progress');
      });

      it('pending/offline atrasado nunca rebaixa um desfecho terminal', async () => {
        await inProgress();
        await service.onIotCommandUpdated({ commandId: store.row.id, status: 'failed', reason: 'did_not_stop' });
        await service.onIotCommandUpdated({ commandId: store.row.id, status: 'pending', reason: 'offline' });
        expect(store.row).toMatchObject({ status: 'failed', statusReason: 'did_not_stop' });
        await (service as any).applyOutcome(store.row, { status: 'pending', reason: 'offline' });
        expect(store.row.status).toBe('failed');
      });

      it('o retorno inicial pending do gateway não rebaixa um in_progress já gravado (só o evento volta para pending)', async () => {
        await inProgress();
        await (service as any).applyOutcome(store.row, { status: 'pending', reason: 'offline' });
        expect(store.row.status).toBe('in_progress');
      });
    });
  });
});
