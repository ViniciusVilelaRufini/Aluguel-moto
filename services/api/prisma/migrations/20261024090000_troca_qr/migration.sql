-- Troca de bateria na estação via QR (docs/decisoes.md, 2026-10-22): só acréscimos. Coluna nova anulável na estação,
-- tabela nova de trocas e a taxa por troca como taxa de sistema (editável pelo admin em /pricing/fees).

-- CreateEnum
CREATE TYPE "StationSwapStatus" AS ENUM ('opening_slot', 'awaiting_return', 'returned', 'releasing', 'completed', 'canceled', 'failed');

-- CreateEnum
CREATE TYPE "StationSwapEndReason" AS ENUM ('canceled_by_customer', 'slot_closed_without_return', 'station_timeout', 'return_timeout', 'release_timeout');

-- AlterTable
ALTER TABLE "SwapStation" ADD COLUMN     "stationCode" TEXT;

-- CreateTable
CREATE TABLE "StationSwap" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "rentalId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "status" "StationSwapStatus" NOT NULL DEFAULT 'opening_slot',
    "endReason" "StationSwapEndReason",
    "slotNumber" INTEGER,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "distanceM" INTEGER NOT NULL,
    "returnedSerial" TEXT,
    "returnedPct" INTEGER,
    "releasedSerial" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationSwap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StationSwap_stationId_createdAt_idx" ON "StationSwap"("stationId", "createdAt");

-- CreateIndex
CREATE INDEX "StationSwap_rentalId_status_idx" ON "StationSwap"("rentalId", "status");

-- CreateIndex
CREATE INDEX "StationSwap_status_expiresAt_idx" ON "StationSwap"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StationSwap_customerId_idempotencyKey_key" ON "StationSwap"("customerId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SwapStation_stationCode_key" ON "SwapStation"("stationCode");

-- AddForeignKey
ALTER TABLE "StationSwap" ADD CONSTRAINT "StationSwap_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "SwapStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ───────────── SQL manual (não expressável no schema Prisma) ─────────────

-- Uma troca aberta por aluguel (a API também confere; o índice fecha a corrida entre duas requisições).
CREATE UNIQUE INDEX "StationSwap_one_open_per_rental" ON "StationSwap" ("rentalId") WHERE "status" IN ('opening_slot', 'awaiting_return', 'returned', 'releasing');

ALTER TABLE "StationSwap" ADD CONSTRAINT "StationSwap_returned_pct_range" CHECK ("returnedPct" IS NULL OR ("returnedPct" >= 0 AND "returnedPct" <= 100));
ALTER TABLE "StationSwap" ADD CONSTRAINT "StationSwap_fee_nonnegative" CHECK ("feeCents" >= 0);

-- Taxa por troca nos planos por minuto e por hora (padrão R$ 5,00). Taxa de sistema: o admin muda o valor, não apaga.
INSERT INTO "Fee" ("id", "code", "name", "description", "amountCents", "active", "system", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'battery_swap_fee', 'Troca de bateria na estação', 'Por troca nos planos por minuto e por hora; cobrada no fechamento do aluguel.', 500, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
