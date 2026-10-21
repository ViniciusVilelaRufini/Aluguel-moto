import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { PageQuery } from '../../common/pagination';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { SendCommandDto } from './commands.dto';
import { CommandsService } from './commands.service';

@Controller()
export class CommandsController {
  constructor(private readonly commands: CommandsService) {}

  /** sendVehicleCommand */
  @Post('vehicles/:id/commands')
  @HttpCode(202)
  @StaffOnly('admin', 'operacao')
  send(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendCommandDto, @CurrentUser() user: Principal) {
    return this.commands.dispatch({ vehicleId: id, type: dto.type, reason: dto.reason, speedLimitKmh: dto.speedLimitKmh, on: dto.on, actor: user });
  }

  /** listVehicleCommands */
  @Get('vehicles/:id/commands')
  @StaffOnly('admin', 'operacao', 'suporte')
  list(@Param('id', ParseUUIDPipe) id: string, @Query() q: PageQuery) {
    return this.commands.listForVehicle(id, q);
  }

  /** getCommand */
  @Get('commands/:id')
  @StaffOnly('admin', 'operacao', 'suporte', 'campo')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.commands.get(id);
  }
}
