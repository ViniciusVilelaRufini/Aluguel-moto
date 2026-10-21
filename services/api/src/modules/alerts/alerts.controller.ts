import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PageQuery } from '../../common/pagination';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { AlertsService } from './alerts.service';

const ALERT_TYPES = [
  'out_of_operation_area', 'forbidden_zone_entered', 'fall_detected', 'tamper', 'battery_critical', 'movement_without_rental',
  'vehicle_offline', 'command_failed', 'customer_not_ok', 'incident_reported', 'speed_limiter_noncompliant',
] as const;

export class ListAlertsQuery extends PageQuery {
  @IsOptional()
  @IsIn(['open', 'assigned', 'resolved'])
  status?: 'open' | 'assigned' | 'resolved';

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsIn(ALERT_TYPES)
  type?: (typeof ALERT_TYPES)[number];

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

export class AlertAssignDto {
  @IsUUID()
  assigneeId: string;
}

export class AlertResolveDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  resolution: string;
}

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @StaffOnly('admin', 'operacao', 'suporte')
  list(@Query() q: ListAlertsQuery) {
    return this.alerts.list(q);
  }

  @Get(':id')
  @StaffOnly('admin', 'operacao', 'suporte')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.alerts.get(id);
  }

  @Post(':id/assign')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'suporte')
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AlertAssignDto, @CurrentUser() u: Principal) {
    return this.alerts.assign(id, dto.assigneeId, u);
  }

  @Post(':id/resolve')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'suporte')
  resolve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AlertResolveDto, @CurrentUser() u: Principal) {
    return this.alerts.resolve(id, dto.resolution, u);
  }
}
