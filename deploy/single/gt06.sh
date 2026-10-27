#!/usr/bin/env bash
# Rastreador GT06 só relé no dev single (spec docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md, §7):
#   gt06.sh init                                      papéis/banco do Traccar e da ponte e usuários do Traccar (idempotente;
#                                                     o update.sh chama com GT06=on, depois das migrações)
#   gt06.sh provision <VLT-0000> <moto-0000> <imei>   Tracker relay_only + dispositivo no Traccar ligado ao usuário da ponte
#   gt06.sh deprovision <moto-0000>                   apaga o Tracker relay_only (o iot-sim volta a simular a moto)
#   gt06.sh e2e <VLT-0000> <moto-0000>                emulador anda e para; lock pela API com o token de staff do DONO
#                                                     (/volti/dev/secrets/E2E_STAFF_TOKEN); confere a linha do tempo MQTT
# Senhas e token nunca vão para a linha de comando (curl -K - e SQL pelo stdin) nem para a saída; o IMEI também não.
set -euo pipefail
source "${VOLTI_INSTANCE_ENV:-/etc/volti/instance.env}"
export AWS_DEFAULT_REGION="$VOLTI_REGION"

usage() { sed -n '2,9p' "$0" >&2; exit 2; }
action="${1:-}"
case "$action" in
  init) ;;
  provision) [[ "${2:-}" =~ ^VLT-[0-9]{4,}$ && "${3:-}" =~ ^moto-[0-9]{4,}$ && "${4:-}" =~ ^[0-9]{15}$ ]] || usage ;;
  deprovision) [[ "${2:-}" =~ ^moto-[0-9]{4,}$ ]] || usage ;;
  e2e) [[ "${2:-}" =~ ^VLT-[0-9]{4,}$ && "${3:-}" =~ ^moto-[0-9]{4,}$ ]] || usage ;;
  *) usage ;;
esac

cd "$VOLTI_REPO_DIR"
ENV_FILE="${VOLTI_ENV_FILE:-/opt/volti/.env}"
# Usuários do Traccar: o admin (primeiro usuário, só o gt06.sh e o provision-gt06 usam) e o da ponte (TRACCAR_EMAIL do
# serviço traccar-bridge no compose.yml; os dispositivos são ligados a ele, senão a ponte não os vê).
TRACCAR_ADMIN_EMAIL=admin@volti.local
TRACCAR_BRIDGE_EMAIL=bridge@volti.local
TRACCAR_LOCAL=http://127.0.0.1:8082
envval() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2-; }
dc() { docker compose -f deploy/single/compose.yml --env-file "$ENV_FILE" --profile gt06 "$@"; }
sql() { dc exec -T postgres psql -v ON_ERROR_STOP=1 -U volti -d volti -tA; }
# traccar_admin <método> <caminho> [json]: credenciais e corpo pelo stdin do curl (-K -), nunca na linha de comando.
traccar_admin() {
  {
    printf 'user = "%s:%s"\n' "$TRACCAR_ADMIN_EMAIL" "$(envval TRACCAR_ADMIN_PASSWORD)"
    if [ -n "${3:-}" ]; then printf 'header = "Content-Type: application/json"\ndata = "%s"\n' "${3//\"/\\\"}"; fi
  } | curl -fsS -X "$1" -K - "$TRACCAR_LOCAL$2"
}

case "$action" in
  init)
    for n in TRACCAR_DB_PASSWORD TRACCAR_ADMIN_PASSWORD TRACCAR_BRIDGE_PASSWORD BRIDGE_DB_PASSWORD; do
      [ -n "$(envval "$n")" ] || { echo "$n ausente no .env (rode render-env.sh)" >&2; exit 1; }
    done
    # Senhas geradas pelo render-env.sh (hex; o .env só aceita [A-Za-z0-9._:/,@+=-]): seguras entre aspas simples.
    # O SQL vai pelo stdin do psql (nada na linha de comando).
    sql >/dev/null <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'traccar') THEN CREATE ROLE traccar LOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'volti_bridge') THEN CREATE ROLE volti_bridge LOGIN; END IF;
END \$\$;
ALTER ROLE traccar PASSWORD '$(envval TRACCAR_DB_PASSWORD)';
ALTER ROLE volti_bridge PASSWORD '$(envval BRIDGE_DB_PASSWORD)';
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM volti_bridge;
GRANT CONNECT ON DATABASE volti TO volti_bridge;
GRANT USAGE ON SCHEMA public TO volti_bridge;
GRANT SELECT ("imei", "thingName", "controlMode") ON "Tracker" TO volti_bridge;
SQL
    if [ -z "$(echo "SELECT 1 FROM pg_database WHERE datname = 'traccar'" | sql)" ]; then
      echo "CREATE DATABASE traccar OWNER traccar" | sql >/dev/null
      echo "banco traccar criado"
    fi
    echo "REVOKE ALL ON DATABASE traccar FROM PUBLIC" | sql >/dev/null
    dc up -d traccar
    for _ in $(seq 1 60); do curl -fsS "$TRACCAR_LOCAL/api/server" >/dev/null 2>&1 && break; sleep 3; done
    server="$(curl -fsS "$TRACCAR_LOCAL/api/server")" || { echo "o Traccar não respondeu em 180 s (logs: docker compose ... logs traccar)" >&2; exit 1; }
    echo "Traccar no ar ($(printf '%s' "$server" | grep -o '"version":"[^"]*"' || echo 'versão desconhecida'))"
    if ! traccar_admin GET /api/users >/dev/null 2>&1; then
      # Traccar vazio: o primeiro usuário vira administrador. Corpo pelo stdin.
      printf '{"name":"Volti admin","email":"%s","password":"%s"}' "$TRACCAR_ADMIN_EMAIL" "$(envval TRACCAR_ADMIN_PASSWORD)" |
        curl -fsS -X POST -H 'Content-Type: application/json' --data @- "$TRACCAR_LOCAL/api/users" >/dev/null ||
        { echo "não foi possível criar o admin do Traccar (já existe outro usuário com outra senha?)" >&2; exit 1; }
      echo "administrador do Traccar criado"
    fi
    if ! traccar_admin GET /api/users | grep -q "\"email\":\"$TRACCAR_BRIDGE_EMAIL\""; then
      traccar_admin POST /api/users "$(printf '{"name":"traccar-bridge","email":"%s","password":"%s"}' "$TRACCAR_BRIDGE_EMAIL" "$(envval TRACCAR_BRIDGE_PASSWORD)")" >/dev/null
      echo "usuário da ponte criado no Traccar"
    fi
    echo "GT06 pronto (Traccar, papéis traccar e volti_bridge, usuários admin e ponte)"
    ;;
  provision)
    # A senha do admin do Traccar já está no ambiente da API (env_file); aqui só valores públicos. TRACCAR_BRIDGE_EMAIL liga
    # o dispositivo ao usuário da ponte (sem isso a ponte não recebe as posições nem manda o corte).
    dc exec -T -e TRACCAR_URL=http://traccar:8082 -e TRACCAR_ADMIN_EMAIL="$TRACCAR_ADMIN_EMAIL" -e TRACCAR_BRIDGE_EMAIL="$TRACCAR_BRIDGE_EMAIL" \
      api node dist/cli/provision-gt06.js --vehicle "$2" --thing "$3" --imei "$4"
    echo "$3 provisionada como GT06 relay_only (a ponte relê o registro em até 60 s)"
    ;;
  deprovision)
    echo "DELETE FROM \"Tracker\" WHERE \"thingName\" = '$2' AND \"controlMode\" = 'relay_only'" | sql
    echo "Tracker relay_only de $2 removido (o iot-sim volta a simular a moto no próximo ciclo)"
    ;;
  e2e)
    code="$2" thing="$3"
    host="$(envval PUBLIC_HOST)"
    vid="$(echo "SELECT id FROM \"Vehicle\" WHERE code = '$code'" | sql)"
    [ -n "$vid" ] || { echo "moto $code não encontrada" >&2; exit 1; }
    imei="$(echo "SELECT imei FROM \"Tracker\" WHERE \"thingName\" = '$thing' AND \"controlMode\" = 'relay_only' AND \"vehicleId\" = '$vid'" | sql)"
    [ -n "$imei" ] || { echo "$thing não está provisionada como GT06 na moto $code (gt06.sh provision)" >&2; exit 1; }
    token="$(aws ssm get-parameter --name "$VOLTI_SECRETS_PREFIX/E2E_STAFF_TOKEN" --with-decryption --query Parameter.Value --output text)" ||
      { echo "sem $VOLTI_SECRETS_PREFIX/E2E_STAFF_TOKEN (DONO: grave o token de staff, cloudshell.md)" >&2; exit 1; }
    api() {
      {
        printf 'header = "Authorization: Bearer %s"\n' "$token"
        if [ -n "${3:-}" ]; then printf 'header = "Content-Type: application/json"\ndata = "%s"\n' "${3//\"/\\\"}"; fi
      } | curl -fsS -X "$1" -K - "https://$host$2"
    }
    dir="$(mktemp -d /var/tmp/gt06-e2e.XXXXXX)"
    chmod 755 "$dir"
    # Hora UTC com milissegundos no recebimento de cada linha (o check-timeline intercala com o log JSON do emulador).
    stamp() { while IFS= read -r l; do printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" "$l"; done; }
    sub=""
    stop_sub() {
      dc exec -T mosquitto pkill -x mosquitto_sub >/dev/null 2>&1 || true
      sleep 1
      if [ -n "$sub" ]; then kill "$sub" 2>/dev/null || true; fi
    }
    cleanup() {
      stop_sub
      GT06_SCENARIO=parked GT06_EMULATOR_IMEI="$imei" dc up -d --force-recreate gt06-emulator >/dev/null 2>&1 || true
    }
    trap cleanup EXIT
    # Tráfego MQTT da moto (telemetria, delta e update do shadow); -W encerra o mosquitto_sub sozinho em último caso.
    dc exec -T mosquitto mosquitto_sub -W 540 -v -t "motos/$thing/telemetria" -t "\$aws/things/$thing/shadow/update/delta" \
      -t "\$aws/things/$thing/shadow/update" | stamp >"$dir/mqtt.log" &
    sub=$!
    sleep 2
    GT06_SCENARIO=ride-then-stop GT06_EMULATOR_IMEI="$imei" dc up -d --force-recreate gt06-emulator
    sleep 25 # andando a 20 km/h (60 s), fora da graça de 10 s
    resp="$(api POST "/vehicles/$vid/commands" '{"type":"lock","reason":"e2e GT06 relay-only"}')" ||
      { echo "FALHA: POST /vehicles/{id}/commands recusado (token vencido? DONO: renove E2E_STAFF_TOKEN)" >&2; exit 1; }
    cid="$(printf '%s' "$resp" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)"
    [ -n "$cid" ] || { echo "FALHA: resposta do comando sem id" >&2; exit 1; }
    status=""
    for _ in $(seq 1 60); do
      status="$(api GET "/commands/$cid" | grep -o '"status":"[^"]*"' | head -n 1 | cut -d'"' -f4 || true)"
      case "$status" in confirmed|failed) break ;; esac
      sleep 5
    done
    sleep 3
    stop_sub
    # Só as linhas JSON (todas com "ts"): o check-timeline recusa linha sem hora.
    dc logs --no-color --no-log-prefix gt06-emulator | grep '^{' >"$dir/emulator.log" || true
    chmod 644 "$dir/mqtt.log" "$dir/emulator.log"
    echo "comando $cid: ${status:-sem status}"
    result=0
    # Verificador sem rede, sem segredos e sem NET_RAW (imagem da ponte).
    docker run --rm -i --network none --cap-drop NET_RAW -v "$dir:/e2e:ro" volti/traccar-bridge:dev \
      node dist/e2e/check-timeline.js "$thing" --emulator-log=/e2e/emulator.log <"$dir/mqtt.log" || result=1
    cuts="$(grep -o '"msg":"gt06_cut"[^}]*"speedKmhAtCut":[0-9.]*' "$dir/emulator.log" | grep -o 'speedKmhAtCut":[0-9.]*' || true)"
    echo "cortes no emulador: ${cuts:-nenhum}"
    if printf '%s' "$cuts" | grep -Eq 'speedKmhAtCut":([3-9]|[1-9][0-9])'; then echo "FALHA: corte com o emulador a 3 km/h ou mais" >&2; result=1; fi
    [ "$status" = "confirmed" ] || { echo "FALHA: o lock terminou '${status:-sem status}'" >&2; result=1; }
    echo "logs do e2e: $dir (mqtt.log, emulator.log; sem segredos)"
    if [ "$result" -eq 0 ]; then echo "e2e GT06: OK"; else echo "e2e GT06: FALHOU" >&2; fi
    exit "$result"
    ;;
esac
