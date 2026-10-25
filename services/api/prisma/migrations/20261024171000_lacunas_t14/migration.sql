-- Task 14 das lacunas: quitação de inadimplência, alerta de pagamento e exclusão LGPD no gateway (somente aditiva).
CREATE TYPE "DebtSettlementKind" AS ENUM ('payment', 'manual');

ALTER TABLE "Payment" ADD COLUMN "debtSettledAt" TIMESTAMP(3),
  ADD COLUMN "debtSettlement" "DebtSettlementKind",
  ADD COLUMN "settlesPaymentId" UUID,
  ADD COLUMN "pix" JSONB;
CREATE INDEX "Payment_settlesPaymentId_idx" ON "Payment"("settlesPaymentId");

ALTER TABLE "Alert" ADD COLUMN "paymentId" UUID;
-- Um alerta aberto por pagamento (escrito à mão: o Prisma não modela índice parcial).
CREATE UNIQUE INDEX "Alert_one_open_per_payment" ON "Alert"("paymentId") WHERE "paymentId" IS NOT NULL AND "status" <> 'resolved';

CREATE TABLE "ProviderCustomerDeletion" (
    "customerId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerCustomerId" TEXT NOT NULL,
    "providerCardIds" TEXT[],
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderCustomerDeletion_pkey" PRIMARY KEY ("customerId")
);
