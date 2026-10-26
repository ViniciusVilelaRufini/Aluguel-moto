-- Auditoria (item adiado 1): unlock de cliente/campo recusado por trava de equipe/sistema, hold em 0 ou modo roubada.
-- Valor novo de enum em migração própria (o Postgres não deixa usar um valor recém-adicionado na mesma transação).
ALTER TYPE "CommandStatusReason" ADD VALUE IF NOT EXISTS 'locked_by_staff';
