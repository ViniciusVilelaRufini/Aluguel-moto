-- QA-07 (fix round 1): exclusões de identidade no Cognito pendentes de retentativa.
CREATE TABLE "CustomerIdentityDeletion" (
    "customerId" UUID NOT NULL,
    "sub" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerIdentityDeletion_pkey" PRIMARY KEY ("customerId")
);

CREATE INDEX "CustomerIdentityDeletion_attempts_idx" ON "CustomerIdentityDeletion"("attempts");
