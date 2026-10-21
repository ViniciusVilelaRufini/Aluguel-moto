// Entrypoint do container: aplica as migrações (opcional, RUN_MIGRATIONS=true) e sobe a API.
import { spawnSync } from 'node:child_process';

if (process.env.RUN_MIGRATIONS === 'true') {
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  if (process.env.RUN_SEED === 'true') {
    const s = spawnSync('node', ['dist-seed/seed.js'], { stdio: 'inherit' });
    if (s.status !== 0) process.exit(s.status ?? 1);
  }
}
await import('../dist/main.js');
