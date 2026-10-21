import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Prisma, type VehicleCommand } from '@prisma/client';
import { MAX_SPEED_KMH, type CommandType } from '../../common/enums';
import { CommandChangedEvent, EV, IotCommandUpdatedEvent } from '../../common/events';
import { PageQuery, pageArgs, toPage } from '../../common/pagination';
import { badRequest, notFound, ProblemException } from '../../common/problem';
import { CommandOutcome, InvalidSpeedLimitError, IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService, type AuditActor } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { CommandPayload, toVehicleCommand } from './commands.mapper';

/** Status de origem aceitos para cada destino (ordem: pending < in_progress < confirmed|failed). */
const PREDECESSORS: Record<CommandOutcome['status'], VehicleCommand['status'][]> = {
  pending: ['pending'],
  in_progress: ['pending', 'in_progress'],
  confirmed: ['pending', 'in_progress', 'failed'],
  failed: ['pending', 'in_progress'],
};

export interface DispatchInput {
  vehicleId: string;
  type: CommandType;
  reason: string;
  speedLimitKmh?: number;
  on?: boolean;
  actor: AuditActor;
  /** Contexto interno (aluguel, tarefa de campo…), gravado em `VehicleCommand.payload`. */
  context?: Pick<CommandPayload, 'rentalId' | 'fieldTaskId' | 'purpose'>;
  /** Ação de auditoria (padrão `vehicle.command.<type>`). */
  auditAction?: string;
}

/**
 * Comandos remotos: valida (limite 0..32 sem truncar), cria o `VehicleCommand`, grava o AuditLog (quem, quando, motivo)
 * e delega ao `IotGateway`. Atualizações posteriores chegam por `iot.command-updated`.
 */
@Injectable()
export class CommandsService {
  private readonly logger = new Logger('CommandsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IOT_GATEWAY) private readonly iot: IotGateway,
    private readonly events: EventEmitter2,
  ) {}

  private validate(input: DispatchInput): void {
    if (!input.reason || input.reason.trim().length < 3) {
      throw badRequest('Informe o motivo do comando (mínimo 3 caracteres).', [{ field: 'reason', message: 'obrigatório' }]);
    }
    if (input.type === 'speed_limit') {
      const v = input.speedLimitKmh;
      if (v === undefined || v === null || !Number.isInteger(v)) {
        throw badRequest('speed_limit exige speedLimitKmh (0 a 32).', [{ field: 'speedLimitKmh', message: 'obrigatório para speed_limit' }]);
      }
      if (v < 0 || v > MAX_SPEED_KMH) {
        throw new ProblemException(400, 'speed-limit-out-of-range', 'Velocidade máxima absoluta: 32 km/h.', [
          { field: 'speedLimitKmh', message: 'deve estar entre 0 e 32' },
        ]);
      }
    }
    if (input.type === 'stolen_mode' && typeof input.on !== 'boolean') {
      throw badRequest('stolen_mode exige o campo on.', [{ field: 'on', message: 'obrigatório para stolen_mode' }]);
    }
  }

  async dispatch(input: DispatchInput) {
    this.validate(input);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw notFound('Moto não encontrada.');

    const payload: CommandPayload = { ...(input.context ?? {}) };
    if (input.type === 'speed_limit') payload.speedLimitKmh = input.speedLimitKmh;
    if (input.type === 'stolen_mode') payload.on = input.on;

    const isSystem = 'system' in input.actor;
    const principal = input.actor as Principal;
    const command = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vehicleCommand.create({
        data: {
          vehicleId: vehicle.id,
          type: input.type,
          status: 'pending',
          reason: input.reason.trim(),
          requestedById: isSystem ? null : principal.userId,
          requestedByType: isSystem ? 'system' : principal.pool === 'staff' ? 'staff' : 'customer',
          payload: payload as Prisma.InputJsonValue,
        },
      });
      await this.audit.record(
        {
          actor: input.actor,
          action: input.auditAction ?? `vehicle.command.${input.type}`,
          entityType: 'Vehicle',
          entityId: vehicle.id,
          reason: input.reason.trim(),
          metadata: { commandId: created.id, type: input.type, ...payload },
        },
        tx as any,
      );
      return created;
    });

    const outcome = await this.callGateway(command.id, vehicle.thingName, input);
    const updated = await this.applyOutcome(command, outcome);
    if (updated.status === 'confirmed') await this.reflectOnVehicle(vehicle.id, input);
    return toVehicleCommand(updated);
  }

  private async callGateway(commandId: string, thingName: string, input: DispatchInput): Promise<CommandOutcome> {
    const req = { commandId, thingName };
    try {
      switch (input.type) {
        case 'lock':
          return await this.iot.lock(req);
        case 'unlock':
          return await this.iot.unlock(req);
        case 'horn':
          return await this.iot.horn(req);
        case 'speed_limit':
          return await this.iot.setSpeedLimit(req, input.speedLimitKmh!);
        case 'stolen_mode':
          return await this.iot.setStolenMode(req, input.on!);
      }
    } catch (err) {
      if (err instanceof InvalidSpeedLimitError) return { commandId, status: 'failed', reason: 'invalid_limit' };
      this.logger.error({ msg: 'iot_gateway_error', commandId, error: (err as Error).message });
      return { commandId, status: 'failed', reason: 'timeout' };
    }
  }

  /**
   * Grava a transição sem nunca andar para trás: pending < in_progress < confirmed|failed (terminal é final;
   * só `failed` → `confirmed` tardio é aceito). O `updateMany` condicional evita que o status inicial devolvido pelo
   * gateway sobrescreva um `iot.command-updated` terminal que chegou antes da gravação. Se não avançou, devolve o estado atual.
   */
  private async applyOutcome(command: VehicleCommand, outcome: { status: CommandOutcome['status']; reason?: CommandOutcome['reason'] }) {
    const moved = await this.prisma.vehicleCommand.updateMany({
      where: { id: command.id, status: { in: PREDECESSORS[outcome.status] } },
      data: {
        status: outcome.status,
        statusReason: outcome.reason ?? null,
        confirmedAt: outcome.status === 'confirmed' ? new Date() : null,
      },
    });
    const updated = await this.prisma.vehicleCommand.findUniqueOrThrow({ where: { id: command.id } });
    if (moved.count === 0) return updated;
    const ev: CommandChangedEvent = {
      commandId: updated.id,
      vehicleId: updated.vehicleId,
      type: updated.type,
      status: updated.status,
      reason: updated.statusReason ?? undefined,
      payload: (updated.payload ?? {}) as Record<string, unknown>,
    };
    this.events.emit(EV.COMMAND_CHANGED, ev);
    return updated;
  }

  /** Reflete o efeito confirmado no cadastro da moto (a telemetria da Task 4 também atualiza). */
  private async reflectOnVehicle(vehicleId: string, input: Pick<DispatchInput, 'type' | 'speedLimitKmh' | 'on'>): Promise<void> {
    const data: Prisma.VehicleUpdateInput = {};
    if (input.type === 'lock') data.locked = true;
    if (input.type === 'unlock') data.locked = false;
    if (input.type === 'speed_limit') data.speedLimitKmh = input.speedLimitKmh;
    if (input.type === 'stolen_mode') data.stolenMode = input.on;
    if (!Object.keys(data).length) return;
    try {
      await this.prisma.vehicle.update({ where: { id: vehicleId }, data });
    } catch (err) {
      this.logger.warn({ msg: 'vehicle_reflect_failed', vehicleId, error: (err as Error).message });
    }
  }

  /** Consumidor de `iot.command-updated` (Task 4): grava a transição e repassa ao realtime. */
  @OnEvent(EV.IOT_COMMAND_UPDATED, { async: true, promisify: true })
  async onIotCommandUpdated(ev: IotCommandUpdatedEvent): Promise<void> {
    const command = await this.prisma.vehicleCommand.findUnique({ where: { id: ev.commandId } });
    if (!command) return;
    if (command.status === 'confirmed' || (command.status === 'failed' && ev.status !== 'confirmed')) return;
    await this.applyOutcome(command, ev);
    if (ev.status === 'confirmed') {
      const p = (command.payload ?? {}) as CommandPayload;
      await this.reflectOnVehicle(command.vehicleId, { type: command.type, speedLimitKmh: p.speedLimitKmh, on: p.on });
    }
  }

  async listForVehicle(vehicleId: string, q: PageQuery) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
    if (!vehicle) throw notFound('Moto não encontrada.');
    const rows = await this.prisma.vehicleCommand.findMany({
      where: { vehicleId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(q),
    });
    return toPage(rows, q, toVehicleCommand);
  }

  async get(id: string) {
    const c = await this.prisma.vehicleCommand.findUnique({ where: { id } });
    if (!c) throw notFound('Comando não encontrado.');
    return toVehicleCommand(c);
  }
}
