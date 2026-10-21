# syntax=docker/dockerfile:1
# Simulador de rastreadores Volti. Build a partir da raiz do monorepo: docker build -f services/iot-sim/Dockerfile .
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY services/iot-sim/package.json services/iot-sim/package.json
RUN pnpm install --frozen-lockfile --filter iot-sim...
COPY services/iot-sim services/iot-sim
RUN pnpm --filter iot-sim build \
 && pnpm --filter iot-sim deploy --prod /out \
 && cp -r services/iot-sim/dist /out/

FROM node:24-alpine AS runtime
RUN addgroup -S volti && adduser -S volti -G volti
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=volti:volti /out ./
USER volti
CMD ["node", "dist/main.js"]
