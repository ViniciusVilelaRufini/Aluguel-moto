import { withLiveState } from './live-overlay';
import { currentSubscriptionWhere, notFixedForOtherSql } from '../../common/fixed-vehicle';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Prisma, type Vehicle } from '@prisma/client';
import { OPEN_RENTAL_STATUSES, type VehicleStatus } from '../../common/enums';
import { BatteryChargedStockDecreasedEvent, EV, IotConnectivityEvent, IotTelemetryEvent, VehicleStatusChangedEvent } from '../../common/events';
import { pageArgs, toPage } from '../../common/pagination';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../../common/problem';
import { KM_PER_FULL_BATTERY } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { CommandsService } from '../commands/commands.service';
import type { ListVehiclesQuery, NearbyQuery, VehicleCreateDto, VehicleDepotTransferDto, VehicleStatusChangeDto, VehicleUpdateDto } from './vehicles.dto';
import { V2_CONFIG, type V2Config } from '../../config/v2-config';
import { VEHICLE_MODEL_SELECT } from '../catalog/catalog.service';
import { UsageTracker } from '../maintenance/usage-tracker.service';
import { VehicleAddressService } from './vehicle-address.service';
import { assertVehicleNotInUse, VEHICLE_LOCKED_BACK_TO_FLEET } from '../../common/vehicle-in-use';
import { assertTaskActor } from '../field-tasks/task-actor';
import { toVehicle, toVehicleSummary } from './vehicles.mapper';
import { depotsLeavingCharged, movement, recordMovements, type MovementInput } from '../batteries/battery-movements';

/** Relações lidas junto com a moto (contrato v2: modelo do catálogo). */
const VEHICLE_INCLUDE = { tracker: { select: { id: true } }, vehicleModel: { select: VEHICLE_MODEL_SELECT } } as const;

const TRACK_MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** Persistência da telemetria no Postgres no máximo a cada 30 s por moto (o estado ao vivo fica no Redis). */
const DB_WRITE_INTERVAL_MS = 30_000;

/** Normaliza `VLT-0001`, `0001`, `1` ou `volti://v/VLT-0001` (URL-encoded) para `VLT-0001`. */
export function parseVehicleCode(raw: string): string | null {
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {
    /* mantém */
  }
  s = s.trim().replace(/^volti:\/\/v\//i, '');
  const m = /^(?:VLT-)?(\d{1,})$/i.exec(s);
  if (!m) return null;
  return `VLT-${m[1].padStart(4, '0')}`;
}

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger('VehiclesService');
  private readonly lastDbWrite = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly commands: CommandsService,
    private readonly events: EventEmitter2,
    @Inject(REDIS_STORE) private readonly redis: RedisStore,
    private readonly addresses: VehicleAddressService,
    private readonly usage: UsageTracker,
    @Inject(V2_CONFIG) private readonly v2: V2Config,
  ) {}

  /**
   * Contrato v2: endereço (geocodificação reversa em cache), bateria instalada e moto fixa de assinatura, para a ficha
   * e a lista. Clientes só recebem o endereço.
   */
  private async enrich<T extends Vehicle & { tracker?: { id: string } | null }>(rows: T[], staff: boolean, currentRental?: Map<string, string>, viewerCustomerId?: string) {
    if (!staff) {
      // Fix round 1 (I5): para cliente, posição e endereço só de moto livre ou da própria reserva/aluguel (LGPD).
      const own = await this.ownVehicleIds(viewerCustomerId, rows.map((r) => r.id));
      const visible = rows.filter((v) => v.status === 'free' || own.has(v.id));
      await this.addresses.ensure(visible);
      return rows.map((v) => (visible.includes(v) ? toVehicle(v, { staff: false }) : toVehicle(v, { staff: false, hideLocation: true })));
    }
    await this.addresses.ensure(rows);
    const ids = rows.map((r) => r.id);
    const serials = rows.map((r) => r.batterySerial).filter((x): x is string => !!x);
    const [batteries, subs] = await Promise.all([
      this.prisma.battery.findMany({ where: { OR: [{ vehicleId: { in: ids } }, { serial: { in: serials } }] } }),
      this.prisma.subscription.findMany({ where: { assignedVehicleId: { in: ids }, ...currentSubscriptionWhere() }, select: { id: true, assignedVehicleId: true } }),
    ]);
    const subBy = new Map(subs.map((x) => [x.assignedVehicleId!, x.id]));
    const defaults = { km: this.v2.defaultServiceIntervalKm, hours: this.v2.defaultServiceIntervalHours };
    return rows.map((v) => {
      const battery =
        batteries.find((b) => b.vehicleId === v.id && b.status === 'in_vehicle') ?? batteries.find((b) => !!v.batterySerial && b.serial === v.batterySerial) ?? null;
      return toVehicle(v, { staff: true, currentRentalId: currentRental?.get(v.id), battery, assignedSubscriptionId: subBy.get(v.id), serviceDefaults: defaults });
    });
  }

  /** Motos `free` de rua no raio (clientes) ou todas (staff), ordenadas por distância (PostGIS). */
  async nearby(user: Principal, q: NearbyQuery) {
    const radius = q.radiusM ?? 1000;
    const minBattery = q.minRangeKm ? Math.ceil((q.minRangeKm / KM_PER_FULL_BATTERY) * 100) : 0;
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography`;
    // Contrato v2: moto fixa de assinatura aberta só aparece para o próprio assinante.
    // Retirada em galpão: moto com `depotId` (só sai pela entrega) e `awaiting_pickup` nunca aparecem para o cliente.
    const statusFilter = isStaff(user)
      ? Prisma.empty
      : Prisma.sql`AND v."status" = 'free'::"VehicleStatus" AND v."depotId" IS NULL AND ${notFixedForOtherSql(user.customerId!)}`;
    type NearbyRow = Pick<Vehicle, 'id' | 'code' | 'model' | 'status' | 'lat' | 'lng' | 'batteryPct' | 'vehicleModelId'> & {
      distance: number;
      categoryLabel: string | null;
      pricePerMinuteCents: number | null;
    };
    const rows = await this.prisma.$queryRaw<NearbyRow[]>`
      SELECT v."id", v."code", v."model", v."status", v."lat", v."lng", v."batteryPct", v."vehicleModelId",
             m."categoryLabel", m."pricePerMinuteCents",
             ST_Distance(ST_SetSRID(ST_MakePoint(v."lng", v."lat"), 4326)::geography, ${point}) AS "distance"
      FROM "Vehicle" v
      LEFT JOIN "VehicleModel" m ON m."id" = v."vehicleModelId"
      WHERE ST_DWithin(ST_SetSRID(ST_MakePoint(v."lng", v."lat"), 4326)::geography, ${point}, ${radius})
        AND v."batteryPct" >= ${minBattery} ${statusFilter}
      ORDER BY "distance" ASC
      LIMIT 200`;
    return { items: rows.map((r) => toVehicleSummary(r, Number(r.distance))) };
  }

  /** Motos da reserva ativa ou do aluguel aberto do cliente. */
  private async ownVehicleIds(customerId: string | undefined, ids: string[]): Promise<Set<string>> {
    if (!customerId || ids.length === 0) return new Set();
    const [res, ren] = await Promise.all([
      this.prisma.reservation.findMany({ where: { customerId, vehicleId: { in: ids }, status: 'active', expiresAt: { gt: new Date() } }, select: { vehicleId: true } }),
      this.prisma.rental.findMany({ where: { customerId, vehicleId: { in: ids }, status: { in: OPEN_RENTAL_STATUSES } }, select: { vehicleId: true } }),
    ]);
    return new Set([...res, ...ren].map((x) => x.vehicleId));
  }

  private async currentRentalId(vehicleId: string): Promise<string | undefined> {
    const r = await this.prisma.rental.findFirst({ where: { vehicleId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
    return r?.id;
  }

  async byCode(user: Principal, code: string) {
    const normalized = parseVehicleCode(code);
    if (!normalized) throw notFound('Moto não encontrada.');
    const v = await this.prisma.vehicle.findUnique({ where: { code: normalized }, include: VEHICLE_INCLUDE });
    if (!v) throw notFound('Moto não encontrada.');
    const rental = isStaff(user) ? await this.currentRentalId(v.id) : undefined;
    return (await this.enrich([v], isStaff(user), rental ? new Map([[v.id, rental]]) : undefined, user.customerId))[0];
  }

  async list(q: ListVehiclesQuery) {
    const where: Prisma.VehicleWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.maxBatteryPct !== undefined) where.batteryPct = { lte: q.maxBatteryPct };
    if (q.depotId) where.depotId = q.depotId;
    if (q.vehicleModelId) where.vehicleModelId = q.vehicleModelId;
    if (q.q) {
      const contains = { contains: q.q, mode: 'insensitive' as const };
      where.OR = [{ code: contains }, { thingName: contains }, { qrCode: contains }, { model: contains }];
    }
    const dbRows = await this.prisma.vehicle.findMany({ where, include: VEHICLE_INCLUDE, orderBy: [{ code: 'asc' }, { id: 'asc' }], ...pageArgs(q) });
    // QA-20: posição/telemetria ao vivo do Redis quando mais nova que o Postgres (gravado a cada 30 s).
    const rows = await withLiveState(this.redis, dbRows);
    const open = await this.prisma.rental.findMany({ where: { vehicleId: { in: rows.map((r) => r.id) }, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true, vehicleId: true } });
    const byVehicle = new Map(open.map((r) => [r.vehicleId, r.id]));
    const page = toPage(rows, q, (v) => v);
    return { ...page, items: await this.enrich(page.items, true, byVehicle) };
  }

  async create(actor: Principal, dto: VehicleCreateDto) {
    const dup = await this.prisma.vehicle.findFirst({ where: { OR: [{ code: dto.code }, { thingName: dto.thingName }] } });
    if (dup) throw conflict('conflict', 'Já existe uma moto com este código ou rastreador.');
    const modelName = dto.vehicleModelId ? await this.modelName(dto.vehicleModelId) : undefined;
    // Cadastro no painel (docs/decisoes.md, 2026-10-25): com galpão a moto nasce `free` na posição dele (disponível para
    // retirada); sem galpão continua nascendo `maintenance`.
    const depot = dto.depotId ? await this.activeDepot(dto.depotId) : null;
    const serial = dto.batterySerial?.trim() || undefined;
    // QA-19: série nova passa a existir no estoque (instalada nesta moto). Série existente só se for uma bateria `charged`
    // livre (no galpão, sem moto): é instalada aqui. Em qualquer outra situação a instalação é pela operação.
    const existing = serial ? await this.prisma.battery.findUnique({ where: { serial } }) : null;
    if (existing && (existing.status !== 'charged' || existing.vehicleId)) {
      throw conflict('conflict', `Bateria ${serial} não está livre no galpão. Informe outra série ou instale pela operação.`);
    }
    const { depotId: _depotId, ...fields } = dto;
    const moves: MovementInput[] = [];
    const v = await this.prisma
      .$transaction(async (tx) => {
        const created = await tx.vehicle.create({
          data: {
            ...fields,
            batterySerial: serial ?? null,
            model: modelName ?? dto.model,
            qrCode: dto.qrCode?.trim() || `volti://v/${dto.code}`,
            ...(depot ? { status: 'free' as const, depotId: depot.id, lat: depot.lat, lng: depot.lng } : { status: 'maintenance' as const }),
            ...(existing ? { batteryPct: existing.chargePct } : {}),
          },
          include: VEHICLE_INCLUDE,
        });
        if (existing) {
          // Bateria livre do galpão instalada no cadastro: +1 ciclo (regra do contrato v2) e sai do galpão.
          const installed = await tx.battery.updateMany({
            where: { id: existing.id, status: 'charged', vehicleId: null },
            data: { status: 'in_vehicle', vehicleId: created.id, depotId: null, stationId: null, holderId: null, cycleCount: { increment: 1 } },
          });
          if (!installed.count) throw conflict('conflict', `Bateria ${serial} mudou de situação. Atualize e tente de novo.`);
          moves.push(movement(existing, { status: 'in_vehicle', vehicleId: created.id }, actor.userId, 'Instalada no cadastro da moto'));
        } else if (serial) {
          // `cycleCount` soma 1 a cada instalação numa moto (regra do contrato v2): nasce instalada, então 1; no galpão nasce 0.
          const b = await tx.battery.create({ data: { serial, status: 'in_vehicle', vehicleId: created.id, chargePct: created.batteryPct, cycleCount: 1 } });
          moves.push(movement(null, { status: 'in_vehicle', vehicleId: created.id }, actor.userId, 'Cadastrada com a moto', b.id));
        }
        await recordMovements(tx, moves);
        await this.audit.record(
          { actor, action: 'vehicle.create', entityType: 'Vehicle', entityId: created.id, metadata: { code: dto.code, ...(depot ? { depotId: depot.id } : {}) } },
          tx as any,
        );
        return created;
      })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002') throw conflict('conflict', 'Já existe uma moto com este código ou rastreador, ou a bateria já está cadastrada.');
        throw err;
      });
    this.emitStockDecrease(moves);
    if (depot) this.emitStatus(v.id, 'free');
    return (await this.enrich([v], true))[0];
  }

  /**
   * Transferência de galpão (docs/decisoes.md, 2026-10-25): só moto `free`/`maintenance` sem aluguel aberto nem reserva
   * ativa; `depotId` e posição passam a ser os do galpão de destino. Gravação condicionada ao estado lido (409 se mudou).
   */
  async transferDepot(actor: Principal, id: string, dto: VehicleDepotTransferDto) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v) throw notFound('Moto não encontrada.');
    const depot = await this.activeDepot(dto.depotId);
    if (v.depotId === depot.id) throw conflict('conflict', 'A moto já está neste galpão.');
    if (v.status !== 'free' && v.status !== 'maintenance') throw conflict('vehicle-unavailable', 'Só é possível transferir moto livre ou em manutenção.');
    const [rental, reservation] = await Promise.all([
      this.prisma.rental.findFirst({ where: { vehicleId: id, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } }),
      this.prisma.reservation.findFirst({ where: { vehicleId: id, status: { in: ['active', 'handover'] } }, select: { id: true } }),
    ]);
    if (rental || reservation) throw conflict('vehicle-unavailable', 'A moto tem aluguel ou reserva ativa.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.vehicle.updateMany({ where: { id, status: v.status, depotId: v.depotId }, data: { depotId: depot.id, lat: depot.lat, lng: depot.lng } });
      if (!moved.count) throw conflict('vehicle-unavailable', 'A moto mudou de situação; atualize e tente de novo.');
      await this.audit.record(
        { actor, action: 'vehicle.transfer_depot', entityType: 'Vehicle', entityId: id, reason: dto.reason, metadata: { fromDepotId: v.depotId, toDepotId: depot.id, status: v.status } },
        tx as any,
      );
      return tx.vehicle.findUniqueOrThrow({ where: { id }, include: VEHICLE_INCLUDE });
    });
    return (await this.enrich([updated], true))[0];
  }

  /** Galpão para cadastrar/transferir motos: inexistente → 404; inativo → 422 `depot-inactive`. */
  private async activeDepot(depotId: string) {
    const d = await this.prisma.depot.findUnique({ where: { id: depotId }, select: { id: true, lat: true, lng: true, active: true } });
    if (!d) throw notFound('Galpão não encontrado.');
    if (!d.active) throw unprocessable('depot-inactive', 'Este galpão está desativado; escolha outro galpão.');
    return d;
  }

  private emitStockDecrease(moves: MovementInput[]): void {
    const depotIds = depotsLeavingCharged(moves);
    if (depotIds.length) this.events.emit(EV.BATTERY_CHARGED_STOCK_DECREASED, { depotIds } satisfies BatteryChargedStockDecreasedEvent);
  }

  private async modelName(vehicleModelId: string): Promise<string> {
    const m = await this.prisma.vehicleModel.findUnique({ where: { id: vehicleModelId }, select: { name: true } });
    if (!m) throw notFound('Modelo não encontrado.');
    return m.name;
  }

  async get(user: Principal, id: string) {
    const row = await this.prisma.vehicle.findUnique({ where: { id }, include: VEHICLE_INCLUDE });
    if (!row) throw notFound('Moto não encontrada.');
    const [v] = await withLiveState(this.redis, [row]);
    const rental = isStaff(user) ? await this.currentRentalId(id) : undefined;
    return (await this.enrich([v], isStaff(user), rental ? new Map([[id, rental]]) : undefined, user.customerId))[0];
  }

  async update(actor: Principal, id: string, dto: VehicleUpdateDto) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v) throw notFound('Moto não encontrada.');
    if (dto.thingName && dto.thingName !== v.thingName) {
      const dup = await this.prisma.vehicle.findUnique({ where: { thingName: dto.thingName } });
      if (dup) throw conflict('conflict', 'Este rastreador já está vinculado a outra moto.');
    }
    const modelName = dto.vehicleModelId ? await this.modelName(dto.vehicleModelId) : undefined;
    const corrected = dto.odometerKm !== undefined || dto.usageHours !== undefined;
    const correction = corrected ? { previousOdometerKm: v.odometerKm, previousUsageHours: v.usageHours } : {};
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.vehicle.update({ where: { id }, data: { ...dto, ...(modelName ? { model: modelName } : {}) }, include: VEHICLE_INCLUDE });
      await this.audit.record({ actor, action: 'vehicle.update', entityType: 'Vehicle', entityId: id, metadata: { ...dto, ...correction } }, tx as any);
      return u;
    });
    // Correção manual do odômetro/horas: descarta o acumulado da telemetria ainda não gravado.
    if (corrected) await this.usage.reset(id);
    const rental = await this.currentRentalId(id);
    return (await this.enrich([updated], true, rental ? new Map([[id, rental]]) : undefined))[0];
  }

  /** Só entre `free` e `maintenance`, sem aluguel ou reserva ativa. */
  async setStatus(actor: Principal, id: string, dto: VehicleStatusChangeDto) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v) throw notFound('Moto não encontrada.');
    if (v.status !== 'free' && v.status !== 'maintenance') throw conflict('vehicle-unavailable', `A moto está ${v.status}; só é possível alternar entre livre e manutenção.`);
    const [rental, reservation] = await Promise.all([
      this.prisma.rental.findFirst({ where: { vehicleId: id, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } }),
      this.prisma.reservation.findFirst({ where: { vehicleId: id, status: 'active' }, select: { id: true } }),
    ]);
    if (rental || reservation) throw conflict('vehicle-unavailable', 'A moto tem aluguel ou reserva ativa.');
    // Revisão final item 6: moto com trava da equipe/sistema não volta à frota; quem travou libera antes.
    if (dto.status === 'free' && (await this.commands.isLockedByStaff(v))) throw conflict('vehicle-unavailable', VEHICLE_LOCKED_BACK_TO_FLEET);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.vehicle.update({ where: { id }, data: { status: dto.status }, include: VEHICLE_INCLUDE });
      await this.audit.record({ actor, action: 'vehicle.status', entityType: 'Vehicle', entityId: id, reason: dto.reason, metadata: { from: v.status, to: dto.status } }, tx as any);
      return u;
    });
    this.emitStatus(id, dto.status);
    return (await this.enrich([updated], true))[0];
  }

  async track(id: string, fromIso: string, toIso: string) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (!(from < to)) throw badRequest('`from` precisa ser anterior a `to`.', [{ field: 'from', message: 'deve ser anterior a to' }]);
    if (to.getTime() - from.getTime() > TRACK_MAX_WINDOW_MS) throw badRequest('Janela máxima de 7 dias.', [{ field: 'to', message: 'janela máxima de 7 dias' }]);
    const v = await this.prisma.vehicle.findUnique({ where: { id }, select: { id: true } });
    if (!v) throw notFound('Moto não encontrada.');
    const points = await this.prisma.trackPoint.findMany({
      where: { vehicleId: id, recordedAt: { gte: from, lt: to }, expiresAt: { gt: new Date() } },
      orderBy: { recordedAt: 'asc' },
      take: 20000,
    });
    return { vehicleId: id, points: points.map((p) => ({ lat: p.lat, lng: p.lng, speedKmh: p.speedKmh, recordedAt: p.recordedAt.toISOString() })) };
  }

  /** Buzina para o cliente achar a moto: só a moto da própria reserva ou aluguel. */
  async ring(user: Principal, id: string) {
    const customerId = user.customerId!;
    const [reservation, rental] = await Promise.all([
      this.prisma.reservation.findFirst({ where: { vehicleId: id, customerId, status: 'active', expiresAt: { gt: new Date() } }, select: { id: true } }),
      this.prisma.rental.findFirst({ where: { vehicleId: id, customerId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } }),
    ]);
    const exists = await this.prisma.vehicle.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw notFound('Moto não encontrada.');
    if (!reservation && !rental) throw forbidden('Só é possível buzinar a moto da sua reserva ou aluguel.');
    return this.commands.dispatch({ vehicleId: id, type: 'horn', reason: 'Cliente procurando a moto', actor: user, context: { rentalId: rental?.id, purpose: 'customer_ring' } });
  }

  /** Destravar em modo serviço (operador de campo), sem aluguel. */
  async serviceUnlock(actor: Principal, id: string, reason: string, fieldTaskId?: string) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v) throw notFound('Moto não encontrada.');
    // Auditoria item 5: `offline` esconde o aluguel/reserva no status; a regra consulta Rental/Reservation.
    if (['rented', 'paused', 'reserved'].includes(v.status)) throw conflict('vehicle-unavailable', 'A moto está em uso por um cliente.');
    await assertVehicleNotInUse(this.prisma, id);
    if (fieldTaskId) {
      const task = await this.prisma.fieldTask.findUnique({ where: { id: fieldTaskId }, select: { id: true, vehicleId: true, assigneeId: true } });
      if (!task) throw notFound('Tarefa não encontrada.');
      if (task.vehicleId !== id) throw conflict('conflict', 'A tarefa informada não é desta moto.');
      assertTaskActor(actor, task);
    }
    return this.commands.dispatch({ vehicleId: id, type: 'unlock', reason, actor, context: { fieldTaskId, purpose: 'service_unlock' }, auditAction: 'vehicle.service_unlock' });
  }

  // ── consumidores de eventos (Task 4 emite) ──

  /** Estado ao vivo no Redis a cada telemetria; Postgres no máximo a cada 30 s por moto. */
  @OnEvent(EV.IOT_TELEMETRY, { async: true, promisify: true })
  async onTelemetry(ev: IotTelemetryEvent): Promise<void> {
    // Contrato v2: odômetro e horas de uso acumulados pela telemetria (gravados junto com a posição, a cada 30 s).
    await this.usage.record(ev);
    await this.redis.hset(`vehicle:live:${ev.vehicleId}`, {
      lat: String(ev.lat), lng: String(ev.lng), speedKmh: String(ev.speedKmh), batteryPct: String(ev.batteryPct),
      locked: String(ev.locked), ignition: String(ev.ignition), signal: String(ev.signal), ts: ev.ts,
    });
    const last = this.lastDbWrite.get(ev.vehicleId) ?? 0;
    if (Date.now() - last < DB_WRITE_INTERVAL_MS) return;
    this.lastDbWrite.set(ev.vehicleId, Date.now());
    const pending = await this.usage.take(ev.vehicleId);
    await this.prisma.vehicle.updateMany({
      where: { id: ev.vehicleId },
      data: {
        lat: ev.lat, lng: ev.lng, speedKmh: ev.speedKmh, batteryPct: Math.round(ev.batteryPct), locked: ev.locked, ignition: ev.ignition, signal: ev.signal,
        lastSeenAt: new Date(ev.ts), online: true,
        ...(pending.km > 0 ? { odometerKm: { increment: pending.km } } : {}),
        ...(pending.hours > 0 ? { usageHours: { increment: pending.hours } } : {}),
      },
    });
    // Carga da bateria instalada acompanha a telemetria.
    await this.prisma.battery.updateMany({ where: { vehicleId: ev.vehicleId, status: 'in_vehicle' }, data: { chargePct: Math.max(0, Math.min(100, Math.round(ev.batteryPct))) } });
  }

  /** Rastreador offline → status `offline` (guarda o anterior); online → restaura. */
  @OnEvent(EV.IOT_CONNECTIVITY, { async: true, promisify: true })
  async onConnectivity(ev: IotConnectivityEvent): Promise<void> {
    const v = await this.prisma.vehicle.findUnique({ where: { id: ev.vehicleId } });
    if (!v) return;
    if (!ev.online && v.status !== 'offline') {
      await this.prisma.vehicle.update({ where: { id: v.id }, data: { online: false, statusBeforeOffline: v.status, status: 'offline', lastSeenAt: new Date(ev.ts) } });
      this.emitStatus(v.id, 'offline');
    } else if (ev.online && v.status === 'offline') {
      const restored = await this.restoredStatus(v);
      await this.prisma.vehicle.update({ where: { id: v.id }, data: { online: true, status: restored, statusBeforeOffline: null, lastSeenAt: new Date(ev.ts) } });
      this.emitStatus(v.id, restored);
    } else if (ev.online !== v.online) {
      await this.prisma.vehicle.update({ where: { id: v.id }, data: { online: ev.online } });
    }
  }

  private async restoredStatus(v: Vehicle): Promise<VehicleStatus> {
    const rental = await this.prisma.rental.findFirst({ where: { vehicleId: v.id, status: { in: OPEN_RENTAL_STATUSES } }, select: { status: true } });
    if (rental) return rental.status === 'paused' ? 'paused' : 'rented';
    const reservation = await this.prisma.reservation.findFirst({ where: { vehicleId: v.id, status: 'active' }, select: { id: true } });
    if (reservation) return 'reserved';
    const prev = v.statusBeforeOffline;
    // Retirada em galpão: moto devolvida em ponto verde continua esperando recolhimento.
    return prev === 'maintenance' || prev === 'blocked' || prev === 'awaiting_pickup' ? prev : 'free';
  }

  private emitStatus(vehicleId: string, status: VehicleStatus): void {
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId, status, ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
  }
}
