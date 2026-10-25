-- Task 14 das lacunas: valores novos de enum (migração separada; o valor novo não é usado na mesma transação).
ALTER TYPE "PaymentKind" ADD VALUE IF NOT EXISTS 'debt_settlement';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'payment_needs_review';
