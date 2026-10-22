import { Body, Controller, Delete, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { INSURANCE_COVERAGES, PLAN_CODES, type InsuranceCoverage, type PlanCode } from '../../common/enums';
import { Idempotent } from '../../common/idempotency/idempotency.interceptor';
import { badRequest, type ValidationIssue } from '../../common/problem';
import { CurrentUser, CustomerOnly, Principal } from '../auth/principal';
import { DepotReservationsService } from './depot-reservations.service';
import { ReservationsService } from './reservations.service';

/** Só `vehicleId` = reserva de rua; com `depotId` = retirada no galpão (demais campos validados no handler). */
export class ReservationCreateDto {
  @IsUUID()
  vehicleId: string;

  @IsOptional()
  @IsUUID()
  depotId?: string;

  @IsOptional()
  @IsIn(['now', 'scheduled'])
  pickupMode?: 'now' | 'scheduled';

  @IsOptional()
  @IsDateString()
  pickupAt?: string;

  @IsOptional()
  @IsIn(PLAN_CODES)
  planCode?: PlanCode;

  @IsOptional()
  @IsIn(INSURANCE_COVERAGES)
  coverage?: InsuranceCoverage;

  @IsOptional()
  @IsIn(['card', 'pix'])
  depositMethod?: 'card' | 'pix';

  @IsOptional()
  @IsUUID()
  cardId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
}

const DEPOT_REQUIRED = ['pickupMode', 'planCode', 'coverage', 'depositMethod'] as const;

@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservations: ReservationsService,
    private readonly depotReservations: DepotReservationsService,
  ) {}

  /**
   * Reserva de rua (sem `depotId`) ou de retirada no galpão (com `depotId`). No galpão o `Idempotency-Key` é obrigatório
   * (o contrato o marca opcional porque o OpenAPI não expressa a condição); com a chave, o interceptor repete a resposta.
   */
  @Post()
  @CustomerOnly()
  @Idempotent({ required: false })
  create(@Body() dto: ReservationCreateDto, @CurrentUser() u: Principal, @Headers('idempotency-key') key?: string) {
    if (!dto.depotId) return this.reservations.create(u.customerId!, dto.vehicleId);
    const issues: ValidationIssue[] = [];
    if (!key) issues.push({ field: 'Idempotency-Key', message: 'obrigatório na reserva de galpão' });
    for (const f of DEPOT_REQUIRED) if (!dto[f]) issues.push({ field: f, message: 'obrigatório na reserva de galpão' });
    if (issues.length) throw badRequest('Dados da reserva de galpão incompletos.', issues);
    return this.depotReservations.create(
      u.customerId!,
      {
        vehicleId: dto.vehicleId,
        depotId: dto.depotId,
        pickupMode: dto.pickupMode!,
        pickupAt: dto.pickupAt,
        planCode: dto.planCode!,
        coverage: dto.coverage!,
        depositMethod: dto.depositMethod!,
        cardId: dto.cardId,
        couponCode: dto.couponCode,
      },
      key!,
    );
  }

  /** Reserva aberta (`active` ou `handover`); `pickupCode` só aqui e na criação (rota do próprio dono). */
  @Get('current')
  @CustomerOnly()
  current(@CurrentUser() u: Principal) {
    return this.reservations.current(u.customerId!, (id, exp) => this.depotReservations.pickupCode(id, exp));
  }

  @Delete(':id')
  @HttpCode(204)
  @CustomerOnly()
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal): Promise<void> {
    await this.reservations.cancel(u.customerId!, id);
  }
}
