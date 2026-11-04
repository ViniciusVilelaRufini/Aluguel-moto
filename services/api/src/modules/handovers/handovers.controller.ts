import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Idempotent } from '../../common/idempotency/idempotency.interceptor';
import { CurrentUser, CustomerOnly, CustomerOrStaff, Principal, StaffOnly } from '../auth/principal';
import { CounterCheckoutDto, CounterQuoteQuery } from './counter-checkout.dto';
import { CounterCheckoutService } from './counter-checkout.service';
import { HandoverCancelDto, HandoverCreateDto, HandoverDisputeDto, HandoverUploadDto, ListHandoversQuery } from './handovers.dto';
import { HandoversService } from './handovers.service';

/** Entrega formal no galpão (saída com aceite do cliente e chegada). Rotas literais antes de `/:id`. */
@Controller('handovers')
export class HandoversController {
  constructor(
    private readonly handovers: HandoversService,
    private readonly counter: CounterCheckoutService,
  ) {}

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
  upload(@Body() dto: HandoverUploadDto) {
    return this.handovers.uploadUrl(dto.contentType, dto.purpose);
  }

  @Get(':id')
  @CustomerOrStaff('admin', 'operacao', 'campo', 'suporte')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.handovers.get(user, id);
  }

  /** getHandoverCounterQuote — prévia do valor do balcão (plano × quantidade + seguro) para a entrega de saída. */
  @Get(':id/counter-quote')
  @StaffOnly('admin', 'operacao', 'campo')
  counterQuote(@Param('id', ParseUUIDPipe) id: string, @Query() q: CounterQuoteQuery) {
    return this.counter.quote(id, q);
  }

  /** counterCheckoutHandover — contrato e pagamento no balcão: inicia o aluguel (201; entrega já aceita → o mesmo aluguel). */
  @Post(':id/counter-checkout')
  @StaffOnly('admin', 'operacao', 'campo')
  @Idempotent({ required: true })
  counterCheckout(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CounterCheckoutDto, @CurrentUser() user: Principal) {
    return this.counter.checkout(user, id, dto);
  }

  /** acceptHandover — apps beta12: sempre `409 handover-counter-checkout` (o aluguel começa no balcão); outro cliente → 404. */
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

  /** cancelHandover — operação cancela a saída pendente ou disputada (reserva volta a active no prazo; senão expira). */
  @Post(':id/cancel')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'campo')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: HandoverCancelDto, @CurrentUser() user: Principal) {
    return this.handovers.cancel(user, id, dto.reason);
  }
}
