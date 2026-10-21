# syntax=docker/dockerfile:1
# API Volti (NestJS). Build a partir da raiz do monorepo: docker build -f services/api/Dockerfile .
FROM node:24-alpine AS base
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/api/package.json services/api/package.json
COPY services/api/prisma services/api/prisma
RUN pnpm install --frozen-lockfile --filter api...

FROM deps AS build
COPY tsconfig.base.json ./
COPY services/api services/api
RUN pnpm --filter api build \
 && pnpm --filter api exec tsc prisma/seed.ts --outDir dist-seed --esModuleInterop --skipLibCheck --module commonjs --target es2022 \
 && pnpm --filter api deploy --prod /out \
 && cp -r services/api/dist services/api/dist-seed /out/ \
 && cd /out && npx prisma generate

FROM node:24-alpine AS runtime
RUN apk add --no-cache openssl && addgroup -S volti && adduser -S volti -G volti
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build --chown=volti:volti /out ./
USER volti
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "scripts/start.mjs"]
