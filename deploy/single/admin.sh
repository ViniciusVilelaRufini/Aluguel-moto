#!/usr/bin/env bash
# Build do painel (apps/admin, export estático) na própria instância e publicação no S3 + CloudFront do dev.
# Documento SSM "volti-dev-admin". Usa o endereço público atual da API (PUBLIC_HOST) e o Hosted UI do pool interno.
set -euo pipefail
source /etc/volti/instance.env
cd "$VOLTI_REPO_DIR"
bash deploy/single/render-env.sh >/dev/null
set -a
source /opt/volti/.env
set +a
export AWS_DEFAULT_REGION="$VOLTI_REGION"

docker run --rm -v "$VOLTI_REPO_DIR":/repo -w /repo \
  -e NEXT_PUBLIC_API_BASE_URL="https://$PUBLIC_HOST" \
  -e NEXT_PUBLIC_AUTH_MODE=cognito \
  -e NEXT_PUBLIC_COGNITO_DOMAIN="$ADMIN_COGNITO_DOMAIN" \
  -e NEXT_PUBLIC_COGNITO_CLIENT_ID="$COGNITO_STAFF_CLIENT_ID" \
  -e NEXT_PUBLIC_COGNITO_REDIRECT_URI="$ADMIN_ORIGIN/auth/callback/" \
  node:24-alpine sh -c 'corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile --filter admin... && pnpm --filter admin build'

aws s3 sync apps/admin/out "s3://$ADMIN_BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$ADMIN_DISTRIBUTION_ID" --paths '/*' >/dev/null
echo "painel publicado em $ADMIN_ORIGIN (API https://$PUBLIC_HOST)"
