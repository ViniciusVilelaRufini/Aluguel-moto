-- AlterTable
ALTER TABLE "SettlementProgress" ADD COLUMN     "finishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SettlementProgress_parkedAt_finishedAt_updatedAt_idx" ON "SettlementProgress"("parkedAt", "finishedAt", "updatedAt");

-- Backfill: liquidações já concluídas (Payment fora de pending) saem da fila do job de retomada.
UPDATE "SettlementProgress" sp
SET "finishedAt" = sp."updatedAt"
FROM "Payment" p
WHERE p."id" = sp."paymentId" AND p."status" <> 'pending' AND sp."finishedAt" IS NULL;
