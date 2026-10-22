import { withLiveState } from './live-overlay';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Prisma, type Vehicle } from '@prisma/client';
import { OPEN_RENTAL_STATUSES, type VehicleStatus } from '../../common/enums';
import { EV, IotConnectivityEvent, IotTelemetryEvent, VehicleStatusChangedEvent } from '../../common/events';
import { pageArgs, toPage } from '../../common/pagination';
import { badRequest, conflict, forbidden, notFound } from '../../common/problem';
import { KM_PER_FULL_BATTERY } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_STORE, type RedisStore } from '../../redis/redis-store';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { CommandsService } from '../commands/commands.service';
import type { ListVehiclesQuery, NearbyQuery, VehicleCreateDto, VehicleStatusChangeDto, VehicleUpdateDto } from './vehicles.dto';
import { toVehicle, toVehicleSummary } from './vehicles.mapper';

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
  ) {}

  /** Motos `free` no raio (clientes) ou todas (staff), ordenadas por distância (PostGIS). */
  async nearby(user: Principal, q: NearbyQuery) {
    const radius = q.radiusM ?? 1000;
    const minBattery = q.minRangeKm ? Math.ceil((q.minRangeKm / KM_PER_FULL_BATTERY) * 100) : 0;
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography`;
    const statusFilter = isStaff(user) ? Prisma.empty : Prisma.sql`AND "status" = 'free'::"VehicleStatus"`;
    const rows = await this.prisma.$queryRaw<Array<Pick<Vehicle, 'id' | 'code' | 'model' | 'status' | 'lat' | 'lng' | 'batteryPct'> & { distance: number }>>`
      SELECT "id", "code", "model", "status", "lat", "lng", "batteryPct",
             ST_Distance(ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography, ${point}) AS "distance"
      FROM "Vehicle"
      WHERE ST_DWithin(ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography, ${point}, ${radius})
        AND "batteryPct" >= ${minBattery} ${statusFilter}
      ORDER BY "distance" ASC
      LIMIT 200`;
    return { items: rows.map((r) => toVehicleSummary(r, Number(r.distance))) };
  }

  private async currentRentalId(vehicleId: string): Promise<string | undefined> {
    const r = await this.prisma.rental.findFirst({ where: { vehicleId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
    return r?.id;
  }

  async byCode(user: Principal, code: string) {
    const normalized = parseVehicleCode(code);
    if (!normalized) throw notFound('Moto não encontrada.');
    const v = await this.prisma.vehicle.findUnique({ where: { code: normalized }, include: { tracker: { select: { id: true } } } });
    if (!v) throw notFound('Moto não encontrada.');
    return toVehicle(v, { staff: isStaff(user), currentRentalId: isStaff(user) ? await this.currentRentalId(v.id) : undefined });
  }

  async list(q: ListVehiclesQuery) {
    const where: Prisma.VehicleWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.maxBatteryPct !== undefined) where.batteryPct = { lte: q.maxBatteryPct };
    if (q.q) where.OR = [{ code: { contains: q.q, mode: 'insensitive' } }, { thingName: { contains: q.q, mode: 'insensitive' } }, { model: { contains: q.q, mode: 'insensitive' } }];
    const dbRows = await this.prisma.vehicle.findMany({ where, include: { tracker: { select: { id: true } } }, orderBy: [{ code: 'asc' }, { id: 'asc' }], ...pageArgs(q) });
    // QA-20: posição/telemetria ao vivo do Redis quando mais nova que o Postgres (gravado a cada 30 s).
    const rows = await withLiveState(this.redis, dbRows);
    const open = await this.prisma.rental.findMany({ where: { vehicleId: { in: rows.map((r) => r.id) }, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true, vehicleId: true } });
    const byVehicle = new Map(open.map((r) => [r.vehicleId, r.id]));
    return toPage(rows, q, (v) => toVehicle(v, { staff: true, currentRentalId: byVehicle.get(v.id) }));
  }

  async create(actor: Principal, dto: VehicleCreateDto) {
    const dup = await this.prisma.vehicle.findFirst({ where: { OR: [{ code: dto.code }, { thingName: dto.thingName }] } });
    if (dup) throw conflict('conflict', 'Já existe uma moto com este código ou rastreador.');
    const v = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vehicle.create({ data: { ...dto, qrCode: dto.qrCode ?? `volti://v/${dto.code}`, status: 'maintenance' } });
      await this.audit.record({ actor, action: 'vehicle.create', entityType: 'Vehicle', entityId: created.id, metadata: { code: dto.code } }, tx as any);
      return created;
    });
    return toVehicle(v, { staff: true });
  }

  async get(user: Principal, id: string) {
    const row = await this.prisma.vehicle.findUnique({ where: { id }, include: { tracker: { select: { id: true } } } });
    if (!row) throw notFound('Moto não encontrada.');
    const [v] = await withLiveState(this.redis, [row]);
    return toVehicle(v, { staff: isStaff(user), currentRentalId: isStaff(user) ? await this.currentRentalId(id) : undefined });
  }

  async update(actor: Principal, id: string, dto: VehicleUpdateDto) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v) throw notFound('Moto não encontrada.');
    if (dto.thingName && dto.thingName !== v.thingName) {
      const dup = await this.prisma.vehicle.findUnique({ where: { thingName: dto.thingName } });
      if (dup) throw conflict('conflict', 'Este rastreador já está vinculado a outra moto.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.vehicle.update({ where: { id }, data: { ...dto }, include: { tracker: { select: { id: true } } } });
      await this.audit.record({ actor, action: 'vehicle.update', entityType: 'Vehicle', entityId: id, metadata: { ...dto } }, tx as any);
      return u;
    });
    return toVehicle(updated, { staff: true, currentRentalId: await this.currentRentalId(id) });
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
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.vehicle.update({ where: { id }, data: { status: dto.status }, include: { tracker: { select: { id: true } } } });
      await this.audit.record({ actor, action: 'vehicle.status', entityType: 'Vehicle', entityId: id, reason: dto.reason, metadata: { from: v.status, to: dto.status } }, tx as any);
      return u;
    });
    this.emitStatus(id, dto.status);
    return toVehicle(updated, { staff: true });
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
    if (['rented', 'paused', 'reserved'].includes(v.status)) throw conflict('vehicle-unavailable', 'A moto está em uso por um cliente.');
    if (fieldTaskId) {
      const task = await this.prisma.fieldTask.findUnique({ where: { id: fieldTaskId }, select: { id: true } });
      if (!task) throw notFound('Tarefa não encontrada.');
    }
    return this.commands.dispatch({ vehicleId: id, type: 'unlock', reason, actor, context: { fieldTaskId, purpose: 'service_unlock' }, auditAction: 'vehicle.service_unlock' });
  }

  // ── consumidores de eventos (Task 4 emite) ──

  /** Estado ao vivo no Redis a cada telemetria; Postgres no máximo a cada 30 s por moto. */
  @OnEvent(EV.IOT_TELEMETRY, { async: true, promisify: true })
  async onTelemetry(ev: IotTelemetryEvent): Promise<void> {
    await this.redis.hset(`vehicle:live:${ev.vehicleId}`, {
      lat: String(ev.lat), lng: String(ev.lng), speedKmh: String(ev.speedKmh), batteryPct: String(ev.batteryPct),
      locked: String(ev.locked), ignition: String(ev.ignition), signal: String(ev.signal), ts: ev.ts,
    });
    const last = this.lastDbWrite.get(ev.vehicleId) ?? 0;
    if (Date.now() - last < DB_WRITE_INTERVAL_MS) return;
    this.lastDbWrite.set(ev.vehicleId, Date.now());
    await this.prisma.vehicle.updateMany({
      where: { id: ev.vehicleId },
      data: { lat: ev.lat, lng: ev.lng, speedKmh: ev.speedKmh, batteryPct: Math.round(ev.batteryPct), locked: ev.locked, ignition: ev.ignition, signal: ev.signal, lastSeenAt: new Date(ev.ts), online: true },
    });
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
    return prev === 'maintenance' || prev === 'blocked' ? prev : 'free';
  }

  private emitStatus(vehicleId: string, status: VehicleStatus): void {
    this.events.emit(EV.VEHICLE_STATUS_CHANGED, { vehicleId, status, ts: new Date().toISOString() } satisfies VehicleStatusChangedEvent);
  }
}
