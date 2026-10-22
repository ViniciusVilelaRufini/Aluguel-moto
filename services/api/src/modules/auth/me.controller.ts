import { Body, Controller, Get, HttpCode, Inject, Patch, Post } from '@nestjs/common';
import { currentSubscriptionWhere } from '../../common/fixed-vehicle';
import { SkipThrottle } from '@nestjs/throttler';
import type { Prisma, StaffUser } from '@prisma/client';
import { STAFF_GROUPS } from '../../common/enums';
import { normalizePixKey, type PixKeyType } from '../../common/pix-key';
import { notFound, ProblemException } from '../../common/problem';
import { compact, iso } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { toCustomer } from '../customers/customers.mapper';
import { DeviceRegistrationDto, MeUpdateDto } from './auth.dto';
import { CurrentUser, CustomerOnly, CustomerOrStaff, Principal } from './principal';

export function toStaffUser(s: StaffUser) {
  return compact({
    id: s.id,
    email: s.email,
    name: s.name,
    groups: s.groups,
    active: s.active,
    mfaEnabled: s.mfaEnabled,
    lastLoginAt: iso(s.lastLoginAt),
    createdAt: s.createdAt.toISOString(),
  });
}

@Controller('me')
export class MeController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** getMe — cria o cadastro do cliente no primeiro acesso (feito no guard). */
  @Get()
  @SkipThrottle()
  @CustomerOrStaff(...STAFF_GROUPS)
  async me(@CurrentUser() u: Principal) {
    if (u.pool === 'customer') {
      const c = await this.prisma.customer.findUnique({ where: { id: u.customerId } });
      if (!c) throw notFound('Cliente não encontrado.');
      const restricted = c.cpf ? !!(await this.prisma.restrictionEntry.findUnique({ where: { cpf: c.cpf } })) : false;
      const activeSubscription = await this.prisma.subscription.findFirst({ where: { customerId: c.id, ...currentSubscriptionWhere() }, select: { id: true, planCode: true } });
      return { id: c.id, sub: u.sub, pool: 'customer', email: c.email, groups: [], customer: toCustomer(c, { fullCpf: true, restricted, activeSubscription }) };
    }
    const s = await this.prisma.staffUser.findUnique({ where: { id: u.staffId } });
    if (!s) throw notFound('Usuário não encontrado.');
    return { id: s.id, sub: u.sub, pool: 'staff', email: s.email, groups: u.groups, staff: toStaffUser(s) };
  }

  @Patch()
  @CustomerOnly()
  async update(@Body() dto: MeUpdateDto, @CurrentUser() u: Principal) {
    const { pixRefundKeyType, pixRefundKey, ...profile } = dto;
    const data: Prisma.CustomerUpdateInput = { ...profile };
    let pixChange: { type?: PixKeyType; removed: boolean } | undefined;
    if (pixRefundKey === '') {
      data.pixRefundKey = null;
      data.pixRefundKeyType = null;
      pixChange = { removed: true };
    } else if (pixRefundKey !== undefined || pixRefundKeyType !== undefined) {
      if (!pixRefundKey || !pixRefundKeyType) {
        throw new ProblemException(422, 'pix-key-invalid', 'Envie o tipo e a chave Pix juntos.', [{ field: pixRefundKey ? 'pixRefundKeyType' : 'pixRefundKey', message: 'obrigatório' }]);
      }
      const current = await this.prisma.customer.findUnique({ where: { id: u.customerId }, select: { cpf: true } });
      const r = normalizePixKey(pixRefundKeyType, pixRefundKey, current?.cpf);
      if (!r.ok) throw new ProblemException(422, 'pix-key-invalid', r.message, [{ field: 'pixRefundKey', message: r.message }]);
      data.pixRefundKey = r.value;
      data.pixRefundKeyType = pixRefundKeyType;
      pixChange = { type: pixRefundKeyType, removed: false };
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({ where: { id: u.customerId }, data });
      // Dado sensível (destino de estornos): auditoria sem o valor da chave.
      if (pixChange) await this.audit.record({ actor: u, action: 'customer.pix_refund_key', entityType: 'Customer', entityId: u.customerId!, metadata: pixChange }, tx as any);
    });
    return this.me(u);
  }

  /** Idempotente por `fcmToken`. */
  @Post('devices')
  @HttpCode(204)
  @CustomerOrStaff(...STAFF_GROUPS)
  async registerDevice(@Body() dto: DeviceRegistrationDto, @CurrentUser() u: Principal): Promise<void> {
    await this.prisma.device.upsert({
      where: { fcmToken: dto.fcmToken },
      create: { fcmToken: dto.fcmToken, platform: dto.platform, appVersion: dto.appVersion, ownerType: u.pool === 'staff' ? 'staff' : 'customer', ownerId: u.userId },
      update: { platform: dto.platform, appVersion: dto.appVersion, ownerType: u.pool === 'staff' ? 'staff' : 'customer', ownerId: u.userId },
    });
  }
}
