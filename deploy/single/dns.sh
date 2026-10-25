#!/usr/bin/env bash
# A cada boot (systemd volti-dns.service): UPSERT do registro A de API_DOMAIN → IPv4 público atual (TTL 60) na zona
# HOSTED_ZONE_ID. A zona é de OUTRO projeto: a role só pode fazer UPSERT de A neste nome (condições no IAM); nada mais.
# A stack não cria o registro (o CloudFormation não pode ser dono de nada na zona compartilhada).
set -euo pipefail
source /etc/volti/instance.env
export AWS_DEFAULT_REGION="$VOLTI_REGION"

get() { aws ssm get-parameter --name "$VOLTI_CONFIG_PREFIX/$1" --query Parameter.Value --output text; }
domain="$(get API_DOMAIN)"
zone="$(get HOSTED_ZONE_ID)"
if [ "$domain" = "-" ] || [ "$zone" = "-" ]; then
  echo "sem API_DOMAIN/HOSTED_ZONE_ID: usando <ip>.sslip.io"
  exit 0
fi

ip=""
for _ in $(seq 1 30); do
  token="$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' || true)"
  ip="$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4 || true)"
  [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && break
  sleep 2
done
[[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "sem IPv4 público" >&2; exit 1; }

batch="$(printf '{"Comment":"volti-dev-single boot","Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"%s","Type":"A","TTL":60,"ResourceRecords":[{"Value":"%s"}]}}]}' "$domain" "$ip")"
change="$(aws route53 change-resource-record-sets --hosted-zone-id "$zone" --change-batch "$batch" --query ChangeInfo.Id --output text)"
aws route53 wait resource-record-sets-changed --id "$change"
echo "DNS: $domain -> $ip"
