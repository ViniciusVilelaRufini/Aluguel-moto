-- Contrato v2, fix round 2 (docs/decisoes.md): cancelamento da assinatura no gateway com retentativa.

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "gatewayCancelAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gatewayCancelPendingAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Subscription_gatewayCancelPendingAt_idx" ON "Subscription"("gatewayCancelPendingAt");
