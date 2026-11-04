-- Valores novos de enum em migração própria (o Postgres não deixa usar um valor recém-adicionado na mesma transação).
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'counter_card';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'counter_pix';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'cash';
ALTER TYPE "DepositMethod" ADD VALUE IF NOT EXISTS 'counter_card';
ALTER TYPE "DepositMethod" ADD VALUE IF NOT EXISTS 'counter_pix';
ALTER TYPE "DepositMethod" ADD VALUE IF NOT EXISTS 'cash';
