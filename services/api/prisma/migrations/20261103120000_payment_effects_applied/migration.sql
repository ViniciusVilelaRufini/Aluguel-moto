-- Auditoria run-4: marcador de idempotência dos efeitos de um pagamento (renovação/past_due da assinatura, quitação da dívida).
ALTER TABLE "Payment" ADD COLUMN "effectsAppliedAt" TIMESTAMP(3);
-- Pagamentos já finalizados tiveram os efeitos aplicados pelo fluxo antigo: marca para um webhook repetido não reaplicar.
UPDATE "Payment" SET "effectsAppliedAt" = "updatedAt" WHERE "kind" IN ('subscription', 'debt_settlement') AND "status" <> 'pending';
