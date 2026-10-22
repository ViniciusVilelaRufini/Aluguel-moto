import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** QA-25: worktree novo compilava sem os tipos do Prisma; `dev` gera o cliente antes do `tsc` (como o `build`). */
describe('scripts do pacote', () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { scripts: Record<string, string> };

  it.each(['dev', 'build'])('%s roda prisma generate antes do tsc', (name) => {
    const s = pkg.scripts[name];
    expect(s.indexOf('prisma generate')).toBeGreaterThanOrEqual(0);
    expect(s.indexOf('prisma generate')).toBeLessThan(s.indexOf('tsc'));
  });
});
