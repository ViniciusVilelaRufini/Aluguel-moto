import { fileMtimeMs, isAlive, LIVENESS_FILE_DEFAULT } from './liveness';

/**
 * HEALTHCHECK do contêiner (Dockerfile, compose e ECS): `node dist/healthcheck.js`. Sai 0 se o arquivo de vida
 * (`LIVENESS_FILE`, padrão /tmp/bridge-alive) foi tocado há no máximo 120 s; senão 1.
 */
const path = process.env.LIVENESS_FILE || LIVENESS_FILE_DEFAULT;
process.exit(isAlive(fileMtimeMs(path), Date.now()) ? 0 : 1);
