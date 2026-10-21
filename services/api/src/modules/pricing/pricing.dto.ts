import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { INSURANCE_COVERAGES, PLAN_CODES, type InsuranceCoverage, type PlanCode } from '../../common/enums';
import { PageQuery } from '../../common/pagination';

const toBool = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true');

export class IncludeInactiveQuery {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  includeInactive?: boolean;
}

export class PricingPlanInputDto {
  @IsIn(PLAN_CODES)
  code: PlanCode;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsIn(['minute', 'hour', 'day', 'week', 'month'])
  unit: 'minute' | 'hour' | 'day' | 'week' | 'month';

  @IsInt()
  @Min(0)
  unlockFeeCents: number;

  @IsInt()
  @Min(0)
  unitPriceCents: number;

  @IsInt()
  @Min(0)
  pausePerMinuteCents: number;

  @IsBoolean()
  recurring: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class QuoteRequestDto {
  @IsIn(PLAN_CODES)
  planCode: PlanCode;

  @IsIn(INSURANCE_COVERAGES)
  coverage: InsuranceCoverage;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  couponCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(44640)
  estimatedMinutes?: number;
}

export class ListCouponsQuery extends PageQuery {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  q?: string;
}

export class CouponInputDto {
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsIn(['percent', 'fixed'])
  discountType: 'percent' | 'fixed';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountOffCents?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PLAN_CODES, { each: true })
  planCodes?: PlanCode[];

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptionsPerCustomer?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class FeeInputDto {
  @Matches(/^[a-z0-9_]{2,60}$/)
  code: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(0)
  amountCents: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
