-- Postgres LOCAL (docker-compose, profile gt06; spec GT06 §7). Roda só na primeira subida do volume pgdata; com volume antigo:
--   docker compose exec -T postgres psql -U volti -d volti < infra/postgres/traccar-db.sql
-- Senhas abaixo são de desenvolvimento local (o Postgres do compose já usa volti/volti); em produção vêm do Secrets Manager.
CREATE ROLE traccar LOGIN PASSWORD 'traccar';
CREATE DATABASE traccar OWNER traccar;
REVOKE ALL ON DATABASE traccar FROM PUBLIC;

-- Papel da ponte: só leitura do registro IMEI -> thingName. O GRANT por coluna roda depois das migrações da API
-- (infra/postgres/bridge-grants.sql, serviço bridge-db-grants), porque a tabela "Tracker" ainda não existe aqui.
CREATE ROLE volti_bridge LOGIN PASSWORD 'volti-bridge-local';
