import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { CreateTrackerDto, InstallTrackerDto, ListTrackersQuery } from './trackers.dto';
import { TrackersService } from './trackers.service';

@Controller()
export class TrackersController {
  constructor(private readonly trackers: TrackersService) {}

  /** listTrackers */
  @Get('trackers')
  @StaffOnly('admin', 'operacao', 'suporte')
  list(@Query() q: ListTrackersQuery) {
    return this.trackers.list(q);
  }

  /** createTracker */
  @Post('trackers')
  @StaffOnly('admin', 'operacao')
  create(@Body() dto: CreateTrackerDto, @CurrentUser() user: Principal) {
    return this.trackers.create(dto, user);
  }

  /** installVehicleTracker */
  @Put('vehicles/:id/tracker')
  @StaffOnly('admin', 'operacao')
  install(@Param('id', ParseUUIDPipe) id: string, @Body() dto: InstallTrackerDto, @CurrentUser() user: Principal) {
    return this.trackers.install(id, dto.trackerId, user);
  }

  /** removeVehicleTracker */
  @Delete('vehicles/:id/tracker')
  @StaffOnly('admin', 'operacao')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.trackers.remove(id, user);
  }
}
