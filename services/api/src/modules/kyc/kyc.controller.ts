import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, CustomerOnly, Principal, StaffOnly } from '../auth/principal';
import { KycReviewDto, KycSubmitDto, KycUploadRequestDto } from './kyc.dto';
import { KycService } from './kyc.service';

@Controller()
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('kyc/uploads')
  @CustomerOnly()
  uploads(@Body() dto: KycUploadRequestDto, @CurrentUser() u: Principal) {
    return this.kyc.uploads(u.customerId!, dto);
  }

  @Post('kyc/submit')
  @HttpCode(202)
  @CustomerOnly()
  submit(@Body() dto: KycSubmitDto, @CurrentUser() u: Principal) {
    return this.kyc.submit(u.customerId!, dto);
  }

  @Get('kyc/status')
  @CustomerOnly()
  status(@CurrentUser() u: Principal) {
    return this.kyc.status(u.customerId!);
  }

  /** Links curtos dos arquivos da verificação para a revisão (painel). AuditLog a cada consulta. */
  @Get('customers/:id/kyc-files')
  @StaffOnly('admin', 'suporte')
  files(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.kyc.files(u, id);
  }

  @Post('customers/:id/kyc-review')
  @HttpCode(200)
  @StaffOnly('admin', 'suporte')
  review(@Param('id', ParseUUIDPipe) id: string, @Body() dto: KycReviewDto, @CurrentUser() u: Principal) {
    return this.kyc.review(u, id, dto);
  }
}
