-- Bancada do J16 (revisão): origem da trava gravada no cadastro e hora da posição.
-- `lockedAt`/`lockedFromReport`: a telemetria (que a ponte manda com `travada: false` quando o bit de corte está velho) não
-- desfaz uma trava reportada pelo rastreador mais nova (VehiclesService.syncTrackerState).
-- `positionAt`: hora da medição de lat/lng (o link de localização mostrava o `lastSeenAt`, que o heartbeat avança).
-- Colunas anuláveis ou com default constante: o ADD COLUMN não reescreve a tabela (Postgres 11+).
SET lock_timeout = '5s';
ALTER TABLE "Vehicle" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "Vehicle" ADD COLUMN "lockedFromReport" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vehicle" ADD COLUMN "positionAt" TIMESTAMP(3);
