-- Task 14 (revisão própria): uma quitação pendente por dívida, para duas chamadas simultâneas não cobrarem duas vezes.
CREATE UNIQUE INDEX "Payment_one_pending_debt_settlement" ON "Payment"("settlesPaymentId") WHERE "settlesPaymentId" IS NOT NULL AND "status" = 'pending';
