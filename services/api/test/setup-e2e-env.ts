// e2e/contrato: usa os serviços do docker compose (valores do .env.example quando não definidos).
process.env.AUTH_MODE = 'dev';
process.env.DEV_JWT_SECRET = process.env.DEV_JWT_SECRET ?? 'troque-este-segredo-local';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://volti:volti@localhost:5432/volti';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JOBS_ENABLED = 'false';
process.env.STORAGE_MODE = process.env.STORAGE_MODE ?? 'local';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
process.env.S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? 'volti';
process.env.S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? 'volti-dev-secret';
process.env.STUB_PIX_AUTOCONFIRM_SECONDS = '0';
// Sem rastreador nos e2e do fluxo de aluguel: gateway stub (confirma na hora). O e2e de IoT (test/iot) usa IOT_MODE=local.
process.env.IOT_MODE = process.env.IOT_MODE ?? 'stub';
