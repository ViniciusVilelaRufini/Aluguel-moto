import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { COUNTER_METHODS, type CounterMethod } from './counter-methods';

/**
 * `CounterSettleRequest` (`POST /payments/{id}/counter-settle`). "Exatamente um entre `method` e `fromDepositId`" é
 * conferido no serviço (`400 validation-error`, `field: method`).
 */
export class CounterSettleDto {
  @IsInt() @Min(1) amountCents: number;
  @IsOptional() @IsIn(COUNTER_METHODS) method?: CounterMethod;
  @IsOptional() @IsUUID() fromDepositId?: string;
  @IsOptional() @IsString() @MaxLength(64) reference?: string;
}

/** `CounterRefundRequest` (`POST /payments/deposits/{id}/counter-refund`). */
export class CounterRefundDto {
  @IsInt() @Min(1) amountCents: number;
  @IsOptional() @IsString() @MaxLength(64) reference?: string;
}
