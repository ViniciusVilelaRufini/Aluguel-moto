import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const toBool = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true');

export class ListVehicleModelsQuery {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  includeInactive?: boolean;
}

export class VehicleModelUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  categoryLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Fix round 1 (M11): só chaves do bucket de catálogo emitidas por `POST /vehicle-models/uploads`. */
  @IsOptional()
  @MaxLength(300)
  @Matches(/^catalog\/[A-Za-z0-9._-]+$/)
  photoObjectKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  pricePerMinuteCents?: number;

  /** `null` (ou `inheritPlanUnlockFee: true`) remove o desbloqueio próprio do modelo (M11). */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(10000)
  unlockFeeCents?: number | null;

  @IsOptional()
  @IsBoolean()
  inheritPlanUnlockFee?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  serviceIntervalKm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  serviceIntervalHours?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class VehicleModelInputDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @Matches(/^[a-z0-9-]{2,40}$/)
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  categoryLabel: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Fix round 1 (M11): só chaves do bucket de catálogo emitidas por `POST /vehicle-models/uploads`. */
  @IsOptional()
  @MaxLength(300)
  @Matches(/^catalog\/[A-Za-z0-9._-]+$/)
  photoObjectKey?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  pricePerMinuteCents: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  unlockFeeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  serviceIntervalKm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  serviceIntervalHours?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class SwapStationsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(50000)
  radiusM?: number;
}
