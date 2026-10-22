import { Body, Controller, Get, Inject, Logger, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
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
import { STAFF_DIRECTORY, type StaffDirectory } from '../../ports/staff-directory.port';

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
 * Usuários internos. O cadastro local é a fonte da autorização (grupos efetivos = cadastro ∩ token, QA-04); mudanças de
 * grupo/ativo são espelhadas no pool interno pela porta `StaffDirectory` (aws: Cognito; local: no-op). A criação do
 * usuário no pool (convite + MFA) continua proposta (decisões, Task 3 item 8).
 */
@Controller('staff')
export class StaffController {
  private readonly logger = new Logger('StaffController');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STAFF_DIRECTORY) private readonly directory: StaffDirectory,
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
    await this.syncDirectory(s, dto);
    return toStaffUser(updated);
  }

  /** Espelha no pool interno. Falha não desfaz o cadastro: a remoção de grupo/desativação já vale pela API. */
  private async syncDirectory(
    before: { id: string; cognitoSub: string | null; email: string; groups: StaffGroup[]; active: boolean },
    dto: StaffUpdateDto,
  ): Promise<void> {
    const who = { sub: before.cognitoSub, email: before.email };
    try {
      if (dto.groups) {
        const next = dto.groups;
        const add = next.filter((g) => !before.groups.includes(g));
        const remove = before.groups.filter((g) => !next.includes(g));
        if (add.length || remove.length) await this.directory.updateGroups(who, { add, remove });
      }
      if (dto.active !== undefined && dto.active !== before.active) await this.directory.setActive(who, dto.active);
    } catch (err) {
      this.logger.error({ msg: 'staff_directory_sync_failed', staffId: before.id, error: (err as Error).message });
    }
  }
}
