import { Inject, Injectable } from '@nestjs/common';
import type { InsuranceCoverage } from '../../common/enums';
import { badRequest, notFound } from '../../common/problem';
import { INSURANCE, type InsurancePort } from '../../ports/insurance.port';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCounterQuote, COUNTER_QUANTITY_MAX, type CounterPlanCode, type CounterQuote } from '../pricing/counter-pricing';
import { PricingService } from '../pricing/pricing.service';

const QUANTITY_LABEL: Record<CounterPlanCode, string> = { day: 'diária até 30', weekly: 'semana até 4', monthly: 'mês até 3' };

/** Balcão do galpão (pré-reserva/balcão): cotação do plano pré-pago para a entrega de saída. */
@Injectable()
export class CounterCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    @Inject(INSURANCE) private readonly insurance: InsurancePort,
  ) {}

  /** `getHandoverCounterQuote`: plano × quantidade + seguro único; só entrega `pickup` (senão 404). */
  async quote(handoverId: string, q: { planCode: CounterPlanCode; coverage: InsuranceCoverage; quantity: number }): Promise<CounterQuote> {
    const h = await this.prisma.handover.findUnique({ where: { id: handoverId }, select: { id: true, type: true } });
    if (!h || h.type !== 'pickup') throw notFound('Entrega não encontrada.');
    const max = COUNTER_QUANTITY_MAX[q.planCode];
    if (q.quantity > max) {
      throw badRequest(`Quantidade acima do limite do plano (${QUANTITY_LABEL[q.planCode]}).`, [{ field: 'quantity', message: `máximo ${max}` }]);
    }
    const [plan, dayPlan, premium] = await Promise.all([
      this.pricing.activePlan(q.planCode),
      this.pricing.activePlan('day'),
      this.insurance.quote({ coverage: q.coverage, planCode: q.planCode }),
    ]);
    return buildCounterQuote({ plan, dayPlan, premiumCents: premium.premiumCents, coverage: q.coverage, quantity: q.quantity });
  }
}
