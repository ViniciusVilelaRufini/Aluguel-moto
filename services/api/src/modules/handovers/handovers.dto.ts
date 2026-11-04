import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PageQuery } from '../../common/pagination';
import { UPLOAD_CONTENT_TYPES, type UploadContentType } from '../rentals/rentals.dto';

export const HANDOVER_TYPES = ['pickup', 'return_depot'] as const;
export type HandoverTypeValue = (typeof HANDOVER_TYPES)[number];
export const HANDOVER_STATUSES = ['pending_customer', 'accepted', 'disputed', 'canceled'] as const;
export type HandoverStatusValue = (typeof HANDOVER_STATUSES)[number];

/** Chave devolvida por `POST /handovers/uploads` (`handovers/<uuid>.<ext>`); sem `..`. */
export const HANDOVER_PHOTO_KEY = /^handovers\/(?!.*\.\.)[\w./-]+$/;
/** Chave das fotos do contrato do balcão devolvida por `POST /handovers/uploads` com `purpose: contract` (`contracts/<uuid>.<ext>`); sem `..`. */
export const HANDOVER_CONTRACT_KEY = /^contracts\/(?!.*\.\.)[\w./-]+$/;
export const HANDOVER_UPLOAD_PURPOSES = ['photo', 'contract'] as const;
export type HandoverUploadPurpose = (typeof HANDOVER_UPLOAD_PURPOSES)[number];

export class HandoverChecklistItemDto {
  @IsString() @MinLength(1) @MaxLength(40) code: string;
  @IsBoolean() ok: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Pedido de entrega sem QR: veio `reservationId` ou `noCodeReason` (os dois passam a ser obrigatórios). */
const isNoCodePickup = (o: { reservationId?: unknown; noCodeReason?: unknown }) => o.reservationId !== undefined || o.noCodeReason !== undefined;

export class HandoverCreateDto {
  @IsIn(HANDOVER_TYPES) type: HandoverTypeValue;

  /** Obrigatório em `return_depot`; em `pickup`, quando enviado, precisa ser o galpão da reserva. */
  @ValidateIf((o: HandoverCreateDto) => o.type === 'return_depot' || o.depotId !== undefined)
  @IsUUID()
  depotId?: string;

  /** Obrigatório em `pickup`, salvo na entrega sem QR (`reservationId` + `noCodeReason`, só admin). */
  @ValidateIf((o: HandoverCreateDto) => o.type === 'pickup' && (o.pickupCode !== undefined || !isNoCodePickup(o)))
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  pickupCode?: string;

  /** Entrega sem QR (só `pickup`, só admin): os dois juntos; o service recusa com `pickupCode` (400) e sem ser admin (403). */
  @ValidateIf(isNoCodePickup)
  @IsUUID()
  reservationId?: string;

  @ValidateIf(isNoCodePickup)
  @IsString()
  @MinLength(10)
  @MaxLength(300)
  noCodeReason?: string;

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

export class HandoverUploadDto {
  @IsIn(UPLOAD_CONTENT_TYPES) contentType: UploadContentType;
  @IsOptional() @IsIn(HANDOVER_UPLOAD_PURPOSES) purpose?: HandoverUploadPurpose;
}

export class HandoverDisputeDto {
  @IsString() @MinLength(3) @MaxLength(500) reason: string;
}

export class HandoverCancelDto {
  @IsString() @MinLength(3) @MaxLength(500) reason: string;
}

export class ListHandoversQuery extends PageQuery {
  @IsOptional() @IsIn(HANDOVER_STATUSES) status?: HandoverStatusValue;
  @IsOptional() @IsUUID() depotId?: string;
  @IsOptional() @IsIn(HANDOVER_TYPES) type?: HandoverTypeValue;
}
