/**
 * Unidades de plano e a duração de cada uma (fonte única, sem dependências): usado pelo cálculo de preço
 * (`PricingService`) e pelo balcão (`counter-pricing`), sem import circular entre os dois.
 */
export type PlanUnit = 'minute' | 'hour' | 'day' | 'week' | 'month';

export const UNIT_SECONDS: Record<PlanUnit, number> = { minute: 60, hour: 3600, day: 86400, week: 7 * 86400, month: 30 * 86400 };

/** Período pré-pago do balcão em segundos (dia = 24 h, semana = 7 dias, mês = 30 dias), contado do início do aluguel. */
export const counterPeriodSeconds = (unit: PlanUnit, quantity: number): number => UNIT_SECONDS[unit] * quantity;
