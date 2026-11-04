import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { INSURANCE_COVERAGES, type InsuranceCoverage } from '../../common/enums';
import { COUNTER_PLAN_CODES, type CounterPlanCode } from '../pricing/counter-pricing';

/** `GET /handovers/{id}/counter-quote`. O limite por plano (30/4/3) é conferido no serviço (`field: quantity`). */
export class CounterQuoteQuery {
  @IsIn(COUNTER_PLAN_CODES) planCode: CounterPlanCode;
  @IsIn(INSURANCE_COVERAGES) coverage: InsuranceCoverage;
  @Type(() => Number) @IsInt() @Min(1) @Max(30) quantity: number = 1;
}
