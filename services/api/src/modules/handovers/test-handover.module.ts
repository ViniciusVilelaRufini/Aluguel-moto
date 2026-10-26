import { DynamicModule, Module } from '@nestjs/common';
import { RentalsModule } from '../rentals/rentals.module';
import { TestRentalEndController } from '../rentals/test-rental-end.controller';
import { ReservationsModule } from '../reservations/reservations.module';
import { HandoversModule } from './handovers.module';
import { TestHandoverController } from './test-handover.controller';
import { TestHandoverService } from './test-handover.service';

@Module({})
export class TestHandoverModule {
  /**
   * Atalhos do app de teste, só registrados com `ALLOW_TEST_HANDOVER=true` (desligado, as rotas não existem: 404):
   * `POST /reservations/{id}/test-handover` (entrega simulada) e `POST /rentals/{id}/test-end` (encerrar fora do ponto verde).
   * Em produção o `loadConfig` só aceita a flag junto com o pagamento fake liberado (ambiente dev da infra).
   */
  static register(enabled: boolean = process.env.ALLOW_TEST_HANDOVER === 'true'): DynamicModule {
    if (!enabled) return { module: TestHandoverModule };
    return {
      module: TestHandoverModule,
      imports: [HandoversModule, ReservationsModule, RentalsModule],
      controllers: [TestHandoverController, TestRentalEndController],
      providers: [TestHandoverService],
    };
  }
}
