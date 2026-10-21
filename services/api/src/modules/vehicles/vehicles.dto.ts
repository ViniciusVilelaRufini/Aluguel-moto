import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { VEHICLE_STATUSES, type VehicleStatus } from '../../common/enums';
import { PageQuery } from '../../common/pagination';

export class NearbyQuery {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(20000)
  radiusM?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRangeKm?: number;
}

export class ListVehiclesQuery extends PageQuery {
  @IsOptional()
  @IsIn(VEHICLE_STATUSES)
  status?: VehicleStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  maxBatteryPct?: number;
}

export class VehicleCreateDto {
  @Matches(/^VLT-\d{4,}$/)
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  model: string;

  @Matches(/^[a-zA-Z0-9:_-]{1,128}$/)
  thingName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  qrCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  batterySerial?: string;
}

export class VehicleUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  model?: string;

  @IsOptional()
  @Matches(/^[a-zA-Z0-9:_-]{1,128}$/)
  thingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  qrCode?: string;
}

export class VehicleStatusChangeDto {
  @IsIn(['free', 'maintenance'])
  status: 'free' | 'maintenance';

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class TrackQuery {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

export class BooleanQuery {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  includeInactive?: boolean;
}
