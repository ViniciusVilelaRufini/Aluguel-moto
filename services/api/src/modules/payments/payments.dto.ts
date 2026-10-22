import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { PageQuery } from '../../common/pagination';

export class PaymentCardCreateDto {
  /** Só o token do SDK do gateway — número, CVV e validade nunca chegam ao backend. */
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  // Recusa algo com cara de número de cartão (12 a 19 dígitos, com ou sem espaços/hífens): só o token do gateway é aceito.
  @Matches(/^(?![\d\s-]{12,25}$)/, { message: 'cardToken deve ser o token gerado pelo SDK do gateway, nunca o número do cartão' })
  cardToken: string;

  @IsOptional()
  @IsBoolean()
  setDefault?: boolean;
}

export class ListDepositsQuery extends PageQuery {
  @IsOptional()
  @IsIn(['awaiting_pix', 'held', 'failed', 'captured', 'released'])
  status?: 'awaiting_pix' | 'held' | 'failed' | 'captured' | 'released';

  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class SubscriptionCreateDto {
  @IsIn(['weekly', 'monthly'])
  planCode: 'weekly' | 'monthly';

  @IsOptional()
  @IsUUID()
  cardId?: string;

  /** Contrato v2: moto fixa (opcional). */
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

export class SubscriptionPauseDto {
  @IsInt()
  @Min(1)
  @Max(7)
  days: number;
}

export class SubscriptionVehicleDto {
  @IsUUID()
  vehicleId: string;
}

export class ListPaymentsQuery extends PageQuery {
  @IsOptional()
  @IsIn(['pending', 'authorized', 'captured', 'canceled', 'paid', 'refunded', 'partially_refunded', 'failed'])
  status?: string;

  @IsOptional()
  @IsIn(['rental', 'deposit', 'top_up', 'subscription', 'fee'])
  kind?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  rentalId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class RefundDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class MercadoPagoWebhookDataDto {
  @IsString()
  id: string;
}

/** Corpo do webhook do Mercado Pago (snake_case, decisão #12). */
export class MercadoPagoWebhookDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsBoolean()
  live_mode?: boolean;

  @IsOptional()
  @IsString()
  date_created?: string;

  @IsOptional()
  @IsInt()
  user_id?: number;

  @IsOptional()
  @IsString()
  api_version?: string;

  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data: MercadoPagoWebhookDataDto;
}

export class TopUpDto {
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(100000)
  amountCents?: number;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsIn(['card', 'pix'])
  method: 'card' | 'pix';

  @IsOptional()
  @IsUUID()
  cardId?: string;
}

export class WalletAdjustmentDto {
  @IsInt()
  @Min(-100000)
  @Max(100000)
  amountCents: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class CoverageItemDto {
  @IsString()
  code: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  limitCents?: number;
}

export class InsuranceCoverageUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  premiumCents?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CoverageItemDto)
  items?: CoverageItemDto[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListPoliciesQuery extends PageQuery {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  rentalId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
