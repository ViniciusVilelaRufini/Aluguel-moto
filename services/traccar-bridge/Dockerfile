# syntax=docker/dockerfile:1
# Ponte GT06 (Traccar → MQTT). Build a partir da raiz do monorepo (amd64 e arm64: base node:24-alpine multi-arquitetura):
#   docker build -f services/traccar-bridge/Dockerfile .
# Configuração e segredos só por variáveis de ambiente (README); roda como usuário sem privilégio.
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY services/traccar-bridge/package.json services/traccar-bridge/package.json
RUN pnpm install --frozen-lockfile --filter traccar-bridge...
COPY services/traccar-bridge services/traccar-bridge
RUN pnpm --filter traccar-bridge build \
 && pnpm --filter traccar-bridge deploy --prod /out \
 && cp -r services/traccar-bridge/dist /out/

FROM node:24-alpine AS runtime
RUN addgroup -S volti && adduser -S volti -G volti
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=volti:volti /out ./
USER volti
CMD ["node", "dist/main.js"]
