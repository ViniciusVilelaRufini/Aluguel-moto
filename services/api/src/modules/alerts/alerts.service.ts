import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Alert, AlertPriority, AlertType, Prisma, StaffUser, Vehicle } from '@prisma/client';
import { AlertCreatedEvent, EV } from '../../common/events';
import { PageQuery, pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound } from '../../common/problem';
import { compact, iso } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
import { hasGroup, type Principal } from '../auth/principal';
import { isUniqueViolation } from '../payments/payment-state.service';

/** Alertas financeiros: vistos por `admin`, `suporte` e `financeiro`; nunca por quem é só `operacao`. */
export const FINANCIAL_ALERT_TYPES: readonly AlertType[] = ['payment_needs_review'];

/**
 * Filtro por perfil (Task 14): `admin`/`suporte` veem tudo; `operacao` vê os operacionais; `financeiro` só os financeiros.
 * `null` = sem filtro. Perfis combinados somam o que cada um vê.
 */
export function alertScope(user: Principal | undefined): Prisma.AlertWhereInput | null {
  if (!user || hasGroup(user, 'admin', 'suporte')) return null;
  const ops = hasGroup(user, 'operacao');
  const fin = hasGroup(user, 'financeiro');
  if (ops && fin) return null;
  if (fin) return { type: { in: [...FINANCIAL_ALERT_TYPES] } };
  return { type: { notIn: [...FINANCIAL_ALERT_TYPES] } };
}

export interface CreateAlertInput {
  type: AlertType;
  priority: AlertPriority;
  message: string;
  vehicleId?: string;
  rentalId?: string;
  /** Galpão do alerta (`battery_stock_low`). */
  depotId?: string;
  /** Pagamento do alerta (`payment_needs_review`; um aberto por pagamento). */
  paymentId?: string;
  lat?: number;
  lng?: number;
}

type AlertRow = Alert & { vehicle?: Pick<Vehicle, 'code'> | null; assignee?: Pick<StaffUser, 'name'> | null };

export function toAlert(a: AlertRow) {
  return compact({
    id: a.id,
    type: a.type,
    priority: a.priority,
    status: a.status,
    vehicleId: a.vehicleId ?? undefined,
    vehicleCode: a.vehicle?.code,
    rentalId: a.rentalId ?? undefined,
    depotId: a.depotId ?? undefined,
    paymentId: a.paymentId ?? undefined,
    message: a.message,
    lat: a.lat ?? undefined,
    lng: a.lng ?? undefined,
    assigneeId: a.assigneeId ?? undefined,
    assigneeName: a.assignee?.name,
    resolution: a.resolution ?? undefined,
    createdAt: a.createdAt.toISOString(),
    assignedAt: iso(a.assignedAt),
    resolvedAt: iso(a.resolvedAt),
  });
}

const PRIORITY_RANK: Record<AlertPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export interface ListAlertsFilter extends PageQuery {
  status?: Alert['status'];
  priority?: AlertPriority;
  type?: AlertType;
  vehicleId?: string;
  assigneeId?: string;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger('AlertsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Cria o alerta e publica `alert.created` (sala `fleet`). Deduplica alerta aberto igual nos últimos 10 min. */
  async create(input: CreateAlertInput, opts: { dedupe?: boolean } = { dedupe: true }): Promise<Alert> {
    if (opts.dedupe !== false && input.vehicleId) {
      const recent = await this.prisma.alert.findFirst({
        where: { type: input.type, vehicleId: input.vehicleId, status: { not: 'resolved' }, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
      });
      if (recent) return recent;
    }
    // Um alerta aberto por pagamento (índice parcial `Alert_one_open_per_payment`): repetição devolve o existente.
    if (input.paymentId) {
      const open = await this.prisma.alert.findFirst({ where: { paymentId: input.paymentId, status: { not: 'resolved' } } });
      if (open) return open;
    }
    let alert: Alert;
    try {
      alert = await this.prisma.alert.create({ data: { ...input } });
    } catch (err) {
      if (!input.paymentId || !isUniqueViolation(err)) throw err;
      return (await this.prisma.alert.findFirst({ where: { paymentId: input.paymentId, status: { not: 'resolved' } } }))!;
    }
    const ev: AlertCreatedEvent = {
      alertId: alert.id,
      vehicleId: alert.vehicleId ?? undefined,
      rentalId: alert.rentalId ?? undefined,
      type: alert.type,
      priority: alert.priority,
      createdAt: alert.createdAt.toISOString(),
    };
    this.events.emit(EV.ALERT_CREATED, ev);
    this.logger.log({ msg: 'alert_created', alertId: alert.id, type: alert.type, priority: alert.priority });
    return alert;
  }

  private async withRelations(rows: Alert[]): Promise<AlertRow[]> {
    const vehicleIds = [...new Set(rows.map((r) => r.vehicleId).filter((x): x is string => !!x))];
    const staffIds = [...new Set(rows.map((r) => r.assigneeId).filter((x): x is string => !!x))];
    const [vehicles, staff] = await Promise.all([
      vehicleIds.length ? this.prisma.vehicle.findMany({ where: { id: { in: vehicleIds } }, select: { id: true, code: true } }) : [],
      staffIds.length ? this.prisma.staffUser.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } }) : [],
    ]);
    const vMap = new Map(vehicles.map((v) => [v.id, v]));
    const sMap = new Map(staff.map((s) => [s.id, s]));
    return rows.map((r) => ({ ...r, vehicle: r.vehicleId ? vMap.get(r.vehicleId) : null, assignee: r.assigneeId ? sMap.get(r.assigneeId) : null }));
  }

  /** Ordem: prioridade (critical primeiro), depois criação mais recente. */
  async list(q: ListAlertsFilter, user?: Principal) {
    const where: Prisma.AlertWhereInput = { ...(alertScope(user) ?? {}) };
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.type) where.AND = [{ type: q.type }];
    if (q.vehicleId) where.vehicleId = q.vehicleId;
    if (q.assigneeId) where.assigneeId = q.assigneeId;
    // Enum `AlertPriority` está em ordem low→critical no banco: desc = critical primeiro.
    const rows = await this.prisma.alert.findMany({ where, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    const enriched = await this.withRelations(rows);
    enriched.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt.getTime() - a.createdAt.getTime());
    return toPage(enriched, q, toAlert);
  }

  /** Alerta visível para o perfil (fora do escopo = 404, sem revelar que existe). */
  private async visible(id: string, user?: Principal): Promise<Alert> {
    const scope = alertScope(user);
    const a = await this.prisma.alert.findFirst({ where: scope ? { AND: [{ id }, scope] } : { id } });
    if (!a) throw notFound('Alerta não encontrado.');
    return a;
  }

  async get(id: string, user?: Principal) {
    const a = await this.visible(id, user);
    return toAlert((await this.withRelations([a]))[0]);
  }

  async assign(id: string, assigneeId: string, actor: Principal) {
    const a = await this.visible(id, actor);
    if (a.status === 'resolved') throw conflict('conflict', 'Alerta já resolvido.');
    const staff = await this.prisma.staffUser.findUnique({ where: { id: assigneeId } });
    if (!staff || !staff.active) throw notFound('Responsável não encontrado.');
    const updated = await this.prisma.alert.update({ where: { id }, data: { assigneeId, status: 'assigned', assignedAt: new Date() } });
    return toAlert((await this.withRelations([updated]))[0]);
  }

  async resolve(id: string, resolution: string, actor: Principal) {
    const a = await this.visible(id, actor);
    if (a.status === 'resolved') throw conflict('conflict', 'Alerta já resolvido.');
    const updated = await this.prisma.alert.update({ where: { id }, data: { status: 'resolved', resolution, resolvedAt: new Date() } });
    return toAlert((await this.withRelations([updated]))[0]);
  }
}
