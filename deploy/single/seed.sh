#!/usr/bin/env bash
# Seed idempotente de demonstração (upsert): rode UMA vez depois do primeiro update (documento SSM "volti-dev-seed").
set -euo pipefail
source /etc/volti/instance.env
cd "$VOLTI_REPO_DIR"
docker compose -f deploy/single/compose.yml --env-file /opt/volti/.env run --rm api node dist-seed/prisma/seed.js
