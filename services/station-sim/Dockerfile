# syntax=docker/dockerfile:1
# Simulador das estações de troca Volti. Build a partir da raiz do monorepo: docker build -f services/station-sim/Dockerfile .
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY services/station-sim/package.json services/station-sim/package.json
RUN pnpm install --frozen-lockfile --filter station-sim...
COPY services/station-sim services/station-sim
RUN pnpm --filter station-sim build \
 && pnpm --filter station-sim deploy --prod /out \
 && cp -r services/station-sim/dist /out/

FROM node:24-alpine AS runtime
RUN addgroup -S volti && adduser -S volti -G volti
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=volti:volti /out ./
USER volti
CMD ["node", "dist/main.js"]
