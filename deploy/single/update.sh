#!/usr/bin/env bash
# Atualiza o Volti dev na instância: git pull, env do SSM, rebuild, prisma migrate deploy e restart.
# Rodado no primeiro boot (user data) e depois pelo documento SSM "volti-dev-update" (Run Command, um clique).
set -euo pipefail
source "${VOLTI_INSTANCE_ENV:-/etc/volti/instance.env}"
cd "$VOLTI_REPO_DIR"
export GIT_SSH_COMMAND='ssh -i /root/.ssh/volti_deploy -o IdentitiesOnly=yes -o UserKnownHostsFile=/root/.ssh/known_hosts'
git fetch --depth 1 origin "$VOLTI_BRANCH"
git reset --hard FETCH_HEAD
echo "commit: $(git rev-parse --short HEAD) ($VOLTI_BRANCH)"

bash deploy/single/render-env.sh
# IMDS só para a API (Run-2): regras DOCKER-USER e a unit de boot, antes de qualquer build (os RUN do docker build também
# rodam em container) e de subir os containers. Idempotente.
bash deploy/single/imds-guard.sh install
# A unit é RequiredBy=docker.service: se ela falhou no boot, o Docker ficou parado. As regras já foram aplicadas acima;
# aqui só se ativa a unit se estiver inativa e se sobe o Docker. Nunca `restart`: com o Requires= do docker.service, o
# restart da unit reiniciaria o dockerd e todos os containers a cada update.
systemctl reset-failed volti-imds-guard 2>/dev/null || true
systemctl is-active --quiet volti-imds-guard || systemctl start volti-imds-guard
systemctl start docker
ENV_FILE="${VOLTI_ENV_FILE:-/opt/volti/.env}"
dc() { docker compose -f deploy/single/compose.yml --env-file "$ENV_FILE" "$@"; }

# Simulador de rastreadores (services/iot-sim): IOT_SIM=on (padrão, também quando ausente) ou off, vindo do parâmetro
# /volti/dev/config/IOT_SIM (render-env.sh). Ligado, sobe junto com o resto (profile "sim"); desligado, é removido.
iot_sim="$(grep -E '^IOT_SIM=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
case "${iot_sim:-on}" in
  off|false|0) sim=() ; sim_services=() ; echo "simulador de rastreadores: desligado (IOT_SIM=$iot_sim)" ;;
  *) sim=(--profile sim) ; sim_services=(iot-sim) ; echo "simulador de rastreadores: ligado" ;;
esac

# Rastreador GT06 só relé (Traccar + ponte + emulador, spec 2026-10-27): GT06=on liga o profile "gt06" (padrão off: a
# t4g.small tem 2 GiB). Ligado, o gt06.sh init (papéis, banco e usuários do Traccar; idempotente) roda depois das migrações.
# Mudanças neste arquivo só valem no update SEGUINTE: o bash já está executando a cópia antiga quando o git reset a troca.
gt06_flag="$(grep -E '^GT06=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
case "${gt06_flag:-off}" in
  on|true|1) gt06=(--profile gt06) ; gt06_services=(traccar-bridge) ; echo "rastreador GT06 (Traccar + ponte + emulador): ligado" ;;
  *) gt06=() ; gt06_services=() ; echo "rastreador GT06: desligado (GT06=${gt06_flag:-off})" ;;
esac

dc "${sim[@]}" "${gt06[@]}" build api postgres "${sim_services[@]}" "${gt06_services[@]}"
# Transição única para a rede volti-dev (172.30.0.0/24, IP fixo da API): os containers da rede antiga volti_default saem
# (os volumes ficam) e a rede é apagada. Nas próximas execuções a volti_default não existe e nada disso roda.
if docker network inspect volti_default >/dev/null 2>&1; then
  dc --profile sim down --remove-orphans
  if ! docker network rm volti_default >/dev/null 2>&1; then
    # Segue o update, mas avisa: enquanto a rede existir, todo update repete o down completo (API fora do ar).
    echo "AVISO: não foi possível remover a rede antiga volti_default; cada update vai repetir o down completo até ela sair (veja: docker network inspect volti_default)" >&2
  fi
fi
dc up -d postgres redis mosquitto
# Migrações antes de trocar a API (a migração inicial cria a extensão PostGIS).
# api-migrate: sem o IP fixo da API (que está no ar), sem IMDS e só com o DATABASE_URL.
dc --profile migrate run --rm api-migrate npx prisma migrate deploy
# GT06: banco/papéis do Traccar e da ponte (o GRANT por coluna precisa da tabela "Tracker", recém-migrada) e usuários do Traccar.
# Init com falha não bloqueia o deploy da API: o profile gt06 sai deste update (e os containers GT06 são removidos abaixo).
if [ ${#gt06[@]} -gt 0 ]; then
  bash deploy/single/gt06.sh init || { echo "AVISO: GT06 init falhou; profile gt06 fora deste update" >&2; gt06=(); gt06_services=(); }
fi
dc "${sim[@]}" "${gt06[@]}" up -d --remove-orphans
if [ ${#sim[@]} -eq 0 ]; then dc --profile sim rm -sf iot-sim >/dev/null 2>&1 || true; fi
if [ ${#gt06[@]} -eq 0 ]; then dc --profile gt06 rm -sf traccar traccar-bridge gt06-emulator >/dev/null 2>&1 || true; fi
# Disco de 20 GB: descarta imagens e cache de build antigos.
docker image prune -f >/dev/null
docker builder prune -f --filter until=72h >/dev/null
dc "${sim[@]}" "${gt06[@]}" ps
