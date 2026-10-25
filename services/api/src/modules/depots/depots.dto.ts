import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { VEHICLE_STATUSES, type VehicleStatus } from '../../common/enums';

export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const RESERVATION_STATUSES = ['active', 'converted', 'canceled', 'expired', 'handover'] as const;
export type ReservationStatusValue = (typeof RESERVATION_STATUSES)[number];

const toBool = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true');

export class DepotOpeningHoursDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @Matches(HHMM, { message: 'opensAt deve estar no formato HH:MM' })
  opensAt: string;

  @Matches(HHMM, { message: 'closesAt deve estar no formato HH:MM' })
  closesAt: string;
}

/** Campos opcionais comuns ao cadastro e à edição. */
class DepotCommonFields {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  pickupNowWindowMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  maxScheduleDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  scheduledGraceMinutes?: number;

  @IsOptional()
  @IsUUID()
  swapStationId?: string;

  /** Mínimo de baterias `charged`; abaixo dele abre `battery_stock_low` (0 = sem alerta). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  minChargedBatteries?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class DepotInputDto extends DepotCommonFields {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DepotOpeningHoursDto)
  openingHours: DepotOpeningHoursDto[];
}

export class DepotUpdateDto extends DepotCommonFields {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DepotOpeningHoursDto)
  openingHours?: DepotOpeningHoursDto[];
}

export class ListDepotsQuery {
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
  @Transform(toBool)
  @IsBoolean()
  includeInactive?: boolean;
}

export class DepotVehiclesQuery {
  @IsOptional()
  @IsIn(VEHICLE_STATUSES)
  status?: VehicleStatus;

  @IsOptional()
  @IsUUID()
  vehicleModelId?: string;
}

export class DepotPickupsQuery {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, { message: 'date deve estar no formato YYYY-MM-DD' })
  date: string;

  @IsOptional()
  @IsIn(RESERVATION_STATUSES)
  status?: ReservationStatusValue;
}
