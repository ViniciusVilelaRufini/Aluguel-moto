import { Body, Controller, Delete, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Idempotent } from '../../common/idempotency/idempotency.interceptor';
import { CurrentUser, CustomerOnly, CustomerOrStaff, Principal, Public, StaffOnly } from '../auth/principal';
import { ListDepositsQuery, ListPaymentsQuery, MercadoPagoWebhookDto, PaymentCardCreateDto, RefundDto, SubscriptionCreateDto } from './payments.dto';
import { PaymentsService } from './payments.service';

/** Rotas literais (`cards`, `deposits`, `subscriptions`) antes de `/payments/:id`. */
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payments/cards')
  @CustomerOnly()
  listCards(@CurrentUser() u: Principal) {
    return this.payments.listCards(u.customerId!);
  }

  @Post('payments/cards')
  @CustomerOnly()
  @Idempotent({ required: true })
  addCard(@Body() dto: PaymentCardCreateDto, @CurrentUser() u: Principal) {
    return this.payments.addCard(u.customerId!, dto);
  }

  @Delete('payments/cards/:id')
  @HttpCode(204)
  @CustomerOnly()
  async deleteCard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal): Promise<void> {
    await this.payments.deleteCard(u.customerId!, id);
  }

  @Get('payments/deposits')
  @StaffOnly('admin', 'financeiro')
  listDeposits(@Query() q: ListDepositsQuery) {
    return this.payments.listDeposits(q);
  }

  @Get('payments/deposits/:id')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  getDeposit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.payments.getDeposit(u, id);
  }

  @Get('payments/subscriptions')
  @CustomerOnly()
  listSubscriptions(@CurrentUser() u: Principal) {
    return this.payments.listSubscriptions(u.customerId!);
  }

  @Post('payments/subscriptions')
  @CustomerOnly()
  @Idempotent({ required: true })
  createSubscription(@Body() dto: SubscriptionCreateDto, @CurrentUser() u: Principal) {
    return this.payments.createSubscription(u.customerId!, dto);
  }

  @Delete('payments/subscriptions/:id')
  @HttpCode(200)
  @CustomerOnly()
  cancelSubscription(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.payments.cancelSubscription(u.customerId!, id);
  }

  @Get('payments')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  list(@Query() q: ListPaymentsQuery, @CurrentUser() u: Principal) {
    return this.payments.listPayments(u, q);
  }

  @Get('payments/:id')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.payments.getPayment(u, id);
  }

  @Post('payments/:id/refund')
  @HttpCode(200)
  @StaffOnly('admin', 'financeiro')
  @Idempotent({ required: true })
  refund(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RefundDto, @CurrentUser() u: Principal, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.payments.refund(u, id, dto, idempotencyKey);
  }

  /** Público; valida `x-signature` (HMAC-SHA256) antes de enfileirar. */
  @Post('webhooks/mercadopago')
  @HttpCode(200)
  @Public()
  @SkipThrottle()
  webhook(@Body() dto: MercadoPagoWebhookDto, @Headers('x-signature') signature?: string, @Headers('x-request-id') requestId?: string) {
    return this.payments.receiveWebhook(dto, { signature, requestId });
  }
}
