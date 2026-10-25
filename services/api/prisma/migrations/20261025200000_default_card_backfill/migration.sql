-- Task 30 (varredura E2E, item 12): só dados. Cliente com cartões ativos e nenhum padrão (o padrão removido não era
-- substituído) ganha como padrão o cartão ativo mais recente. Idempotente.
UPDATE "PaymentCard" AS c
SET "isDefault" = true
FROM (
  SELECT DISTINCT ON ("customerId") id
  FROM "PaymentCard"
  WHERE "deletedAt" IS NULL
    AND "customerId" NOT IN (SELECT "customerId" FROM "PaymentCard" WHERE "deletedAt" IS NULL AND "isDefault" = true)
  ORDER BY "customerId", "createdAt" DESC, id DESC
) AS latest
WHERE c.id = latest.id;
