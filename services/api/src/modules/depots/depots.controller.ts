import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { STAFF_GROUPS } from '../../common/enums';
import { CurrentUser, CustomerOrStaff, Principal, StaffOnly } from '../auth/principal';
import { DepotInputDto, DepotPickupsQuery, DepotUpdateDto, DepotVehiclesQuery, ListDepotsQuery } from './depots.dto';
import { DepotsService } from './depots.service';

/** Galpões (retirada em galpão): cadastro, motos do galpão e agenda de retiradas. */
@Controller('depots')
export class DepotsController {
  constructor(private readonly depots: DepotsService) {}

  @Get()
  @CustomerOrStaff(...STAFF_GROUPS)
  list(@Query() q: ListDepotsQuery, @CurrentUser() u: Principal) {
    return this.depots.list(u, q);
  }

  @Post()
  @StaffOnly('admin', 'operacao')
  create(@Body() dto: DepotInputDto, @CurrentUser() u: Principal) {
    return this.depots.create(u, dto);
  }

  @Get(':id')
  @CustomerOrStaff(...STAFF_GROUPS)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.depots.get(id, u);
  }

  @Patch(':id')
  @StaffOnly('admin', 'operacao')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DepotUpdateDto, @CurrentUser() u: Principal) {
    return this.depots.update(u, id, dto);
  }

  @Get(':id/vehicles')
  @CustomerOrStaff(...STAFF_GROUPS)
  vehicles(@Param('id', ParseUUIDPipe) id: string, @Query() q: DepotVehiclesQuery, @CurrentUser() u: Principal) {
    return this.depots.vehicles(id, u, q);
  }

  @Get(':id/pickups')
  @StaffOnly('admin', 'operacao', 'campo')
  pickups(@Param('id', ParseUUIDPipe) id: string, @Query() q: DepotPickupsQuery) {
    return this.depots.pickups(id, q);
  }
}
