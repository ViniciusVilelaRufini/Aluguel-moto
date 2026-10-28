#!/usr/bin/env bash
# Rastreador GT06 só relé no dev single (spec docs/superpowers/specs/2026-10-27-volti-rastreador-gt06-relay-only.md, §7):
#   gt06.sh init                                      papéis/banco do Traccar e da ponte e usuários do Traccar (idempotente;
#                                                     o update.sh chama com GT06=on, depois das migrações)
#   gt06.sh provision <VLT-0000> <moto-0000> <imei>   Tracker relay_only + dispositivo no Traccar ligado ao usuário da ponte;
#                                                     o iot-sim (se rodando) para de simular a moto no ciclo seguinte (60 s)
#   gt06.sh deprovision <moto-0000>                   SÓ DEV: apaga a linha inteira do Tracker relay_only (o dispositivo fica no
#                                                     Traccar); o iot-sim volta a simular a moto no ciclo seguinte (60 s)
#   gt06.sh e2e <VLT-0000> <moto-0000>                emulador anda e para; lock pela API com o token de staff do DONO
#                                                     (/volti/dev/secrets/E2E_STAFF_TOKEN); confere a linha do tempo MQTT
#   gt06.sh status <moto-0000>                        diagnóstico só leitura de um J16 (banco, Traccar, ponte, Redis), sem
#                                                     IMEI completo nem posição (guia: docs/gt06-j16-instalacao.md)
# Senhas e token nunca vão para a linha de comando (curl -K - e SQL pelo stdin) nem para a saída; o IMEI também não.
set -euo pipefail
source "${VOLTI_INSTANCE_ENV:-/etc/volti/instance.env}"
export AWS_DEFAULT_REGION="$VOLTI_REGION"

usage() { sed -n '2,13p' "$0" >&2; exit 2; }
action="${1:-}"
case "$action" in
  init) ;;
  provision) [[ "${2:-}" =~ ^VLT-[0-9]{4,}$ && "${3:-}" =~ ^moto-[0-9]{4,}$ && "${4:-}" =~ ^[0-9]{15}$ ]] || usage ;;
  deprovision) [[ "${2:-}" =~ ^moto-[0-9]{4,}$ ]] || usage ;;
  e2e) [[ "${2:-}" =~ ^VLT-[0-9]{4,}$ && "${3:-}" =~ ^moto-[0-9]{4,}$ ]] || usage ;;
  status) [[ "${2:-}" =~ ^moto-[0-9]{4,}$ && -z "${3:-}" ]] || usage ;;
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
# O iot-sim relê a frota a cada SIM_FLEET_REFRESH_SEC (60 s no compose.yml) e desconecta limpo (DISCONNECT, sem will) a moto que
# virou GT06. Não reiniciar: o SIGTERM anuncia `disconnected` por todas as motos que ele ainda simula — inclusive a recém-
# provisionada, se o ciclo ainda não passou (a API a marcaria offline). Até o ciclo as duas fontes podem responder pela moto.
sim_cycle_note() {
  if [ -n "$(dc --profile sim ps -q iot-sim 2>/dev/null)" ]; then
    echo "iot-sim rodando: espere um ciclo (SIM_FLEET_REFRESH_SEC, 60 s; log sim_removed/sim_fleet_synced) antes de testar o bloqueio"
  fi
}
# traccar_admin <método> <caminho> [json]: credenciais e corpo pelo stdin do curl (-K -), nunca na linha de comando.
# No config do curl, "\" e '"' dentro de aspas precisam de escape (barra invertida primeiro).
traccar_admin() {
  local b=""
  if [ -n "${3:-}" ]; then b="${3//\\/\\\\}"; b="${b//\"/\\\"}"; fi
  {
    printf 'user = "%s:%s"\n' "$TRACCAR_ADMIN_EMAIL" "$(envval TRACCAR_ADMIN_PASSWORD)"
    if [ -n "$b" ]; then printf 'header = "Content-Type: application/json"\ndata = "%s"\n' "$b"; fi
  } | curl -fsS -X "$1" -K - "$TRACCAR_LOCAL$2"
}
# traccar_get <email> <variável da senha no .env> <caminho>: GET com credencial e URL no config do curl (o caminho pode levar
# o IMEI: nada disso na linha de comando nem na saída).
traccar_get() {
  printf 'user = "%s:%s"\nurl = "%s%s"\n' "$1" "$(envval "$2")" "$TRACCAR_LOCAL" "$3" | curl -fsS -K - 2>/dev/null
}
# admin_users_code: código HTTP do GET /api/users como admin (200 = admin existe, 401 = ainda não; 000 = sem resposta).
admin_users_code() {
  printf 'user = "%s:%s"\n' "$TRACCAR_ADMIN_EMAIL" "$(envval TRACCAR_ADMIN_PASSWORD)" |
    curl -sS -o /dev/null -w '%{http_code}' -K - "$TRACCAR_LOCAL/api/users" 2>/dev/null || true
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
    # Admin: só um 401 (credencial do admin recusada = ainda não existe) leva à criação. Sem resposta/5xx: tenta de novo e,
    # persistindo, falha (nunca cria às cegas).
    code=""
    for _ in $(seq 1 10); do
      code="$(admin_users_code)"
      case "$code" in 200|401) break ;; esac
      sleep 3
    done
    case "$code" in
      200) ;;
      401)
        # Traccar vazio: o primeiro usuário vira administrador. Corpo pelo stdin. Com usuários e cadastro fechado, o Traccar
        # recusa (não há admin duplicado).
        printf '{"name":"Volti admin","email":"%s","password":"%s"}' "$TRACCAR_ADMIN_EMAIL" "$(envval TRACCAR_ADMIN_PASSWORD)" |
          curl -fsS -X POST -H 'Content-Type: application/json' --data @- "$TRACCAR_LOCAL/api/users" >/dev/null ||
          { echo "não foi possível criar o admin do Traccar (já existe outro usuário? senha do admin trocada?)" >&2; exit 1; }
        echo "administrador do Traccar criado"
        ;;
      *) echo "GET /api/users do Traccar falhou (HTTP ${code:-sem resposta}) depois de 10 tentativas" >&2; exit 1 ;;
    esac
    # Cadastro aberto desligado: nenhum container da rede cria usuário sozinho. O PUT exige o objeto completo do servidor.
    server="$(traccar_admin GET /api/server)" || { echo "GET /api/server como admin falhou" >&2; exit 1; }
    case "$server" in
      *'"registration":false'*) ;;
      *'"registration":true'*)
        traccar_admin PUT /api/server "${server/\"registration\":true/\"registration\":false}" >/dev/null
        echo "cadastro aberto do Traccar desligado (registration:false)"
        ;;
      *) echo "o /api/server do Traccar não traz \"registration\"; não sei desligar o cadastro aberto" >&2; exit 1 ;;
    esac
    users="$(traccar_admin GET /api/users)" || { echo "GET /api/users como admin falhou" >&2; exit 1; }
    if ! printf '%s' "$users" | grep -q "\"email\":\"$TRACCAR_BRIDGE_EMAIL\""; then
      traccar_admin POST /api/users "$(printf '{"name":"traccar-bridge","email":"%s","password":"%s"}' "$TRACCAR_BRIDGE_EMAIL" "$(envval TRACCAR_BRIDGE_PASSWORD)")" >/dev/null
      echo "usuário da ponte criado no Traccar"
    fi
    echo "GT06 pronto (Traccar, papéis traccar e volti_bridge, usuários admin e ponte, cadastro fechado)"
    ;;
  provision)
    # A senha do admin do Traccar já está no ambiente da API (env_file); aqui só valores públicos. TRACCAR_BRIDGE_EMAIL liga
    # o dispositivo ao usuário da ponte (sem isso a ponte não recebe as posições nem manda o corte).
    dc exec -T -e TRACCAR_URL=http://traccar:8082 -e TRACCAR_ADMIN_EMAIL="$TRACCAR_ADMIN_EMAIL" -e TRACCAR_BRIDGE_EMAIL="$TRACCAR_BRIDGE_EMAIL" \
      api node dist/cli/provision-gt06.js --vehicle "$2" --thing "$3" --imei "$4"
    echo "$3 provisionada como GT06 relay_only (a ponte relê o registro em até 60 s)"
    sim_cycle_note
    ;;
  deprovision)
    # Só dev: apaga a linha inteira (sem certificado/thing para restaurar). O dispositivo continua no Traccar (sem o Tracker a
    # ponte o trata como desconhecido; remova pelo painel do Traccar se o IMEI não voltar a ser usado).
    echo "DELETE FROM \"Tracker\" WHERE \"thingName\" = '$2' AND \"controlMode\" = 'relay_only'" | sql
    echo "Tracker relay_only de $2 removido (o dispositivo continua no Traccar)"
    sim_cycle_note
    ;;
  status)
    # Diagnóstico só leitura (docs/gt06-j16-instalacao.md, "Se algo falhar"): banco, Traccar (REST em 127.0.0.1), ponte (vínculo
    # e logs) e Redis. Nada é gravado. A saída nunca traz IMEI completo, senha nem posição (lat/lng): só idades, bits e contagens.
    thing="$2"
    now="$(date -u +%s)"
    problems=0
    warn() { echo "  ATENÇÃO: $*"; problems=$((problems + 1)); }
    # secs <data ISO>: segundos desde a data (vazio se ilegível/nula).
    secs() {
      local t
      case "$1" in "" | null) return 0 ;; esac
      t="$(date -u -d "$1" +%s 2>/dev/null)" || return 0
      echo "$((now - t))"
    }
    # field <nome>: primeiro valor do campo num JSON plano (texto, número, booleano ou null), sem aspas.
    field() { grep -o "\"$1\":\"\\{0,1\\}[^,\"}]*" | head -n 1 | sed 's/^"[^"]*":"\{0,1\}//' || true; }
    row="$(echo "SELECT coalesce(t.imei, ''), t.\"controlMode\", coalesce(t.protocol, '-'), coalesce(v.code, '-'), coalesce(v.status::text, '-'),
      coalesce(v.online::text, '-'), coalesce(v.locked::text, '-'), coalesce(v.\"batteryPct\"::text, '-'),
      coalesce(round(extract(epoch FROM (now() AT TIME ZONE 'UTC') - v.\"lastSeenAt\"))::text, '-')
      FROM \"Tracker\" t LEFT JOIN \"Vehicle\" v ON v.id = t.\"vehicleId\" WHERE t.\"thingName\" = '$thing'" | sql)"
    [ -n "$row" ] || { echo "$thing: nenhum Tracker no banco (provisione: gt06.sh provision VLT-0000 $thing <IMEI>)" >&2; exit 1; }
    IFS='|' read -r imei mode proto vcode vstatus vonline vlocked vbat vage <<<"$row"
    masked="sem IMEI"
    [ -z "$imei" ] || masked="***********${imei: -4}"
    echo "== $thing (moto $vcode) =="
    echo "banco: Tracker $mode/$proto, IMEI $masked; moto status=$vstatus online=$vonline travada=$vlocked bateria=$vbat% último sinal há $vage s"
    [ "$mode" = relay_only ] || warn "o Tracker não é relay_only: a ponte não o vê (gt06.sh provision)"
    [ "$vcode" != "-" ] || warn "Tracker sem moto vinculada"
    registry="não"
    if [ "$mode" = relay_only ] && [ "$masked" != "sem IMEI" ]; then registry="sim (Tracker relay_only com IMEI; releitura a cada 60 s)"; fi
    echo "registro da ponte: $registry"
    server="$(curl -fsS "$TRACCAR_LOCAL/api/server" 2>/dev/null || true)"
    if [ -z "$server" ]; then
      warn "o Traccar não responde em 127.0.0.1:8082 (profile gt06 ligado? docker ps)"
    else
      ver="$(printf '%s' "$server" | field version)"
      if [ -z "$ver" ] || [ "$ver" = null ] || [ "$(printf '6.7.0\n%s\n' "$ver" | sort -V | head -n 1)" != 6.7.0 ]; then
        warn "Traccar versão ${ver:-desconhecida}: a ponte recusa todo comando de motor (mínimo 6.7.0, texto em /api/server)"
      else
        echo "Traccar: versão $ver (>= 6.7.0)"
      fi
      dev=""
      [ -z "$imei" ] || dev="$(traccar_get "$TRACCAR_ADMIN_EMAIL" TRACCAR_ADMIN_PASSWORD "/api/devices?uniqueId=$imei" || true)"
      did="$(printf '%s' "$dev" | field id)"
      if [ -z "$did" ]; then
        warn "dispositivo não encontrado no Traccar (ou admin recusado): rode gt06.sh provision de novo"
      else
        dstatus="$(printf '%s' "$dev" | field status)"
        dlast="$(secs "$(printf '%s' "$dev" | field lastUpdate)")"
        echo "Traccar: dispositivo $did status=$dstatus última comunicação há ${dlast:-?} s"
        [ "$dstatus" = online ] || warn "J16 não está online no Traccar: chip com dados e APN, SERVER (host e porta 5023), 5023 aberta (gt06Port + GT06_BIND=0.0.0.0)"
        [ "$(printf '%s' "$dev" | field disabled)" != true ] || warn "dispositivo desativado no Traccar"
        bdev="$(traccar_get "$TRACCAR_BRIDGE_EMAIL" TRACCAR_BRIDGE_PASSWORD /api/devices || true)"
        if printf '%s' "$bdev" | grep -q "\"id\":$did[,}]"; then
          echo "ponte: vê o dispositivo (vinculado a $TRACCAR_BRIDGE_EMAIL)"
        else
          warn "o usuário da ponte não vê o dispositivo: sem posições nem corte (rode gt06.sh provision de novo para vincular)"
        fi
        pos="$(traccar_get "$TRACCAR_ADMIN_EMAIL" TRACCAR_ADMIN_PASSWORD "/api/positions?deviceId=$did" || true)"
        if [ -z "$(printf '%s' "$pos" | field id)" ]; then
          warn "nenhuma posição no Traccar ainda (J16 nunca mandou mensagem válida)"
        else
          srv="$(secs "$(printf '%s' "$pos" | field serverTime)")"
          fix="$(secs "$(printf '%s' "$pos" | field fixTime)")"
          kmh="$(printf '%s' "$pos" | field speed | awk '{ printf "%.1f", $1 * 1.852 }')"
          blocked="$(printf '%s' "$pos" | field blocked)"
          power="$(printf '%s' "$pos" | field power)"
          echo "última mensagem: recebida há ${srv:-?} s; fix do GPS há ${fix:-?} s; valid=$(printf '%s' "$pos" | field valid) outdated=$(printf '%s' "$pos" | field outdated) velocidade=${kmh:-?} km/h"
          echo "última mensagem: bit de corte (blocked)=${blocked:-ausente nesta mensagem}, tensão externa (power)=${power:-ausente nesta mensagem}"
          if [ "$dstatus" = online ] && [ -n "$srv" ] && [ "$srv" -gt 90 ]; then
            warn "nada do J16 há mais de 90 s com ele online: heartbeat lento (HBT <= 60 s é obrigatório)"
          fi
          if [ -n "$fix" ] && [ "$fix" -gt 15 ]; then
            warn "fix do GPS com mais de 10 s: o bloqueio só corta com posições paradas a cada <= 10 s (TIMER,5,5#; antena com céu aberto)"
          fi
        fi
      fi
    fi
    if [ -n "$(dc ps -q traccar-bridge 2>/dev/null)" ]; then
      echo "ponte: $(dc ps --format '{{.Status}}' traccar-bridge 2>/dev/null | head -n 1)"
      logs="$(dc logs --no-color --no-log-prefix --since 15m traccar-bridge 2>/dev/null || true)"
      if [ -n "$imei" ]; then
        unknown="$(printf '%s\n' "$logs" | grep -c "traccar_unknown_device.*\*${imei: -4}\"" || true)"
        [ "${unknown:-0}" -eq 0 ] || warn "a ponte logou traccar_unknown_device para $masked ($unknown vez(es) em 15 min): registro ainda não relido ou Tracker não relay_only"
      fi
      mine="$(printf '%s\n' "$logs" | grep -F "\"thingName\":\"$thing\"" || true)"
      if [ -n "$mine" ]; then
        echo "ponte, últimos 15 min (contagem por evento e motivo):"
        printf '%s\n' "$mine" | sed -E 's/^.*"msg":"([^"]*)"(.*"reason":"([^"]*)")?.*$/\1 \3/' | sort | uniq -c | sort -rn | head -n 15 | sed 's/^/    /'
        if printf '%s\n' "$mine" | grep -q '"msg":"battery_unknown"'; then
          warn "battery_unknown: o J16 não manda tensão externa (ou fora da curva de GT06_BATTERY_MODEL); bateria aparece 0%"
        fi
        if printf '%s\n' "$mine" | grep -q '"reason":"awaiting_status"'; then
          warn "telemetria retida esperando o bit de corte: confira o heartbeat (HBT <= 60 s)"
        fi
      else
        echo "ponte, últimos 15 min: nenhum log desta moto (normal se tudo vai bem)"
      fi
    else
      warn "container traccar-bridge não está rodando"
    fi
    live="$(dc exec -T redis redis-cli HGETALL "iot:live:$thing" 2>/dev/null | paste - - || true)"
    hv() { printf '%s\n' "$live" | awk -F'\t' -v k="$1" '$1 == k { print $2; exit }'; }
    if [ -n "$(hv lastSeenAt)" ]; then
      echo "estado ao vivo (API/Redis): online=$(hv online) travada=$(hv locked) bateria=$(hv batteryPct)% última mensagem há $(secs "$(hv lastSeenAt)") s"
    else
      echo "estado ao vivo (API/Redis): nenhum (a API ainda não recebeu telemetria desta moto)"
    fi
    lock="$(dc exec -T redis redis-cli GET "iot:relay-lock:$thing" 2>/dev/null || true)"
    phase="$(printf '%s' "$lock" | field phase)"
    case "$phase" in
      "") echo "trava relay_only em andamento: nenhuma" ;;
      waiting_online) echo "trava relay_only em andamento: esperando a moto ficar online (pending/offline)" ;;
      waiting_stop) echo "trava relay_only em andamento: esperando 2 posições paradas em 10 s (\"Aguardando a moto parar para bloquear\")" ;;
      cutting) echo "trava relay_only em andamento: corte enviado, esperando o bit de corte do J16" ;;
      *) echo "trava relay_only em andamento: fase $phase" ;;
    esac
    if [ "$problems" -eq 0 ]; then echo "diagnóstico: nenhum problema encontrado"; else echo "diagnóstico: $problems ponto(s) de atenção acima"; fi
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
    # Logs do e2e só do root: o mqtt.log tem posições (dado pessoal pela LGPD, mesmo de moto de teste).
    umask 077
    dir="$(mktemp -d /var/tmp/gt06-e2e.XXXXXX)"
    chmod 700 "$dir"
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
    cid="$(printf '%s' "$resp" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4 || true)"
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
    chmod 600 "$dir/mqtt.log" "$dir/emulator.log"
    echo "comando $cid: ${status:-sem status}"
    result=0
    # Verificador sem rede, sem segredos, sem capabilities e com o disco só leitura (imagem da ponte). Usuário 0 só para ler
    # os arquivos 600 do root montados read-only (sem DAC_OVERRIDE: lê como dono).
    docker run --rm -i --network none --cap-drop ALL --read-only --user 0:0 -v "$dir:/e2e:ro" volti/traccar-bridge:dev \
      node dist/e2e/check-timeline.js "$thing" --emulator-log=/e2e/emulator.log <"$dir/mqtt.log" || result=1
    cuts="$(grep -o '"msg":"gt06_cut"[^}]*"speedKmhAtCut":[0-9.]*' "$dir/emulator.log" | grep -o 'speedKmhAtCut":[0-9.]*' || true)"
    echo "cortes no emulador: ${cuts:-nenhum}"
    if printf '%s' "$cuts" | grep -Eq 'speedKmhAtCut":([3-9]|[1-9][0-9])'; then echo "FALHA: corte com o emulador a 3 km/h ou mais" >&2; result=1; fi
    [ "$status" = "confirmed" ] || { echo "FALHA: o lock terminou '${status:-sem status}'" >&2; result=1; }
    # Sucesso: apaga o mqtt.log (posições). Falha: fica para o diagnóstico (só root); apague depois.
    if [ "$result" -eq 0 ]; then rm -f "$dir/mqtt.log"; echo "logs do e2e: $dir (emulator.log; mqtt.log apagado)"
    else echo "logs do e2e: $dir (mqtt.log com posições e emulator.log, só root; apague depois do diagnóstico)"; fi
    if [ "$result" -eq 0 ]; then echo "e2e GT06: OK"; else echo "e2e GT06: FALHOU" >&2; fi
    exit "$result"
    ;;
esac
