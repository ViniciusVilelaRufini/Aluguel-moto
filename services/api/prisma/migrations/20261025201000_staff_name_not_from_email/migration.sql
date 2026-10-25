-- Task 30 (varredura E2E, item 38): só dados. O cadastro criado no primeiro login recebia como nome a parte local do
-- e-mail (ou o sub), e isso chegava ao cliente ("Entregue por <e-mail>", autor no chat). Limpa esses nomes; a API
-- mostra "Equipe Volti" até alguém cadastrar o nome no painel. Idempotente.
UPDATE "SupportMessage" AS m
SET "authorName" = NULL
FROM "StaffUser" AS s
WHERE m."authorType" = 'staff'
  AND m."authorId" = s.id
  AND (m."authorName" = split_part(s.email, '@', 1) OR m."authorName" = s."cognitoSub" OR m."authorName" LIKE '%@%');

UPDATE "StaffUser"
SET name = ''
WHERE name = split_part(email, '@', 1) OR name = "cognitoSub" OR name LIKE '%@%';
