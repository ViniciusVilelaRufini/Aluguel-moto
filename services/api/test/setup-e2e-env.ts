// e2e/contrato: usa os serviços do docker compose. O `.env` do pacote (ou da raiz) é lido primeiro, então cada worktree
// pode apontar para o próprio banco/Redis (ex.: DATABASE_URL=.../volti_pagamentos, REDIS_URL=redis://localhost:6379/2);
// sem `.env`, valem os padrões do .env.example.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

for (const file of [join(__dirname, '..', '.env'), join(__dirname, '..', '..', '..', '.env')]) {
  if (existsSync(file)) {
    // No sandbox do Jest, process.loadEnvFile escreve no process.env real, não no do teste: copia à mão (sem sobrescrever).
    for (const [k, v] of Object.entries(parseEnv(readFileSync(file, 'utf8')))) if (process.env[k] === undefined) process.env[k] = v;
    break;
  }
}

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
// Pagamentos (Task 5): gateway fake, sem Pix automático; segredo do webhook só de teste.
process.env.PAYMENT_PROVIDER = 'fake';
process.env.FAKE_PIX_AUTOCONFIRM_SECONDS = '0';
process.env.MERCADOPAGO_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || 'segredo-webhook-e2e';
