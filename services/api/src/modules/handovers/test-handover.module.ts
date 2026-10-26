import { DynamicModule, Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module';
import { HandoversModule } from './handovers.module';
import { TestHandoverController } from './test-handover.controller';
import { TestHandoverService } from './test-handover.service';

@Module({})
export class TestHandoverModule {
  /**
   * `POST /reservations/{id}/test-handover` só é registrado com `ALLOW_TEST_HANDOVER=true` (desligado, a rota não existe: 404).
   * Em produção o `loadConfig` só aceita a flag junto com o pagamento fake liberado (ambiente dev da infra).
   */
  static register(enabled: boolean = process.env.ALLOW_TEST_HANDOVER === 'true'): DynamicModule {
    if (!enabled) return { module: TestHandoverModule };
    return {
      module: TestHandoverModule,
      imports: [HandoversModule, ReservationsModule],
      controllers: [TestHandoverController],
      providers: [TestHandoverService],
    };
  }
}
