#!/usr/bin/env bash
# Registro A de API_DOMAIN na zona HOSTED_ZONE_ID (serviço systemd volti-dns):
#   dns.sh up    no boot, assim que a rede sobe: A → IPv4 público atual (TTL 60)
#   dns.sh down  no desligamento (ExecStop, com a rede ainda no ar): A → 192.0.2.1 (TEST-NET-1, não roteável), para o nome
#                nunca apontar para um IP liberado que a AWS entrega a outra conta.
# A zona é de OUTRO projeto: a role só pode fazer UPSERT de A neste nome (condições no IAM); nada mais.
# A stack não cria o registro (o CloudFormation não pode ser dono de nada na zona compartilhada).
# Risco residual: numa falha brusca (sem desligamento limpo: pane do host, terminate forçado) o ExecStop não roda e o
# registro fica com o IP antigo até o próximo boot.
set -euo pipefail
source /etc/volti/instance.env
export AWS_DEFAULT_REGION="$VOLTI_REGION"
mode="${1:-up}"
PARKED_IP=192.0.2.1

get() { aws ssm get-parameter --name "$VOLTI_CONFIG_PREFIX/$1" --query Parameter.Value --output text; }
domain="$(get API_DOMAIN)"
zone="$(get HOSTED_ZONE_ID)"
if [ "$domain" = "-" ] || [ "$zone" = "-" ]; then
  echo "sem API_DOMAIN/HOSTED_ZONE_ID: usando <ip>.sslip.io"
  exit 0
fi

case "$mode" in
  up)
    ip=""
    for _ in $(seq 1 30); do
      token="$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' || true)"
      ip="$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4 || true)"
      [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && break
      sleep 2
    done
    [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "sem IPv4 público" >&2; exit 1; }
    ;;
  down)
    ip="$PARKED_IP"
    ;;
  *)
    echo "uso: dns.sh up|down" >&2
    exit 2
    ;;
esac

batch="$(printf '{"Comment":"volti-dev-single %s","Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"%s","Type":"A","TTL":60,"ResourceRecords":[{"Value":"%s"}]}}]}' "$mode" "$domain" "$ip")"
change="$(aws route53 change-resource-record-sets --hosted-zone-id "$zone" --change-batch "$batch" --query ChangeInfo.Id --output text)"
if [ "$mode" = "up" ]; then
  aws route53 wait resource-record-sets-changed --id "$change"
fi
echo "DNS ($mode): $domain -> $ip"
