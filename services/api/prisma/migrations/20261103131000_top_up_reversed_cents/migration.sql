-- Auditoria run-4 onda 2: estorno de recarga tira o crédito da carteira. `reversedCents` guarda quanto do estorno
-- (`Payment.refundedCents`) já foi debitado; o claim condicional desse valor torna o débito idempotente.
-- Default constante: o ADD COLUMN não reescreve a tabela (Postgres 11+).
-- Não espera atrás de consulta longa segurando a fila da tabela: falha rápido e o deploy é refeito.
SET lock_timeout = '5s';
ALTER TABLE "TopUp" ADD COLUMN "reversedCents" INTEGER NOT NULL DEFAULT 0;
