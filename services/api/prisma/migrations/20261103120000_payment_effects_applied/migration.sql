-- Auditoria run-4: marcador de idempotência dos efeitos de um pagamento (renovação/past_due da assinatura, quitação da dívida).
ALTER TABLE "Payment" ADD COLUMN "effectsAppliedAt" TIMESTAMP(3);
-- Pagamentos já finalizados tiveram os efeitos aplicados pelo fluxo antigo: marca para um webhook repetido não reaplicar.
UPDATE "Payment" SET "effectsAppliedAt" = "updatedAt" WHERE "kind" IN ('subscription', 'debt_settlement') AND "status" <> 'pending';
-- Varredura de aluguéis encerrados sem liquidação (retryPendingSettlements): quase todo aluguel tem paymentId, então o
-- índice parcial fica pequeno. Escrito à mão (o Prisma não expressa índice parcial).
CREATE INDEX "Rental_unbilled_endedAt_idx" ON "Rental"("endedAt") WHERE "paymentId" IS NULL AND "status" IN ('ended', 'force_ended');
