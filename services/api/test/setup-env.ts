// Ambiente padrão dos testes unitários (sem banco/Redis reais).
process.env.AUTH_MODE = process.env.AUTH_MODE ?? 'dev';
process.env.DEV_JWT_SECRET = process.env.DEV_JWT_SECRET ?? 'segredo-de-teste-com-32-caracteres!!';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'memory';
process.env.JOBS_ENABLED = process.env.JOBS_ENABLED ?? 'false';
process.env.STORAGE_MODE = process.env.STORAGE_MODE ?? 'local';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
process.env.S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? 'test';
process.env.S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? 'test-secret';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
process.env.ENSURE_BUCKETS = 'false';
