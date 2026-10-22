import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Idempotent } from '../../common/idempotency/idempotency.interceptor';
import { CurrentUser, CustomerOnly, CustomerOrStaff, Principal, StaffOnly } from '../auth/principal';
import { UploadRequestDto } from '../rentals/rentals.dto';
import { HandoverCreateDto, HandoverDisputeDto, ListHandoversQuery } from './handovers.dto';
import { HandoversService } from './handovers.service';

/** Entrega formal no galpão (saída com aceite do cliente e chegada). Rotas literais antes de `/:id`. */
@Controller('handovers')
export class HandoversController {
  constructor(private readonly handovers: HandoversService) {}

  /** createHandover — 201; chegada repetida do mesmo aluguel (fila offline) → 200 com a entrega existente. */
  @Post()
  @StaffOnly('admin', 'operacao', 'campo')
  async create(@Body() dto: HandoverCreateDto, @CurrentUser() user: Principal, @Res({ passthrough: true }) res: Response) {
    const r = await this.handovers.create(user, dto);
    res.status(r.status);
    return r.body;
  }

  @Get()
  @StaffOnly('admin', 'operacao', 'campo', 'suporte')
  list(@Query() q: ListHandoversQuery) {
    return this.handovers.list(q);
  }

  @Post('uploads')
  @StaffOnly('admin', 'operacao', 'campo')
  upload(@Body() dto: UploadRequestDto) {
    return this.handovers.uploadUrl(dto.contentType);
  }

  @Get(':id')
  @CustomerOrStaff('admin', 'operacao', 'campo', 'suporte')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.handovers.get(user, id);
  }

  /** acceptHandover — 201 com o `Rental`; aceites repetidos convergem no mesmo aluguel. */
  @Post(':id/accept')
  @CustomerOnly()
  @Idempotent({ required: true })
  accept(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.handovers.accept(user, id);
  }

  @Post(':id/dispute')
  @HttpCode(200)
  @CustomerOnly()
  dispute(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HandoverDisputeDto, @CurrentUser() user: Principal) {
    return this.handovers.dispute(user, id, dto.reason);
  }
}
