-- QA-21 (fix round 1): marcador do início de aluguel em andamento, para compensar se o processo morrer durante o desbloqueio.
CREATE TABLE "RentalStart" (
    "rentalId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "depositId" UUID,
    "policyId" UUID,
    "previousStatus" "VehicleStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalStart_pkey" PRIMARY KEY ("rentalId")
);

CREATE INDEX "RentalStart_createdAt_idx" ON "RentalStart"("createdAt");
CREATE INDEX "RentalStart_customerId_idx" ON "RentalStart"("customerId");
