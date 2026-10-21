import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import type { InsuranceCoverageConfig, Prisma } from '@prisma/client';
import { INSURANCE_COVERAGES, type InsuranceCoverage } from '../../common/enums';
import { pageArgs, toPage } from '../../common/pagination';
import { notFound } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, CustomerOrStaff, isStaff, Principal, StaffOnly } from '../auth/principal';
import { InsuranceCoverageUpdateDto, ListPoliciesQuery } from '../payments/payments.dto';
import { toInsurancePolicy } from '../payments/payments.mapper';

function toCoverageOption(c: InsuranceCoverageConfig) {
  return {
    coverage: c.coverage,
    name: c.name,
    description: c.description,
    premiumCents: c.premiumCents,
    mandatory: c.mandatory,
    items: (c.items as Array<{ code: string; description: string; limitCents?: number }>) ?? [],
    active: c.active,
  };
}

/** Coberturas e apólices — dono: Task 5 (agente 4). Endpoints provisórios sobre o banco. */
@Controller('insurance')
export class InsuranceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('coverages')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  async coverages(@CurrentUser() u: Principal) {
    const rows = await this.prisma.insuranceCoverageConfig.findMany({ where: isStaff(u) ? {} : { active: true }, orderBy: { premiumCents: 'asc' } });
    return { items: rows.map(toCoverageOption) };
  }

  @Put('coverages/:coverage')
  @StaffOnly('admin')
  async update(@Param('coverage') coverage: string, @Body() dto: InsuranceCoverageUpdateDto, @CurrentUser() u: Principal) {
    if (!(INSURANCE_COVERAGES as string[]).includes(coverage)) throw notFound('Cobertura não encontrada.');
    const existing = await this.prisma.insuranceCoverageConfig.findUnique({ where: { coverage: coverage as InsuranceCoverage } });
    if (!existing) throw notFound('Cobertura não encontrada.');
    const data: Prisma.InsuranceCoverageConfigUpdateInput = { ...dto, items: dto.items as unknown as Prisma.InputJsonValue };
    // `basic` é obrigatória: não pode ser desativada.
    if (coverage === 'basic') data.active = true;
    const updated = await this.prisma.insuranceCoverageConfig.update({ where: { coverage: coverage as InsuranceCoverage }, data });
    await this.audit.record({ actor: u, action: 'insurance.coverage.update', entityType: 'InsuranceCoverage', entityId: coverage, metadata: { ...dto } });
    return toCoverageOption(updated);
  }

  @Get('policies')
  @StaffOnly('admin', 'financeiro', 'suporte')
  async policies(@Query() q: ListPoliciesQuery) {
    const where: Prisma.InsurancePolicyWhereInput = {};
    if (q.customerId) where.customerId = q.customerId;
    if (q.rentalId) where.rentalId = q.rentalId;
    if (q.from || q.to) where.issuedAt = { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lt: new Date(q.to) } : {}) };
    const rows = await this.prisma.insurancePolicy.findMany({ where, orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, toInsurancePolicy);
  }

  @Get('policies/:id')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  async policy(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    const p = await this.prisma.insurancePolicy.findUnique({ where: { id } });
    if (!p || (!isStaff(u) && p.customerId !== u.customerId)) throw notFound('Apólice não encontrada.');
    return toInsurancePolicy(p);
  }
}
