import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

/** Contrato v2: cupons na conta e programa de indicação. */
@Module({ imports: [PricingModule], controllers: [ReferralsController], providers: [ReferralsService] })
export class ReferralsModule {}
