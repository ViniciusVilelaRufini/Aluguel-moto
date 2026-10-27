import { Inject, Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Battery, BatterySwap, FieldTask, Inspection, Prisma, StaffUser, Vehicle } from '@prisma/client';
import { MAX_SPEED_KMH, type VehicleStatus } from '../../common/enums';
import { type BatteryChargedStockDecreasedEvent, EV, VehicleStatusChangedEvent } from '../../common/events';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, unprocessable } from '../../common/problem';
import { presignedUpload } from '../../common/uploads';
import { compact, iso } from '../../common/util';
import { assertVehicleNotInUse, VEHICLE_LOCKED_BACK_TO_FLEET } from '../../common/vehicle-in-use';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { OUT_OF_SERVICE } from '../batteries/batteries.service';
import { depotsLeavingCharged, movement, recordMovements, type MovementInput } from '../batteries/battery-movements';
import { CommandsService } from '../commands/commands.service';
import { BUDGET_MS, CALL_TIMEOUT_MS, VehicleAddressService } from '../vehicles/vehicle-address.service';
import { assertTaskActor, isFieldOnly } from './task-actor';
import type { BatterySwapDto, FieldTaskCompleteDto, FieldTaskCreateDto, FieldTaskUpdateDto, InspectionDto, ListFieldTasksQuery } from './field-tasks.dto';

type TaskVehicle = Pick<Vehicle, 'code' | 'lat' | 'lng' | 'batteryPct'> & Partial<Pick<Vehicle, 'status' | 'addressLabel' | 'batterySerial'>>;
type TaskRow = FieldTask & {
  vehicle?: TaskVehicle | null;
  assignee?: Pick<StaffUser, 'name'> | null;
  /** Contrato v2: bateria instalada e endereço do destino. */
  battery?: Pick<Battery, 'serial' | 'cycleCount'> | null;
  targetAddress?: string;
};
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
const CLOSED = ['done', 'canceled'];
/** Status de onde (e para onde) a conclusão da tarefa pode mudar a moto, como em `VehiclesService.setStatus`. */
const VEHICLE_STATUS_SETTABLE: VehicleStatus[] = ['free', 'maintenance'];

export function toFieldTask(t: TaskRow) {
  return compact({
    id: t.id, type: t.type, status: t.status, priority: t.priority, vehicleId: t.vehicleId, vehicleCode: t.vehicle?.code ?? '',
    vehicleLat: t.vehicle?.lat, vehicleLng: t.vehicle?.lng, vehicleBatteryPct: t.vehicle?.batteryPct,
    vehicleStatus: t.vehicle?.status, vehicleAddress: t.vehicle?.addressLabel ?? undefined,
    vehicleBatterySerial: t.battery?.serial ?? t.vehicle?.batterySerial ?? undefined, vehicleBatteryCycleCount: t.battery?.cycleCount,
    targetAddress: t.targetAddress, targetLat: t.targetLat ?? undefined,
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
    installedBatterySerial: b.installedBatterySerial, installedBatteryPct: b.installedBatteryPct ?? undefined,
    removedBatteryPct: b.removedBatteryPct ?? undefined, removedBatteryCycleCount: b.removedBatteryCycleCount ?? undefined,
    installedBatteryCycleCount: b.installedBatteryCycleCount ?? undefined, recordedAt: b.recordedAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
  });
}

type VehicleState = Pick<Vehicle, 'status' | 'statusBeforeOffline'> | null;
type ArrivalStatus = 'free' | 'maintenance' | 'blocked';
/** Origens aceitas na chegada ao galpão (direto ou guardada antes de ficar offline). */
const ARRIVAL_FROM = ['awaiting_pickup', 'free', 'maintenance', 'blocked'];

/** Moto devolvida em ponto verde esperando recolhimento (também se ficou offline nesse estado). */
function isAwaitingPickup(v: VehicleState): boolean {
  return v?.status === 'awaiting_pickup' || (v?.status === 'offline' && v.statusBeforeOffline === 'awaiting_pickup');
}

/**
 * Chegada da `collect` ao galpão: `free` (ou o `vehicleStatus` enviado); moto bloqueada continua bloqueada sem
 * `vehicleStatus` explícito. Offline: grava o status de retorno em `statusBeforeOffline` e não emite evento.
 */
function depotArrival(v: VehicleState, explicit: 'free' | 'maintenance' | undefined, at: { depotId: string; lat: number; lng: number }) {
  const target = (from: string | null): ArrivalStatus => (from === 'blocked' && !explicit ? 'blocked' : (explicit ?? 'free'));
  if (v && ARRIVAL_FROM.includes(v.status)) {
    const status = target(v.status);
    return { where: { status: v.status }, data: { status, ...at }, status, emit: true };
  }
  if (v?.status === 'offline' && (v.statusBeforeOffline === null || ARRIVAL_FROM.includes(v.statusBeforeOffline))) {
    const status = target(v.statusBeforeOffline);
    return { where: { status: v.status, statusBeforeOffline: v.statusBeforeOffline }, data: { statusBeforeOffline: status, ...at }, status, emit: false };
  }
  throw conflict('vehicle-unavailable', 'A moto está em uso por um cliente; não dá para registrar a chegada ao galpão.');
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
    private readonly commands: CommandsService,
    @Optional() private readonly addresses?: VehicleAddressService,
  ) {}

  private async enrich(rows: FieldTask[]): Promise<TaskRow[]> {
    const vIds = [...new Set(rows.map((r) => r.vehicleId))];
    const sIds = [...new Set(rows.map((r) => r.assigneeId).filter((x): x is string => !!x))];
    const [vehicles, staff] = await Promise.all([
      vIds.length
        ? this.prisma.vehicle.findMany({
            where: { id: { in: vIds } },
            select: { id: true, code: true, lat: true, lng: true, batteryPct: true, status: true, batterySerial: true, addressLabel: true, addressLat: true, addressLng: true, addressUpdatedAt: true },
          })
        : [],
      sIds.length ? this.prisma.staffUser.findMany({ where: { id: { in: sIds } }, select: { id: true, name: true } }) : [],
    ]);
    // Contrato v2: endereço da moto (cache) e do destino, bateria instalada.
    if (this.addresses) await this.addresses.ensure(vehicles);
    const batteries = vIds.length ? await this.prisma.battery.findMany({ where: { vehicleId: { in: vIds }, status: 'in_vehicle' }, select: { vehicleId: true, serial: true, cycleCount: true } }) : [];
    const bm = new Map(batteries.map((b) => [b.vehicleId!, b]));
    const vm = new Map(vehicles.map((v) => [v.id, v]));
    const sm = new Map(staff.map((s) => [s.id, s]));
    const out: TaskRow[] = [];
    // Fix round 1 (M6): endereço dos destinos dentro de um orçamento de tempo por lista.
    const started = Date.now();
    for (const r of rows) {
      const remaining = BUDGET_MS - (Date.now() - started);
      const targetAddress = this.addresses && r.targetLat != null && remaining > 0 ? await this.addresses.label(r.targetLat, r.targetLng, Math.min(CALL_TIMEOUT_MS, remaining)) : undefined;
      out.push({ ...r, vehicle: vm.get(r.vehicleId) ?? null, assignee: r.assigneeId ? (sm.get(r.assigneeId) ?? null) : null, battery: bm.get(r.vehicleId) ?? null, targetAddress });
    }
    return out;
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
    // Auditoria item 13: usuário só-campo lista só as próprias tarefas (o `assigneeId` pedido é ignorado).
    const assignee = isFieldOnly(user) ? user.userId : q.assigneeId === 'me' ? user.userId : q.assigneeId;
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
    const data = { ...dto, dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined, status: dto.assigneeId ? ('assigned' as const) : ('open' as const), createdById: actor.userId };
    if (dto.type !== 'collect') return this.mapped((await this.prisma.fieldTask.create({ data })).id);
    // Recolhimento: mesmo lock por moto do encerramento em ponto verde; uma `collect` aberta por moto.
    const t = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`collect:${dto.vehicleId}`}))::text`;
      const open = await tx.fieldTask.findFirst({ where: { vehicleId: dto.vehicleId, type: 'collect', status: { notIn: CLOSED as FieldTask['status'][] } }, select: { id: true } });
      if (open) throw conflict('conflict', 'Já existe um recolhimento aberto para esta moto.');
      return tx.fieldTask.create({ data });
    });
    return this.mapped(t.id);
  }

  async upload(user: Principal, contentType: string) {
    return presignedUpload(this.storage, this.cfg.buckets.attachments, `field/${user.userId}`, contentType);
  }

  async get(user: Principal, id: string) {
    const t = await this.one(id);
    assertTaskActor(user, t, { allowUnassigned: true });
    return toFieldTask((await this.enrich([t]))[0]);
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
    if (dto.status === 'canceled' && t.type === 'collect') await this.assertCollectCancelable(t);
    if (dto.status === 'canceled') data.status = 'canceled';
    else if (dto.status && dto.status !== t.status && !dto.assigneeId) data.status = dto.status;
    await this.prisma.fieldTask.update({ where: { id }, data });
    return this.mapped(id);
  }

  async start(user: Principal, id: string) {
    const t = await this.one(id);
    if (t.status !== 'open' && t.status !== 'assigned') throw conflict('conflict', 'A tarefa não pode ser iniciada neste estado.');
    assertTaskActor(user, t, { allowUnassigned: true });
    await this.prisma.fieldTask.update({ where: { id }, data: { status: 'in_progress', startedAt: new Date(), assigneeId: t.assigneeId ?? user.userId } });
    return this.mapped(id);
  }

  async complete(user: Principal, id: string, dto: FieldTaskCompleteDto) {
    const t = await this.one(id);
    assertTaskActor(user, t);
    if (t.status === 'done') return this.mapped(id); // reenvio da fila offline
    if (t.status === 'canceled' || t.status === 'open') throw conflict('conflict', 'A tarefa não pode ser concluída neste estado.');
    if (t.type === 'inspection' && (await this.prisma.inspection.count({ where: { fieldTaskId: id } })) === 0) {
      throw unprocessable('validation-error', 'Registre a inspeção antes de concluir.');
    }
    if (t.type === 'battery_swap' && (await this.prisma.batterySwap.count({ where: { fieldTaskId: id } })) === 0) {
      throw unprocessable('validation-error', 'Registre a troca de bateria antes de concluir.');
    }
    if (dto.depotId && t.type !== 'collect') throw unprocessable('validation-error', 'O galpão só é informado ao concluir um recolhimento.');
    const depot = dto.depotId ? await this.prisma.depot.findUnique({ where: { id: dto.depotId }, select: { id: true, lat: true, lng: true, active: true } }) : null;
    if (dto.depotId && !depot) throw notFound('Galpão não encontrado.');
    if (depot && !depot.active) throw unprocessable('depot-inactive', 'Este galpão está desativado; escolha outro galpão.');
    const vehicle = t.type === 'collect' ? await this.prisma.vehicle.findUnique({ where: { id: t.vehicleId }, select: { status: true, statusBeforeOffline: true } }) : null;
    if (t.type === 'collect' && !depot && isAwaitingPickup(vehicle)) throw unprocessable('validation-error', 'Informe o galpão onde a moto chegou.');
    const arrival = depot ? depotArrival(vehicle, dto.vehicleStatus, { depotId: depot.id, lat: depot.lat, lng: depot.lng }) : null;
    await this.prisma.$transaction(async (tx) => {
      if (arrival && depot) {
        // Retirada em galpão: a moto recolhida volta ao galpão. Gravação condicionada ao status lido (409 se mudou).
        // Auditoria (revisão final item 6) no fluxo do galpão: chegada como `free` (agora ou ao reconectar) exige a moto sem
        // aluguel/reserva e sem trava da equipe/sistema (cerca, hold, modo roubada) — senão 409, a moto entra em manutenção.
        if (arrival.status === 'free') {
          await assertVehicleNotInUse(tx, t.vehicleId);
          const v = await tx.vehicle.findUnique({ where: { id: t.vehicleId }, select: { id: true, thingName: true, stolenMode: true } });
          if (!v) throw notFound('Moto não encontrada.');
          if (await this.commands.isLockedByStaff(v)) throw conflict('vehicle-unavailable', VEHICLE_LOCKED_BACK_TO_FLEET);
        }
        const moved = await tx.vehicle.updateMany({ where: { id: t.vehicleId, ...arrival.where }, data: arrival.data });
        if (!moved.count) throw conflict('vehicle-unavailable', 'A moto mudou de situação; atualize a tarefa e tente de novo.');
        await this.audit.record({ actor: user, action: 'vehicle.status', entityType: 'Vehicle', entityId: t.vehicleId, reason: 'Recolhimento concluído no galpão', metadata: { fieldTaskId: id, to: arrival.status, depotId: depot.id } }, tx as any);
      } else if (dto.vehicleStatus) {
        // Auditoria item 7: mesmas guardas de `setStatus` — só entre livre e manutenção e sem aluguel/reserva
        // (consultados, não deduzidos do status, que fica `offline` durante um aluguel com o rastreador fora).
        const v = await tx.vehicle.findUnique({ where: { id: t.vehicleId }, select: { id: true, status: true, thingName: true, stolenMode: true } });
        if (!v) throw notFound('Moto não encontrada.');
        if (!VEHICLE_STATUS_SETTABLE.includes(v.status)) throw conflict('vehicle-unavailable', `A moto está ${v.status}; só é possível alternar entre livre e manutenção.`);
        await assertVehicleNotInUse(tx, t.vehicleId);
        // Revisão final item 6: moto com trava da equipe/sistema (cerca, hold, modo roubada) não volta à frota pela tarefa.
        if (dto.vehicleStatus === 'free' && (await this.commands.isLockedByStaff(v))) throw conflict('vehicle-unavailable', VEHICLE_LOCKED_BACK_TO_FLEET);
        const moved = await tx.vehicle.updateMany({ where: { id: t.vehicleId, status: { in: VEHICLE_STATUS_SETTABLE } }, data: { status: dto.vehicleStatus } });
        if (moved.count !== 1) throw conflict('vehicle-unavailable', 'A moto mudou de estado; tente de novo.');
        await this.audit.record({ actor: user, action: 'vehicle.status', entityType: 'Vehicle', entityId: t.vehicleId, reason: `Tarefa ${t.type} concluída`, metadata: { fieldTaskId: id, from: v.status, to: dto.vehicleStatus } }, tx as any);
      }
      await tx.fieldTask.update({ where: { id }, data: { status: 'done', completionNotes: dto.notes, completedAt: dto.completedAt ? new Date(dto.completedAt) : new Date() } });
    });
    // Moto offline: o status real continua `offline` (o de retorno fica guardado), então não emite.
    if (arrival) {
      if (arrival.emit) this.emitVehicle(t.vehicleId, arrival.status);
    } else if (dto.vehicleStatus) this.emitVehicle(t.vehicleId, dto.vehicleStatus);
    return this.mapped(id);
  }

  /**
   * Todos os itens obrigatórios e ao menos uma foto (validação). `configuredMaxKmh > 32`: `ok: true` → 422;
   * `ok: false` → registra, abre manutenção corretiva + alerta e muda a moto para `maintenance`.
   */
  async submitInspection(user: Principal, id: string, dto: InspectionDto, idempotencyKey?: string) {
    const t = await this.one(id);
    assertTaskActor(user, t);
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
          vehicleId: t.vehicleId, kind: 'corrective', title: 'Limitador de velocidade acima de 32 km/h', source: 'system',
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

  /**
   * Troca de bateria na tarefa `battery_swap`. 2026-10-26 (custódia): uma troca por tarefa (409
   * `battery-swap-already-recorded`); a instalada sai da van de quem registra (ou é nova, sem cadastro) — senão 409
   * `battery-not-in-van`; a retirada precisa ser a bateria desta moto (`Vehicle.batterySerial` ou a linha `in_vehicle`
   * dela) e uma série instalada em outra moto nunca é reatribuída — 409 `battery-serial-mismatch`. Cada escrita confere o
   * estado lido (`updateMany` + `count`). `installedBatteryPct` só vale para bateria nova; a existente mantém a carga gravada.
   */
  async submitBatterySwap(user: Principal, id: string, dto: BatterySwapDto, idempotencyKey?: string) {
    const t = await this.one(id);
    assertTaskActor(user, t);
    if (CLOSED.includes(t.status)) throw conflict('conflict', 'Tarefa já encerrada.');
    if (t.type !== 'battery_swap') throw conflict('task-type-mismatch', 'Esta tarefa não é de troca de bateria.');
    if (dto.removedBatterySerial.trim() === dto.installedBatterySerial.trim()) {
      throw unprocessable('battery-serials-must-differ', 'A bateria instalada precisa ser diferente da retirada.');
    }
    if (idempotencyKey) {
      const prev = await this.prisma.batterySwap.findUnique({ where: { idempotencyKey } });
      if (prev) return toBatterySwap(prev);
    }
    if (await this.prisma.batterySwap.findFirst({ where: { fieldTaskId: id }, select: { id: true } })) {
      throw conflict('battery-swap-already-recorded', 'A troca de bateria desta tarefa já foi registrada.');
    }
    const removedSerial = dto.removedBatterySerial.trim();
    const installedSerial = dto.installedBatterySerial.trim();
    const moves: MovementInput[] = [];
    const swap = await this.prisma.$transaction(async (tx) => {
      // Contrato v2: inventário de baterias. A retirada vai para a van do operador com a última carga lida da moto;
      // a instalada sai da van dele, entra na moto e conta mais um ciclo. 2026-10-24: cada mudança grava uma
      // movimentação; bateria com defeito ou baixada não entra numa moto (409).
      const prevInstalled = await tx.battery.findUnique({ where: { serial: installedSerial } });
      if (prevInstalled && OUT_OF_SERVICE.includes(prevInstalled.status)) {
        throw conflict('conflict', `Bateria fora de uso (com defeito ou baixada): ${installedSerial}.`);
      }
      // Fix round 1: o slug fala da instalada (o app mostra `battery-serial-mismatch` como "a retirada não é desta moto").
      if (prevInstalled?.status === 'in_vehicle') {
        throw conflict('battery-not-in-van', `A bateria a instalar consta instalada numa moto, não na sua van: ${installedSerial}. Confira a série.`);
      }
      if (prevInstalled && (prevInstalled.status !== 'in_van' || prevInstalled.holderId !== user.userId)) {
        throw conflict('battery-not-in-van', `Essa bateria não está na sua van: ${installedSerial}.`);
      }
      const prevRemoved = await tx.battery.findUnique({ where: { serial: removedSerial } });
      // Fix 1 (M2): bateria fora de uso não estava numa moto — série errada ou registro inconsistente; não ressuscita.
      if (prevRemoved && OUT_OF_SERVICE.includes(prevRemoved.status)) {
        throw conflict('conflict', `A bateria retirada consta fora de uso (com defeito ou baixada): ${removedSerial}. Confira a série.`);
      }
      const vehicle = await tx.vehicle.findUnique({ where: { id: t.vehicleId }, select: { batteryPct: true, batterySerial: true } });
      const current = vehicle?.batterySerial ?? null;
      const onVehicle = await tx.battery.findMany({ where: { vehicleId: t.vehicleId, status: 'in_vehicle' } });
      const removedMismatch =
        (prevRemoved?.status === 'in_vehicle' && prevRemoved.vehicleId !== t.vehicleId) ||
        (current ? current !== removedSerial : onVehicle.length > 0 && !onVehicle.some((b) => b.serial === removedSerial)) ||
        (!!prevRemoved && prevRemoved.status !== 'in_vehicle' && current !== removedSerial);
      if (removedMismatch) throw conflict('battery-serial-mismatch', `A bateria retirada não é a desta moto: ${removedSerial}. Confira a série.`);

      const removedPct = vehicle?.batteryPct ?? null;
      let removed: Pick<Battery, 'id' | 'cycleCount'>;
      if (prevRemoved) {
        const data = { status: 'in_van' as const, holderId: user.userId, vehicleId: null, stationId: null, depotId: null, ...(removedPct !== null ? { chargePct: removedPct } : {}) };
        const where: Prisma.BatteryWhereInput = { id: prevRemoved.id, status: prevRemoved.status, ...(prevRemoved.status === 'in_vehicle' ? { vehicleId: t.vehicleId } : {}) };
        const changed = await tx.battery.updateMany({ where, data });
        if (changed.count !== 1) throw conflict('conflict', 'A bateria retirada mudou de situação durante a operação. Atualize e tente de novo.');
        removed = prevRemoved;
      } else {
        removed = await tx.battery.create({ data: { serial: removedSerial, chargePct: removedPct ?? 0, status: 'in_van', holderId: user.userId } });
      }
      moves.push(movement(prevRemoved, { status: 'in_van', vehicleId: prevRemoved ? undefined : t.vehicleId }, user.userId, null, removed.id));

      let installed: Pick<Battery, 'id' | 'cycleCount' | 'chargePct'>;
      if (prevInstalled) {
        const changed = await tx.battery.updateMany({
          where: { id: prevInstalled.id, status: 'in_van', holderId: user.userId },
          data: { status: 'in_vehicle', vehicleId: t.vehicleId, holderId: null, stationId: null, depotId: null, cycleCount: { increment: 1 } },
        });
        if (changed.count !== 1) throw conflict('battery-not-in-van', `Essa bateria não está na sua van: ${installedSerial}.`);
        installed = { id: prevInstalled.id, cycleCount: prevInstalled.cycleCount + 1, chargePct: prevInstalled.chargePct };
      } else {
        installed = await tx.battery.create({ data: { serial: installedSerial, chargePct: dto.installedBatteryPct ?? 100, status: 'in_vehicle', vehicleId: t.vehicleId, cycleCount: 1 } });
      }
      moves.push(movement(prevInstalled, { status: 'in_vehicle', vehicleId: t.vehicleId }, user.userId, null, installed.id));
      // Outra bateria registrada nesta moto (registro inconsistente com a série retirada) deixa de constar como instalada.
      const stray = onVehicle.filter((b) => b.id !== installed.id && b.id !== removed.id);
      if (stray.length) {
        await tx.battery.updateMany({ where: { id: { in: stray.map((b) => b.id) }, status: 'in_vehicle' }, data: { vehicleId: null, status: 'charging' } });
        for (const b of stray) moves.push(movement(b, { status: 'charging' }, user.userId));
      }
      await recordMovements(tx, moves);
      const s = await tx.batterySwap.create({
        data: {
          fieldTaskId: id, vehicleId: t.vehicleId, operatorId: user.userId, removedBatterySerial: dto.removedBatterySerial, installedBatterySerial: dto.installedBatterySerial,
          installedBatteryPct: dto.installedBatteryPct, idempotencyKey, recordedAt: new Date(dto.recordedAt),
          removedBatteryPct: removedPct, removedBatteryCycleCount: removed.cycleCount, installedBatteryCycleCount: installed.cycleCount,
        },
      });
      // A moto só muda se ainda tiver a bateria lida (outra troca, na estação ou noutra tarefa, não é sobrescrita).
      const vehicleMoved = await tx.vehicle.updateMany({
        where: { id: t.vehicleId, batterySerial: current },
        data: { batterySerial: installedSerial, batteryPct: installed.chargePct },
      });
      if (vehicleMoved.count !== 1) throw conflict('battery-serial-mismatch', 'A bateria da moto mudou durante a operação. Confira a série e tente de novo.');
      return s;
    }).catch((err: unknown) => {
      // Fix round 1: série sem cadastro criada ao mesmo tempo por outro envio — o índice único recusa; é conflito, não 500.
      if ((err as { code?: string }).code === 'P2002') throw conflict('conflict', 'Bateria cadastrada durante a operação. Atualize e tente de novo.');
      throw err;
    });
    const depotIds = depotsLeavingCharged(moves);
    if (depotIds.length) this.events.emit(EV.BATTERY_CHARGED_STOCK_DECREASED, { depotIds } satisfies BatteryChargedStockDecreasedEvent);
    return toBatterySwap(swap);
  }

  /** Cancelar a única `collect` aberta de uma moto que espera recolhimento deixaria a moto presa fora da rua. */
  private async assertCollectCancelable(t: FieldTask): Promise<void> {
    const v = await this.prisma.vehicle.findUnique({ where: { id: t.vehicleId }, select: { status: true, statusBeforeOffline: true } });
    if (!isAwaitingPickup(v)) return;
    const others = await this.prisma.fieldTask.count({ where: { vehicleId: t.vehicleId, type: 'collect', status: { notIn: CLOSED as FieldTask['status'][] }, id: { not: t.id } } });
    if (!others) throw conflict('conflict', 'Moto aguardando recolhimento; conclua a tarefa.');
  }

  private emitVehicle(vehicleId: string, status: VehicleStatusChangedEvent['status']): void {
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId, status, ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
  }
}
