-- Ciclo de vida das baterias no galpão (docs/decisoes.md, 2026-10-24): só acréscimos. Galpão da bateria, estoque mínimo
-- do galpão, galpão do alerta e histórico de movimentação. Linhas antigas ficam com `depotId` nulo (válido).

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "depotId" UUID;

-- AlterTable
ALTER TABLE "Battery" ADD COLUMN     "depotId" UUID;

-- AlterTable
ALTER TABLE "Depot" ADD COLUMN     "minChargedBatteries" INTEGER;

-- CreateTable
CREATE TABLE "BatteryMovement" (
    "id" UUID NOT NULL,
    "batteryId" UUID NOT NULL,
    "fromStatus" "BatteryStatus",
    "toStatus" "BatteryStatus" NOT NULL,
    "depotId" UUID,
    "stationId" UUID,
    "vehicleId" UUID,
    "actorId" UUID NOT NULL,
    "reason" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatteryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BatteryMovement_batteryId_at_idx" ON "BatteryMovement"("batteryId", "at");

-- CreateIndex
CREATE INDEX "Battery_depotId_status_idx" ON "Battery"("depotId", "status");

-- AddForeignKey
ALTER TABLE "Battery" ADD CONSTRAINT "Battery_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatteryMovement" ADD CONSTRAINT "BatteryMovement_batteryId_fkey" FOREIGN KEY ("batteryId") REFERENCES "Battery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Escrito à mão (o Prisma não modela índice parcial): no máximo um alerta `battery_stock_low` não resolvido por galpão.
CREATE UNIQUE INDEX "Alert_one_open_stock_low_per_depot" ON "Alert"("depotId") WHERE "type" = 'battery_stock_low' AND "status" <> 'resolved';
