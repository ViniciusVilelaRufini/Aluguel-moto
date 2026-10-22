-- Contrato v2 (docs/decisoes.md, 2026-10-22): valor novo de enum em migração própria (o Postgres não deixa usar um
-- valor recém-adicionado na mesma transação; a migração seguinte cria índices parciais com `paused`).
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'paused';
