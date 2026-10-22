import { Inject, Injectable, Optional } from '@nestjs/common';
import { customerCpfHash } from '../../common/fraud-hash';
import { loadV2Config, V2_CONFIG, type V2Config } from '../../config/v2-config';
import type { Coupon, PricingPlan } from '@prisma/client';
import type { InsuranceCoverage, PlanCode } from '../../common/enums';
import { notFound, unprocessable } from '../../common/problem';
import { PrismaService } from '../../prisma/prisma.service';

export type PlanUnit = 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface CouponSnapshot {
  code: string;
  discountType: 'percent' | 'fixed';
  percentOff?: number;
  amountOffCents?: number;
}

/** Preço congelado no início do aluguel (o aluguel guarda o preço do início — `updatePricingPlan`). */
export interface PriceSnapshot {
  planCode: PlanCode;
  unit: PlanUnit;
  unlockFeeCents: number;
  unitPriceCents: number;
  pausePerMinuteCents: number;
  insurancePremiumCents: number;
  coverage?: InsuranceCoverage;
  /** Assinatura semanal/mensal ativa com o mesmo plano: não cobra tempo. */
  subscriptionCovered?: boolean;
  coupon?: CouponSnapshot;
}

export interface PriceLine {
  code: string;
  description: string;
  quantity?: number;
  unitCents?: number;
  amountCents: number;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  subtotalCents: number;
  discountCents: number;
  insuranceCents: number;
  feesCents: number;
  walletAppliedCents?: number;
  totalCents: number;
}

export interface FeeCharge {
  code: string;
  description: string;
  amountCents: number;
}

const UNIT_SECONDS: Record<PlanUnit, number> = { minute: 60, hour: 3600, day: 86400, week: 7 * 86400, month: 30 * 86400 };
const UNIT_LABEL: Record<PlanUnit, string> = { minute: 'minuto', hour: 'hora', day: 'dia', week: 'semana', month: 'mês' };
const COVERAGE_LABEL: Record<InsuranceCoverage, string> = { basic: 'Seguro básico', full: 'Seguro completo' };

/** Unidades iniciadas (parcial arredonda para cima). */
const startedUnits = (seconds: number, unitSeconds: number) => (seconds <= 0 ? 0 : Math.ceil(seconds / unitSeconds));

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(V2_CONFIG) private readonly v2?: V2Config,
  ) {}

  /** Fix round 1 (I4): HMAC do CPF do cliente (prevenção a fraude; sobrevive à exclusão da conta). */
  cpfHashFor(customerId: string): Promise<string | null> {
    return customerCpfHash(this.prisma, customerId, (this.v2 ?? loadV2Config()).fraudHashSecret);
  }

  /**
   * Regra de preço (centavos):
   * - `minute`: desbloqueio + preço/min × minutos rodando (parcial ↑) + pausa/min × minutos pausados (parcial ↑).
   * - `hour`/`day`/`week`/`month`: preço por unidade iniciada sobre o tempo total (a moto fica com o cliente na pausa).
   * - Cupom incide só sobre o tempo (não sobre seguro e taxas). Total = tempo − desconto + seguro + taxas − carteira.
   */
  calculate(input: {
    snapshot: PriceSnapshot;
    elapsedSeconds: number;
    pausedSeconds: number;
    fees?: FeeCharge[];
    walletAvailableCents?: number;
  }): PriceBreakdown {
    const s = input.snapshot;
    const elapsed = Math.max(0, Math.floor(input.elapsedSeconds));
    const paused = Math.min(elapsed, Math.max(0, Math.floor(input.pausedSeconds)));
    const lines: PriceLine[] = [];

    if (!s.subscriptionCovered) {
      if (s.unit === 'minute') {
        if (s.unlockFeeCents > 0) lines.push({ code: 'unlock', description: 'Desbloqueio', quantity: 1, unitCents: s.unlockFeeCents, amountCents: s.unlockFeeCents });
        const rideMinutes = startedUnits(elapsed - paused, 60);
        lines.push({ code: 'time', description: 'Tempo de uso (por minuto)', quantity: rideMinutes, unitCents: s.unitPriceCents, amountCents: rideMinutes * s.unitPriceCents });
        const pauseMinutes = startedUnits(paused, 60);
        if (pauseMinutes > 0 && s.pausePerMinuteCents > 0) {
          lines.push({ code: 'pause', description: 'Tempo pausado (por minuto)', quantity: pauseMinutes, unitCents: s.pausePerMinuteCents, amountCents: pauseMinutes * s.pausePerMinuteCents });
        }
      } else {
        if (s.unlockFeeCents > 0) lines.push({ code: 'unlock', description: 'Desbloqueio', quantity: 1, unitCents: s.unlockFeeCents, amountCents: s.unlockFeeCents });
        const units = Math.max(1, startedUnits(elapsed, UNIT_SECONDS[s.unit]));
        lines.push({ code: 'time', description: `Tempo de uso (por ${UNIT_LABEL[s.unit]})`, quantity: units, unitCents: s.unitPriceCents, amountCents: units * s.unitPriceCents });
      }
    } else {
      lines.push({ code: 'subscription', description: 'Coberto pela assinatura', amountCents: 0 });
    }
    const subtotalCents = lines.reduce((acc, l) => acc + l.amountCents, 0);

    let discountCents = 0;
    if (s.coupon && subtotalCents > 0) {
      discountCents =
        s.coupon.discountType === 'percent'
          ? Math.round((subtotalCents * (s.coupon.percentOff ?? 0)) / 100)
          : (s.coupon.amountOffCents ?? 0);
      discountCents = Math.min(discountCents, subtotalCents);
      if (discountCents > 0) lines.push({ code: 'coupon', description: `Cupom ${s.coupon.code}`, amountCents: -discountCents });
    }

    const insuranceCents = s.insurancePremiumCents;
    if (insuranceCents > 0) {
      const coverage = s.coverage ?? 'basic';
      lines.push({ code: `insurance_${coverage}`, description: COVERAGE_LABEL[coverage], quantity: 1, unitCents: insuranceCents, amountCents: insuranceCents });
    }

    let feesCents = 0;
    for (const f of input.fees ?? []) {
      feesCents += f.amountCents;
      lines.push({ code: f.code, description: f.description, quantity: 1, unitCents: f.amountCents, amountCents: f.amountCents });
    }

    let totalCents = subtotalCents - discountCents + insuranceCents + feesCents;
    const breakdown: PriceBreakdown = { lines, subtotalCents, discountCents, insuranceCents, feesCents, totalCents };
    if (input.walletAvailableCents && input.walletAvailableCents > 0 && totalCents > 0) {
      const walletAppliedCents = Math.min(input.walletAvailableCents, totalCents);
      totalCents -= walletAppliedCents;
      lines.push({ code: 'wallet', description: 'Créditos da carteira', amountCents: -walletAppliedCents });
      breakdown.walletAppliedCents = walletAppliedCents;
      breakdown.totalCents = totalCents;
    }
    return breakdown;
  }

  // ───────────── consultas usadas pelo aluguel e pela cotação ─────────────

  async activePlan(code: PlanCode): Promise<PricingPlan> {
    const plan = await this.prisma.pricingPlan.findFirst({ where: { code, active: true } });
    if (!plan) throw notFound(`Plano ${code} indisponível.`);
    return plan;
  }

  /** Valida o cupom para o cliente/plano. Devolve o cupom ou a mensagem de recusa. */
  /** `planCode` ausente (validação na conta, contrato v2) não confere a elegibilidade por plano. */
  async checkCoupon(code: string, planCode: PlanCode | undefined, customerId?: string): Promise<{ coupon?: Coupon; message?: string }> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    const now = new Date();
    if (!coupon || !coupon.active) return { message: 'Cupom não encontrado.' };
    if (coupon.validFrom && coupon.validFrom > now) return { message: 'Cupom ainda não está válido.' };
    if (coupon.validUntil && coupon.validUntil < now) return { message: 'Cupom expirado.' };
    if (planCode && coupon.planCodes.length > 0 && !coupon.planCodes.includes(planCode)) return { message: 'Cupom não vale para este plano.' };
    if (coupon.maxRedemptions != null && coupon.redemptions >= coupon.maxRedemptions) return { message: 'Cupom esgotado.' };
    if (customerId && coupon.maxRedemptionsPerCustomer != null) {
      // Fix round 1 (I4): conta também os usos do mesmo CPF em contas excluídas/recriadas.
      const hash = await this.cpfHashFor(customerId);
      const used = await this.prisma.couponRedemption.count({ where: { couponId: coupon.id, OR: [{ customerId }, ...(hash ? [{ cpfHash: hash }] : [])] } });
      if (used >= coupon.maxRedemptionsPerCustomer) return { message: 'Você já usou este cupom.' };
    }
    return { coupon };
  }

  async requireCoupon(code: string, planCode: PlanCode, customerId: string): Promise<Coupon> {
    const r = await this.checkCoupon(code, planCode, customerId);
    if (!r.coupon) throw unprocessable('coupon-invalid', r.message ?? 'Cupom inválido.');
    return r.coupon;
  }

  async feeAmount(code: string, fallbackCents: number): Promise<number> {
    const fee = await this.prisma.fee.findUnique({ where: { code } });
    return fee && fee.active ? fee.amountCents : fallbackCents;
  }

  /**
   * Contrato v2: `model` (catálogo) substitui o preço por minuto — e o desbloqueio, se o modelo tiver um — só no plano
   * por minuto (unidade `minute`). Os demais planos têm preço único para a frota.
   */
  static snapshotFrom(
    plan: PricingPlan,
    insurancePremiumCents: number,
    coverage: InsuranceCoverage,
    coupon?: Coupon | null,
    subscriptionCovered = false,
    model?: { pricePerMinuteCents: number; unlockFeeCents?: number | null } | null,
  ): PriceSnapshot {
    const perMinuteModel = plan.unit === 'minute' && model ? model : null;
    const snap: PriceSnapshot = {
      planCode: plan.code,
      unit: plan.unit,
      unlockFeeCents: perMinuteModel?.unlockFeeCents ?? plan.unlockFeeCents,
      unitPriceCents: perMinuteModel ? perMinuteModel.pricePerMinuteCents : plan.unitPriceCents,
      pausePerMinuteCents: plan.pausePerMinuteCents,
      insurancePremiumCents,
      coverage,
      subscriptionCovered,
    };
    if (coupon) {
      snap.coupon = { code: coupon.code, discountType: coupon.discountType, percentOff: coupon.percentOff ?? undefined, amountOffCents: coupon.amountOffCents ?? undefined };
    }
    return snap;
  }
}

const PURE = new PricingService(undefined as never);
/** Cálculo puro (sem banco), usado pelos mapeadores. */
export const calculatePrice = (input: Parameters<PricingService['calculate']>[0]): PriceBreakdown => PURE.calculate(input);
