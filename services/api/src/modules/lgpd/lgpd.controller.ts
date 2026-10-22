import { Body, Controller, Delete, Get, Header, HttpCode, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsString, MaxLength } from 'class-validator';
import { CurrentUser, CustomerOnly, Principal } from '../auth/principal';
import { LgpdService } from './lgpd.service';

class ConsentsUpdateDto {
  @IsString() @MaxLength(32) termsVersion: string;
  @IsBoolean() termsAccepted: boolean;
  @IsBoolean() locationTracking: boolean;
  @IsBoolean() marketing: boolean;
}

@Controller('lgpd')
export class LgpdController {
  constructor(private readonly lgpd: LgpdService) {}

  @Get('consents')
  @CustomerOnly()
  @Header('Cache-Control', 'no-store')
  consents(@CurrentUser() u: Principal) {
    return this.lgpd.getConsents(u.customerId!);
  }

  @Put('consents')
  @CustomerOnly()
  update(@Body() dto: ConsentsUpdateDto, @CurrentUser() u: Principal) {
    return this.lgpd.updateConsents(u.customerId!, dto);
  }

  /** Só os dados do próprio titular. Limitado a 5 por hora. */
  /** QA-13: `no-store` — todos os dados pessoais do titular não ficam em cache de proxy nem do navegador. */
  @Get('export')
  @CustomerOnly()
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  export(@CurrentUser() u: Principal) {
    return this.lgpd.export(u.customerId!);
  }

  @Delete('account')
  @HttpCode(202)
  @CustomerOnly()
  remove(@CurrentUser() u: Principal) {
    return this.lgpd.deleteAccount(u.customerId!);
  }
}
