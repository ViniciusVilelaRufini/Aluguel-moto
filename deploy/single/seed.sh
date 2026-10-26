#!/usr/bin/env bash
# Seed idempotente de demonstração (upsert): rode UMA vez depois do primeiro update (documento SSM "volti-dev-seed").
set -euo pipefail
source /etc/volti/instance.env
cd "$VOLTI_REPO_DIR"
# Dentro da API em execução (exec, não run): o seed sobe as fotos do catálogo no S3 com a role da instância, e só o
# container da API (IP fixo) alcança o IMDS. Rode depois do volti-dev-update.
docker compose -f deploy/single/compose.yml --env-file /opt/volti/.env exec -T api node dist-seed/prisma/seed.js
