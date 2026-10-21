import { Module } from '@nestjs/common';
import { PricingAdminService } from './pricing-admin.service';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({ controllers: [PricingController], providers: [PricingService, PricingAdminService], exports: [PricingService] })
export class PricingModule {}
