import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Coupon, CustomerCoupon, Referral } from '@prisma/client';
import type { PlanCode } from '../../common/enums';
import { EV, type PaymentUpdatedEvent } from '../../common/events';
import { PageQuery, pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, unprocessable } from '../../common/problem';
import { compact, iso } from '../../common/util';
import { V2_CONFIG, type V2Config } from '../../config/v2-config';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from '../payments/payment-state.service';
import { toWalletEntry } from '../payments/payments.mapper';
import { PricingService } from '../pricing/pricing.service';
import { appendWalletEntry } from '../wallet/wallet-ledger';
import { assertReferralEligible, customerCouponStatus, firstName, makeReferralCode, normalizeReferralCode } from './referral-rules';

const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

function couponFields(c: Coupon) {
  return {
    code: c.code,
    description: c.description ?? undefined,
    discountType: c.discountType,
    percentOff: c.percentOff ?? undefined,
    amountOffCents: c.amountOffCents ?? undefined,
    planCodes: c.planCodes,
    validUntil: iso(c.validUntil),
  };
}

/** Cupom salvo → `CustomerCoupon` (situação calculada). Também usado na exportação LGPD. */
export function toCustomerCoupon(r: CustomerCoupon & { coupon: Coupon }, usedByCustomer: number, now: Date) {
  const st = customerCouponStatus(r.coupon, usedByCustomer, now);
  return compact({ id: r.id, ...couponFields(r.coupon), usesRemaining: st.usesRemaining, status: st.status, source: r.source, addedAt: r.createdAt.toISOString() });
}

/** Indicação feita → `ReferralReward` (só o primeiro nome do amigo). */
export function toReferralReward(r: Referral, refereeName: string | null | undefined) {
  return compact({
    id: r.id, refereeName: firstName(refereeName), status: r.status, amountCents: r.referrerRewardCents,
    walletEntryId: r.referrerWalletEntryId ?? undefined, createdAt: r.createdAt.toISOString(), grantedAt: iso(r.grantedAt),
  });
}

/** Cupons na conta do cliente e programa de indicação (contrato v2). */
@Injectable()
export class ReferralsService {
  private readonly logger = new Logger('ReferralsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    @Inject(V2_CONFIG) private readonly v2: V2Config,
  ) {}

  // ───────────── cupons da conta ─────────────

  async validateCoupon(customerId: string, code: string, planCode?: PlanCode) {
    const r = await this.pricing.checkCoupon(code, planCode, customerId);
    if (!r.coupon) return { code: code.toUpperCase(), valid: false, message: r.message ?? 'Cupom inválido.' };
    return compact({ ...couponFields(r.coupon), valid: true, message: 'Cupom válido.' });
  }

  private async mapCoupons(customerId: string, rows: Array<CustomerCoupon & { coupon: Coupon }>) {
    const used = await this.prisma.couponRedemption.groupBy({ by: ['couponId'], where: { customerId, couponId: { in: rows.map((r) => r.couponId) } }, _count: { _all: true } });
    const usedBy = new Map(used.map((u) => [u.couponId, u._count._all]));
    const now = new Date();
    return rows.map((r) => toCustomerCoupon(r, usedBy.get(r.couponId) ?? 0, now));
  }

  async listCoupons(customerId: string) {
    const rows = await this.prisma.customerCoupon.findMany({ where: { customerId }, include: { coupon: true }, orderBy: { createdAt: 'desc' } });
    const items = await this.mapCoupons(customerId, rows);
    const rank = { available: 0, used: 1, expired: 2 } as const;
    items.sort((a, b) => rank[a.status] - rank[b.status]);
    return { items };
  }

  async addCoupon(customerId: string, code: string, planCode?: PlanCode) {
    const r = await this.pricing.checkCoupon(code, planCode, customerId);
    if (!r.coupon) throw unprocessable('coupon-invalid', r.message ?? 'Cupom inválido.');
    try {
      const row = await this.prisma.customerCoupon.create({ data: { customerId, couponId: r.coupon.id, source: 'manual' }, include: { coupon: true } });
      return (await this.mapCoupons(customerId, [row]))[0];
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict('conflict', 'Este cupom já está na sua conta.');
      throw err;
    }
  }

  // ───────────── indicação ─────────────

  /** Código de indicação do cliente (gerado no primeiro acesso; colisão → tenta de novo). */
  private async ensureCode(customerId: string): Promise<string> {
    const c = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { referralCode: true, name: true } });
    if (!c) throw notFound('Cliente não encontrado.');
    if (c.referralCode) return c.referralCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeReferralCode(c.name);
      try {
        const updated = await this.prisma.customer.updateMany({ where: { id: customerId, referralCode: null }, data: { referralCode: code } });
        if (updated.count === 1) return code;
        return (await this.prisma.customer.findUnique({ where: { id: customerId }, select: { referralCode: true } }))!.referralCode!;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
      }
    }
    throw new Error('referral_code_generation_failed');
  }

  async summary(customerId: string) {
    const code = await this.ensureCode(customerId);
    const [invited, granted, referredBy] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: customerId } }),
      this.prisma.referral.aggregate({ where: { referrerId: customerId, status: 'granted' }, _count: { _all: true }, _sum: { referrerRewardCents: true } }),
      this.prisma.referral.findUnique({ where: { refereeId: customerId }, select: { referrerId: true } }),
    ]);
    const referrer = referredBy ? await this.prisma.customer.findUnique({ where: { id: referredBy.referrerId }, select: { name: true } }) : null;
    const inviteUrl = `${this.v2.inviteBaseUrl}/${code}`;
    return compact({
      code,
      inviteUrl,
      shareMessage: `Use meu código ${code} na Volti e ganhe ${brl(this.v2.referralRefereeRewardCents)} para andar de moto elétrica: ${inviteUrl}`,
      referrerRewardCents: this.v2.referralReferrerRewardCents,
      refereeRewardCents: this.v2.referralRefereeRewardCents,
      invitedCount: invited,
      qualifiedCount: granted._count._all,
      totalEarnedCents: granted._sum.referrerRewardCents ?? 0,
      referredBy: referrer ? firstName(referrer.name) : undefined,
    });
  }

  async rewards(customerId: string, q: PageQuery) {
    const rows = await this.prisma.referral.findMany({ where: { referrerId: customerId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    const names = await this.prisma.customer.findMany({ where: { id: { in: rows.map((r) => r.refereeId) } }, select: { id: true, name: true } });
    const nameBy = new Map(names.map((n) => [n.id, n.name]));
    return toPage(rows, q, (r) => toReferralReward(r, nameBy.get(r.refereeId)));
  }

  /** O indicado usa o código: indicação `pending` + bônus do indicado na carteira, na mesma transação. */
  async redeem(customerId: string, rawCode: string) {
    const code = normalizeReferralCode(rawCode);
    const referrer = await this.prisma.customer.findUnique({ where: { referralCode: code }, select: { id: true, name: true, status: true } });
    if (!referrer || referrer.status !== 'active') throw unprocessable('referral-code-invalid', 'Código de indicação não encontrado.');
    const me = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { kycStatus: true, status: true } });
    // Fix round 1 (I4): HMAC do CPF (sobrevive à exclusão da conta) contra autoindicação e resgate repetido pelo mesmo CPF.
    const [rentalsCount, already, refereeHash, referrerHash] = await Promise.all([
      this.prisma.rental.count({ where: { customerId } }),
      this.prisma.referral.findUnique({ where: { refereeId: customerId }, select: { id: true } }),
      this.pricing.cpfHashFor(customerId),
      this.pricing.cpfHashFor(referrer.id),
    ]);
    const cpfAlreadyReferred = refereeHash ? !!(await this.prisma.referral.findFirst({ where: { refereeCpfHash: refereeHash }, select: { id: true } })) : false;
    assertReferralEligible({
      refereeId: customerId, referrerId: referrer.id, kycApproved: me?.kycStatus === 'approved', rentalsCount, alreadyReferred: !!already,
      refereeActive: me?.status === 'active', sameCpfAsReferrer: !!refereeHash && refereeHash === referrerHash, cpfAlreadyReferred,
    });
    const reward = this.v2.referralRefereeRewardCents;
    try {
      const entry = await this.prisma.$transaction(async (tx) => {
        const ref = await tx.referral.create({
          data: { referrerId: referrer.id, refereeId: customerId, code, referrerRewardCents: this.v2.referralReferrerRewardCents, refereeRewardCents: reward, refereeCpfHash: refereeHash, referrerCpfHash: referrerHash },
        });
        if (reward <= 0) return null;
        const e = await appendWalletEntry(tx, { customerId, type: 'bonus', amountCents: reward, description: `Bônus de indicação (código ${code})` });
        await tx.referral.update({ where: { id: ref.id }, data: { refereeWalletEntryId: e.id } });
        return e;
      });
      this.logger.log({ msg: 'referral_redeemed', referrerId: referrer.id });
      return compact({ code, referrerName: firstName(referrer.name), rewardCents: reward, walletEntry: entry ? toWalletEntry(entry) : undefined });
    } catch (err) {
      if (isUniqueViolation(err)) throw unprocessable('referral-not-eligible', 'Sua conta já usou um código de indicação.');
      throw err;
    }
  }

  /**
   * Fix round 1 (M8): bônus de quem indicou só com a primeira corrida **paga** do indicado, de pelo menos
   * `REFERRAL_MIN_RENTAL_CENTS` (líquido de estornos), e com a conta do indicado ativa. Uma vez, por transição condicional.
   */
  @OnEvent(EV.PAYMENT_UPDATED, { async: true, promisify: true })
  async onPaymentUpdated(ev: PaymentUpdatedEvent): Promise<void> {
    if (ev.status !== 'paid' && ev.status !== 'captured') return;
    try {
      const pay = await this.prisma.payment.findUnique({ where: { id: ev.paymentId }, select: { kind: true, customerId: true, amountCents: true, refundedCents: true, status: true } });
      if (!pay || pay.kind !== 'rental' || (pay.status !== 'paid' && pay.status !== 'captured')) return;
      if (pay.amountCents - pay.refundedCents < this.v2.referralMinRentalCents) return;
      const referee = await this.prisma.customer.findUnique({ where: { id: pay.customerId }, select: { status: true } });
      if (referee?.status !== 'active') return;
      await this.grantReferrer(pay.customerId);
    } catch (err) {
      this.logger.error({ msg: 'referral_grant_failed', error: (err as Error).message });
    }
  }

  async grantReferrer(refereeId: string): Promise<boolean> {
    const ref = await this.prisma.referral.findUnique({ where: { refereeId } });
    if (!ref || ref.status !== 'pending') return false;
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.referral.updateMany({ where: { id: ref.id, status: 'pending' }, data: { status: 'granted', grantedAt: new Date() } });
      if (claimed.count === 0) return false;
      if (ref.referrerRewardCents > 0) {
        const e = await appendWalletEntry(tx, { customerId: ref.referrerId, type: 'bonus', amountCents: ref.referrerRewardCents, description: 'Bônus de indicação: amigo fez a primeira corrida' });
        await tx.referral.update({ where: { id: ref.id }, data: { referrerWalletEntryId: e.id } });
      }
      return true;
    });
  }
}
