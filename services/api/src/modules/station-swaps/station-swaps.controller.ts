import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Idempotent } from '../../common/idempotency/idempotency.interceptor';
import { CurrentUser, CustomerOnly, CustomerOrStaff, Principal, StaffOnly } from '../auth/principal';
import { CreateStationSwapDto, ListStationSwapsQuery } from './station-swaps.dto';
import { StationSwapsService } from './station-swaps.service';

/** Troca de bateria na estação via QR (cliente) e histórico da estação (painel). */
@Controller('swap-stations')
export class StationSwapsController {
  constructor(private readonly swaps: StationSwapsService) {}

  @Post(':id/swaps')
  @CustomerOnly()
  @Idempotent({ required: true })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStationSwapDto,
    @CurrentUser() user: Principal,
    @Headers('idempotency-key') key: string,
  ) {
    return this.swaps.create(user, id, dto, key);
  }

  /** Fix 1 (I6) + Task 12 das lacunas: conteúdo do QR fixo da estação, admin e operação (impressão pelo painel). */
  @Get(':id/qr')
  @StaffOnly('admin', 'operacao')
  qr(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.swaps.qr(user, id);
  }

  @Get(':id/swaps')
  @StaffOnly('admin', 'operacao', 'suporte')
  list(@Param('id', ParseUUIDPipe) id: string, @Query() q: ListStationSwapsQuery) {
    return this.swaps.list(id, q);
  }

  @Get(':id/swaps/:swapId')
  @CustomerOrStaff('admin', 'operacao', 'suporte')
  get(@Param('id', ParseUUIDPipe) id: string, @Param('swapId', ParseUUIDPipe) swapId: string, @CurrentUser() user: Principal) {
    return this.swaps.get(user, id, swapId);
  }

  @Post(':id/swaps/:swapId/cancel')
  @HttpCode(200)
  @CustomerOnly()
  cancel(@Param('id', ParseUUIDPipe) id: string, @Param('swapId', ParseUUIDPipe) swapId: string, @CurrentUser() user: Principal) {
    return this.swaps.cancel(user, id, swapId);
  }
}
