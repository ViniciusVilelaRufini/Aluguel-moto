-- Valores novos de enum em migração própria (o Postgres não deixa usar um valor recém-adicionado na mesma transação).
ALTER TYPE "CommandStatusReason" ADD VALUE IF NOT EXISTS 'unsupported_by_tracker';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'zone_speed_exceeded';
