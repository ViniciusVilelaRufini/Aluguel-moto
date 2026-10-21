-- CreateTable
CREATE TABLE "SettlementProgress" (
    "paymentId" UUID NOT NULL,
    "plan" TEXT NOT NULL,
    "depositId" UUID,
    "steps" JSONB NOT NULL DEFAULT '{}',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailure" TEXT,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementProgress_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "DepositRelease" (
    "depositId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositRelease_pkey" PRIMARY KEY ("depositId")
);

-- CreateTable
CREATE TABLE "PaymentCapture" (
    "paymentId" UUID NOT NULL,
    "capturedCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentCapture_pkey" PRIMARY KEY ("paymentId")
);

-- CreateIndex
CREATE INDEX "SettlementProgress_updatedAt_idx" ON "SettlementProgress"("updatedAt");

-- CreateIndex
CREATE INDEX "DepositRelease_confirmedAt_idx" ON "DepositRelease"("confirmedAt");

