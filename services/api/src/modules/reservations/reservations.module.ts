import { Module } from '@nestjs/common';
import { DepotReservationsService } from './depot-reservations.service';
import { loadPickupCodeSecret, PICKUP_CODE_SECRET } from './pickup-code';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    DepotReservationsService,
    // Sem PICKUP_CODE_SECRET em produção a API não sobe (como FRAUD_HASH_SECRET).
    { provide: PICKUP_CODE_SECRET, useFactory: loadPickupCodeSecret },
  ],
  exports: [ReservationsService, DepotReservationsService, PICKUP_CODE_SECRET],
})
export class ReservationsModule {}
