-- Chips (SIM) dos rastreadores e console de comandos de texto do rastreador (spec 2026-11-05).
CREATE TYPE "SimCardStatus" AS ENUM ('active', 'suspended', 'cancelled');

CREATE TYPE "TrackerConsoleStatus" AS ENUM ('pending', 'answered', 'failed');

CREATE TABLE "SimCard" (
    "id" UUID NOT NULL,
    "iccid" TEXT NOT NULL,
    "msisdn" TEXT,
    "carrier" TEXT NOT NULL,
    "apn" TEXT,
    "status" "SimCardStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "trackerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrackerConsoleCommand" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "trackerId" UUID NOT NULL,
    "thingName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "status" "TrackerConsoleStatus" NOT NULL DEFAULT 'pending',
    "failReason" TEXT,
    "response" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "TrackerConsoleCommand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SimCard_iccid_key" ON "SimCard"("iccid");

CREATE UNIQUE INDEX "SimCard_trackerId_key" ON "SimCard"("trackerId");

CREATE INDEX "TrackerConsoleCommand_vehicleId_createdAt_idx" ON "TrackerConsoleCommand"("vehicleId", "createdAt");

CREATE INDEX "TrackerConsoleCommand_createdAt_idx" ON "TrackerConsoleCommand"("createdAt");

ALTER TABLE "SimCard" ADD CONSTRAINT "SimCard_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrackerConsoleCommand" ADD CONSTRAINT "TrackerConsoleCommand_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrackerConsoleCommand" ADD CONSTRAINT "TrackerConsoleCommand_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs à mão (tabelas novas e vazias, valem desde já).
ALTER TABLE "SimCard" ADD CONSTRAINT "SimCard_iccid_digits" CHECK ("iccid" ~ '^[0-9]{18,22}$');

ALTER TABLE "TrackerConsoleCommand" ADD CONSTRAINT "TrackerConsoleCommand_text_len" CHECK (char_length("text") BETWEEN 1 AND 100);
