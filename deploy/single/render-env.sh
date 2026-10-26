#!/usr/bin/env bash
# Gera /opt/volti/.env (chmod 600) a partir do SSM Parameter Store:
#   /volti/dev/config/*  (String, escritos pela stack volti-dev-single)
#   /volti/dev/secrets/* (SecureString com a chave alias/volti-dev; os gerados nascem aqui na primeira execução)
# Nunca imprime valores.
set -euo pipefail
# VOLTI_INSTANCE_ENV/VOLTI_ENV_FILE: só para os testes (infra/test/single-profile-imds.test.ts); na instância, os padrões.
source "${VOLTI_INSTANCE_ENV:-/etc/volti/instance.env}"
export AWS_DEFAULT_REGION="$VOLTI_REGION"
OUT="${VOLTI_ENV_FILE:-/opt/volti/.env}"
mkdir -p "$(dirname "$OUT")"
TMP="$(mktemp "$OUT.XXXXXX")"
chmod 600 "$TMP"
trap 'rm -f "$TMP"' EXIT

# Segredos gerados (hex, 64 caracteres). Trocar STATION_QR_SECRET invalida os QRs das estações; FRAUD_HASH_SECRET quebra
# a comparação dos CPFs já gravados; DB_PASSWORD precisa casar com o volume do Postgres (não troque depois do primeiro boot).
# A role da instância só cria (Deny com ssm:Overwrite=true): nunca sobrescreve um segredo existente.
for name in DB_PASSWORD STATION_QR_SECRET FRAUD_HASH_SECRET PICKUP_CODE_SECRET MERCADOPAGO_WEBHOOK_SECRET; do
  if ! aws ssm get-parameter --name "$VOLTI_SECRETS_PREFIX/$name" --query Parameter.Name --output text >/dev/null 2>&1; then
    # --no-overwrite: só cria; se outro processo criou antes (ParameterAlreadyExists), está tudo certo.
    if out="$(aws ssm put-parameter --name "$VOLTI_SECRETS_PREFIX/$name" --type SecureString --key-id "$VOLTI_KEY_ALIAS" \
      --no-overwrite --value "$(openssl rand -hex 32)" --tags Key=Projeto,Value=Volti 2>&1 >/dev/null)"; then
      echo "segredo gerado: $name"
    elif [[ "$out" == *ParameterAlreadyExists* ]]; then
      echo "segredo já existia: $name"
    else
      echo "falha ao criar $name: $out" >&2
      exit 1
    fi
  fi
done

# Allowlists (Run-2, docs/decisoes.md 2026-10-26): só estes nomes entram no .env. Um parâmetro novo em /volti/dev/secrets/*
# (a role da instância pode criar nomes novos ali) não vira variável da API; nome desconhecido gera aviso sem o valor.
# Para aceitar um nome novo, inclua-o aqui (e no teste infra/test/single-profile-imds.test.ts).
# config: os parâmetros da stack (infra/lib/stacks/single-dev-stack.ts, configParams) e os opcionais do cloudshell.md.
CONFIG_NAMES=(
  AWS_REGION COGNITO_REGION
  COGNITO_CUSTOMER_POOL_ID COGNITO_CUSTOMER_CLIENT_ID COGNITO_STAFF_POOL_ID COGNITO_STAFF_CLIENT_ID COGNITO_STAFF_CLIENT_IDS
  CORS_ORIGINS API_DOMAIN HOSTED_ZONE_ID CUSTOMER_LOGIN
  S3_BUCKET_KYC S3_BUCKET_RETURN_PHOTOS S3_BUCKET_REPORTS S3_BUCKET_ATTACHMENTS S3_BUCKET_CATALOG
  ADMIN_ORIGIN ADMIN_BUCKET ADMIN_DISTRIBUTION_ID ADMIN_COGNITO_DOMAIN
  IOT_SIM SIM_RIDE_ON_UNLOCK
)
# secrets: os gerados acima e o manual documentado no cloudshell.md. Listas separadas de propósito: um segredo não pode
# repetir (e sobrescrever) uma chave de config, e config (String, texto aberto) não carrega segredo.
SECRET_NAMES=(DB_PASSWORD STATION_QR_SECRET FRAUD_HASH_SECRET PICKUP_CODE_SECRET MERCADOPAGO_WEBHOOK_SECRET MERCADOPAGO_ACCESS_TOKEN)

# Só valores com caracteres seguros entram no .env (o Compose interpola $ e o arquivo nunca é executado como shell).
SAFE='^[A-Za-z0-9._:/,@+=-]*$'
# dump <prefixo> <nomes permitidos...>: sem --recursive e só o filho direto do prefixo (um /secrets/x/DB_PASSWORD não
# duplica o DB_PASSWORD).
dump() {
  local prefix="$1"
  shift
  local allowed=" $* "
  aws ssm get-parameters-by-path --path "$prefix" --with-decryption \
    --query 'Parameters[].[Name,Value]' --output text |
    while IFS=$'\t' read -r key value; do
      name="${key##*/}"
      if [ "$key" != "$prefix/$name" ] || [[ "$allowed" != *" $name "* ]]; then
        echo "ignorado (fora da allowlist de ${prefix##*/}): ${key#"$prefix"/}" >&2
        continue
      fi
      if [[ ! "$value" =~ $SAFE ]]; then
        echo "ignorado (valor com caracteres não permitidos): $name" >&2
        continue
      fi
      printf '%s=%s\n' "$name" "$value"
    done
}
dump "$VOLTI_CONFIG_PREFIX" "${CONFIG_NAMES[@]}" >>"$TMP"
dump "$VOLTI_SECRETS_PREFIX" "${SECRET_NAMES[@]}" >>"$TMP"

# Endereço público: API_DOMAIN (registro A mantido por dns.sh) ou, sem domínio, <ip>.sslip.io (DNS público que resolve
# para o próprio IP e que o Let's Encrypt aceita).
domain="$(grep '^API_DOMAIN=' "$TMP" | cut -d= -f2- || true)"
if [ -n "$domain" ] && [ "$domain" != "-" ]; then
  host="$domain"
else
  token="$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')"
  ip="$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4)"
  host="${ip//./-}.sslip.io"
fi
echo "PUBLIC_HOST=$host" >>"$TMP"

mv "$TMP" "$OUT"
trap - EXIT
echo "env pronto ($(wc -l <"$OUT") variáveis); API em https://$host"
