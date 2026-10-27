-- Rastreador só relé (spec 2026-10-27, GT06/Concox J16): capacidade, protocolo e IMEI único.
CREATE TYPE "TrackerControlMode" AS ENUM ('speed_control', 'relay_only');
ALTER TABLE "Tracker" ADD COLUMN "controlMode" "TrackerControlMode" NOT NULL DEFAULT 'speed_control';
ALTER TABLE "Tracker" ADD COLUMN "protocol" TEXT;
-- Único quando preenchido (o Postgres aceita vários NULL num índice único).
CREATE UNIQUE INDEX "Tracker_imei_key" ON "Tracker"("imei");
-- relay_only exige IMEI: é a chave do dispositivo no Traccar.
ALTER TABLE "Tracker" ADD CONSTRAINT "Tracker_relay_only_imei" CHECK ("controlMode" <> 'relay_only' OR "imei" IS NOT NULL);
