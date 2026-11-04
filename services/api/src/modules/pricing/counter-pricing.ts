import type { PricingPlan } from '@prisma/client';
import type { InsuranceCoverage } from '../../common/enums';
import { type PlanUnit, type PriceSnapshot, PricingService, UNIT_SECONDS } from './pricing.service';

/** Planos vendidos no balcão (pré-pagos pelo período). */
export const COUNTER_PLAN_CODES = ['day', 'weekly', 'monthly'] as const;
export type CounterPlanCode = (typeof COUNTER_PLAN_CODES)[number];

/** Quantidade máxima por plano: diária até 30, semana até 4, mês até 3. */
export const COUNTER_QUANTITY_MAX: Record<CounterPlanCode, number> = { day: 30, weekly: 4, monthly: 3 };

/** Período pré-pago em segundos (dia = 24 h, semana = 7 dias, mês = 30 dias). */
export const counterPeriodSeconds = (unit: PlanUnit, quantity: number): number => UNIT_SECONDS[unit] * quantity;

/** `CounterQuote` do contrato: valor a receber no balcão. */
export interface CounterQuote {
  planCode: CounterPlanCode;
  quantity: number;
  coverage: InsuranceCoverage;
  planUnitCents: number;
  planCents: number;
  insuranceCents: number;
  totalCents: number;
  excessDayCents: number;
  periodDays: number;
}

/**
 * Plano × quantidade + prêmio único do seguro (não multiplica pela quantidade). `excessDayCents` = diária do plano `day`
 * ativo (decisão 14; Interp. 3).
 */
export function buildCounterQuote(input: {
  plan: Pick<PricingPlan, 'code' | 'unit' | 'unitPriceCents'>;
  dayPlan: Pick<PricingPlan, 'unitPriceCents'>;
  premiumCents: number;
  coverage: InsuranceCoverage;
  quantity: number;
}): CounterQuote {
  const planCents = input.plan.unitPriceCents * input.quantity;
  return {
    planCode: input.plan.code as CounterPlanCode,
    quantity: input.quantity,
    coverage: input.coverage,
    planUnitCents: input.plan.unitPriceCents,
    planCents,
    insuranceCents: input.premiumCents,
    totalCents: planCents + input.premiumCents,
    excessDayCents: input.dayPlan.unitPriceCents,
    periodDays: counterPeriodSeconds(input.plan.unit, input.quantity) / UNIT_SECONDS.day,
  };
}

/** Snapshot congelado no checkout do balcão: sem desbloqueio, cupom ou assinatura; `counter` guarda o pré-pago. */
export function counterSnapshot(plan: PricingPlan, quote: CounterQuote): PriceSnapshot {
  return {
    ...PricingService.snapshotFrom(plan, quote.insuranceCents, quote.coverage),
    unlockFeeCents: 0,
    unitPriceCents: quote.planUnitCents,
    counter: { quantity: quote.quantity, prepaidCents: quote.totalCents, excessDayCents: quote.excessDayCents },
  };
}
