-- Auditoria run-4: índices para consultas que faziam varredura sequencial. `IF NOT EXISTS` (reaplicável à mão) e sem
-- `CONCURRENTLY`: o Prisma aplica cada migração numa transação, onde `CREATE INDEX CONCURRENTLY` não é permitido
-- (docs/decisoes.md, "Auditoria run-4 — melhorias de banco").

-- Caução: pagamento da caução (rental-billing depositPayment), aluguel/reserva que usou a caução (liberação, órfãs).
CREATE INDEX IF NOT EXISTS "Payment_depositId_idx" ON "Payment"("depositId");
CREATE INDEX IF NOT EXISTS "Rental_depositId_idx" ON "Rental"("depositId");
CREATE INDEX IF NOT EXISTS "Reservation_depositId_idx" ON "Reservation"("depositId");

-- Webhook sem externalReference: fallback pelo id do gateway.
CREATE INDEX IF NOT EXISTS "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");

-- Relatórios e dashboard: receita por `endedAt`, uso/heatmap por `startedAt`, financeiro por `createdAt`.
CREATE INDEX IF NOT EXISTS "Rental_endedAt_idx" ON "Rental"("endedAt");
CREATE INDEX IF NOT EXISTS "Rental_startedAt_idx" ON "Rental"("startedAt");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");

-- Expurgo diário (housekeeping) de webhooks processados há mais de 90 dias.
CREATE INDEX IF NOT EXISTS "ProcessedWebhook_processedAt_idx" ON "ProcessedWebhook"("processedAt");

-- Escrito à mão (o Prisma não modela índice parcial; listado em test/helpers/e2e-app.ts HAND_WRITTEN_INDEXES):
-- expurgo LGPD da posição de início (lgpd.service purgeExpiredStartLocations) só olha aluguéis que ainda têm posição.
CREATE INDEX IF NOT EXISTS "Rental_start_location_startedAt" ON "Rental"("startedAt") WHERE "startLat" IS NOT NULL;
