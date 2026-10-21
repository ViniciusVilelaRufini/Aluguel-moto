import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Idempotent } from '../../common/idempotency/idempotency.interceptor';
import { PageQuery } from '../../common/pagination';
import { CurrentUser, CustomerOnly, CustomerOrStaff, Principal, StaffOnly } from '../auth/principal';
import { TopUpDto, WalletAdjustmentDto } from '../payments/payments.dto';
import { WalletService } from './wallet.service';

@Controller()
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('wallet')
  @CustomerOnly()
  get(@CurrentUser() u: Principal) {
    return this.wallet.get(u.customerId!);
  }

  @Get('wallet/packages')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  packages() {
    return this.wallet.packages();
  }

  @Post('wallet/top-ups')
  @CustomerOnly()
  @Idempotent({ required: true })
  topUp(@Body() dto: TopUpDto, @CurrentUser() u: Principal) {
    return this.wallet.topUp(u.customerId!, dto);
  }

  @Get('wallet/top-ups/:id')
  @CustomerOnly()
  getTopUp(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.wallet.getTopUp(u.customerId!, id);
  }

  @Get('wallet/ledger')
  @CustomerOnly()
  ledger(@Query() q: PageQuery, @CurrentUser() u: Principal) {
    return this.wallet.ledger(u.customerId!, q);
  }

  @Post('customers/:id/wallet/adjustments')
  @StaffOnly('admin', 'financeiro')
  @Idempotent({ required: true })
  adjust(@Param('id', ParseUUIDPipe) id: string, @Body() dto: WalletAdjustmentDto, @CurrentUser() u: Principal) {
    return this.wallet.adjust(u, id, dto);
  }
}
