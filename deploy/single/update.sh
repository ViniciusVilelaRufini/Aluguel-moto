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

# Simulador de rastreadores (services/iot-sim): IOT_SIM=on (padrão, também quando ausente) ou off, vindo do parâmetro
# /volti/dev/config/IOT_SIM (render-env.sh). Ligado, sobe junto com o resto (profile "sim"); desligado, é removido.
iot_sim="$(grep -E '^IOT_SIM=' /opt/volti/.env | tail -n 1 | cut -d= -f2- || true)"
case "${iot_sim:-on}" in
  off|false|0) sim=() ; sim_services=() ; echo "simulador de rastreadores: desligado (IOT_SIM=$iot_sim)" ;;
  *) sim=(--profile sim) ; sim_services=(iot-sim) ; echo "simulador de rastreadores: ligado" ;;
esac

dc "${sim[@]}" build api postgres "${sim_services[@]}"
dc up -d postgres redis mosquitto
# Migrações antes de trocar a API (a migração inicial cria a extensão PostGIS).
dc run --rm api npx prisma migrate deploy
dc "${sim[@]}" up -d --remove-orphans
if [ ${#sim[@]} -eq 0 ]; then dc --profile sim rm -sf iot-sim >/dev/null 2>&1 || true; fi
# Disco de 20 GB: descarta imagens e cache de build antigos.
docker image prune -f >/dev/null
docker builder prune -f --filter until=72h >/dev/null
dc "${sim[@]}" ps
