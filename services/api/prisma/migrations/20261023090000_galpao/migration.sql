-- Retirada em galpão (docs/decisoes.md, 2026-10-22): só acréscimos. Colunas novas anuláveis ou com padrão; reservas e
-- motos existentes continuam válidas (reserva de rua = todos os campos de galpão nulos).

-- CreateEnum
CREATE TYPE "PickupMode" AS ENUM ('now', 'scheduled');

-- CreateEnum
CREATE TYPE "HandoverType" AS ENUM ('pickup', 'return_depot');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('pending_customer', 'accepted', 'disputed', 'canceled');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "depotId" UUID;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "cardId" UUID,
ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "coverage" "InsuranceCoverage",
ADD COLUMN     "depositMethod" "DepositMethod",
ADD COLUMN     "depotId" UUID,
ADD COLUMN     "pickupAt" TIMESTAMP(3),
ADD COLUMN     "pickupMode" "PickupMode",
ADD COLUMN     "planCode" "PlanCode",
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Depot" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "openingHours" JSONB NOT NULL,
    "pickupNowWindowMinutes" INTEGER NOT NULL DEFAULT 120,
    "maxScheduleDays" INTEGER NOT NULL DEFAULT 7,
    "scheduledGraceMinutes" INTEGER NOT NULL DEFAULT 30,
    "swapStationId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" UUID NOT NULL,
    "type" "HandoverType" NOT NULL,
    "status" "HandoverStatus" NOT NULL DEFAULT 'pending_customer',
    "depotId" UUID NOT NULL,
    "reservationId" UUID,
    "rentalId" UUID,
    "vehicleId" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "checklist" JSONB NOT NULL,
    "photoKeys" TEXT[],
    "batteryPct" INTEGER NOT NULL,
    "batterySerial" TEXT,
    "disputeReason" TEXT,
    "lastError" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Depot_active_idx" ON "Depot"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Handover_reservationId_key" ON "Handover"("reservationId");

-- CreateIndex
CREATE INDEX "Handover_depotId_status_idx" ON "Handover"("depotId", "status");

-- CreateIndex
CREATE INDEX "Handover_rentalId_idx" ON "Handover"("rentalId");

-- CreateIndex
CREATE INDEX "Handover_vehicleId_idx" ON "Handover"("vehicleId");

-- CreateIndex
CREATE INDEX "Vehicle_depotId_status_idx" ON "Vehicle"("depotId", "status");

-- CreateIndex
CREATE INDEX "Reservation_depotId_pickupAt_idx" ON "Reservation"("depotId", "pickupAt");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ───────────── SQL manual (não expressável no schema Prisma) ─────────────

-- Uma chegada no galpão não cancelada por aluguel (a saída já é única por reserva via "Handover_reservationId_key").
CREATE UNIQUE INDEX "Handover_one_open_return_per_rental" ON "Handover" ("rentalId") WHERE "type" = 'return_depot' AND "status" <> 'canceled';

-- Reserva com entrega aberta (`handover`) ainda ocupa o cliente e a moto: uma reserva aberta por cliente e por moto.
DROP INDEX "Reservation_one_active_per_customer";
CREATE UNIQUE INDEX "Reservation_one_active_per_customer" ON "Reservation" ("customerId") WHERE "status" IN ('active', 'handover');
DROP INDEX "Reservation_one_active_per_vehicle";
CREATE UNIQUE INDEX "Reservation_one_active_per_vehicle" ON "Reservation" ("vehicleId") WHERE "status" IN ('active', 'handover');

-- Defesa em profundidade: bateria em %, prazos do galpão dentro dos limites do contrato.
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_battery_pct_range" CHECK ("batteryPct" BETWEEN 0 AND 100);
ALTER TABLE "Depot" ADD CONSTRAINT "Depot_windows_range" CHECK ("pickupNowWindowMinutes" BETWEEN 15 AND 480 AND "maxScheduleDays" BETWEEN 0 AND 30 AND "scheduledGraceMinutes" BETWEEN 0 AND 120);
