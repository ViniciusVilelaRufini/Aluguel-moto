import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { CommandsModule } from '../commands/commands.module';
import { PricingModule } from '../pricing/pricing.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { ZonesModule } from '../zones/zones.module';
import { RentalEndService } from './rental-end.service';
import { RentalStartService } from './rental-start.service';
import { RentalsController } from './rentals.controller';
import { RentalsListeners } from './rentals.listeners';
import { RentalsService } from './rentals.service';

@Module({
  imports: [CommandsModule, PricingModule, ReservationsModule, ZonesModule, AlertsModule],
  controllers: [RentalsController],
  providers: [RentalStartService, RentalEndService, RentalsService, RentalsListeners],
  exports: [RentalsService],
})
export class RentalsModule {}
