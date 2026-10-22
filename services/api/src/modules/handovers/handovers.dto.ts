import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PageQuery } from '../../common/pagination';

export const HANDOVER_TYPES = ['pickup', 'return_depot'] as const;
export type HandoverTypeValue = (typeof HANDOVER_TYPES)[number];
export const HANDOVER_STATUSES = ['pending_customer', 'accepted', 'disputed', 'canceled'] as const;
export type HandoverStatusValue = (typeof HANDOVER_STATUSES)[number];

/** Chave devolvida por `POST /handovers/uploads` (`handovers/<uuid>.<ext>`); sem `..`. */
export const HANDOVER_PHOTO_KEY = /^handovers\/(?!.*\.\.)[\w./-]+$/;

export class HandoverChecklistItemDto {
  @IsString() @MinLength(1) @MaxLength(40) code: string;
  @IsBoolean() ok: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class HandoverCreateDto {
  @IsIn(HANDOVER_TYPES) type: HandoverTypeValue;

  /** Obrigatório em `return_depot`; em `pickup`, quando enviado, precisa ser o galpão da reserva. */
  @ValidateIf((o: HandoverCreateDto) => o.type === 'return_depot' || o.depotId !== undefined)
  @IsUUID()
  depotId?: string;

  @ValidateIf((o: HandoverCreateDto) => o.type === 'pickup')
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  pickupCode?: string;

  @ValidateIf((o: HandoverCreateDto) => o.type === 'return_depot')
  @IsUUID()
  rentalId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => HandoverChecklistItemDto)
  checklist: HandoverChecklistItemDto[];

  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  @Matches(HANDOVER_PHOTO_KEY, { each: true, message: 'photoKeys deve conter chaves de POST /handovers/uploads (prefixo handovers/)' })
  photoKeys: string[];

  @IsInt() @Min(0) @Max(100) batteryPct: number;

  @IsOptional() @IsString() @MaxLength(64) batterySerial?: string;
}

export class HandoverDisputeDto {
  @IsString() @MinLength(3) @MaxLength(500) reason: string;
}

export class ListHandoversQuery extends PageQuery {
  @IsOptional() @IsIn(HANDOVER_STATUSES) status?: HandoverStatusValue;
  @IsOptional() @IsUUID() depotId?: string;
  @IsOptional() @IsIn(HANDOVER_TYPES) type?: HandoverTypeValue;
}
