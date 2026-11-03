import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Auditoria run-4: confere, sem banco, que o schema.prisma e as migrações andam juntos (o `prisma migrate diff` exige um
 * shadow database). Cada `@@index` do schema precisa de um `CREATE INDEX` com o nome padrão do Prisma
 * (`Modelo_campo1_campo2_idx`) em alguma migração; os índices e CHECKs escritos à mão ficam listados no helper do e2e.
 */
const root = join(__dirname, '..');
const migrationsDir = join(root, 'prisma', 'migrations');
const migrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const sqlOf = (name: string) => readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf8');
const allSql = migrations.map(sqlOf).join('\n');
const schema = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8');
const e2eHelper = readFileSync(join(root, 'test', 'helpers', 'e2e-app.ts'), 'utf8');

/** `@@index([a, b])` sem `map:` de cada modelo → nome padrão do Prisma. */
function schemaIndexNames(): Array<{ model: string; name: string; columns: string[] }> {
  const out: Array<{ model: string; name: string; columns: string[] }> = [];
  for (const m of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    for (const idx of m[2].matchAll(/^\s*@@index\(\[([^\]]+)\](.*)\)\s*$/gm)) {
      if (/map:/.test(idx[2])) continue;
      const columns = idx[1].split(',').map((c) => c.trim().replace(/\(.*\)$/, ''));
      out.push({ model: m[1], name: `${m[1]}_${columns.join('_')}_idx`, columns });
    }
  }
  return out;
}

describe('schema.prisma × migrações', () => {
  it.each(schemaIndexNames().map((i) => [i.name, i]))('%s tem CREATE INDEX correspondente', (_name, idx) => {
    const { model, name, columns } = idx as { model: string; name: string; columns: string[] };
    const cols = columns.map((c) => `"${c}"`).join(', ');
    expect(allSql).toMatch(new RegExp(`CREATE INDEX (IF NOT EXISTS )?"${name}" ON "${model}"\\(${cols.replace(/[()]/g, '\\$&')}\\)`));
  });
});

describe('migração 20261103100000_aud4_indices', () => {
  const sql = sqlOf('20261103100000_aud4_indices');

  it.each([
    ['Payment_depositId_idx', 'Payment', 'depositId'],
    ['Rental_depositId_idx', 'Rental', 'depositId'],
    ['Reservation_depositId_idx', 'Reservation', 'depositId'],
    ['Payment_providerPaymentId_idx', 'Payment', 'providerPaymentId'],
    ['Rental_endedAt_idx', 'Rental', 'endedAt'],
    ['Rental_startedAt_idx', 'Rental', 'startedAt'],
    ['Payment_createdAt_idx', 'Payment', 'createdAt'],
    ['ProcessedWebhook_processedAt_idx', 'ProcessedWebhook', 'processedAt'],
  ])('%s: CREATE INDEX IF NOT EXISTS em %s(%s)', (name, table, col) => {
    expect(sql).toContain(`CREATE INDEX IF NOT EXISTS "${name}" ON "${table}"("${col}");`);
  });

  it('índice parcial do expurgo LGPD da posição de início, listado em HAND_WRITTEN_INDEXES', () => {
    expect(sql).toContain(`CREATE INDEX IF NOT EXISTS "Rental_start_location_startedAt" ON "Rental"("startedAt") WHERE "startLat" IS NOT NULL;`);
    expect(e2eHelper).toContain(`'Rental_start_location_startedAt'`);
  });

  it('não usa CONCURRENTLY (o Prisma aplica a migração numa transação)', () => {
    expect(sql).not.toMatch(/^\s*CREATE INDEX CONCURRENTLY/m);
  });
});
