import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { MaintenanceTask, Prisma } from '@prisma/client';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound } from '../../common/problem';
import { compact, iso } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser, hasGroup, Principal, StaffOnly } from '../auth/principal';
import { firstName } from '../referrals/referral-rules';
import { MaintenanceV2Service } from '../maintenance/maintenance-v2.service';
import { ListMaintenanceQuery, MaintenanceCreateDto, MaintenanceUpdateDto } from './field-tasks.dto';

export const toMaintenance = (m: MaintenanceTask & { vehicle?: { code: string } | null; customerName?: string | null }) =>
  compact({
    id: m.id, vehicleId: m.vehicleId, vehicleCode: m.vehicle?.code, kind: m.kind, title: m.title, description: m.description ?? undefined, status: m.status,
    scheduledFor: iso(m.scheduledFor), completedAt: iso(m.completedAt), notes: m.notes ?? undefined, createdById: m.createdById ?? undefined,
    // Contrato v2: origem (painel, cliente do plano ou regra automática) e cliente que agendou.
    source: m.source, customerId: m.customerId ?? undefined, customerName: m.customerName ?? undefined,
    createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString(),
  });

const withVehicle = { vehicle: { select: { code: true } } } as const;

/** Manutenção preventiva e corretiva. */
@Controller('maintenance/tasks')
export class MaintenanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly v2: MaintenanceV2Service,
  ) {}

  /** Nome do cliente (só o primeiro nome) para manutenções agendadas pelo app. */
  /** Fix round 1 (M2): o grupo `campo` (sem admin/operacao) recebe só o primeiro nome do cliente. */
  private async withCustomerNames<T extends MaintenanceTask>(rows: T[], user?: Principal): Promise<Array<T & { customerName?: string | null }>> {
    const firstOnly = !!user && hasGroup(user, 'campo') && !hasGroup(user, 'admin', 'operacao');
    const ids = [...new Set(rows.map((r) => r.customerId).filter((x): x is string => !!x))];
    if (!ids.length) return rows;
    const customers = await this.prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    const by = new Map(customers.map((c) => [c.id, c.name]));
    return rows.map((r) => {
      const name = r.customerId ? (by.get(r.customerId) ?? null) : null;
      return { ...r, customerName: name && firstOnly ? firstName(name) : name };
    });
  }

  @Get()
  @StaffOnly('admin', 'operacao', 'campo')
  async list(@Query() q: ListMaintenanceQuery, @CurrentUser() u: Principal) {
    const where: Prisma.MaintenanceTaskWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.kind) where.kind = q.kind;
    if (q.vehicleId) where.vehicleId = q.vehicleId;
    const rows = await this.prisma.maintenanceTask.findMany({ where, include: withVehicle, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(await this.withCustomerNames(rows, u), q, toMaintenance);
  }

  @Post()
  @StaffOnly('admin', 'operacao')
  async create(@Body() dto: MaintenanceCreateDto, @CurrentUser() u: Principal) {
    if (!(await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId }, select: { id: true } }))) throw notFound('Moto não encontrada.');
    const m = await this.prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceTask.create({
        data: { vehicleId: dto.vehicleId, kind: dto.kind, title: dto.title, description: dto.description, scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined, createdById: u.userId },
        include: withVehicle,
      });
      if (dto.createFieldTask) {
        await tx.fieldTask.create({
          data: { type: 'maintenance', vehicleId: dto.vehicleId, priority: dto.kind === 'corrective' ? 'high' : 'medium', maintenanceTaskId: created.id, notes: dto.title, dueAt: created.scheduledFor, createdById: u.userId },
        });
      }
      return created;
    });
    return toMaintenance(m);
  }

  @Get(':id')
  @StaffOnly('admin', 'operacao', 'campo')
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    const m = await this.prisma.maintenanceTask.findUnique({ where: { id }, include: withVehicle });
    if (!m) throw notFound('Manutenção não encontrada.');
    return toMaintenance((await this.withCustomerNames([m], u))[0]);
  }

  @Patch(':id')
  @StaffOnly('admin', 'operacao')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MaintenanceUpdateDto) {
    const m = await this.prisma.maintenanceTask.findUnique({ where: { id } });
    if (!m) throw notFound('Manutenção não encontrada.');
    if (m.status === 'done' || m.status === 'canceled') throw conflict('conflict', 'Manutenção já encerrada.');
    const completedAt = dto.status === 'done' ? new Date() : undefined;
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.maintenanceTask.update({
        where: { id },
        data: { title: dto.title, description: dto.description, status: dto.status, notes: dto.notes, scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined, completedAt },
        include: withVehicle,
      });
      // Contrato v2: preventiva concluída = revisão (zera km/horas desde a revisão).
      if (completedAt && m.kind === 'preventive') await this.v2.recordService(m.vehicleId, completedAt, tx);
      return u;
    });
    return toMaintenance((await this.withCustomerNames([updated]))[0]);
  }
}
