import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../../common/problem';
import { iso } from '../../common/util';
import { V2_CONFIG, type V2Config } from '../../config/v2-config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { VEHICLE_MODEL_SELECT } from '../catalog/catalog.service';
import { vehicleServiceInfo } from '../vehicles/vehicles.mapper';
import { generateSlots, isValidSlotStart } from './maintenance-slots';
import { compareServiceRows, publicServiceInfo, type VehicleServiceStatus } from './service-due';

/** Conflito de serialização do Postgres/Prisma (P2034 ou SQLSTATE 40001). */
export const isSerializationFailure = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError ? err.code === 'P2034' : /40001|could not serialize/i.test(String((err as Error)?.message ?? ''));

const OPEN_MAINTENANCE = ['scheduled', 'in_progress'] as const;

/** Cursor opaco por posição (a tabela é ordenada por urgência, não por id). */
const encodeOffset = (n: number) => Buffer.from(`o:${n}`, 'utf8').toString('base64url');
function decodeOffset(cursor?: string): number {
  if (!cursor) return 0;
  const m = /^o:(\d{1,7})$/.exec(Buffer.from(cursor, 'base64url').toString('utf8'));
  if (!m) throw badRequest('Cursor inválido.', [{ field: 'cursor', message: 'cursor inválido' }]);
  return Number(m[1]);
}

type RequestRow = { id: string; vehicleId: string; status: string; scheduledFor: Date | null; description: string | null; title: string; createdAt: Date; vehicle?: { code: string } | null };

/**
 * Contrato v2: tabela "Manutenção" (preventiva por km/horas) do painel e agendamento de manutenção pelo cliente do plano
 * semanal/mensal (moto fixa).
 */
@Injectable()
export class MaintenanceV2Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(V2_CONFIG) private readonly v2: V2Config,
  ) {}

  // ── painel ──

  async serviceTable(q: { cursor?: string; limit?: number; status?: VehicleServiceStatus; q?: string }) {
    const where: Prisma.VehicleWhereInput = q.q ? { code: { contains: q.q, mode: 'insensitive' } } : {};
    const vehicles = await this.prisma.vehicle.findMany({ where, include: { vehicleModel: { select: VEHICLE_MODEL_SELECT } } });
    const open = await this.prisma.maintenanceTask.findMany({
      where: { vehicleId: { in: vehicles.map((v) => v.id) }, kind: 'preventive', status: { in: [...OPEN_MAINTENANCE] } },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, vehicleId: true, scheduledFor: true },
    });
    const openBy = new Map<string, { id: string; scheduledFor: Date | null }>();
    for (const m of open) if (!openBy.has(m.vehicleId)) openBy.set(m.vehicleId, m);
    const defaults = { km: this.v2.defaultServiceIntervalKm, hours: this.v2.defaultServiceIntervalHours };
    const rows = vehicles
      .map((v) => ({ v, code: v.code, service: vehicleServiceInfo(v, defaults) }))
      .filter((r) => !q.status || r.service.status === q.status)
      .sort(compareServiceRows);
    const offset = decodeOffset(q.cursor);
    const limit = q.limit ?? 20;
    const slice = rows.slice(offset, offset + limit);
    return {
      items: slice.map(({ v, service }) => {
        const m = openBy.get(v.id);
        return {
          vehicleId: v.id,
          vehicleCode: v.code,
          model: v.model,
          vehicleStatus: v.status,
          service: publicServiceInfo(service),
          ...(m ? { openMaintenanceTaskId: m.id, ...(m.scheduledFor ? { scheduledFor: m.scheduledFor.toISOString() } : {}) } : {}),
        };
      }),
      ...(offset + limit < rows.length ? { nextCursor: encodeOffset(offset + limit) } : {}),
    };
  }

  /** Manutenção preventiva concluída = revisão: zera km/horas desde a revisão da moto. */
  async recordService(vehicleId: string, at: Date, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    const v = await tx.vehicle.findUnique({ where: { id: vehicleId }, select: { odometerKm: true, usageHours: true } });
    if (!v) return;
    await tx.vehicle.update({ where: { id: vehicleId }, data: { lastServiceAt: at, lastServiceOdometerKm: v.odometerKm, lastServiceUsageHours: v.usageHours } });
  }

  // ── cliente ──

  /** Assinatura semanal/mensal aberta; `403 subscription-required` sem ela. */
  private async subscriptionOf(customerId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { customerId, status: { in: ['active', 'paused'] }, currentPeriodEnd: { gt: new Date() } } });
    if (!sub) throw forbidden('A manutenção agendada é para quem tem o plano semanal ou mensal.', 'subscription-required');
    return sub;
  }

  private async slotCounts(from: Date, to: Date): Promise<Map<number, number>> {
    const rows = await this.prisma.maintenanceTask.findMany({
      where: { source: 'customer', status: { in: [...OPEN_MAINTENANCE] }, scheduledFor: { gte: from, lt: to } },
      select: { scheduledFor: true },
    });
    const m = new Map<number, number>();
    for (const r of rows) if (r.scheduledFor) m.set(r.scheduledFor.getTime(), (m.get(r.scheduledFor.getTime()) ?? 0) + 1);
    return m;
  }

  async slots(customerId: string, days: number) {
    await this.subscriptionOf(customerId);
    const now = new Date();
    const slots = generateSlots(now, days);
    const counts = slots.length ? await this.slotCounts(slots[0].startsAt, slots[slots.length - 1].endsAt) : new Map<number, number>();
    return {
      location: this.v2.maintenanceLocation,
      items: slots.map((s) => ({
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        available: (counts.get(s.startsAt.getTime()) ?? 0) < this.v2.maintenanceSlotCapacity,
      })),
    };
  }

  private toRequest(m: RequestRow) {
    return {
      id: m.id,
      vehicleId: m.vehicleId,
      vehicleCode: m.vehicle?.code ?? '',
      status: m.status,
      scheduledFor: iso(m.scheduledFor) ?? m.createdAt.toISOString(),
      location: this.v2.maintenanceLocation,
      description: m.description ?? m.title,
      createdAt: m.createdAt.toISOString(),
    };
  }

  async listRequests(customerId: string) {
    const rows = await this.prisma.maintenanceTask.findMany({
      where: { customerId, source: 'customer' },
      include: { vehicle: { select: { code: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
    return { items: rows.map((r) => this.toRequest(r)) };
  }

  async createRequest(user: Principal, dto: { slotStartsAt: string; description: string }) {
    const customerId = user.customerId!;
    const sub = await this.subscriptionOf(customerId);
    if (!sub.assignedVehicleId) throw unprocessable('subscription-vehicle-required', 'Defina a moto fixa do plano antes de agendar.');
    const startsAt = new Date(dto.slotStartsAt);
    const now = new Date();
    if (!isValidSlotStart(startsAt, now)) throw conflict('maintenance-slot-unavailable', 'Escolha um dos horários livres.');
    const vehicleId = sub.assignedVehicleId;
    // Fix round 1 (M3): checagem de pedido aberto e de lotação dentro da transação serializável; conflito de serialização
    // (P2034) é refeito até 3 vezes e, se persistir, vira 409 (o cliente escolhe de novo).
    let created: RequestRow | undefined;
    for (let attempt = 1; !created; attempt++) {
      try {
        created = await this.prisma.$transaction(
          async (tx) => {
            const pending = await tx.maintenanceTask.findFirst({ where: { customerId, source: 'customer', status: { in: [...OPEN_MAINTENANCE] } }, select: { id: true } });
            if (pending) throw conflict('conflict', 'Você já tem uma manutenção agendada.');
            const taken = await tx.maintenanceTask.count({ where: { source: 'customer', status: { in: [...OPEN_MAINTENANCE] }, scheduledFor: startsAt } });
            if (taken >= this.v2.maintenanceSlotCapacity) throw conflict('maintenance-slot-unavailable', 'Este horário acabou de lotar. Escolha outro.');
            const m = await tx.maintenanceTask.create({
              data: { vehicleId, kind: 'preventive', title: 'Manutenção agendada pelo cliente', description: dto.description, scheduledFor: startsAt, source: 'customer', customerId },
              include: { vehicle: { select: { code: true } } },
            });
            await this.audit.record({ actor: user, action: 'maintenance.customer_request', entityType: 'MaintenanceTask', entityId: m.id, metadata: { vehicleId, scheduledFor: startsAt.toISOString() } }, tx as any);
            return m;
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (err) {
        if (!isSerializationFailure(err)) throw err;
        if (attempt >= 3) throw conflict('maintenance-slot-unavailable', 'Muitos agendamentos ao mesmo tempo. Escolha o horário de novo.');
      }
    }
    return this.toRequest(created);
  }

  async cancelRequest(user: Principal, id: string) {
    const m = await this.prisma.maintenanceTask.findUnique({ where: { id }, include: { vehicle: { select: { code: true } } } });
    if (!m || m.customerId !== user.customerId || m.source !== 'customer') throw notFound('Manutenção não encontrada.');
    if (m.status !== 'scheduled') throw conflict('conflict', 'Só é possível cancelar uma manutenção ainda agendada.');
    const updated = await this.prisma.maintenanceTask.update({ where: { id }, data: { status: 'canceled' }, include: { vehicle: { select: { code: true } } } });
    return this.toRequest(updated);
  }
}

