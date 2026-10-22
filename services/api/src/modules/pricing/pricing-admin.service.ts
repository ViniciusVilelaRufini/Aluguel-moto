import { Inject, Injectable } from '@nestjs/common';
import type { Coupon, Fee, PricingPlan, Prisma } from '@prisma/client';
import { pageArgs, toPage } from '../../common/pagination';
import { badRequest, conflict, notFound } from '../../common/problem';
import { compact, iso } from '../../common/util';
import { INSURANCE, type InsurancePort } from '../../ports/insurance.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import type { CouponInputDto, FeeInputDto, ListCouponsQuery, PricingPlanInputDto, QuoteRequestDto } from './pricing.dto';
import { PricingService } from './pricing.service';

export const SYSTEM_FEES = ['deposit', 'force_end_outside_return_zone', 'battery_swap_fee'];
const UNIT_MINUTES = { minute: 1, hour: 60, day: 1440, week: 10080, month: 43200 } as const;

export const toPlan = (p: PricingPlan) =>
  compact({
    id: p.id, code: p.code, name: p.name, description: p.description ?? undefined, unit: p.unit, unlockFeeCents: p.unlockFeeCents,
    unitPriceCents: p.unitPriceCents, pausePerMinuteCents: p.pausePerMinuteCents, recurring: p.recurring, active: p.active,
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
  });

export const toCoupon = (c: Coupon) =>
  compact({
    id: c.id, code: c.code, description: c.description ?? undefined, discountType: c.discountType, percentOff: c.percentOff ?? undefined,
    amountOffCents: c.amountOffCents ?? undefined, planCodes: c.planCodes.length ? c.planCodes : undefined, validFrom: iso(c.validFrom),
    validUntil: iso(c.validUntil), maxRedemptions: c.maxRedemptions ?? undefined, maxRedemptionsPerCustomer: c.maxRedemptionsPerCustomer ?? undefined,
    redemptions: c.redemptions, active: c.active, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
  });

export const toFee = (f: Fee) =>
  compact({
    id: f.id, code: f.code, name: f.name, description: f.description ?? undefined, amountCents: f.amountCents, active: f.active, system: f.system,
    createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString(),
  });

/** Planos, cotação, cupons e taxas configuráveis pelo admin (toda alteração grava AuditLog). */
@Injectable()
export class PricingAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
    @Inject(INSURANCE) private readonly insurance: InsurancePort,
  ) {}

  // ── planos ──
  async listPlans(includeInactive: boolean) {
    const plans = await this.prisma.pricingPlan.findMany({ where: includeInactive ? {} : { active: true }, orderBy: [{ code: 'asc' }, { createdAt: 'desc' }] });
    return { items: plans.map(toPlan) };
  }

  async getPlan(id: string) {
    const p = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!p) throw notFound('Plano não encontrado.');
    return toPlan(p);
  }

  async createPlan(actor: Principal, dto: PricingPlanInputDto) {
    const active = dto.active ?? true;
    if (active && (await this.prisma.pricingPlan.findFirst({ where: { code: dto.code, active: true } }))) {
      throw conflict('conflict', `Já existe um plano ativo ${dto.code}.`);
    }
    const p = await this.prisma.pricingPlan.create({ data: { ...dto, active } });
    await this.audit.record({ actor, action: 'pricing.plan.create', entityType: 'PricingPlan', entityId: p.id, metadata: { ...dto } });
    return toPlan(p);
  }

  async updatePlan(actor: Principal, id: string, dto: PricingPlanInputDto) {
    const existing = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) throw notFound('Plano não encontrado.');
    const active = dto.active ?? existing.active;
    if (active && (await this.prisma.pricingPlan.findFirst({ where: { code: dto.code, active: true, id: { not: id } } }))) {
      throw conflict('conflict', `Já existe um plano ativo ${dto.code}.`);
    }
    const p = await this.prisma.pricingPlan.update({ where: { id }, data: { ...dto, active } });
    await this.audit.record({ actor, action: 'pricing.plan.update', entityType: 'PricingPlan', entityId: id, metadata: { ...dto } });
    return toPlan(p);
  }

  async deletePlan(actor: Principal, id: string): Promise<void> {
    const existing = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) throw notFound('Plano não encontrado.');
    await this.prisma.pricingPlan.update({ where: { id }, data: { active: false } });
    await this.audit.record({ actor, action: 'pricing.plan.delete', entityType: 'PricingPlan', entityId: id });
  }

  // ── cotação ──
  async quote(dto: QuoteRequestDto, customerId?: string) {
    const plan = await this.pricing.activePlan(dto.planCode);
    let couponApplied = false;
    let couponMessage: string | undefined;
    let coupon: Coupon | undefined;
    if (dto.couponCode) {
      const r = await this.pricing.checkCoupon(dto.couponCode, dto.planCode, customerId);
      coupon = r.coupon;
      couponApplied = !!r.coupon;
      couponMessage = r.coupon ? 'Cupom aplicado.' : r.message;
    }
    const { premiumCents } = await this.insurance.quote({ coverage: dto.coverage, planCode: dto.planCode });
    const minutes = dto.estimatedMinutes ?? UNIT_MINUTES[plan.unit];
    // Contrato v2: preço por minuto do modelo da moto.
    const model = dto.vehicleId
      ? ((await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId }, select: { vehicleModel: { select: { pricePerMinuteCents: true, unlockFeeCents: true } } } }))?.vehicleModel ?? null)
      : null;
    const breakdown = this.pricing.calculate({
      snapshot: PricingService.snapshotFrom(plan, premiumCents, dto.coverage, coupon, false, model),
      elapsedSeconds: minutes * 60,
      pausedSeconds: 0,
    });
    const depositCents = await this.pricing.feeAmount('deposit', 5000);
    return compact({ planCode: dto.planCode, coverage: dto.coverage, breakdown, depositCents, couponApplied, couponMessage });
  }

  // ── cupons ──
  private checkCouponInput(dto: CouponInputDto): void {
    if (dto.discountType === 'percent' && !dto.percentOff) throw badRequest('Cupom percentual exige percentOff.', [{ field: 'percentOff', message: 'obrigatório' }]);
    if (dto.discountType === 'fixed' && !dto.amountOffCents) throw badRequest('Cupom de valor fixo exige amountOffCents.', [{ field: 'amountOffCents', message: 'obrigatório' }]);
    if (dto.validFrom && dto.validUntil && new Date(dto.validFrom) >= new Date(dto.validUntil)) {
      throw badRequest('validFrom deve ser anterior a validUntil.', [{ field: 'validUntil', message: 'deve ser posterior a validFrom' }]);
    }
  }

  private couponData(dto: CouponInputDto): Prisma.CouponUncheckedCreateInput {
    return {
      code: dto.code, description: dto.description ?? null, discountType: dto.discountType,
      percentOff: dto.discountType === 'percent' ? dto.percentOff : null, amountOffCents: dto.discountType === 'fixed' ? dto.amountOffCents : null,
      planCodes: dto.planCodes ?? [], validFrom: dto.validFrom ? new Date(dto.validFrom) : null, validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      maxRedemptions: dto.maxRedemptions ?? null, maxRedemptionsPerCustomer: dto.maxRedemptionsPerCustomer ?? null, active: dto.active ?? true,
    };
  }

  async listCoupons(q: ListCouponsQuery) {
    const where: Prisma.CouponWhereInput = {};
    if (q.active !== undefined) where.active = q.active;
    if (q.q) where.code = { contains: q.q.toUpperCase() };
    const rows = await this.prisma.coupon.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, toCoupon);
  }

  async getCoupon(id: string) {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c) throw notFound('Cupom não encontrado.');
    return toCoupon(c);
  }

  async createCoupon(actor: Principal, dto: CouponInputDto) {
    this.checkCouponInput(dto);
    if (await this.prisma.coupon.findUnique({ where: { code: dto.code } })) throw conflict('conflict', 'Já existe um cupom com este código.');
    const c = await this.prisma.coupon.create({ data: this.couponData(dto) });
    await this.audit.record({ actor, action: 'pricing.coupon.create', entityType: 'Coupon', entityId: c.id, metadata: { code: c.code } });
    return toCoupon(c);
  }

  async updateCoupon(actor: Principal, id: string, dto: CouponInputDto) {
    this.checkCouponInput(dto);
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw notFound('Cupom não encontrado.');
    if (dto.code !== existing.code && (await this.prisma.coupon.findUnique({ where: { code: dto.code } }))) throw conflict('conflict', 'Já existe um cupom com este código.');
    const c = await this.prisma.coupon.update({ where: { id }, data: this.couponData(dto) });
    await this.audit.record({ actor, action: 'pricing.coupon.update', entityType: 'Coupon', entityId: id, metadata: { code: c.code } });
    return toCoupon(c);
  }

  async deleteCoupon(actor: Principal, id: string): Promise<void> {
    if (!(await this.prisma.coupon.findUnique({ where: { id } }))) throw notFound('Cupom não encontrado.');
    await this.prisma.coupon.update({ where: { id }, data: { active: false } });
    await this.audit.record({ actor, action: 'pricing.coupon.delete', entityType: 'Coupon', entityId: id });
  }

  // ── taxas ──
  async listFees() {
    const fees = await this.prisma.fee.findMany({ orderBy: { code: 'asc' } });
    return { items: fees.map(toFee) };
  }

  async createFee(actor: Principal, dto: FeeInputDto) {
    if (await this.prisma.fee.findUnique({ where: { code: dto.code } })) throw conflict('conflict', 'Já existe uma taxa com este código.');
    const f = await this.prisma.fee.create({ data: { ...dto, active: dto.active ?? true, system: false } });
    await this.audit.record({ actor, action: 'pricing.fee.create', entityType: 'Fee', entityId: f.id, metadata: { ...dto } });
    return toFee(f);
  }

  async updateFee(actor: Principal, id: string, dto: FeeInputDto) {
    const existing = await this.prisma.fee.findUnique({ where: { id } });
    if (!existing) throw notFound('Taxa não encontrada.');
    if (existing.system && dto.code !== existing.code) throw conflict('conflict', 'O código de uma taxa de sistema não pode mudar.');
    if (existing.system && dto.active === false) throw conflict('conflict', 'Taxas de sistema não podem ser desativadas.');
    if (dto.code !== existing.code && (await this.prisma.fee.findUnique({ where: { code: dto.code } }))) throw conflict('conflict', 'Já existe uma taxa com este código.');
    const f = await this.prisma.fee.update({ where: { id }, data: { ...dto, active: dto.active ?? existing.active } });
    await this.audit.record({ actor, action: 'pricing.fee.update', entityType: 'Fee', entityId: id, metadata: { ...dto } });
    return toFee(f);
  }

  async deleteFee(actor: Principal, id: string): Promise<void> {
    const existing = await this.prisma.fee.findUnique({ where: { id } });
    if (!existing) throw notFound('Taxa não encontrada.');
    if (existing.system || SYSTEM_FEES.includes(existing.code)) throw conflict('conflict', 'Taxas de sistema não podem ser desativadas.');
    await this.prisma.fee.update({ where: { id }, data: { active: false } });
    await this.audit.record({ actor, action: 'pricing.fee.delete', entityType: 'Fee', entityId: id });
  }
}
