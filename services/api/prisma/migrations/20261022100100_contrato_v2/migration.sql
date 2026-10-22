-- Contrato v2 (docs/decisoes.md, 2026-10-22): chave Pix de estorno, catálogo de modelos, estações de troca, cupons na
-- conta, indicação, pausa e moto fixa do plano, estado das mensagens do chat, endereço em cache, manutenção preventiva
-- por km/horas e baterias. Só acréscimos.

-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('cpf', 'email', 'phone', 'random');

-- CreateEnum
CREATE TYPE "BatteryStatus" AS ENUM ('in_vehicle', 'in_van', 'charging', 'in_station', 'retired');

-- CreateEnum
CREATE TYPE "MaintenanceSource" AS ENUM ('staff', 'customer', 'system');

-- CreateEnum
CREATE TYPE "ReferralRewardStatus" AS ENUM ('pending', 'granted', 'canceled');

-- CreateEnum
CREATE TYPE "CustomerCouponSource" AS ENUM ('manual', 'referral');

-- AlterTable
ALTER TABLE "Battery" ADD COLUMN     "cycleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "holderId" UUID,
ADD COLUMN     "stationId" UUID,
ADD COLUMN     "status" "BatteryStatus" NOT NULL DEFAULT 'charging';

-- AlterTable
ALTER TABLE "BatterySwap" ADD COLUMN     "installedBatteryCycleCount" INTEGER,
ADD COLUMN     "removedBatteryCycleCount" INTEGER,
ADD COLUMN     "removedBatteryPct" INTEGER;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "pixRefundKey" TEXT,
ADD COLUMN     "pixRefundKeyType" "PixKeyType",
ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTask" ADD COLUMN     "customerId" UUID,
ADD COLUMN     "source" "MaintenanceSource" NOT NULL DEFAULT 'staff';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "assignedVehicleId" UUID,
ADD COLUMN     "pauseEndsAt" TIMESTAMP(3),
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausesUsedInPeriod" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SupportMessage" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "addressLabel" TEXT,
ADD COLUMN     "addressLat" DOUBLE PRECISION,
ADD COLUMN     "addressLng" DOUBLE PRECISION,
ADD COLUMN     "addressUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "lastServiceAt" TIMESTAMP(3),
ADD COLUMN     "lastServiceOdometerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lastServiceUsageHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "odometerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "usageHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vehicleModelId" UUID;

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "description" TEXT,
    "photoObjectKey" TEXT,
    "pricePerMinuteCents" INTEGER NOT NULL,
    "unlockFeeCents" INTEGER,
    "serviceIntervalKm" INTEGER NOT NULL DEFAULT 1000,
    "serviceIntervalHours" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapStation" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "availableBatteries" INTEGER NOT NULL DEFAULT 0,
    "totalSlots" INTEGER NOT NULL DEFAULT 0,
    "openingHours" TEXT NOT NULL,
    "open24h" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwapStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCoupon" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "source" "CustomerCouponSource" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" UUID NOT NULL,
    "referrerId" UUID NOT NULL,
    "refereeId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralRewardStatus" NOT NULL DEFAULT 'pending',
    "referrerRewardCents" INTEGER NOT NULL,
    "refereeRewardCents" INTEGER NOT NULL,
    "refereeWalletEntryId" UUID,
    "referrerWalletEntryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_name_key" ON "VehicleModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_slug_key" ON "VehicleModel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCoupon_customerId_couponId_key" ON "CustomerCoupon"("customerId", "couponId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_createdAt_idx" ON "Referral"("referrerId", "createdAt");

-- CreateIndex
CREATE INDEX "Battery_vehicleId_idx" ON "Battery"("vehicleId");

-- CreateIndex
CREATE INDEX "Battery_holderId_status_idx" ON "Battery"("holderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_referralCode_key" ON "Customer"("referralCode");

-- CreateIndex
CREATE INDEX "MaintenanceTask_customerId_idx" ON "MaintenanceTask"("customerId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_scheduledFor_idx" ON "MaintenanceTask"("scheduledFor");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCoupon" ADD CONSTRAINT "CustomerCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Escrito à mão (o Prisma não modela índices parciais): uma assinatura aberta (ativa ou pausada) por cliente e uma moto
-- fixa por assinatura aberta. O e2e confere que existem (`HAND_WRITTEN_INDEXES`).
CREATE UNIQUE INDEX "Subscription_one_open_per_customer" ON "Subscription" ("customerId") WHERE "status" IN ('active', 'paused');
CREATE UNIQUE INDEX "Subscription_one_open_per_vehicle" ON "Subscription" ("assignedVehicleId") WHERE "status" IN ('active', 'paused') AND "assignedVehicleId" IS NOT NULL;
