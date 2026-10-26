#!/usr/bin/env bash
# Só o container da API alcança o IMDS (169.254.169.254), Run-2 / docs/decisoes.md 2026-10-26.
# A instância usa hop limit 2 para a API (IP fixo 172.30.0.10 na rede do compose.yml) obter a role para S3 e Cognito. Todo
# outro container (iot-sim, Postgres, Redis, Mosquitto, Caddy, a migração, o build do painel do admin.sh e os passos RUN do
# docker build na rede padrão) cai no DROP da chain DOCKER-USER, que o Docker consulta no FORWARD antes das próprias regras.
# Processos do host não passam pelo FORWARD: o IMDS do host (render-env.sh, dns.sh, aws cli) continua igual.
#
#   imds-guard.sh           aplica as regras (idempotente: apaga as nossas e insere de novo, RETURN antes do DROP)
#   imds-guard.sh install   copia este script para /usr/local/sbin, instala a unit volti-imds-guard (roda antes do Docker
#                           a cada boot; o Docker não sobe sem ela) e aplica as regras. Chamado pelo update.sh.
set -euo pipefail
IMDS=169.254.169.254
API_IP=172.30.0.10
UNIT=/etc/systemd/system/volti-imds-guard.service
BIN=/usr/local/sbin/volti-imds-guard

if [ "${1:-}" = "install" ]; then
  install -m 755 "$0" "$BIN"
  cat >"$UNIT" <<EOF
[Unit]
Description=Volti: só o container da API (${API_IP}) alcança o IMDS (regras DOCKER-USER)
Before=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/bash ${BIN}

[Install]
RequiredBy=docker.service
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable volti-imds-guard.service >/dev/null 2>&1
fi

command -v iptables >/dev/null || { echo "iptables ausente: sem as regras do IMDS os containers não sobem" >&2; exit 1; }
ipt() { iptables -w "$@"; }
# O Docker cria a DOCKER-USER se não existir e não apaga as regras dela; no boot esta unit roda antes do Docker.
ipt -N DOCKER-USER 2>/dev/null || true
while ipt -D DOCKER-USER -s "$API_IP" -d "$IMDS" -j RETURN 2>/dev/null; do :; done
while ipt -D DOCKER-USER -d "$IMDS" -j DROP 2>/dev/null; do :; done
ipt -I DOCKER-USER -d "$IMDS" -j DROP
ipt -I DOCKER-USER -s "$API_IP" -d "$IMDS" -j RETURN
echo "IMDS: só $API_IP (API) alcança $IMDS a partir dos containers"
