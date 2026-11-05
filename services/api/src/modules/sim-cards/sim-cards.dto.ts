import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export const SIM_CARD_STATUSES = ['active', 'suspended', 'cancelled'] as const;
export type SimCardStatusValue = (typeof SIM_CARD_STATUSES)[number];

const ICCID = /^[0-9]{18,22}$/;
const MSISDN = /^\+?[0-9]{10,15}$/;
const toBool = ({ value }: { value: unknown }) => (value === undefined ? undefined : value === true || value === 'true');
/** Campo que aceita `null` (limpa) ou ausente. */
const nullable = () => ValidateIf((_o, v) => v !== undefined && v !== null);
/** Campo que só aceita ausente (`null` falha na validação do tipo). */
const optional = () => ValidateIf((_o, v) => v !== undefined);

/** `GET /sim-cards`. */
export class ListSimCardsQuery {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  q?: string;

  @IsOptional()
  @IsIn(SIM_CARD_STATUSES)
  status?: SimCardStatusValue;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  unlinked?: boolean;
}

/** `CreateSimCardRequest`. */
export class CreateSimCardDto {
  @IsString()
  @Matches(ICCID)
  iccid: string;

  @nullable()
  @Matches(MSISDN)
  msisdn?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  carrier: string;

  @nullable()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apn?: string | null;

  @optional()
  @IsIn(SIM_CARD_STATUSES)
  status?: SimCardStatusValue;

  @nullable()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  /** Vincula o chip ao rastreador desta moto. */
  @nullable()
  @IsUUID()
  vehicleId?: string | null;

  /** Vincula o chip a este rastreador (estoque ou instalado). Com `vehicleId` junto → 400. */
  @nullable()
  @IsUUID()
  trackerId?: string | null;
}

/** `UpdateSimCardRequest`: tudo opcional; `vehicleId: null` ou `trackerId: null` desvincula. */
export class UpdateSimCardDto {
  @optional()
  @IsString()
  @Matches(ICCID)
  iccid?: string;

  @nullable()
  @Matches(MSISDN)
  msisdn?: string | null;

  @optional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  carrier?: string;

  @nullable()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apn?: string | null;

  @optional()
  @IsIn(SIM_CARD_STATUSES)
  status?: SimCardStatusValue;

  @nullable()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @nullable()
  @IsUUID()
  vehicleId?: string | null;

  /** Vincula (ou move) o chip a este rastreador; `null` desvincula. Com `vehicleId` junto → 400. */
  @nullable()
  @IsUUID()
  trackerId?: string | null;
}
