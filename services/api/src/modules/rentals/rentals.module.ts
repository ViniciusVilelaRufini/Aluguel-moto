import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { CommandsModule } from '../commands/commands.module';
import { PricingModule } from '../pricing/pricing.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { StationSwapsModule } from '../station-swaps/station-swaps.module';
import { ZonesModule } from '../zones/zones.module';
import { RentalEndService } from './rental-end.service';
import { RentalStartService } from './rental-start.service';
import { LocationShareController } from './location-share.controller';
import { LocationShareService } from './location-share.service';
import { RentalsController } from './rentals.controller';
import { RentalsListeners } from './rentals.listeners';
import { RentalsService } from './rentals.service';

@Module({
  imports: [CommandsModule, PricingModule, ReservationsModule, ZonesModule, AlertsModule, StationSwapsModule],
  controllers: [RentalsController, LocationShareController],
  providers: [RentalStartService, RentalEndService, RentalsService, RentalsListeners, LocationShareService],
  // Task 6: a entrega no galpão reaproveita o início e o fechamento do aluguel.
  exports: [RentalsService, RentalStartService, RentalEndService],
})
export class RentalsModule {}
