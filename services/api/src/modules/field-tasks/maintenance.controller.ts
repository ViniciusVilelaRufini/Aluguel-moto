import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { MaintenanceTask, Prisma } from '@prisma/client';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound } from '../../common/problem';
import { compact, iso } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { ListMaintenanceQuery, MaintenanceCreateDto, MaintenanceUpdateDto } from './field-tasks.dto';

const toMaintenance = (m: MaintenanceTask & { vehicle?: { code: string } | null }) =>
  compact({
    id: m.id, vehicleId: m.vehicleId, vehicleCode: m.vehicle?.code, kind: m.kind, title: m.title, description: m.description ?? undefined, status: m.status,
    scheduledFor: iso(m.scheduledFor), completedAt: iso(m.completedAt), notes: m.notes ?? undefined, createdById: m.createdById ?? undefined,
    createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString(),
  });

const withVehicle = { vehicle: { select: { code: true } } } as const;

/** Manutenção preventiva e corretiva. */
@Controller('maintenance/tasks')
export class MaintenanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @StaffOnly('admin', 'operacao', 'campo')
  async list(@Query() q: ListMaintenanceQuery) {
    const where: Prisma.MaintenanceTaskWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.kind) where.kind = q.kind;
    if (q.vehicleId) where.vehicleId = q.vehicleId;
    const rows = await this.prisma.maintenanceTask.findMany({ where, include: withVehicle, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, toMaintenance);
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
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const m = await this.prisma.maintenanceTask.findUnique({ where: { id }, include: withVehicle });
    if (!m) throw notFound('Manutenção não encontrada.');
    return toMaintenance(m);
  }

  @Patch(':id')
  @StaffOnly('admin', 'operacao')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MaintenanceUpdateDto) {
    const m = await this.prisma.maintenanceTask.findUnique({ where: { id } });
    if (!m) throw notFound('Manutenção não encontrada.');
    if (m.status === 'done' || m.status === 'canceled') throw conflict('conflict', 'Manutenção já encerrada.');
    const updated = await this.prisma.maintenanceTask.update({
      where: { id },
      data: {
        title: dto.title, description: dto.description, status: dto.status, notes: dto.notes,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined, completedAt: dto.status === 'done' ? new Date() : undefined,
      },
      include: withVehicle,
    });
    return toMaintenance(updated);
  }
}
