import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, CustomerOrStaff, isStaff, Principal, StaffOnly } from '../auth/principal';
import { GeoZoneInputDto, ListZonesQuery } from './zones.dto';
import { ZonesService } from './zones.service';

const ALL = ['admin', 'operacao', 'financeiro', 'suporte', 'campo'] as const;

@Controller('zones')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Get()
  @CustomerOrStaff(...ALL)
  list(@Query() q: ListZonesQuery, @CurrentUser() u: Principal) {
    return this.zones.list(q, isStaff(u));
  }

  @Post()
  @StaffOnly('admin', 'operacao')
  create(@Body() dto: GeoZoneInputDto, @CurrentUser() u: Principal) {
    return this.zones.create(dto, u);
  }

  @Get(':id')
  @CustomerOrStaff(...ALL)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.zones.get(id, isStaff(u));
  }

  @Put(':id')
  @StaffOnly('admin', 'operacao')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GeoZoneInputDto, @CurrentUser() u: Principal) {
    return this.zones.update(id, dto, u);
  }

  @Delete(':id')
  @HttpCode(204)
  @StaffOnly('admin', 'operacao')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal): Promise<void> {
    await this.zones.remove(id, u);
  }
}
