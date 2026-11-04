import type { PricingPlan } from '@prisma/client';
import type { InsuranceCoverage } from '../../common/enums';
import { counterPeriodSeconds, UNIT_SECONDS } from './plan-units';
import { type PriceSnapshot, PricingService } from './pricing.service';

export { counterPeriodSeconds } from './plan-units';

/** Planos vendidos no balcão (pré-pagos pelo período). */
export const COUNTER_PLAN_CODES = ['day', 'weekly', 'monthly'] as const;
export type CounterPlanCode = (typeof COUNTER_PLAN_CODES)[number];

/** Quantidade máxima por plano: diária até 30, semana até 4, mês até 3. */
export const COUNTER_QUANTITY_MAX: Record<CounterPlanCode, number> = { day: 30, weekly: 4, monthly: 3 };

/** Plano vendido no balcão (`day`, `weekly`, `monthly`). */
export const isCounterPlanCode = (code: string): code is CounterPlanCode => (COUNTER_PLAN_CODES as readonly string[]).includes(code);

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
  const planCode = input.plan.code;
  // Só chega aqui plano lido por `activePlan(planCode do balcão)`; outro código é erro de programação, não do cliente.
  if (!isCounterPlanCode(planCode)) throw new Error(`counter_plan_not_supported:${planCode}`);
  const planCents = input.plan.unitPriceCents * input.quantity;
  return {
    planCode,
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
