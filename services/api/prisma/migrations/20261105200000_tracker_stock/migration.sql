-- Estoque de rastreadores: modelo do aparelho e último sinal (rastreador sem moto).
ALTER TABLE "Tracker" ADD COLUMN "model" TEXT, ADD COLUMN "lastSeenAt" TIMESTAMP(3);

UPDATE "Tracker" SET "model" = 'J16' WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL;

-- Rastreador sem moto passa a se chamar gt06-<IMEI>.
UPDATE "Tracker" SET "thingName" = 'gt06-' || "imei" WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL AND "vehicleId" IS NULL;
