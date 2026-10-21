import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { INSURANCE_COVERAGES, PLAN_CODES, RENTAL_STATUSES, type InsuranceCoverage, type PlanCode, type RentalStatus } from '../../common/enums';
import { PageQuery } from '../../common/pagination';

export const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'] as const;
export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];

export class StartRentalDto {
  @IsUUID()
  vehicleId: string;

  @IsIn(PLAN_CODES)
  planCode: PlanCode;

  /** `basic` é o mínimo obrigatório (`insurance-required` se ausente → validação). */
  @IsIn(INSURANCE_COVERAGES)
  coverage: InsuranceCoverage;

  @IsIn(['card', 'pix'])
  depositMethod: 'card' | 'pix';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  couponCode?: string;

  @IsOptional()
  @IsUUID()
  cardId?: string;

  @IsOptional()
  @IsUUID()
  depositId?: string;

  @IsOptional()
  @IsBoolean()
  useWalletCredits?: boolean;
}

export class ListRentalsQuery extends PageQuery {
  @IsOptional()
  @IsIn(RENTAL_STATUSES)
  status?: RentalStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SwapVehicleDto {
  @IsUUID()
  newVehicleId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsUUID()
  incidentId?: string;
}

export class UploadRequestDto {
  @IsIn(UPLOAD_CONTENT_TYPES)
  contentType: UploadContentType;
}

export class EndRentalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  returnPhotoObjectKey: string;
}

export class ForceEndRentalDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class RatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class LocationShareDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes?: number;
}

export class WellbeingDto {
  @IsBoolean()
  ok: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
