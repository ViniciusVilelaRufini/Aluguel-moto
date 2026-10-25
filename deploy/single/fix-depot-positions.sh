#!/usr/bin/env bash
# Correção de dados (idempotente): moto parada num galpão (`depotId` preenchido e status `free` ou `maintenance`) passa a
# ter a posição do galpão (lat/lng e o endereço em cache). Corrige motos movidas de galpão por SQL sem atualizar a
# posição (ex.: o lote VLT-0011..0018 em Catanduva com a posição de Pinheiros).
# Rodar pelo SSM (Run Command, documento AWS-RunShellScript), ver deploy/single/cloudshell.md:
#   bash /opt/volti/src/deploy/single/fix-depot-positions.sh            # aplica
#   bash /opt/volti/src/deploy/single/fix-depot-positions.sh --dry-run  # só lista o que mudaria
# Uma segunda execução não muda nada (0 motos). Cada moto corrigida ganha um registro `vehicle.position_fix` no AuditLog.
# Não toca em motos em uso (rented/paused/reserved), aguardando recolhimento, bloqueadas ou offline.
# Com o simulador ligado (IOT_SIM), o rastreador simulado também já reporta a posição do galpão.
set -euo pipefail
source /etc/volti/instance.env
cd "$VOLTI_REPO_DIR"

mode="${1:-apply}"
case "$mode" in
  apply) finish=COMMIT ;;
  --dry-run) finish=ROLLBACK ;;
  *) echo "uso: $0 [--dry-run]" >&2; exit 2 ;;
esac

# psql dentro do container do Postgres (socket local; nenhuma senha passa pela linha de comando).
docker compose -f deploy/single/compose.yml --env-file /opt/volti/.env exec -T postgres \
  psql -U volti -d volti -v ON_ERROR_STOP=1 -q -P pager=off <<SQL
BEGIN;
\echo 'Motos com a posição alinhada ao galpão (a contagem sai no rodapé):'
WITH moved AS (
  UPDATE "Vehicle" v
     SET "lat" = d."lat", "lng" = d."lng",
         "addressLabel" = d."address", "addressLat" = d."lat", "addressLng" = d."lng", "addressUpdatedAt" = now(),
         "updatedAt" = now()
    FROM "Depot" d
   WHERE v."depotId" = d."id"
     AND v."status" IN ('free', 'maintenance')
     AND (v."lat" IS DISTINCT FROM d."lat" OR v."lng" IS DISTINCT FROM d."lng")
  RETURNING v."id", v."code", d."id" AS "depotId", d."name" AS "depot"
), audit AS (
  INSERT INTO "AuditLog" ("id", "actorType", "action", "entityType", "entityId", "reason", "metadata", "createdAt")
  SELECT gen_random_uuid(), 'system', 'vehicle.position_fix', 'Vehicle', m."id"::text,
         'Posição alinhada à do galpão (deploy/single/fix-depot-positions.sh)', jsonb_build_object('depotId', m."depotId"), now()
    FROM moved m
  RETURNING 1
)
SELECT m."code", m."depot", (SELECT count(*) FROM audit) AS "auditados" FROM moved m ORDER BY m."code";
${finish};
SQL
if [ "$mode" = --dry-run ]; then echo "dry-run: nada foi gravado (ROLLBACK)"; fi
