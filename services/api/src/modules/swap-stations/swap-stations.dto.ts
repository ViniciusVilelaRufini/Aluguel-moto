import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

/** `station-<uuid>`: o mesmo formato do provisionamento (`infra/scripts/provision-station.ts`) e da regra IoT. */
export const STATION_THING = /^station-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const THING_MSG = 'thingName deve ser station-<uuid> (minúsculas)';

/** Campos opcionais comuns ao cadastro e à edição (`SwapStationInput` / `SwapStationUpdate`). */
class SwapStationCommonFields {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  openingHours?: string;

  @IsOptional()
  @IsBoolean()
  open24h?: boolean;

  @IsOptional()
  @Matches(STATION_THING, { message: THING_MSG })
  thingName?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SwapStationInputDto extends SwapStationCommonFields {
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

  @IsInt()
  @Min(1)
  @Max(200)
  totalSlots: number;
}

export class SwapStationUpdateDto extends SwapStationCommonFields {
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
  @IsInt()
  @Min(1)
  @Max(200)
  totalSlots?: number;
}
