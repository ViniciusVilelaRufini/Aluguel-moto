-- Balcão: referência e atendente do pagamento, devolução da caução, fotos do contrato e período pré-pago.
ALTER TABLE "Payment" ADD COLUMN "reference" TEXT,
ADD COLUMN "recordedById" UUID;

ALTER TABLE "Deposit" ADD COLUMN "refundedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reference" TEXT;

ALTER TABLE "Handover" ADD COLUMN "contractPhotoKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Rental" ADD COLUMN "prepaidUntil" TIMESTAMP(3),
ADD COLUMN "prepaidReminderSentAt" TIMESTAMP(3);

CREATE INDEX "Rental_prepaidUntil_idx" ON "Rental"("prepaidUntil");
