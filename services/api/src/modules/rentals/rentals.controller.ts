import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Idempotent } from '../../common/idempotency/idempotency.interceptor';
import { CurrentUser, CustomerOnly, CustomerOrStaff, Principal, StaffOnly } from '../auth/principal';
import { RentalEndService } from './rental-end.service';
import { RentalStartService } from './rental-start.service';
import {
  EndRentalDto, ForceEndRentalDto, ListRentalsQuery, LocationShareDto, RatingDto, StartRentalDto, SwapVehicleDto, UploadRequestDto, WellbeingDto,
} from './rentals.dto';
import { RentalsService } from './rentals.service';

/** Rotas literais (`/rentals/current`) antes de `/rentals/:id`; ids validados como UUID. */
@Controller('rentals')
export class RentalsController {
  constructor(
    private readonly starter: RentalStartService,
    private readonly ender: RentalEndService,
    private readonly rentals: RentalsService,
  ) {}

  /** startRental — 201 `started` ou 202 `awaiting_deposit` (Pix). */
  @Post()
  @CustomerOnly()
  @Idempotent({ required: true })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async start(
    @Body() dto: StartRentalDto,
    @CurrentUser() user: Principal,
    @Headers('idempotency-key') key: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.starter.start(user, dto, key);
    res.status(r.status);
    return r.body;
  }

  @Get()
  @CustomerOrStaff('admin', 'operacao', 'financeiro', 'suporte')
  list(@Query() q: ListRentalsQuery, @CurrentUser() user: Principal) {
    return this.rentals.list(user, q);
  }

  @Get('current')
  @CustomerOnly()
  current(@CurrentUser() user: Principal) {
    return this.rentals.current(user.customerId!);
  }

  @Get(':id')
  @CustomerOrStaff('admin', 'operacao', 'financeiro', 'suporte')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.rentals.get(user, id);
  }

  @Get(':id/events')
  @CustomerOrStaff('admin', 'operacao', 'financeiro', 'suporte')
  events(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.rentals.events_(user, id);
  }

  @Post(':id/pause')
  @HttpCode(200)
  @CustomerOnly()
  pause(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.rentals.pause(user, id);
  }

  @Post(':id/resume')
  @HttpCode(200)
  @CustomerOnly()
  resume(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.rentals.resume(user, id);
  }

  @Post(':id/swap')
  @HttpCode(200)
  @CustomerOnly()
  swap(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SwapVehicleDto, @CurrentUser() user: Principal) {
    return this.rentals.swap(user, id, dto);
  }

  @Post(':id/return-photo')
  @CustomerOnly()
  returnPhoto(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UploadRequestDto, @CurrentUser() user: Principal) {
    return this.rentals.returnPhotoUpload(user, id, dto.contentType);
  }

  /** endRental — 200 `ended` ou 202 `ending`. */
  @Post(':id/end')
  @CustomerOnly()
  @Idempotent({ required: false })
  async end(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndRentalDto,
    @CurrentUser() user: Principal,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.ender.end(user.customerId!, id, dto);
    res.status(r.status);
    return r.rental;
  }

  @Post(':id/force-end')
  @HttpCode(200)
  @StaffOnly('admin', 'suporte')
  @Idempotent({ required: false })
  forceEnd(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ForceEndRentalDto, @CurrentUser() user: Principal) {
    return this.ender.forceEnd(user, id, dto.reason);
  }

  @Get(':id/track')
  @CustomerOrStaff('admin', 'operacao', 'suporte')
  track(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.rentals.track(user, id);
  }

  @Get(':id/receipt')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  receipt(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.rentals.receipt(user, id);
  }

  @Post(':id/rating')
  @HttpCode(200)
  @CustomerOnly()
  rate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RatingDto, @CurrentUser() user: Principal) {
    return this.rentals.rate(user, id, dto);
  }

  @Post(':id/location-share')
  @CustomerOnly()
  share(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LocationShareDto, @CurrentUser() user: Principal) {
    return this.rentals.shareLocation(user, id, dto);
  }

  @Post(':id/wellbeing')
  @HttpCode(204)
  @CustomerOnly()
  async wellbeing(@Param('id', ParseUUIDPipe) id: string, @Body() dto: WellbeingDto, @CurrentUser() user: Principal): Promise<void> {
    await this.rentals.wellbeing(user, id, dto);
  }
}
