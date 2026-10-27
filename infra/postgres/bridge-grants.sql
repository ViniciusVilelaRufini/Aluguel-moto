-- Executado pelo serviço bridge-db-grants do docker-compose (profile gt06) quando a tabela "Tracker" já existe
-- (a API migra ao subir). Idempotente. Só SELECT nas colunas que a ponte lê (services/traccar-bridge/src/registry.ts).
REVOKE ALL ON "Tracker" FROM volti_bridge;
GRANT SELECT ("imei", "thingName", "controlMode") ON "Tracker" TO volti_bridge;
