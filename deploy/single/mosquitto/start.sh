#!/bin/sh
# Entrypoint do Mosquitto do dev single (auditoria run-4, onda 2). Gera o arquivo de senhas (mosquitto_passwd -U, hash) a
# partir das senhas de cada serviço (render-env.sh → .env → environment do compose) e sobe o broker. Nunca imprime senhas.
# O usuário "observador" (só leitura, para o mosquitto_sub do gt06.sh e2e) recebe uma senha aleatória a cada start, que só
# existe dentro do container, no arquivo de opções padrão do mosquitto_sub ($HOME/.config/mosquitto_sub).
# Variáveis de caminho: só para os testes (infra/test/single-mosquitto.test.ts); no container, os padrões.
set -eu
umask 077
for v in MQTT_API_PASSWORD MQTT_BRIDGE_PASSWORD MQTT_SIM_PASSWORD; do
  eval "val=\${$v:-}"
  if [ -z "$val" ]; then
    echo "mosquitto: $v ausente (rode render-env.sh)" >&2
    exit 1
  fi
  case "$val" in
    *[!A-Za-z0-9]*) echo "mosquitto: $v com caracteres não permitidos" >&2; exit 1 ;;
  esac
done
dir="${MOSQUITTO_AUTH_DIR:-/mosquitto/auth}"
sub_conf="${MOSQUITTO_SUB_CONF:-${HOME:-/root}/.config/mosquitto_sub}"
mkdir -p "$dir" "$(dirname "$sub_conf")"
observer="$(od -An -tx1 -N24 /dev/urandom | tr -d ' \n')"
tmp="$dir/passwd.tmp"
{
  printf 'api:%s\n' "$MQTT_API_PASSWORD"
  printf 'traccar-bridge:%s\n' "$MQTT_BRIDGE_PASSWORD"
  printf 'iot-sim:%s\n' "$MQTT_SIM_PASSWORD"
  printf 'observador:%s\n' "$observer"
} >"$tmp"
mosquitto_passwd -U "$tmp"
mv "$tmp" "$dir/passwd"
# O broker cai para o usuário mosquitto: o arquivo de senhas precisa ser legível por ele (e só por ele).
chown -R mosquitto:mosquitto "$dir"
chmod 700 "$dir"
chmod 600 "$dir/passwd"
printf -- '-u observador\n-P %s\n' "$observer" >"$sub_conf"
chmod 600 "$sub_conf"
exec mosquitto -c "${MOSQUITTO_CONF:-/mosquitto/config/mosquitto.conf}"
