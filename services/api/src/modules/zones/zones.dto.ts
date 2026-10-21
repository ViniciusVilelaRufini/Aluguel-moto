import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, Validate, ValidateNested,
  ValidatorConstraint, ValidatorConstraintInterface,
} from 'class-validator';
import { MAX_SPEED_KMH, ZONE_TYPES, type ZoneType } from '../../common/enums';

/** Estrutura GeoJSON: anéis com ≥ 4 posições `[lng, lat]` numéricas (o fechamento e a autointerseção são checados depois → 422). */
@ValidatorConstraint({ name: 'polygonCoordinates' })
export class PolygonCoordinatesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (!Array.isArray(value) || value.length < 1) return false;
    return value.every(
      (ring) =>
        Array.isArray(ring) &&
        ring.length >= 4 &&
        ring.every((pos) => Array.isArray(pos) && pos.length === 2 && pos.every((n) => typeof n === 'number' && Number.isFinite(n))),
    );
  }
  defaultMessage(): string {
    return 'coordinates deve ser uma lista de anéis com ao menos 4 posições [lng, lat]';
  }
}

export class GeoJsonPolygonDto {
  @IsIn(['Polygon'])
  type: 'Polygon';

  @Validate(PolygonCoordinatesConstraint)
  coordinates: number[][][];
}

export class GeoZoneInputDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsIn(ZONE_TYPES)
  type: ZoneType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SPEED_KMH)
  speedLimitKmh?: number;

  @ValidateNested()
  @Type(() => GeoJsonPolygonDto)
  geometry: GeoJsonPolygonDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListZonesQuery {
  /** `minLng,minLat,maxLng,maxLat` */
  @IsOptional()
  @IsString()
  bbox?: string;

  @IsOptional()
  @IsIn(ZONE_TYPES)
  type?: ZoneType;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean;
}
