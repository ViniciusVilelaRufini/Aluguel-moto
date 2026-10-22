import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PageQuery } from '../../common/pagination';

export class CreateStationSwapDto {
  /** Conteúdo do QR fixo da estação (`vst1.<id>.<assinatura>`). */
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  stationCode: string;

  @IsUUID()
  rentalId: string;

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
}

export const STATION_SWAP_STATUSES = ['opening_slot', 'awaiting_return', 'returned', 'releasing', 'completed', 'canceled', 'failed'] as const;

export class ListStationSwapsQuery extends PageQuery {
  @IsOptional()
  @IsIn(STATION_SWAP_STATUSES as unknown as string[])
  status?: (typeof STATION_SWAP_STATUSES)[number];
}
