-- Retirada em galpão, fix round 1 (docs/decisoes.md): a saída deixa de ser única por reserva para sempre. Uma entrega
-- `pickup` disputada ou cancelada libera refazer; no máximo uma pendente ou aceita por reserva. Nome do galpão único
-- (o seed faz upsert atômico pelo nome).

-- DropIndex
DROP INDEX "Handover_reservationId_key";

-- CreateIndex
CREATE INDEX "Handover_reservationId_idx" ON "Handover"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "Depot_name_key" ON "Depot"("name");

-- ───────────── SQL manual (não expressável no schema Prisma) ─────────────

CREATE UNIQUE INDEX "Handover_one_open_pickup_per_reservation" ON "Handover" ("reservationId") WHERE "type" = 'pickup' AND "status" IN ('pending_customer', 'accepted');

-- Cada tipo com a sua referência: saída aponta a reserva; chegada aponta o aluguel.
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_type_reference" CHECK (("type" = 'pickup' AND "reservationId" IS NOT NULL) OR ("type" = 'return_depot' AND "rentalId" IS NOT NULL));
