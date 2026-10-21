import { Body, Controller, Get, HttpCode, Inject, Patch, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { StaffUser } from '@prisma/client';
import { STAFF_GROUPS } from '../../common/enums';
import { notFound } from '../../common/problem';
import { compact, iso } from '../../common/util';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** getMe — cria o cadastro do cliente no primeiro acesso (feito no guard). */
  @Get()
  @SkipThrottle()
  @CustomerOrStaff(...STAFF_GROUPS)
  async me(@CurrentUser() u: Principal) {
    if (u.pool === 'customer') {
      const c = await this.prisma.customer.findUnique({ where: { id: u.customerId } });
      if (!c) throw notFound('Cliente não encontrado.');
      const restricted = c.cpf ? !!(await this.prisma.restrictionEntry.findUnique({ where: { cpf: c.cpf } })) : false;
      return { id: c.id, sub: u.sub, pool: 'customer', email: c.email, groups: [], customer: toCustomer(c, { fullCpf: true, restricted }) };
    }
    const s = await this.prisma.staffUser.findUnique({ where: { id: u.staffId } });
    if (!s) throw notFound('Usuário não encontrado.');
    return { id: s.id, sub: u.sub, pool: 'staff', email: s.email, groups: u.groups, staff: toStaffUser(s) };
  }

  @Patch()
  @CustomerOnly()
  async update(@Body() dto: MeUpdateDto, @CurrentUser() u: Principal) {
    await this.prisma.customer.update({ where: { id: u.customerId }, data: { ...dto } });
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
