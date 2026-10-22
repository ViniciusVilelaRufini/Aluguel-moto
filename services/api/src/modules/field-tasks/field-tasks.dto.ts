import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { PageQuery } from '../../common/pagination';

const TYPES = ['collect', 'battery_swap', 'maintenance', 'reposition', 'inspection'] as const;
const STATUSES = ['open', 'assigned', 'in_progress', 'done', 'canceled'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export class ListFieldTasksQuery extends PageQuery {
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsIn(TYPES) type?: (typeof TYPES)[number];
  /** UUID do operador ou `me`. */
  @IsOptional() @IsString() @MaxLength(36) assigneeId?: string;
  @IsOptional() @IsUUID() vehicleId?: string;
}

export class FieldTaskCreateDto {
  @IsIn(TYPES) type: (typeof TYPES)[number];
  @IsUUID() vehicleId: string;
  @IsIn(PRIORITIES) priority: (typeof PRIORITIES)[number];
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) targetLat?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) targetLng?: number;
  @IsOptional() @IsUUID() maintenanceTaskId?: string;
}

export class FieldTaskUpdateDto {
  @IsOptional() @IsIn(PRIORITIES) priority?: (typeof PRIORITIES)[number];
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
}

export class FieldTaskCompleteDto {
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsIn(['free', 'maintenance']) vehicleStatus?: 'free' | 'maintenance';
  /** Tarefa `collect`: galpão onde a moto chegou (volta a `free` com esse `depotId` e as coordenadas do galpão). */
  @IsOptional() @IsUUID() depotId?: string;
  @IsOptional() @IsDateString() completedAt?: string;
}

export class ChecklistItemDto {
  @IsBoolean() ok: boolean;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

/** `configuredMaxKmh` é observação (0..100), não limite configurável (decisão #13). */
export class SpeedLimiterCheckDto {
  @IsBoolean() ok: boolean;
  @IsInt() @Min(0) @Max(100) configuredMaxKmh: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class InspectionDto {
  @ValidateNested() @Type(() => ChecklistItemDto) brakes: ChecklistItemDto;
  @ValidateNested() @Type(() => ChecklistItemDto) tires: ChecklistItemDto;
  @ValidateNested() @Type(() => ChecklistItemDto) lights: ChecklistItemDto;
  @ValidateNested() @Type(() => ChecklistItemDto) bell: ChecklistItemDto;
  @ValidateNested() @Type(() => SpeedLimiterCheckDto) speedLimiter: SpeedLimiterCheckDto;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsString({ each: true }) photoObjectKeys: string[];
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsDateString() recordedAt: string;
}

export class BatterySwapDto {
  @IsString() @MinLength(3) @MaxLength(64) removedBatterySerial: string;
  @IsString() @MinLength(3) @MaxLength(64) installedBatterySerial: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) installedBatteryPct?: number;
  @IsDateString() recordedAt: string;
}

export class ListMaintenanceQuery extends PageQuery {
  @IsOptional() @IsIn(['scheduled', 'in_progress', 'done', 'canceled']) status?: 'scheduled' | 'in_progress' | 'done' | 'canceled';
  @IsOptional() @IsIn(['preventive', 'corrective']) kind?: 'preventive' | 'corrective';
  @IsOptional() @IsUUID() vehicleId?: string;
}

export class MaintenanceCreateDto {
  @IsUUID() vehicleId: string;
  @IsIn(['preventive', 'corrective']) kind: 'preventive' | 'corrective';
  @IsString() @MinLength(3) @MaxLength(120) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsDateString() scheduledFor?: string;
  @IsOptional() @IsBoolean() createFieldTask?: boolean;
}

export class MaintenanceUpdateDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(['scheduled', 'in_progress', 'done', 'canceled']) status?: 'scheduled' | 'in_progress' | 'done' | 'canceled';
  @IsOptional() @IsDateString() scheduledFor?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
