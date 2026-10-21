import { Controller, Get, Query } from '@nestjs/common';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { Prisma } from '@prisma/client';
import { PageQuery, pageArgs, toPage } from '../../common/pagination';
import { compact } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffOnly } from '../auth/principal';

class ListAuditQuery extends PageQuery {
  @IsOptional() @IsUUID() actorId?: string;
  @IsOptional() @IsString() @MaxLength(120) action?: string;
  @IsOptional() @IsString() @MaxLength(60) entityType?: string;
  @IsOptional() @IsString() @MaxLength(64) entityId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

/** Log de auditoria (somente leitura, só admin). */
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @StaffOnly('admin')
  async list(@Query() q: ListAuditQuery) {
    const where: Prisma.AuditLogWhereInput = {};
    if (q.actorId) where.actorId = q.actorId;
    if (q.action) where.action = q.action;
    if (q.entityType) where.entityType = q.entityType;
    if (q.entityId) where.entityId = q.entityId;
    if (q.from || q.to) where.createdAt = { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lt: new Date(q.to) } : {}) };
    const rows = await this.prisma.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    const staffIds = [...new Set(rows.filter((r) => r.actorType === 'staff' && r.actorId).map((r) => r.actorId!))];
    const staff = staffIds.length ? await this.prisma.staffUser.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } }) : [];
    const names = new Map(staff.map((s) => [s.id, s.name]));
    return toPage(rows, q, (r) =>
      compact({
        id: r.id, actorType: r.actorType, actorId: r.actorId ?? undefined, actorName: r.actorName ?? (r.actorId ? names.get(r.actorId) : undefined),
        action: r.action, entityType: r.entityType, entityId: r.entityId, reason: r.reason ?? undefined,
        metadata: (r.metadata as Record<string, unknown> | null) ?? undefined, createdAt: r.createdAt.toISOString(),
      }),
    );
  }
}
