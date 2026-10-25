#!/usr/bin/env bash
# Gera /opt/volti/.env (chmod 600) a partir do SSM Parameter Store:
#   /volti/dev/config/*  (String, escritos pela stack volti-dev-single)
#   /volti/dev/secrets/* (SecureString com a chave alias/volti-dev; os gerados nascem aqui na primeira execução)
# Nunca imprime valores.
set -euo pipefail
source /etc/volti/instance.env
export AWS_DEFAULT_REGION="$VOLTI_REGION"
OUT=/opt/volti/.env
mkdir -p /opt/volti
TMP="$(mktemp /opt/volti/.env.XXXXXX)"
chmod 600 "$TMP"
trap 'rm -f "$TMP"' EXIT

# Segredos gerados (hex, 64 caracteres). Trocar STATION_QR_SECRET invalida os QRs das estações; FRAUD_HASH_SECRET quebra
# a comparação dos CPFs já gravados; DB_PASSWORD precisa casar com o volume do Postgres (não troque depois do primeiro boot).
# A role da instância só cria (ssm:Overwrite=false): nunca sobrescreve um segredo existente.
for name in DB_PASSWORD STATION_QR_SECRET FRAUD_HASH_SECRET PICKUP_CODE_SECRET MERCADOPAGO_WEBHOOK_SECRET; do
  if ! aws ssm get-parameter --name "$VOLTI_SECRETS_PREFIX/$name" --query Parameter.Name --output text >/dev/null 2>&1; then
    aws ssm put-parameter --name "$VOLTI_SECRETS_PREFIX/$name" --type SecureString --key-id "$VOLTI_KEY_ALIAS" \
      --value "$(openssl rand -hex 32)" --tags Key=Projeto,Value=Volti >/dev/null
    echo "segredo gerado: $name"
  fi
done

# Só valores com caracteres seguros entram no .env (o Compose interpola $ e o arquivo nunca é executado como shell).
SAFE='^[A-Za-z0-9._:/,@+=-]*$'
dump() {
  aws ssm get-parameters-by-path --path "$1" --with-decryption --recursive \
    --query 'Parameters[].[Name,Value]' --output text |
    while IFS=$'\t' read -r key value; do
      name="${key##*/}"
      if [[ ! "$name" =~ ^[A-Z][A-Z0-9_]*$ ]] || [[ ! "$value" =~ $SAFE ]]; then
        echo "ignorado (nome ou valor com caracteres não permitidos): $name" >&2
        continue
      fi
      printf '%s=%s\n' "$name" "$value"
    done
}
dump "$VOLTI_CONFIG_PREFIX" >>"$TMP"
dump "$VOLTI_SECRETS_PREFIX" >>"$TMP"

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
