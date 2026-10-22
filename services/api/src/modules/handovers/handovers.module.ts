import { Module } from '@nestjs/common';
import { RentalsModule } from '../rentals/rentals.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { SupportModule } from '../support/support.module';
import { HandoversController } from './handovers.controller';
import { HandoversService } from './handovers.service';

/** Retirada em galpão (Task 6): entrega de saída com aceite do cliente e chegada no galpão. */
@Module({
  imports: [RentalsModule, ReservationsModule, SupportModule],
  controllers: [HandoversController],
  providers: [HandoversService],
})
export class HandoversModule {}
