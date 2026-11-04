import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { INSURANCE_COVERAGES, type InsuranceCoverage } from '../../common/enums';
import { COUNTER_METHODS, type CounterMethod } from '../payments/counter-methods';
import { COUNTER_PLAN_CODES, type CounterPlanCode } from '../pricing/counter-pricing';
import { HANDOVER_CONTRACT_KEY } from './handovers.dto';

/** `GET /handovers/{id}/counter-quote`. O limite por plano (30/4/3) é conferido no serviço (`field: quantity`). */
export class CounterQuoteQuery {
  @IsIn(COUNTER_PLAN_CODES) planCode: CounterPlanCode;
  @IsIn(INSURANCE_COVERAGES) coverage: InsuranceCoverage;
  @Type(() => Number) @IsInt() @Min(1) @Max(30) quantity: number = 1;
}

/** `CounterPaymentInput`: valor recebido no balcão (só método e referência; o balcão não digita cartão). */
export class CounterPaymentInputDto {
  @IsIn(COUNTER_METHODS) method: CounterMethod;
  @IsInt() @Min(1) amountCents: number;
  @IsOptional() @IsString() @MaxLength(64) reference?: string;
}

/** `CounterDepositInput`: caução recebida no balcão (0 = sem caução). */
export class CounterDepositInputDto {
  @IsIn(COUNTER_METHODS) method: CounterMethod;
  @IsInt() @Min(0) @Max(1_000_000) amountCents: number;
  @IsOptional() @IsString() @MaxLength(64) reference?: string;
}

/**
 * `CounterCheckoutRequest` (`POST /handovers/{id}/counter-checkout`). As fotos do contrato são 1 a 4, mas a falta delas
 * é `422 contract-photos-required` no serviço (ruling C8); aqui só o formato e o máximo.
 */
export class CounterCheckoutDto {
  @IsIn(COUNTER_PLAN_CODES) planCode: CounterPlanCode;
  @IsOptional() @IsInt() @Min(1) @Max(30) quantity?: number;
  @IsIn(INSURANCE_COVERAGES) coverage: InsuranceCoverage;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  @Matches(HANDOVER_CONTRACT_KEY, { each: true, message: 'contractPhotoKeys deve conter chaves de POST /handovers/uploads com purpose contract (prefixo contracts/)' })
  contractPhotoKeys?: string[];

  @ValidateNested() @Type(() => CounterPaymentInputDto) payment: CounterPaymentInputDto;
  @IsOptional() @ValidateNested() @Type(() => CounterDepositInputDto) deposit?: CounterDepositInputDto;
}
