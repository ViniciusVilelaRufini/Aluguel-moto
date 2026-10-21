import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { BatterySwap, FieldTask, Inspection, Prisma, StaffUser, Vehicle } from '@prisma/client';
import { MAX_SPEED_KMH } from '../../common/enums';
import { EV, VehicleStatusChangedEvent } from '../../common/events';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, forbidden, notFound, unprocessable } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { compact, iso } from '../../common/util';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { AuditService } from '../audit/audit.service';
import { hasGroup, type Principal } from '../auth/principal';
import type { BatterySwapDto, FieldTaskCompleteDto, FieldTaskCreateDto, FieldTaskUpdateDto, InspectionDto, ListFieldTasksQuery } from './field-tasks.dto';

type TaskRow = FieldTask & { vehicle?: Pick<Vehicle, 'code' | 'lat' | 'lng' | 'batteryPct'> | null; assignee?: Pick<StaffUser, 'name'> | null };
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
const CLOSED = ['done', 'canceled'];

export function toFieldTask(t: TaskRow) {
  return compact({
    id: t.id, type: t.type, status: t.status, priority: t.priority, vehicleId: t.vehicleId, vehicleCode: t.vehicle?.code ?? '',
    vehicleLat: t.vehicle?.lat, vehicleLng: t.vehicle?.lng, vehicleBatteryPct: t.vehicle?.batteryPct, targetLat: t.targetLat ?? undefined,
    targetLng: t.targetLng ?? undefined, assigneeId: t.assigneeId ?? undefined, assigneeName: t.assignee?.name, notes: t.notes ?? undefined,
    dueAt: iso(t.dueAt), maintenanceTaskId: t.maintenanceTaskId ?? undefined, createdById: t.createdById ?? undefined,
    completionNotes: t.completionNotes ?? undefined, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
    startedAt: iso(t.startedAt), completedAt: iso(t.completedAt),
  });
}

export function toInspection(i: Inspection) {
  const c = i.checklist as Record<string, unknown>;
  return compact({
    id: i.id, fieldTaskId: i.fieldTaskId, vehicleId: i.vehicleId, inspectorId: i.inspectorId, brakes: c.brakes, tires: c.tires, lights: c.lights,
    bell: c.bell, speedLimiter: c.speedLimiter, photoObjectKeys: i.photoObjectKeys, notes: i.notes ?? undefined, passed: i.passed,
    maintenanceTaskId: i.maintenanceTaskId ?? undefined, alertId: i.alertId ?? undefined, recordedAt: i.recordedAt.toISOString(), createdAt: i.createdAt.toISOString(),
  });
}

export function toBatterySwap(b: BatterySwap) {
  return compact({
    id: b.id, fieldTaskId: b.fieldTaskId, vehicleId: b.vehicleId, operatorId: b.operatorId, removedBatterySerial: b.removedBatterySerial,
    installedBatterySerial: b.installedBatterySerial, installedBatteryPct: b.installedBatteryPct ?? undefined, recordedAt: b.recordedAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
  });
}

/** Tarefas de campo, inspeção (limitador como observação) e troca de bateria. */
@Injectable()
export class FieldTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly audit: AuditService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly events: EventEmitter2,
  ) {}

  private async enrich(rows: FieldTask[]): Promise<TaskRow[]> {
    const vIds = [...new Set(rows.map((r) => r.vehicleId))];
    const sIds = [...new Set(rows.map((r) => r.assigneeId).filter((x): x is string => !!x))];
    const [vehicles, staff] = await Promise.all([
      vIds.length ? this.prisma.vehicle.findMany({ where: { id: { in: vIds } }, select: { id: true, code: true, lat: true, lng: true, batteryPct: true } }) : [],
      sIds.length ? this.prisma.staffUser.findMany({ where: { id: { in: sIds } }, select: { id: true, name: true } }) : [],
    ]);
    const vm = new Map(vehicles.map((v) => [v.id, v]));
    const sm = new Map(staff.map((s) => [s.id, s]));
    return rows.map((r) => ({ ...r, vehicle: vm.get(r.vehicleId) ?? null, assignee: r.assigneeId ? (sm.get(r.assigneeId) ?? null) : null }));
  }

  private async one(id: string) {
    const t = await this.prisma.fieldTask.findUnique({ where: { id } });
    if (!t) throw notFound('Tarefa não encontrada.');
    return t;
  }

  private async mapped(id: string) {
    return toFieldTask((await this.enrich([await this.one(id)]))[0]);
  }

  async list(user: Principal, q: ListFieldTasksQuery) {
    const where: Prisma.FieldTaskWhereInput = {};
    const onlyCampo = hasGroup(user, 'campo') && !hasGroup(user, 'admin', 'operacao');
    let assignee = q.assigneeId === 'me' ? user.userId : q.assigneeId;
    if (!assignee && onlyCampo) assignee = user.userId;
    if (assignee) where.assigneeId = assignee;
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    if (q.vehicleId) where.vehicleId = q.vehicleId;
    const rows = await this.prisma.fieldTask.findMany({ where, orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { id: 'asc' }], ...pageArgs(q) });
    const enriched = await this.enrich(rows);
    enriched.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity));
    return toPage(enriched, q, toFieldTask);
  }

  async create(actor: Principal, dto: FieldTaskCreateDto) {
    if (!(await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId }, select: { id: true } }))) throw notFound('Moto não encontrada.');
    if (dto.assigneeId && !(await this.prisma.staffUser.findUnique({ where: { id: dto.assigneeId }, select: { id: true } }))) throw notFound('Operador não encontrado.');
    if (dto.maintenanceTaskId && !(await this.prisma.maintenanceTask.findUnique({ where: { id: dto.maintenanceTaskId }, select: { id: true } }))) {
      throw notFound('Manutenção não encontrada.');
    }
    const t = await this.prisma.fieldTask.create({
      data: { ...dto, dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined, status: dto.assigneeId ? 'assigned' : 'open', createdById: actor.userId },
    });
    return this.mapped(t.id);
  }

  async upload(user: Principal, contentType: string) {
    return presignedUpload(this.storage, this.cfg.buckets.attachments, `field/${user.userId}`, contentType);
  }

  async get(id: string) {
    return this.mapped(id);
  }

  async update(id: string, dto: FieldTaskUpdateDto) {
    const t = await this.one(id);
    if (CLOSED.includes(t.status)) throw conflict('conflict', 'Tarefa já encerrada.');
    if (dto.assigneeId && !(await this.prisma.staffUser.findUnique({ where: { id: dto.assigneeId }, select: { id: true } }))) throw notFound('Operador não encontrado.');
    const data: Prisma.FieldTaskUpdateInput = { priority: dto.priority, notes: dto.notes, dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined };
    if (dto.assigneeId) {
      data.assigneeId = dto.assigneeId;
      if (t.status === 'open') data.status = 'assigned';
    }
    if (dto.status === 'canceled') data.status = 'canceled';
    else if (dto.status && dto.status !== t.status && !dto.assigneeId) data.status = dto.status;
    await this.prisma.fieldTask.update({ where: { id }, data });
    return this.mapped(id);
  }

  async start(user: Principal, id: string) {
    const t = await this.one(id);
    if (t.status !== 'open' && t.status !== 'assigned') throw conflict('conflict', 'A tarefa não pode ser iniciada neste estado.');
    if (t.assigneeId && t.assigneeId !== user.userId && !hasGroup(user, 'admin', 'operacao')) throw forbidden('Esta tarefa está atribuída a outro operador.');
    await this.prisma.fieldTask.update({ where: { id }, data: { status: 'in_progress', startedAt: new Date(), assigneeId: t.assigneeId ?? user.userId } });
    return this.mapped(id);
  }

  async complete(user: Principal, id: string, dto: FieldTaskCompleteDto) {
    const t = await this.one(id);
    if (t.status === 'done') return this.mapped(id); // reenvio da fila offline
    if (t.status === 'canceled' || t.status === 'open') throw conflict('conflict', 'A tarefa não pode ser concluída neste estado.');
    if (t.type === 'inspection' && (await this.prisma.inspection.count({ where: { fieldTaskId: id } })) === 0) {
      throw unprocessable('validation-error', 'Registre a inspeção antes de concluir.');
    }
    if (t.type === 'battery_swap' && (await this.prisma.batterySwap.count({ where: { fieldTaskId: id } })) === 0) {
      throw unprocessable('validation-error', 'Registre a troca de bateria antes de concluir.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.fieldTask.update({ where: { id }, data: { status: 'done', completionNotes: dto.notes, completedAt: dto.completedAt ? new Date(dto.completedAt) : new Date() } });
      if (dto.vehicleStatus) {
        const moved = await tx.vehicle.updateMany({ where: { id: t.vehicleId, status: { in: ['free', 'maintenance', 'offline', 'blocked'] } }, data: { status: dto.vehicleStatus } });
        if (moved.count) await this.audit.record({ actor: user, action: 'vehicle.status', entityType: 'Vehicle', entityId: t.vehicleId, reason: `Tarefa ${t.type} concluída`, metadata: { fieldTaskId: id, to: dto.vehicleStatus } }, tx as any);
      }
    });
    if (dto.vehicleStatus) this.emitVehicle(t.vehicleId, dto.vehicleStatus);
    return this.mapped(id);
  }

  /**
   * Todos os itens obrigatórios e ao menos uma foto (validação). `configuredMaxKmh > 32`: `ok: true` → 422;
   * `ok: false` → registra, abre manutenção corretiva + alerta e muda a moto para `maintenance`.
   */
  async submitInspection(user: Principal, id: string, dto: InspectionDto, idempotencyKey?: string) {
    const t = await this.one(id);
    if (CLOSED.includes(t.status)) throw conflict('conflict', 'Tarefa já encerrada.');
    if (idempotencyKey) {
      const prev = await this.prisma.inspection.findUnique({ where: { idempotencyKey } });
      if (prev) return toInspection(prev);
    }
    const overLimit = dto.speedLimiter.configuredMaxKmh > MAX_SPEED_KMH;
    if (overLimit && dto.speedLimiter.ok) {
      throw unprocessable('speed-limiter-noncompliant', `Limitador configurado em ${dto.speedLimiter.configuredMaxKmh} km/h: acima de 32 km/h não pode ser aprovado.`);
    }
    const passed = !overLimit && [dto.brakes, dto.tires, dto.lights, dto.bell, dto.speedLimiter].every((i) => i.ok);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: t.vehicleId } });
    if (!vehicle) throw notFound('Moto não encontrada.');

    let maintenanceTaskId: string | undefined;
    let alertId: string | undefined;
    if (overLimit) {
      const mt = await this.prisma.maintenanceTask.create({
        data: {
          vehicleId: t.vehicleId, kind: 'corrective', title: 'Limitador de velocidade acima de 32 km/h',
          description: `Inspeção leu ${dto.speedLimiter.configuredMaxKmh} km/h no controlador. Reconfigurar para no máximo 32 km/h.`, createdById: user.userId,
        },
      });
      maintenanceTaskId = mt.id;
      const alert = await this.alerts.create(
        { type: 'speed_limiter_noncompliant', priority: 'high', message: `Limitador da ${vehicle.code} em ${dto.speedLimiter.configuredMaxKmh} km/h.`, vehicleId: t.vehicleId, lat: vehicle.lat, lng: vehicle.lng },
        { dedupe: false },
      );
      alertId = alert.id;
      const moved = await this.prisma.vehicle.updateMany({ where: { id: t.vehicleId, status: { in: ['free', 'offline', 'blocked', 'maintenance'] } }, data: { status: 'maintenance' } });
      if (moved?.count) this.emitVehicle(t.vehicleId, 'maintenance');
    }
    const insp = await this.prisma.inspection.create({
      data: {
        fieldTaskId: id, vehicleId: t.vehicleId, inspectorId: user.userId,
        checklist: { brakes: dto.brakes, tires: dto.tires, lights: dto.lights, bell: dto.bell, speedLimiter: dto.speedLimiter } as unknown as Prisma.InputJsonValue,
        photoObjectKeys: dto.photoObjectKeys, notes: dto.notes, passed, maintenanceTaskId, alertId, idempotencyKey, recordedAt: new Date(dto.recordedAt),
      },
    });
    return toInspection(insp);
  }

  async submitBatterySwap(user: Principal, id: string, dto: BatterySwapDto, idempotencyKey?: string) {
    const t = await this.one(id);
    if (CLOSED.includes(t.status)) throw conflict('conflict', 'Tarefa já encerrada.');
    if (dto.removedBatterySerial.trim() === dto.installedBatterySerial.trim()) {
      throw unprocessable('battery-serials-must-differ', 'A bateria instalada precisa ser diferente da retirada.');
    }
    if (idempotencyKey) {
      const prev = await this.prisma.batterySwap.findUnique({ where: { idempotencyKey } });
      if (prev) return toBatterySwap(prev);
    }
    const swap = await this.prisma.$transaction(async (tx) => {
      const s = await tx.batterySwap.create({
        data: {
          fieldTaskId: id, vehicleId: t.vehicleId, operatorId: user.userId, removedBatterySerial: dto.removedBatterySerial, installedBatterySerial: dto.installedBatterySerial,
          installedBatteryPct: dto.installedBatteryPct, idempotencyKey, recordedAt: new Date(dto.recordedAt),
        },
      });
      await tx.vehicle.update({
        where: { id: t.vehicleId },
        data: { batterySerial: dto.installedBatterySerial, ...(dto.installedBatteryPct !== undefined ? { batteryPct: dto.installedBatteryPct } : {}) },
      });
      return s;
    });
    return toBatterySwap(swap);
  }

  private emitVehicle(vehicleId: string, status: VehicleStatusChangedEvent['status']): void {
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId, status, ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
  }
}
