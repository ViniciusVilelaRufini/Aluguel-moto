import { Global, Module } from '@nestjs/common';
import { RENTAL_BILLING } from '../../ports/rental-billing.port';
import { PaymentStateService } from './payment-state.service';
import { loadPaymentsConfig, PAYMENTS_CONFIG, type PaymentsConfig } from './payments.config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ProviderCustomersService } from './provider-customers.service';
import { FakePaymentProvider } from './provider/fake-payment-provider';
import { MercadoPagoPaymentProvider } from './provider/mercadopago-payment-provider';
import { PAYMENT_PROVIDER } from './provider/payment-provider';
import { INVOICE_ISSUER, MockInvoiceIssuer } from './receipts/invoice-issuer';
import { RECEIPT_OPTIONS, ReceiptService } from './receipts/receipt.service';
import { BILLING_OPTIONS, RentalBillingService } from './rental-billing.service';
import { SubscriptionsService } from './subscriptions.service';
import { WebhookProcessor } from './webhook-processor.service';

/**
 * Pagamentos (Task 5): `RentalBillingService` implementa a porta `RENTAL_BILLING` sobre o `PaymentProvider`
 * escolhido por `PAYMENT_PROVIDER` (fake | mercadopago). Webhooks validados, enfileirados e processados com deduplicação.
 */
@Global()
@Module({
  controllers: [PaymentsController],
  providers: [
    { provide: PAYMENTS_CONFIG, useFactory: loadPaymentsConfig },
    {
      provide: PAYMENT_PROVIDER,
      inject: [PAYMENTS_CONFIG],
      useFactory: (cfg: PaymentsConfig) =>
        cfg.provider === 'mercadopago'
          ? new MercadoPagoPaymentProvider({ accessToken: cfg.mercadoPago.accessToken ?? '', webhookSecret: cfg.mercadoPago.webhookSecret, baseUrl: cfg.mercadoPago.baseUrl, webhookToleranceSeconds: cfg.webhookToleranceSeconds })
          : new FakePaymentProvider(cfg.mercadoPago.webhookSecret, cfg.webhookToleranceSeconds),
    },
    { provide: BILLING_OPTIONS, inject: [PAYMENTS_CONFIG], useFactory: (cfg: PaymentsConfig) => ({ pixExpirationMinutes: cfg.pixExpirationMinutes, fakePixAutoConfirmSeconds: cfg.fakePixAutoConfirmSeconds, reviewMaxDays: cfg.reviewMaxDays }) },
    { provide: RECEIPT_OPTIONS, inject: [PAYMENTS_CONFIG], useFactory: (cfg: PaymentsConfig) => ({ reportsBucket: cfg.reportsBucket }) },
    { provide: INVOICE_ISSUER, useFactory: () => new MockInvoiceIssuer() },
    PaymentStateService,
    ProviderCustomersService,
    ReceiptService,
    RentalBillingService,
    { provide: RENTAL_BILLING, useExisting: RentalBillingService },
    SubscriptionsService,
    WebhookProcessor,
    PaymentsService,
  ],
  exports: [PaymentsService, RENTAL_BILLING, PAYMENT_PROVIDER, BILLING_OPTIONS, PaymentStateService, ProviderCustomersService, RentalBillingService, SubscriptionsService],
})
export class PaymentsModule {}
