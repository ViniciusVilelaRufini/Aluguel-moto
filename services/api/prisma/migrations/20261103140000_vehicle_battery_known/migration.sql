-- Bancada do J16 (2026-11-03): o rastreador pode não ter leitura da bateria (telemetria `bateria_conhecida: false`, ex.: J16
-- alimentado por conversor DC-DC). `batteryKnown = false` = o `batteryPct` 0 não é carga real (contrato: `Vehicle.batteryKnown`).
-- Default constante: o ADD COLUMN não reescreve a tabela (Postgres 11+); as motos existentes ficam com a bateria conhecida.
-- Não espera atrás de consulta longa segurando a fila da tabela: falha rápido e o deploy é refeito.
SET lock_timeout = '5s';
ALTER TABLE "Vehicle" ADD COLUMN "batteryKnown" BOOLEAN NOT NULL DEFAULT true;
