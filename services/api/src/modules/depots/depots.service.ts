import { Injectable } from '@nestjs/common';
import { Prisma, type Depot } from '@prisma/client';
import { currentSubscriptionWhere } from '../../common/fixed-vehicle';
import type { VehicleStatus } from '../../common/enums';
import { badRequest, conflict, notFound, unprocessable, type ValidationIssue } from '../../common/problem';
import { distanceM } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { VEHICLE_MODEL_SELECT } from '../catalog/catalog.service';
import { toVehicle } from '../vehicles/vehicles.mapper';
import { localDayBounds } from './depot-rules';
import { HHMM, type DepotInputDto, type DepotUpdateDto, type ReservationStatusValue } from './depots.dto';
import { toDepot, toDepotPickup, type DepotPickupRow } from './depots.mapper';

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Valida o horário (também checado no DTO): HH:MM, `opensAt < closesAt`, weekday 0..6, um intervalo por dia. */
export function openingHoursIssues(hours: unknown): ValidationIssue[] {
  if (!Array.isArray(hours)) return [{ field: 'openingHours', message: 'openingHours deve ser uma lista' }];
  const issues: ValidationIssue[] = [];
  if (hours.length > 7) issues.push({ field: 'openingHours', message: 'no máximo 7 dias' });
  const seen = new Set<number>();
  hours.forEach((h: { weekday?: unknown; opensAt?: unknown; closesAt?: unknown }, i) => {
    const f = `openingHours.${i}`;
    if (!Number.isInteger(h?.weekday) || (h.weekday as number) < 0 || (h.weekday as number) > 6) {
      issues.push({ field: `${f}.weekday`, message: 'weekday deve ser um inteiro de 0 (domingo) a 6 (sábado)' });
    } else if (seen.has(h.weekday as number)) {
      issues.push({ field: `${f}.weekday`, message: 'no máximo um intervalo por dia da semana' });
    } else {
      seen.add(h.weekday as number);
    }
    const okOpen = typeof h?.opensAt === 'string' && HHMM.test(h.opensAt);
    const okClose = typeof h?.closesAt === 'string' && HHMM.test(h.closesAt);
    if (!okOpen) issues.push({ field: `${f}.opensAt`, message: 'opensAt deve estar no formato HH:MM' });
    if (!okClose) issues.push({ field: `${f}.closesAt`, message: 'closesAt deve estar no formato HH:MM' });
    if (okOpen && okClose && toMinutes(h.opensAt as string) >= toMinutes(h.closesAt as string)) {
      issues.push({ field: `${f}.opensAt`, message: 'opensAt deve ser anterior a closesAt' });
    }
  });
  return issues;
}

/** `YYYY-MM-DD` que existe no calendário (ida e volta pelo `Date`: 2026-02-31 não passa). */
export function isRealDate(day: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === day;
}

const DUPLICATE_NAME = 'Já existe um galpão com este nome.';

/** Corrida no nome único (`P2002`) → `409` com a mesma mensagem da checagem prévia. */
function mapUniqueName(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw conflict('conflict', DUPLICATE_NAME);
  throw err;
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export interface ListDepotsParams {
  lat?: number;
  lng?: number;
  includeInactive?: boolean;
}
export interface DepotVehiclesParams {
  status?: VehicleStatus;
  vehicleModelId?: string;
}
export interface DepotPickupsParams {
  date: string;
  status?: ReservationStatusValue;
}

/** Galpões: cadastro, motos do galpão e agenda de retiradas (retirada em galpão, 2026-10-22). */
@Injectable()
export class DepotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Motos fixas de assinaturas vigentes (de qualquer cliente ou, com `exceptCustomerId`, só dos outros). */
  private async fixedVehicleIds(opts: { among?: string[]; exceptCustomerId?: string } = {}): Promise<string[]> {
    const rows = await this.prisma.subscription.findMany({
      where: {
        assignedVehicleId: opts.among ? { in: opts.among } : { not: null },
        ...currentSubscriptionWhere(),
        ...(opts.exceptCustomerId ? { customerId: { not: opts.exceptCustomerId } } : {}),
      },
      select: { assignedVehicleId: true },
    });
    return rows.map((r) => r.assignedVehicleId as string);
  }

  /** `availableVehicleCount`: motos `free` do galpão sem nenhuma moto fixa vigente, de qualquer cliente (decisoes.md). */
  private async freeCounts(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const fixed = await this.fixedVehicleIds();
    const where: Prisma.VehicleWhereInput = { status: 'free', depotId: { in: ids }, ...(fixed.length ? { id: { notIn: fixed } } : {}) };
    const rows = await this.prisma.vehicle.groupBy({ by: ['depotId'], where, _count: { _all: true } });
    return new Map(rows.map((r) => [r.depotId as string, r._count._all]));
  }

  private async withCount(d: Depot, staff: boolean) {
    const counts = await this.freeCounts([d.id]);
    return toDepot(d, { availableVehicleCount: counts.get(d.id) ?? 0, staff });
  }

  /** Galpão visível para o principal: cliente só vê ativo (inativo → 404). */
  private async findVisible(id: string, principal: Principal): Promise<Depot> {
    const d = await this.prisma.depot.findUnique({ where: { id } });
    if (!d || (!d.active && !isStaff(principal))) throw notFound('Galpão não encontrado.');
    return d;
  }

  private async validate(dto: DepotUpdateDto, currentName?: string): Promise<void> {
    const issues: ValidationIssue[] = [];
    if (dto.openingHours !== undefined) issues.push(...openingHoursIssues(dto.openingHours));
    if (dto.timezone !== undefined && !isValidTimezone(dto.timezone)) issues.push({ field: 'timezone', message: 'fuso horário IANA inválido' });
    if (dto.clearSwapStation && dto.swapStationId) issues.push({ field: 'clearSwapStation', message: 'não combine clearSwapStation com swapStationId' });
    if (issues.length) throw badRequest('Verifique os campos informados.', issues);
    if (dto.swapStationId && !(await this.prisma.swapStation.findUnique({ where: { id: dto.swapStationId }, select: { id: true } }))) {
      throw badRequest('Estação de troca não encontrada.', [{ field: 'swapStationId', message: 'estação de troca não encontrada' }]);
    }
    if (dto.name !== undefined && dto.name !== currentName && (await this.prisma.depot.findUnique({ where: { name: dto.name }, select: { id: true } }))) {
      throw conflict('conflict', DUPLICATE_NAME);
    }
  }

  async list(principal: Principal, q: ListDepotsParams) {
    const staff = isStaff(principal);
    const rows = await this.prisma.depot.findMany({ where: staff && q.includeInactive ? {} : { active: true }, orderBy: { name: 'asc' } });
    const counts = await this.freeCounts(rows.map((d) => d.id));
    const count = (d: Depot) => counts.get(d.id) ?? 0;
    if (q.lat === undefined || q.lng === undefined) return { items: rows.map((d) => toDepot(d, { availableVehicleCount: count(d), staff })) };
    const origin = { lat: q.lat, lng: q.lng };
    const items = rows
      .map((d) => ({ d, m: distanceM(origin, d) }))
      .sort((a, b) => a.m - b.m)
      .map(({ d, m }) => toDepot(d, { availableVehicleCount: count(d), distanceM: m, staff }));
    return { items };
  }

  async get(id: string, principal: Principal) {
    return this.withCount(await this.findVisible(id, principal), isStaff(principal));
  }

  /** Galpão ativo para reservar (Task 5): inexistente → 404; inativo → 422 `depot-inactive`. */
  async requireActive(id: string): Promise<Depot> {
    const d = await this.prisma.depot.findUnique({ where: { id } });
    if (!d) throw notFound('Galpão não encontrado.');
    if (!d.active) throw unprocessable('depot-inactive', 'Este galpão não está recebendo retiradas no momento.');
    return d;
  }

  async create(actor: Principal, dto: DepotInputDto) {
    await this.validate(dto);
    const d = await this.prisma.$transaction(async (tx) => {
      const created = await tx.depot.create({ data: { ...dto, openingHours: dto.openingHours as unknown as Prisma.InputJsonValue } });
      await this.audit.record({ actor, action: 'depot.create', entityType: 'Depot', entityId: created.id, metadata: { name: created.name } }, tx as any);
      return created;
    }).catch(mapUniqueName);
    return toDepot(d, { availableVehicleCount: 0, staff: true });
  }

  async update(actor: Principal, id: string, dto: DepotUpdateDto) {
    const current = await this.prisma.depot.findUnique({ where: { id } });
    if (!current) throw notFound('Galpão não encontrado.');
    await this.validate(dto, current.name);
    const d = await this.prisma.$transaction(async (tx) => {
      const { openingHours, clearSwapStation, ...fields } = dto;
      const updated = await tx.depot.update({
        where: { id },
        data: {
          ...fields,
          ...(openingHours !== undefined ? { openingHours: openingHours as unknown as Prisma.InputJsonValue } : {}),
          ...(clearSwapStation ? { swapStationId: null } : {}),
        },
      });
      await this.audit.record(
        { actor, action: 'depot.update', entityType: 'Depot', entityId: id, metadata: { fields: Object.keys(dto), ...(dto.active !== undefined ? { active: dto.active } : {}) } },
        tx as any,
      );
      return updated;
    }).catch(mapUniqueName);
    return this.withCount(d, true);
  }

  /** Cliente: só `free` com este `depotId` (nunca `reserved`/`awaiting_pickup`), bateria desc. Staff: todas, com filtros. */
  async vehicles(id: string, principal: Principal, q: DepotVehiclesParams) {
    await this.findVisible(id, principal);
    const staff = isStaff(principal);
    const where: Prisma.VehicleWhereInput = staff
      ? { depotId: id, ...(q.status ? { status: q.status } : {}) }
      : { depotId: id, status: 'free' };
    if (q.vehicleModelId) where.vehicleModelId = q.vehicleModelId;
    const rows = await this.prisma.vehicle.findMany({
      where,
      orderBy: [{ batteryPct: 'desc' }, { code: 'asc' }],
      include: { vehicleModel: { select: VEHICLE_MODEL_SELECT }, ...(staff ? { tracker: { select: { id: true, controlMode: true } } } : {}) },
    });
    if (staff) return { items: rows.map((v) => toVehicle(v as any, { staff })) };
    // Moto fixa da assinatura vigente de outro cliente some; a do próprio cliente continua visível.
    const exceptCustomerId = principal.customerId ?? principal.userId;
    const fixed = new Set(rows.length ? await this.fixedVehicleIds({ among: rows.map((v) => v.id), exceptCustomerId }) : []);
    // Defesa em profundidade: o cliente nunca recebe moto de outro galpão nem fora de `free`.
    const visible = rows.filter((v) => v.status === 'free' && v.depotId === id && !fixed.has(v.id));
    return { items: visible.map((v) => toVehicle(v as any, { staff })) };
  }

  /** Agenda do dia (fuso do galpão): todas as reservas do galpão, em qualquer status, em ordem de horário. */
  async pickups(id: string, q: DepotPickupsParams) {
    if (!isRealDate(q.date)) throw badRequest('Data inválida.', [{ field: 'date', message: 'date deve ser uma data real no formato YYYY-MM-DD' }]);
    const d = await this.prisma.depot.findUnique({ where: { id } });
    if (!d) throw notFound('Galpão não encontrado.');
    const { start, end } = localDayBounds(d.timezone, q.date);
    const range = { gte: start, lt: end };
    const rows = (await this.prisma.reservation.findMany({
      where: {
        depotId: id,
        ...(q.status ? { status: q.status } : {}),
        OR: [{ pickupMode: 'scheduled', pickupAt: range }, { pickupMode: 'now', createdAt: range }],
      },
      include: {
        customer: { select: { name: true } },
        vehicle: true,
        handovers: { where: { type: 'pickup', status: { in: ['pending_customer', 'accepted'] } }, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })) as unknown as DepotPickupRow[];
    const at = (r: DepotPickupRow) => (r.pickupMode === 'scheduled' && r.pickupAt ? r.pickupAt : r.createdAt).getTime();
    const items = [...rows].sort((a, b) => at(a) - at(b) || a.id.localeCompare(b.id)).map(toDepotPickup);
    return { date: q.date, items };
  }
}

