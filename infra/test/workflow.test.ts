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

  // A job is reachable by pull_request unless it is gated to push (or workflow_dispatch).
  const gated = (body: string) => /^\s{4}if:.*(github\.event_name == 'push'|github\.event_name == 'workflow_dispatch')/m.test(body);

  it('gives no AWS credentials to any job reachable by pull_request', () => {
    for (const [name, body] of Object.entries(all)) {
      if (gated(body)) continue;
      expect({ name, idToken: /id-token:\s*write/.test(body) }).toEqual({ name, idToken: false });
      expect({ name, configure: body.includes('aws-actions/configure-aws-credentials') }).toEqual({ name, configure: false });
    }
  });

  it('gates every id-token: write job behind an environment and a push to main', () => {
    const withToken = Object.keys(all).filter((n) => /^\s{6}id-token:\s*write/m.test(all[n]));
    expect(withToken).toEqual(['deploy-dev']);
    for (const n of withToken) {
      expect({ n, env: /^\s{4}environment:\s*\S+/m.test(all[n]) }).toEqual({ n, env: true });
      expect({ n, push: /^\s{4}if:.*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/m.test(all[n]) }).toEqual({ n, push: true });
    }
  });

  it('does not reference the lookup role anywhere in the workflow', () => {
    expect(text).not.toContain('AWS_LOOKUP_ROLE_ARN_DEV');
    expect(all.diff).toBeUndefined();
  });

  it('runs cdk diff only inside deploy-dev, before the first deploy', () => {
    const body = all['deploy-dev'];
    const diffAt = body.indexOf('cdk diff');
    expect(diffAt).toBeGreaterThan(body.indexOf('configure-aws-credentials'));
    expect(diffAt).toBeLessThan(body.indexOf('cdk deploy'));
    expect(text.match(/exec cdk diff/g)).toHaveLength(1);
  });

  it('keeps the deploy role out of every job reachable by pull_request', () => {
    for (const [name, body] of Object.entries(all)) {
      const pushOnly = /^\s{4}if:.*github\.event_name == 'push'/m.test(body);
      if (!pushOnly) expect({ name, uses: body.includes('AWS_DEPLOY_ROLE_ARN_DEV') }).toEqual({ name, uses: false });
    }
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
