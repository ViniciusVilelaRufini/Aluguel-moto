import { Global, Module } from '@nestjs/common';
import { RENTAL_BILLING } from '../../ports/rental-billing.port';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StubRentalBilling } from './stub-rental-billing';

/**
 * Módulo de pagamentos — dono: Task 5 (agente 4). Hoje registra o `StubRentalBilling` e endpoints provisórios
 * sobre o banco. A Task 5 troca o provider por `RentalBillingService` (com `PaymentProvider` fake/Mercado Pago).
 */
@Global()
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, StubRentalBilling, { provide: RENTAL_BILLING, useExisting: StubRentalBilling }],
  exports: [RENTAL_BILLING],
})
export class PaymentsModule {}
