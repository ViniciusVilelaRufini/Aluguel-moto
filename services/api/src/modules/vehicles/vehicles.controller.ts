import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, CustomerOnly, CustomerOrStaff, Principal, StaffOnly } from '../auth/principal';
import { ServiceUnlockDto } from '../commands/commands.dto';
import { ListVehiclesQuery, NearbyQuery, TrackQuery, VehicleCreateDto, VehicleStatusChangeDto, VehicleUpdateDto } from './vehicles.dto';
import { VehiclesService } from './vehicles.service';

/** Rotas literais (`nearby`, `by-code/:code`) declaradas antes de `:id`. */
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get('nearby')
  @CustomerOrStaff('admin', 'operacao', 'suporte', 'campo')
  nearby(@Query() q: NearbyQuery, @CurrentUser() u: Principal) {
    return this.vehicles.nearby(u, q);
  }

  @Get('by-code/:code')
  @CustomerOrStaff('admin', 'operacao', 'suporte', 'campo')
  byCode(@Param('code') code: string, @CurrentUser() u: Principal) {
    return this.vehicles.byCode(u, code);
  }

  @Get()
  @StaffOnly('admin', 'operacao', 'suporte', 'campo')
  list(@Query() q: ListVehiclesQuery) {
    return this.vehicles.list(q);
  }

  @Post()
  @StaffOnly('admin', 'operacao')
  create(@Body() dto: VehicleCreateDto, @CurrentUser() u: Principal) {
    return this.vehicles.create(u, dto);
  }

  @Get(':id')
  @CustomerOrStaff('admin', 'operacao', 'financeiro', 'suporte', 'campo')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.vehicles.get(u, id);
  }

  @Patch(':id')
  @StaffOnly('admin', 'operacao')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VehicleUpdateDto, @CurrentUser() u: Principal) {
    return this.vehicles.update(u, id, dto);
  }

  @Post(':id/status')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'campo')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VehicleStatusChangeDto, @CurrentUser() u: Principal) {
    return this.vehicles.setStatus(u, id, dto);
  }

  @Get(':id/track')
  @StaffOnly('admin', 'operacao')
  track(@Param('id', ParseUUIDPipe) id: string, @Query() q: TrackQuery) {
    return this.vehicles.track(id, q.from, q.to);
  }

  @Post(':id/ring')
  @HttpCode(202)
  @CustomerOnly()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  ring(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.vehicles.ring(u, id);
  }

  @Post(':id/service-unlock')
  @HttpCode(202)
  @StaffOnly('admin', 'operacao', 'campo')
  serviceUnlock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ServiceUnlockDto, @CurrentUser() u: Principal) {
    return this.vehicles.serviceUnlock(u, id, dto.reason, dto.fieldTaskId);
  }
}
