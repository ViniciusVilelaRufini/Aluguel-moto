import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { STAFF_GROUPS } from '../../common/enums';
import { CurrentUser, CustomerOrStaff, isStaff, Principal, StaffOnly } from '../auth/principal';
import { UploadRequestDto } from '../rentals/rentals.dto';
import { ListVehicleModelsQuery, SwapStationsQuery, VehicleModelInputDto, VehicleModelUpdateDto } from './catalog.dto';
import { CatalogService } from './catalog.service';

/** Catálogo de modelos. Rota literal `uploads` antes de `:id`. */
@Controller('vehicle-models')
export class VehicleModelsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @CustomerOrStaff(...STAFF_GROUPS)
  list(@Query() q: ListVehicleModelsQuery, @CurrentUser() u: Principal) {
    return this.catalog.list(isStaff(u), !!q.includeInactive);
  }

  @Post()
  @StaffOnly('admin')
  create(@Body() dto: VehicleModelInputDto, @CurrentUser() u: Principal) {
    return this.catalog.create(u, dto);
  }

  @Post('uploads')
  @StaffOnly('admin')
  upload(@Body() dto: UploadRequestDto) {
    return this.catalog.photoUpload(dto.contentType);
  }

  @Patch(':id')
  @StaffOnly('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VehicleModelUpdateDto, @CurrentUser() u: Principal) {
    return this.catalog.update(u, id, dto);
  }
}

@Controller('swap-stations')
export class SwapStationsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @CustomerOrStaff('admin', 'operacao', 'suporte', 'campo')
  list(@Query() q: SwapStationsQuery) {
    return this.catalog.stations(q);
  }
}
