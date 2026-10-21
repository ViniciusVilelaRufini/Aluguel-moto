import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { CurrentUser, CustomerOnly, Principal } from '../auth/principal';
import { ReservationsService } from './reservations.service';

export class ReservationCreateDto {
  @IsUUID()
  vehicleId: string;
}

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @CustomerOnly()
  create(@Body() dto: ReservationCreateDto, @CurrentUser() u: Principal) {
    return this.reservations.create(u.customerId!, dto.vehicleId);
  }

  @Get('current')
  @CustomerOnly()
  current(@CurrentUser() u: Principal) {
    return this.reservations.current(u.customerId!);
  }

  @Delete(':id')
  @HttpCode(204)
  @CustomerOnly()
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal): Promise<void> {
    await this.reservations.cancel(u.customerId!, id);
  }
}
