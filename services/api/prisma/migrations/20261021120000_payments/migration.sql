-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dataId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderRef" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProviderRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceRemittance" (
    "id" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "rentalId" UUID,
    "insurer" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceRemittance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "paymentId" UUID NOT NULL,
    "rentalId" UUID,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "issuer" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhook_provider_eventId_key" ON "ProcessedWebhook"("provider", "eventId");

-- CreateIndex
CREATE INDEX "PaymentProviderRef_provider_providerId_idx" ON "PaymentProviderRef"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderRef_entityType_entityId_provider_key" ON "PaymentProviderRef"("entityType", "entityId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceRemittance_policyId_key" ON "InsuranceRemittance"("policyId");

-- CreateIndex
CREATE INDEX "InsuranceRemittance_createdAt_idx" ON "InsuranceRemittance"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentId_key" ON "Invoice"("paymentId");

