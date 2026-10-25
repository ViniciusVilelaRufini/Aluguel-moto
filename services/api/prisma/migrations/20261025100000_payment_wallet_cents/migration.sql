-- Task 16 (R2-01): parte do pagamento bruto paga com a carteira no fechamento.
ALTER TABLE "Payment" ADD COLUMN "walletCents" INTEGER NOT NULL DEFAULT 0;
