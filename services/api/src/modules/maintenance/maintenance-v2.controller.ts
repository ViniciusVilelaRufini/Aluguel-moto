import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PageQuery } from '../../common/pagination';
import { CurrentUser, CustomerOnly, Principal, StaffOnly } from '../auth/principal';
import { MaintenanceV2Service } from './maintenance-v2.service';
import type { VehicleServiceStatus } from './service-due';

export class VehicleServiceQuery extends PageQuery {
  @IsOptional()
  @IsIn(['ok', 'due_soon', 'overdue'])
  status?: VehicleServiceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;
}

export class MaintenanceSlotsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(14)
  days?: number;
}

export class CustomerMaintenanceRequestDto {
  @IsDateString()
  slotStartsAt: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  description: string;
}

/** Tabela "Manutenção" (preventiva por km/horas). */
@Controller('maintenance')
export class VehicleServiceController {
  constructor(private readonly maintenance: MaintenanceV2Service) {}

  @Get('vehicles')
  @StaffOnly('admin', 'operacao', 'campo')
  list(@Query() q: VehicleServiceQuery) {
    return this.maintenance.serviceTable(q);
  }
}

/** Manutenção agendada pelo cliente do plano semanal/mensal. */
@Controller('me')
export class CustomerMaintenanceController {
  constructor(private readonly maintenance: MaintenanceV2Service) {}

  @Get('maintenance-slots')
  @CustomerOnly()
  slots(@Query() q: MaintenanceSlotsQuery, @CurrentUser() u: Principal) {
    return this.maintenance.slots(u.customerId!, q.days ?? 7);
  }

  @Get('maintenance-requests')
  @CustomerOnly()
  list(@CurrentUser() u: Principal) {
    return this.maintenance.listRequests(u.customerId!);
  }

  @Post('maintenance-requests')
  @CustomerOnly()
  create(@Body() dto: CustomerMaintenanceRequestDto, @CurrentUser() u: Principal) {
    return this.maintenance.createRequest(u, dto);
  }

  @Delete('maintenance-requests/:id')
  @HttpCode(200)
  @CustomerOnly()
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.maintenance.cancelRequest(u, id);
  }
}
