-- Painel de bancada (L1): comando substituído por um mais novo termina `failed` com motivo `superseded` (não é falha da moto).
-- Valor novo de enum em migração própria (o Postgres não deixa usar um valor recém-adicionado na mesma transação).
ALTER TYPE "CommandStatusReason" ADD VALUE IF NOT EXISTS 'superseded';
