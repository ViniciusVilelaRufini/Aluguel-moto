import { readFileSync } from 'fs';
import { join } from 'path';

// Line-based assertions: no YAML parser is declared in the infra workspace.
const text = readFileSync(join(__dirname, '..', '..', '.github', 'workflows', 'infra.yml'), 'utf8');
const lines = text.split(/\r?\n/);

function topLevelBlock(key: string): string[] {
  const start = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (start < 0) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function jobs(): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | null = null;
  for (const l of topLevelBlock('jobs')) {
    const m = /^ {2}([\w-]+):\s*$/.exec(l);
    if (m) {
      current = m[1];
      out[current] = '';
    } else if (current) {
      out[current] += `${l}\n`;
    }
  }
  return out;
}

describe('infra workflow', () => {
  const all = jobs();

  it('declares only contents: read at workflow level', () => {
    const perms = topLevelBlock('permissions').filter((l) => l.trim() && !l.trim().startsWith('#'));
    expect(perms.map((l) => l.replace(/#.*/, '').trim())).toEqual(['contents: read']);
  });

  it('grants id-token: write only to the diff and deploy-dev jobs', () => {
    const withToken = Object.keys(all).filter((n) => /^\s{6}id-token:\s*write/m.test(all[n]));
    expect(withToken.sort()).toEqual(['deploy-dev', 'diff']);
  });

  it('keeps the deploy role out of every job reachable by pull_request', () => {
    for (const [name, body] of Object.entries(all)) {
      const pushOnly = /^\s{4}if:.*github\.event_name == 'push'/m.test(body);
      if (!pushOnly) expect({ name, uses: body.includes('AWS_DEPLOY_ROLE_ARN_DEV') }).toEqual({ name, uses: false });
    }
  });

  it('makes diff assume the read-only lookup role and skip when it is missing', () => {
    expect(all.diff).toContain('vars.AWS_LOOKUP_ROLE_ARN_DEV');
    expect(all.diff).toMatch(/if: .*AWS_LOOKUP_ROLE_ARN_DEV/);
    expect(all.diff).toContain('::warning::');
  });

  it('requires an environment on every job that uses the deploy role', () => {
    for (const [name, body] of Object.entries(all)) {
      if (body.includes('AWS_DEPLOY_ROLE_ARN_DEV')) {
        expect({ name, env: /^\s{4}environment:\s*dev\s*$/m.test(body) }).toEqual({ name, env: true });
      }
    }
    expect(all['deploy-dev']).toContain('AWS_DEPLOY_ROLE_ARN_DEV');
  });

  it('builds the API image with the repository root as context', () => {
    expect(text).toMatch(/docker build -f services\/api\/Dockerfile [^\n]*\s\.\s*$/m);
  });
});
