-- Auditoria run-4: marcador de idempotência dos efeitos de um pagamento (renovação/past_due da assinatura, quitação da dívida).
ALTER TABLE "Payment" ADD COLUMN "effectsAppliedAt" TIMESTAMP(3);
-- Pagamentos já finalizados tiveram os efeitos aplicados pelo fluxo antigo: marca para um webhook repetido não reaplicar.
UPDATE "Payment" SET "effectsAppliedAt" = "updatedAt" WHERE "kind" = 'subscription' AND "status" <> 'pending';
-- Quitação: só quando a dívida alvo (settlesPaymentId) está quitada. Quitação paga com a dívida ainda aberta perdeu o
-- efeito numa queda e fica sem marcador, para o próximo evento do webhook quitar.
UPDATE "Payment" p SET "effectsAppliedAt" = p."updatedAt"
WHERE p."kind" = 'debt_settlement' AND p."status" <> 'pending'
  AND EXISTS (SELECT 1 FROM "Payment" d WHERE d."id" = p."settlesPaymentId" AND d."debtSettledAt" IS NOT NULL);
-- Varredura de aluguéis encerrados sem liquidação (retryPendingSettlements): quase todo aluguel tem paymentId, então o
-- índice parcial fica pequeno. Escrito à mão (o Prisma não expressa índice parcial).
CREATE INDEX "Rental_unbilled_endedAt_idx" ON "Rental"("endedAt") WHERE "paymentId" IS NULL AND "status" IN ('ended', 'force_ended');
