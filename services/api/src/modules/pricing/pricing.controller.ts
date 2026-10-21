import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, CustomerOrStaff, isStaff, Principal, StaffOnly } from '../auth/principal';
import { CouponInputDto, FeeInputDto, IncludeInactiveQuery, ListCouponsQuery, PricingPlanInputDto, QuoteRequestDto } from './pricing.dto';
import { PricingAdminService } from './pricing-admin.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly admin: PricingAdminService) {}

  @Get('plans')
  @CustomerOrStaff('admin', 'operacao', 'financeiro', 'suporte', 'campo')
  listPlans(@Query() q: IncludeInactiveQuery, @CurrentUser() u: Principal) {
    return this.admin.listPlans(isStaff(u) && !!q.includeInactive);
  }

  @Post('plans')
  @StaffOnly('admin')
  createPlan(@Body() dto: PricingPlanInputDto, @CurrentUser() u: Principal) {
    return this.admin.createPlan(u, dto);
  }

  @Get('plans/:id')
  @StaffOnly('admin', 'financeiro')
  getPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getPlan(id);
  }

  @Put('plans/:id')
  @StaffOnly('admin')
  updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PricingPlanInputDto, @CurrentUser() u: Principal) {
    return this.admin.updatePlan(u, id, dto);
  }

  @Delete('plans/:id')
  @HttpCode(204)
  @StaffOnly('admin')
  async deletePlan(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal): Promise<void> {
    await this.admin.deletePlan(u, id);
  }

  @Post('quote')
  @HttpCode(200)
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  quote(@Body() dto: QuoteRequestDto, @CurrentUser() u: Principal) {
    return this.admin.quote(dto, u.customerId);
  }

  @Get('coupons')
  @StaffOnly('admin', 'financeiro')
  listCoupons(@Query() q: ListCouponsQuery) {
    return this.admin.listCoupons(q);
  }

  @Post('coupons')
  @StaffOnly('admin')
  createCoupon(@Body() dto: CouponInputDto, @CurrentUser() u: Principal) {
    return this.admin.createCoupon(u, dto);
  }

  @Get('coupons/:id')
  @StaffOnly('admin', 'financeiro')
  getCoupon(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getCoupon(id);
  }

  @Put('coupons/:id')
  @StaffOnly('admin')
  updateCoupon(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CouponInputDto, @CurrentUser() u: Principal) {
    return this.admin.updateCoupon(u, id, dto);
  }

  @Delete('coupons/:id')
  @HttpCode(204)
  @StaffOnly('admin')
  async deleteCoupon(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal): Promise<void> {
    await this.admin.deleteCoupon(u, id);
  }

  @Get('fees')
  @StaffOnly('admin', 'financeiro')
  listFees() {
    return this.admin.listFees();
  }

  @Post('fees')
  @StaffOnly('admin')
  createFee(@Body() dto: FeeInputDto, @CurrentUser() u: Principal) {
    return this.admin.createFee(u, dto);
  }

  @Put('fees/:id')
  @StaffOnly('admin')
  updateFee(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FeeInputDto, @CurrentUser() u: Principal) {
    return this.admin.updateFee(u, id, dto);
  }

  @Delete('fees/:id')
  @HttpCode(204)
  @StaffOnly('admin')
  async deleteFee(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal): Promise<void> {
    await this.admin.deleteFee(u, id);
  }
}
