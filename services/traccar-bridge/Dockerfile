# syntax=docker/dockerfile:1
# Ponte GT06 (Traccar → MQTT). Build a partir da raiz do monorepo (amd64 e arm64: base node:24-alpine multi-arquitetura):
#   docker build -f services/traccar-bridge/Dockerfile .
# Configuração e segredos só por variáveis de ambiente (README); roda como usuário sem privilégio.
# Base fixada por digest (índice multi-arquitetura amd64/arm64 de node:24-alpine, lido do Docker Hub em 2026-10-27).
# Para atualizar: troque o digest pelo atual de node:24-alpine e rode os testes/e2e.
ARG NODE_IMAGE=node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
FROM ${NODE_IMAGE} AS base
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

FROM ${NODE_IMAGE} AS runtime
RUN addgroup -S volti && adduser -S volti -G volti
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=volti:volti /out ./
USER volti
# B-I3: a ponte toca /tmp/bridge-alive a cada 30 s só se a fila de entrada anda; arquivo com mais de 120 s = fila travada.
ENV LIVENESS_FILE=/tmp/bridge-alive
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD ["node", "dist/healthcheck.js"]
CMD ["node", "dist/main.js"]
