#!/usr/bin/env bash
# Atualiza o Volti dev na instância: git pull, env do SSM, rebuild, prisma migrate deploy e restart.
# Rodado no primeiro boot (user data) e depois pelo documento SSM "volti-dev-update" (Run Command, um clique).
set -euo pipefail
source /etc/volti/instance.env
cd "$VOLTI_REPO_DIR"
export GIT_SSH_COMMAND='ssh -i /root/.ssh/volti_deploy -o IdentitiesOnly=yes -o UserKnownHostsFile=/root/.ssh/known_hosts'
git fetch --depth 1 origin "$VOLTI_BRANCH"
git reset --hard FETCH_HEAD
echo "commit: $(git rev-parse --short HEAD) ($VOLTI_BRANCH)"

bash deploy/single/render-env.sh
dc() { docker compose -f deploy/single/compose.yml --env-file /opt/volti/.env "$@"; }

dc build api postgres
dc up -d postgres redis mosquitto
# Migrações antes de trocar a API (a migração inicial cria a extensão PostGIS).
dc run --rm api npx prisma migrate deploy
dc up -d --remove-orphans
# Disco de 20 GB: descarta imagens e cache de build antigos.
docker image prune -f >/dev/null
docker builder prune -f --filter until=72h >/dev/null
dc ps
