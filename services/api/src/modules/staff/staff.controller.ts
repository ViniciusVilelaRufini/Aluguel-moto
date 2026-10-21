import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Prisma } from '@prisma/client';
import { STAFF_GROUPS, type StaffGroup } from '../../common/enums';
import { PageQuery, pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { toStaffUser } from '../auth/me.controller';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { PrincipalResolver } from '../auth/principal-resolver.service';

class ListStaffQuery extends PageQuery {
  @IsOptional() @IsIn(STAFF_GROUPS) group?: StaffGroup;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(120) q?: string;
}
class StaffCreateDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(STAFF_GROUPS, { each: true }) groups: StaffGroup[];
}
class StaffUpdateDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(STAFF_GROUPS, { each: true }) groups?: StaffGroup[];
  @IsOptional() @IsBoolean() active?: boolean;
}

/**
 * Usuários internos. O cadastro local é a fonte para a API; a criação do usuário no pool interno do Cognito
 * (convite + MFA) é feita pela infraestrutura — ver decisões propostas.
 */
@Controller('staff')
export class StaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly resolver: PrincipalResolver,
  ) {}

  @Get()
  @StaffOnly('admin', 'operacao', 'suporte')
  async list(@Query() q: ListStaffQuery) {
    const where: Prisma.StaffUserWhereInput = {};
    if (q.group) where.groups = { has: q.group };
    if (q.active !== undefined) where.active = q.active;
    if (q.q) where.OR = [{ name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }];
    const rows = await this.prisma.staffUser.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], ...pageArgs(q) });
    return toPage(rows, q, toStaffUser);
  }

  @Post()
  @StaffOnly('admin')
  async create(@Body() dto: StaffCreateDto, @CurrentUser() u: Principal) {
    if (await this.prisma.staffUser.findUnique({ where: { email: dto.email.toLowerCase() } })) throw conflict('conflict', 'Já existe um usuário com este e-mail.');
    const s = await this.prisma.staffUser.create({ data: { email: dto.email.toLowerCase(), name: dto.name, groups: dto.groups } });
    await this.audit.record({ actor: u, action: 'staff.create', entityType: 'StaffUser', entityId: s.id, metadata: { groups: dto.groups } });
    return toStaffUser(s);
  }

  @Get(':id')
  @StaffOnly('admin')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const s = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!s) throw notFound('Usuário não encontrado.');
    return toStaffUser(s);
  }

  /** Um admin não remove o próprio grupo `admin` nem se desativa. */
  @Patch(':id')
  @StaffOnly('admin')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StaffUpdateDto, @CurrentUser() u: Principal) {
    const s = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!s) throw notFound('Usuário não encontrado.');
    if (id === u.staffId && (dto.active === false || (dto.groups && !dto.groups.includes('admin')))) {
      throw conflict('conflict', 'Você não pode remover o próprio acesso de admin nem se desativar.');
    }
    const updated = await this.prisma.staffUser.update({ where: { id }, data: { name: dto.name, groups: dto.groups, active: dto.active } });
    await this.audit.record({ actor: u, action: 'staff.update', entityType: 'StaffUser', entityId: id, metadata: { ...dto } });
    this.resolver.invalidate();
    return toStaffUser(updated);
  }
}
