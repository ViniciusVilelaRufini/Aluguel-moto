import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PLAN_CODES, type PlanCode } from '../../common/enums';
import { PageQuery } from '../../common/pagination';
import { CurrentUser, CustomerOnly, Principal } from '../auth/principal';
import { ReferralsService } from './referrals.service';

export class CouponCodeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code: string;

  @IsOptional()
  @IsIn(PLAN_CODES)
  planCode?: PlanCode;
}

export class ReferralRedeemDto {
  @IsString()
  @MinLength(4)
  @MaxLength(16)
  code: string;
}

/** Cupons salvos e indicação na conta do cliente (`/me/...`). */
@Controller('me')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('coupons')
  @CustomerOnly()
  listCoupons(@CurrentUser() u: Principal) {
    return this.referrals.listCoupons(u.customerId!);
  }

  @Post('coupons')
  @CustomerOnly()
  addCoupon(@Body() dto: CouponCodeDto, @CurrentUser() u: Principal) {
    return this.referrals.addCoupon(u.customerId!, dto.code, dto.planCode);
  }

  @Post('coupons/validate')
  @HttpCode(200)
  @CustomerOnly()
  validateCoupon(@Body() dto: CouponCodeDto, @CurrentUser() u: Principal) {
    return this.referrals.validateCoupon(u.customerId!, dto.code, dto.planCode);
  }

  @Get('referral')
  @CustomerOnly()
  summary(@CurrentUser() u: Principal) {
    return this.referrals.summary(u.customerId!);
  }

  @Get('referral/rewards')
  @CustomerOnly()
  rewards(@Query() q: PageQuery, @CurrentUser() u: Principal) {
    return this.referrals.rewards(u.customerId!, q);
  }

  @Post('referral/redeem')
  @CustomerOnly()
  redeem(@Body() dto: ReferralRedeemDto, @CurrentUser() u: Principal) {
    return this.referrals.redeem(u.customerId!, dto.code);
  }
}
