#!/usr/bin/env bash
# Documento SSM "volti-dev-admin":
#   admin.sh publish-panel            build do painel (apps/admin, export estático) na instância e publicação no S3 + CloudFront
#   admin.sh create-customer <email>  cria um cliente de teste no pool de clientes (o dev não tem auto-cadastro)
# O SSM valida action/email (allowedValues/allowedPattern) antes de rodar; o e-mail é conferido de novo aqui.
set -euo pipefail
source /etc/volti/instance.env
export AWS_DEFAULT_REGION="$VOLTI_REGION"
cd "$VOLTI_REPO_DIR"
action="${1:-publish-panel}"
email="${2:--}"

bash deploy/single/render-env.sh >/dev/null
# Lê só as chaves necessárias (sem `source` do .env).
envval() { grep -m1 "^$1=" /opt/volti/.env | cut -d= -f2-; }

case "$action" in
  publish-panel)
    host="$(envval PUBLIC_HOST)"
    origin="$(envval ADMIN_ORIGIN)"
    docker run --rm -v "$VOLTI_REPO_DIR":/repo -w /repo \
      -e NEXT_PUBLIC_API_BASE_URL="https://$host" \
      -e NEXT_PUBLIC_AUTH_MODE=cognito \
      -e NEXT_PUBLIC_COGNITO_DOMAIN="$(envval ADMIN_COGNITO_DOMAIN)" \
      -e NEXT_PUBLIC_COGNITO_CLIENT_ID="$(envval COGNITO_STAFF_CLIENT_ID)" \
      -e NEXT_PUBLIC_COGNITO_REDIRECT_URI="$origin/auth/callback/" \
      node:24-alpine sh -c 'corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile --filter admin... && pnpm --filter admin build'
    aws s3 sync apps/admin/out "s3://$(envval ADMIN_BUCKET)" --delete
    aws cloudfront create-invalidation --distribution-id "$(envval ADMIN_DISTRIBUTION_ID)" --paths '/*' >/dev/null
    echo "painel publicado em $origin (API https://$host)"
    ;;
  create-customer)
    if [[ ! "$email" =~ ^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,24}$ ]]; then
      echo "e-mail inválido" >&2
      exit 2
    fi
    pool="$(envval COGNITO_CUSTOMER_POOL_ID)"
    if [ "$(envval CUSTOMER_LOGIN)" = "email-otp" ]; then
      # Pool com OTP por e-mail (SES): sem convite; senha permanente aleatória que ninguém conhece (conta CONFIRMED), o
      # login é pelo código enviado ao e-mail.
      aws cognito-idp admin-create-user --user-pool-id "$pool" --username "$email" \
        --user-attributes Name=email,Value="$email" Name=email_verified,Value=true --message-action SUPPRESS >/dev/null
      aws cognito-idp admin-set-user-password --user-pool-id "$pool" --username "$email" \
        --password "Vt-$(openssl rand -hex 24)-A9" --permanent >/dev/null
      echo "cliente de teste criado (login por código no e-mail)"
    else
      # Pool só com senha (sem SES): o Cognito envia o convite com a senha temporária pelo e-mail padrão dele (sem SNS);
      # no primeiro login o app recebe o desafio NEW_PASSWORD_REQUIRED.
      aws cognito-idp admin-create-user --user-pool-id "$pool" --username "$email" \
        --user-attributes Name=email,Value="$email" Name=email_verified,Value=true --desired-delivery-mediums EMAIL >/dev/null
      echo "cliente de teste criado (senha temporária enviada por e-mail pelo Cognito)"
    fi
    ;;
  *)
    echo "ação inválida: $action" >&2
    exit 2
    ;;
esac
