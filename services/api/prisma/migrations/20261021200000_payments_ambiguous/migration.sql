-- AlterTable
ALTER TABLE "SettlementProgress" ADD COLUMN     "errorRuns" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parkedAt" TIMESTAMP(3),
ADD COLUMN     "parkedReason" TEXT;

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "prevStatus" TEXT NOT NULL,
    "prevRefundedCents" INTEGER NOT NULL,
    "newStatus" TEXT NOT NULL,
    "newRefundedCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerRefundId" TEXT,
    "lastError" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRefund_idempotencyKey_key" ON "PaymentRefund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentRefund_status_updatedAt_idx" ON "PaymentRefund"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "PaymentRefund_paymentId_idx" ON "PaymentRefund"("paymentId");

