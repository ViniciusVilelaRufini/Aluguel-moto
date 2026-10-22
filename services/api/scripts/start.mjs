// Entrypoint do container: aplica as migrações (opcional, RUN_MIGRATIONS=true) e sobe a API.
import { spawnSync } from 'node:child_process';

// QA-02: na AWS (infra/lib/stacks/api-stack.ts) o banco chega em partes (DB_HOST, DB_PORT, DB_NAME e o segredo do RDS em
// DB_USER/DB_PASSWORD), porque o Secrets Manager não compõe strings. Sem isto o Prisma subia sem DATABASE_URL.
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
  const { DB_HOST, DB_PORT = '5432', DB_NAME = 'volti', DB_USER = '', DB_PASSWORD = '' } = process.env;
  const auth = `${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}`;
  process.env.DATABASE_URL = `postgresql://${auth}@${DB_HOST}:${DB_PORT}/${encodeURIComponent(DB_NAME)}?sslmode=require`;
}

if (process.env.RUN_MIGRATIONS === 'true') {
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  if (process.env.RUN_SEED === 'true') {
    const s = spawnSync('node', ['dist-seed/seed.js'], { stdio: 'inherit' });
    if (s.status !== 0) process.exit(s.status ?? 1);
  }
}
await import('../dist/main.js');
