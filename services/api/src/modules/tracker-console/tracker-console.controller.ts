import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { ListTrackerConsoleQuery, SendTrackerConsoleDto } from './tracker-console.dto';
import { TrackerConsoleService } from './tracker-console.service';

@Controller('vehicles/:id/tracker-console')
export class TrackerConsoleController {
  constructor(private readonly console: TrackerConsoleService) {}

  /** sendTrackerConsoleCommand */
  @Post()
  @HttpCode(202)
  @StaffOnly('admin')
  send(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendTrackerConsoleDto, @CurrentUser() user: Principal) {
    return this.console.send(id, dto, user);
  }

  /** listTrackerConsoleCommands */
  @Get()
  @StaffOnly('admin')
  list(@Param('id', ParseUUIDPipe) id: string, @Query() q: ListTrackerConsoleQuery) {
    return this.console.list(id, q.limit ?? 20);
  }
}
