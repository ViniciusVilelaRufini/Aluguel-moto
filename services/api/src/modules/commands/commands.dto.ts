import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { COMMAND_TYPES, MAX_SPEED_KMH, type CommandType } from '../../common/enums';

/** `SendCommandRequest`: `speedLimitKmh` 0..32 (nunca truncar), `reason` 3..500. */
export class SendCommandDto {
  @IsIn(COMMAND_TYPES)
  type: CommandType;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SPEED_KMH)
  speedLimitKmh?: number;

  @IsOptional()
  @IsBoolean()
  on?: boolean;
}

export class ServiceUnlockDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsUUID()
  fieldTaskId?: string;
}
