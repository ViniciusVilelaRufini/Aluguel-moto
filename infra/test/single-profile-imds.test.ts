import { spawnSync } from 'child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Template } from 'aws-cdk-lib/assertions';
import { createSingleDevApp } from '../lib/volti-app';

/**
 * Run-2 (infra.single-dev.imds-hop2-broad-instance-role-reachable-from-containers): the hop limit stays 2 for the API
 * container, but only the API (fixed IP 172.30.0.10) reaches IMDS; render-env.sh only writes allowlisted names.
 */
const REPO = join(__dirname, '..', '..');
const file = (name: string) => readFileSync(join(REPO, 'deploy', 'single', name), 'utf8');
const IMDS = '169.254.169.254';
const API_IP = '172.30.0.10';
const ALLOW_RULE = `-s ${API_IP} -d ${IMDS} -j RETURN`;
const DROP_RULE = `-d ${IMDS} -j DROP`;

/** Git Bash on Windows (never WSL's System32\bash.exe); `bash` elsewhere. null = no bash: the shell tests are skipped. */
function findBash(): string | null {
  if (process.env.VOLTI_TEST_BASH) return process.env.VOLTI_TEST_BASH;
  if (process.platform === 'win32') {
    for (const p of ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files/Git/usr/bin/bash.exe']) if (existsSync(p)) return p;
    return null;
  }
  return spawnSync('bash', ['--version']).status === 0 ? 'bash' : null;
}
const BASH = findBash();
const itBash = BASH ? it : it.skip;
if (!BASH) console.warn('single-profile-imds: sem bash (Git Bash no Windows): testes de shell pulados');

const slash = (p: string) => p.replace(/\\/g, '/');
/** Runs `script` with bash, the fake bin dir first on PATH (converted with cygpath on Git Bash). */
function runScript(script: string, fakeBin: string, env: Record<string, string>, args: string[] = []) {
  const wrapper = 'd="$1"; shift; if command -v cygpath >/dev/null 2>&1; then d="$(cygpath -u "$d")"; fi; export PATH="$d:$PATH"; exec bash "$@"';
  return spawnSync(BASH!, ['-c', wrapper, '_', slash(fakeBin), slash(script), ...args], { env: { ...process.env, ...env }, encoding: 'utf8' });
}
function fake(dir: string, name: string, body: string) {
  const p = join(dir, name);
  writeFileSync(p, body.replace(/\r\n/g, '\n'));
  chmodSync(p, 0o755);
}

describe('single-dev: only the API container reaches IMDS (Run-2)', () => {
  const s = createSingleDevApp({ outdir: mkdtempSync(join(tmpdir(), 'volti-imds-')) });
  const t = Template.fromStack(s.single);
  const instance = () => (Object.values(t.findResources('AWS::EC2::Instance'))[0] as any).Properties;

  it('the instance keeps IMDSv2 with 2 hops (the API container uses the role for S3 and Cognito)', () => {
    expect(instance().MetadataOptions).toEqual({ HttpEndpoint: 'enabled', HttpTokens: 'required', HttpPutResponseHopLimit: 2 });
  });

  it('user data runs update.sh, which installs the DOCKER-USER guard before any build or container start', () => {
    const ud = JSON.stringify(instance().UserData);
    expect(ud).toContain('/opt/volti/src/deploy/single/update.sh');
    const update = file('update.sh');
    const guard = update.indexOf('bash deploy/single/imds-guard.sh install');
    expect(guard).toBeGreaterThan(update.indexOf('bash deploy/single/render-env.sh'));
    // First command line (not comment) of each kind.
    for (const cmd of [/^dc .*\bbuild\b/m, /^dc .*\bup -d\b/m, /^dc .*\brun --rm\b/m]) {
      const at = update.search(cmd);
      expect(at).toBeGreaterThan(-1);
      expect(guard).toBeLessThan(at);
    }
  });

  it('imds-guard.sh: DOCKER-USER allows only the API IP to IMDS, drops everyone else; the boot unit runs before Docker', () => {
    const g = file('imds-guard.sh');
    expect(g).toContain(`API_IP=${API_IP}`);
    expect(g).toContain(`IMDS=${IMDS}`);
    expect(g).toMatch(/-I DOCKER-USER -d "\$IMDS" -j DROP/);
    expect(g).toMatch(/-I DOCKER-USER -s "\$API_IP" -d "\$IMDS" -j RETURN/);
    // RETURN inserted last = first in the chain.
    expect(g.lastIndexOf('-j RETURN')).toBeGreaterThan(g.lastIndexOf('-j DROP'));
    expect(g).toContain('Before=docker.service');
    expect(g).toContain('RequiredBy=docker.service');
    expect(g).toContain('/usr/local/sbin/volti-imds-guard');
  });

  it('compose: one network 172.30.0.0/24 (dynamic IPs outside .10), only the API has the fixed IP; the rest drops NET_RAW', () => {
    const c = file('compose.yml');
    expect(c).toMatch(/subnet: 172\.30\.0\.0\/24/);
    expect(c).toMatch(/ip_range: 172\.30\.0\.128\/25/);
    expect(c.match(/ipv4_address:/g)).toHaveLength(1);
    const api = c.slice(c.indexOf('\n  api:'), c.indexOf('\n  api-migrate:'));
    expect(api).toContain(`ipv4_address: ${API_IP}`);
    expect(api).not.toMatch(/cap_drop/);
    for (const svc of ['postgres', 'redis', 'mosquitto', 'caddy', 'iot-sim', 'api-migrate']) {
      const start = c.indexOf(`\n  ${svc}:`);
      expect(start).toBeGreaterThan(-1);
      const rest = c.slice(start + 1);
      const next = rest.search(/\n( {2}[a-z][a-z-]*:|[a-z]+:)/);
      expect(rest.slice(0, next)).toMatch(/cap_drop: \[NET_RAW\]/);
    }
  });

  it('migrations run in api-migrate (no fixed IP, only DATABASE_URL); the seed runs inside the running API', () => {
    const c = file('compose.yml');
    const migrate = c.slice(c.indexOf('\n  api-migrate:'), c.indexOf('\n  caddy:'));
    expect(migrate).toContain('profiles: ["migrate"]');
    expect(migrate).toContain('DATABASE_URL: postgresql://volti:${DB_PASSWORD}@postgres:5432/volti');
    expect(migrate).not.toContain('env_file');
    expect(migrate).not.toContain('ipv4_address');
    const update = file('update.sh');
    expect(update).toMatch(/run --rm api-migrate npx prisma migrate deploy/);
    expect(update).not.toMatch(/run --rm api /);
    expect(file('seed.sh')).toMatch(/exec -T api node dist-seed\/prisma\/seed\.js/);
  });

  it('admin.sh publish-panel: guard applied first; build container without AWS credentials and without NET_RAW', () => {
    const a = file('admin.sh');
    const run = a.slice(a.indexOf('docker run'), a.indexOf("pnpm --filter admin build'"));
    expect(a.indexOf('imds-guard.sh')).toBeGreaterThan(-1);
    expect(a.indexOf('imds-guard.sh')).toBeLessThan(a.indexOf('docker run'));
    expect(run).toContain('--cap-drop NET_RAW');
    expect(run).not.toMatch(/AWS_|\.aws|--network[ =]host/);
  });

  it('render-env.sh allowlists cover every config parameter of the stack, the generated secrets and the documented manual one', () => {
    const env = file('render-env.sh');
    const list = (name: string) => env.match(new RegExp(`^${name}=\\(([^)]*)\\)`, 'm'))![1].trim().split(/\s+/);
    const config = list('CONFIG_NAMES');
    const secrets = list('SECRET_NAMES');
    const names = Object.values(t.findResources('AWS::SSM::Parameter')).map((p: any) => p.Properties.Name.replace('/volti/dev/config/', ''));
    expect(names.length).toBeGreaterThanOrEqual(20);
    for (const n of names) expect(config).toContain(n);
    // Optional config documented in cloudshell.md.
    expect(config).toEqual(expect.arrayContaining(['IOT_SIM', 'SIM_RIDE_ON_UNLOCK']));
    const generated = env.match(/^for name in ([A-Z_ ]+); do/m)![1].split(' ');
    expect(secrets).toEqual(expect.arrayContaining([...generated, 'MERCADOPAGO_ACCESS_TOKEN']));
    expect(file('cloudshell.md')).toContain('/volti/dev/secrets/MERCADOPAGO_ACCESS_TOKEN');
    // Disjoint: a secret never repeats (and overrides) a config key.
    expect(config.filter((n) => secrets.includes(n))).toEqual([]);
    // Every name admin.sh and update.sh read from the .env is allowlisted (PUBLIC_HOST is written by render-env.sh itself).
    const read = [...file('admin.sh').matchAll(/envval ([A-Z_]+)/g), ...file('update.sh').matchAll(/\^([A-Z_]+)=/g)].map((m) => m[1]);
    for (const n of read) if (n !== 'PUBLIC_HOST') expect(config).toContain(n);
  });

  itBash('imds-guard.sh is idempotent: RETURN for the API before the DROP, no duplicates, other rules kept', () => {
    const dir = mkdtempSync(join(tmpdir(), 'volti-ipt-'));
    const state = join(dir, 'state');
    // Docker's own rule and a stale DROP without the RETURN (worst order) already in the chain.
    writeFileSync(state, `${DROP_RULE}\n-j RETURN\n`);
    fake(
      dir,
      'iptables',
      `#!/usr/bin/env bash
state="$FAKE_IPT_STATE"
args=("$@")
[ "\${args[0]}" = "-w" ] && args=("\${args[@]:1}")
op="\${args[0]}"; chain="\${args[1]}"; rule="\${args[*]:2}"
[ "$chain" = "DOCKER-USER" ] || exit 2
case "$op" in
  -N) exit 0 ;;
  -C) grep -qxF -- "$rule" "$state" ;;
  -D) grep -qxF -- "$rule" "$state" || exit 1
      awk -v r="$rule" '!d && $0==r {d=1; next} {print}' "$state" > "$state.tmp" && mv "$state.tmp" "$state" ;;
  -I) { printf '%s\\n' "$rule"; cat "$state"; } > "$state.tmp" && mv "$state.tmp" "$state" ;;
  *) exit 2 ;;
esac
`,
    );
    for (let i = 0; i < 2; i++) {
      const r = runScript(join(REPO, 'deploy', 'single', 'imds-guard.sh'), dir, { FAKE_IPT_STATE: slash(state) });
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
    }
    expect(readFileSync(state, 'utf8').trim().split('\n')).toEqual([ALLOW_RULE, DROP_RULE, '-j RETURN']);
  });

  itBash('render-env.sh: only allowlisted names reach the .env; unknown or nested names are warned without the value', () => {
    const dir = mkdtempSync(join(tmpdir(), 'volti-env-'));
    const instanceEnv = join(dir, 'instance.env');
    const out = join(dir, 'out', '.env');
    writeFileSync(
      instanceEnv,
      ['VOLTI_REGION=sa-east-1', 'VOLTI_CONFIG_PREFIX=/volti/dev/config', 'VOLTI_SECRETS_PREFIX=/volti/dev/secrets', 'VOLTI_KEY_ALIAS=alias/volti-dev', ''].join('\n'),
    );
    const tsv = (rows: [string, string][]) => rows.map(([k, v]) => `${k}\t${v}`).join('\n') + '\n';
    writeFileSync(
      join(dir, 'config.tsv'),
      tsv([
        ['/volti/dev/config/API_DOMAIN', 'api.example.com'],
        ['/volti/dev/config/CORS_ORIGINS', 'https://painel.example.com'],
        ['/volti/dev/config/COGNITO_STAFF_POOL_ID', 'sa-east-1_abc'],
        ['/volti/dev/config/IOT_SIM', 'off'],
        ['/volti/dev/config/AUTH_MODE', 'dev'],
      ]),
    );
    writeFileSync(
      join(dir, 'secrets.tsv'),
      tsv([
        ['/volti/dev/secrets/DB_PASSWORD', 'abc123'],
        ['/volti/dev/secrets/MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-1'],
        ['/volti/dev/secrets/NODE_OPTIONS', '--require=/tmp/evil.js'],
        ['/volti/dev/secrets/CORS_ORIGINS', 'https://evilorigin.example.com'],
        ['/volti/dev/secrets/extra/DB_PASSWORD', 'hijack'],
      ]),
    );
    fake(
      dir,
      'aws',
      `#!/usr/bin/env bash
cmd="$2"; path=""; name=""
while [ $# -gt 0 ]; do case "$1" in --path) path="$2"; shift ;; --name) name="$2"; shift ;; esac; shift; done
case "$cmd" in
  get-parameter) echo "$name" ;;
  put-parameter) echo "unexpected put $name" >&2; exit 1 ;;
  get-parameters-by-path) cat "$FAKE_AWS_DIR/\${path##*/}.tsv" ;;
  *) exit 2 ;;
esac
`,
    );
    const r = runScript(join(REPO, 'deploy', 'single', 'render-env.sh'), dir, {
      VOLTI_INSTANCE_ENV: slash(instanceEnv),
      VOLTI_ENV_FILE: slash(out),
      FAKE_AWS_DIR: slash(dir),
    });
    expect(r.status).toBe(0);
    const env = readFileSync(out, 'utf8');
    const lines = env.trim().split('\n');
    expect(lines).toEqual(
      expect.arrayContaining([
        'API_DOMAIN=api.example.com',
        'CORS_ORIGINS=https://painel.example.com',
        'COGNITO_STAFF_POOL_ID=sa-east-1_abc',
        'IOT_SIM=off',
        'DB_PASSWORD=abc123',
        'MERCADOPAGO_ACCESS_TOKEN=APP_USR-1',
        'PUBLIC_HOST=api.example.com',
      ]),
    );
    expect(lines.filter((l) => l.startsWith('DB_PASSWORD='))).toEqual(['DB_PASSWORD=abc123']);
    expect(lines.filter((l) => l.startsWith('CORS_ORIGINS='))).toEqual(['CORS_ORIGINS=https://painel.example.com']);
    expect(env).not.toMatch(/NODE_OPTIONS|evil|hijack|AUTH_MODE/);
    // Warned by name, never by value.
    expect(r.stderr).toMatch(/NODE_OPTIONS/);
    expect(r.stderr).toMatch(/AUTH_MODE/);
    expect(r.stderr).not.toMatch(/evil|hijack|=dev/);
  });

  /** Fake repo dir with no-op render-env.sh/imds-guard.sh that log their call; instance.env + .env in the same temp dir. */
  function fakeInstance(prefix: string, envLines: string[]) {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    const repo = join(dir, 'repo');
    const log = join(dir, 'calls.log');
    const bin = join(dir, 'bin');
    for (const d of [bin, join(repo, 'deploy', 'single'), join(repo, 'apps', 'admin')]) mkdirSync(d, { recursive: true });
    for (const s of ['render-env.sh', 'imds-guard.sh']) {
      writeFileSync(join(repo, 'deploy', 'single', s), `echo "${s} $*" >> "$FAKE_LOG"\n`);
    }
    writeFileSync(join(repo, 'package.json'), '{}\n');
    writeFileSync(join(repo, 'apps', 'admin', 'package.json'), '{}\n');
    const instanceEnv = join(dir, 'instance.env');
    writeFileSync(instanceEnv, ['VOLTI_REGION=sa-east-1', `VOLTI_REPO_DIR=${slash(repo)}`, 'VOLTI_BRANCH=feat/x', ''].join('\n'));
    const envFile = join(dir, '.env');
    writeFileSync(envFile, envLines.join('\n') + '\n');
    const env = { VOLTI_INSTANCE_ENV: slash(instanceEnv), VOLTI_ENV_FILE: slash(envFile), FAKE_LOG: slash(log) };
    const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : []);
    return { dir, repo, bin, env, calls };
  }
  const logger = (name: string, extra = '') => `#!/usr/bin/env bash\necho "${name} $*" >> "$FAKE_LOG"\n${extra}`;

  /** PANEL_PATHS of admin.sh: what `git archive` copies for the panel build. */
  const panelPaths = () => file('admin.sh').match(/^PANEL_PATHS=\(([^)]*)\)/m)![1].trim().split(/\s+/);

  it('admin.sh: the panel copy holds every workspace dep of apps/admin (derived from package.json), on disk (not /tmp)', () => {
    const paths = panelPaths();
    const pkg = (dir: string) => JSON.parse(readFileSync(join(REPO, dir, 'package.json'), 'utf8'));
    // Workspace packages by name -> dir (packages/*, apps/*, services/*).
    const byName = new Map<string, string>();
    for (const root of ['packages', 'apps', 'services']) {
      for (const d of readdirSync(join(REPO, root))) {
        if (existsSync(join(REPO, root, d, 'package.json'))) byName.set(pkg(`${root}/${d}`).name, `${root}/${d}`);
      }
    }
    const needed = new Set<string>();
    const visit = (dir: string) => {
      if (needed.has(dir)) return;
      needed.add(dir);
      const p = pkg(dir);
      for (const [name, v] of Object.entries({ ...p.dependencies, ...p.devDependencies }) as [string, string][]) {
        if (v.startsWith('workspace:')) visit(byName.get(name)!);
      }
      // tsconfig "extends" outside the package (tsconfig.base.json at the root).
      const ts = join(REPO, dir, 'tsconfig.json');
      if (existsSync(ts)) {
        const ext = /"extends":\s*"([^"]+)"/.exec(readFileSync(ts, 'utf8'));
        if (ext) needed.add(slash(join(dir, ext[1])).replace(/^(\.\.\/)+/, ''));
      }
    };
    visit('apps/admin');
    expect(needed).toContain('packages/contracts');
    for (const n of [...needed, 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) expect(paths).toContain(n);
    for (const p of paths) expect(existsSync(join(REPO, p))).toBe(true);
    // Nothing the host runs as root (deploy/, .git) and no unrelated tree goes into the copy.
    for (const p of paths) expect(p).not.toMatch(/^(deploy|services|infra|\.git)/);
    const a = file('admin.sh');
    expect(a).toMatch(/PANEL_TMP="\$\{VOLTI_PANEL_TMP:-\/var\/tmp\}"/);
    expect(a).toMatch(/mktemp -d -p "\$PANEL_TMP" volti-panel\.XXXXXX/);
    expect(a).not.toMatch(/mktemp -d\)/);
  });

  itBash('admin.sh publish-panel builds from a throwaway git archive copy (panel paths only), never mounting the repo; the copy is removed', () => {
    const f = fakeInstance('volti-admin-', ['PUBLIC_HOST=api.example.com', 'ADMIN_ORIGIN=https://p.example.com', 'ADMIN_BUCKET=painel', 'ADMIN_DISTRIBUTION_ID=E1']);
    // Every PANEL_PATHS entry exists in the fake repo, plus things that must NOT be copied.
    for (const p of panelPaths()) {
      if (/\.[a-z]+$/.test(p)) writeFileSync(join(f.repo, p), '{}\n');
      else {
        mkdirSync(join(f.repo, p), { recursive: true });
        writeFileSync(join(f.repo, p, 'package.json'), '{}\n');
      }
    }
    mkdirSync(join(f.repo, 'services', 'api'), { recursive: true });
    writeFileSync(join(f.repo, 'services', 'api', 'package.json'), '{}\n');
    const panelTmp = mkdtempSync(join(tmpdir(), 'volti-paneltmp-'));
    const git = (...a: string[]) => spawnSync('git', ['-C', f.repo, ...a], { encoding: 'utf8' });
    git('init', '-q');
    git('add', '-A');
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'x');
    // Fake docker: logs every -v, what the mounted dir holds, and builds apps/admin/out inside it.
    fake(
      f.bin,
      'docker',
      logger(
        'docker',
        `prev=""
for a in "$@"; do
  if [ "$prev" = "-v" ]; then
    src="\${a%:/repo}"
    echo "mount-src $src" >> "$FAKE_LOG"
    [ -e "$src/.git" ] && echo "mount-has-git" >> "$FAKE_LOG"
    [ -e "$src/deploy" ] && echo "mount-has-deploy" >> "$FAKE_LOG"
    [ -e "$src/services" ] && echo "mount-has-services" >> "$FAKE_LOG"
    [ -f "$src/apps/admin/package.json" ] && echo "mount-has-admin" >> "$FAKE_LOG"
    [ -f "$src/packages/contracts/package.json" ] && echo "mount-has-contracts" >> "$FAKE_LOG"
    mkdir -p "$src/apps/admin/out" && echo ok > "$src/apps/admin/out/index.html"
  fi
  prev="$a"
done
`,
      ),
    );
    fake(f.bin, 'aws', logger('aws'));
    const r = runScript(join(REPO, 'deploy', 'single', 'admin.sh'), f.bin, { ...f.env, VOLTI_PANEL_TMP: slash(panelTmp) }, ['publish-panel']);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    const calls = f.calls();
    const mounts = calls.filter((c) => c.startsWith('mount-src ')).map((c) => c.slice('mount-src '.length));
    expect(mounts).toHaveLength(1);
    expect(mounts[0].startsWith(`${slash(panelTmp)}/volti-panel.`)).toBe(true);
    expect(calls).toEqual(expect.arrayContaining(['mount-has-admin', 'mount-has-contracts']));
    for (const bad of ['mount-has-git', 'mount-has-deploy', 'mount-has-services']) expect(calls).not.toContain(bad);
    const sync = calls.find((c) => c.startsWith('aws s3 sync '))!;
    expect(sync).toBe(`aws s3 sync ${mounts[0]}/apps/admin/out s3://painel --delete`);
    // The build output never lands in the repo and the copy is gone.
    expect(existsSync(join(f.repo, 'apps', 'admin', 'out'))).toBe(false);
    expect(readdirSync(panelTmp)).toEqual([]);
    expect(calls.indexOf('imds-guard.sh ')).toBeLessThan(calls.findIndex((c) => c.startsWith('docker ')));
  });

  const runUpdate = (guardActive: boolean) => {
    const f = fakeInstance('volti-update-', ['IOT_SIM=off']);
    fake(f.bin, 'git', logger('git', 'case "$1" in rev-parse) echo abc123 ;; esac\n'));
    fake(f.bin, 'systemctl', logger('systemctl', `case "$1" in is-active) exit ${guardActive ? 0 : 3} ;; esac\n`));
    // volti_default still exists and cannot be removed (a container still holds it).
    fake(f.bin, 'docker', logger('docker', 'case "$1 $2" in "network inspect") exit 0 ;; "network rm") echo "Error: in use" >&2; exit 1 ;; esac\n'));
    const r = runScript(join(REPO, 'deploy', 'single', 'update.sh'), f.bin, f.env);
    return { r, calls: f.calls() };
  };

  itBash('update.sh: never restarts the guard unit or Docker; starts the unit only when inactive, then Docker, before any compose call', () => {
    for (const active of [false, true]) {
      const { r, calls } = runUpdate(active);
      expect(r.status).toBe(0);
      const at = (c: string) => calls.indexOf(c);
      expect(calls.filter((c) => /^systemctl (restart|stop|try-restart|reload-or-restart)/.test(c))).toEqual([]);
      expect(at('imds-guard.sh install')).toBeGreaterThan(-1);
      expect(at('systemctl reset-failed volti-imds-guard')).toBeGreaterThan(at('imds-guard.sh install'));
      expect(at('systemctl is-active --quiet volti-imds-guard')).toBeGreaterThan(at('systemctl reset-failed volti-imds-guard'));
      if (active) expect(calls).not.toContain('systemctl start volti-imds-guard');
      else expect(at('systemctl start volti-imds-guard')).toBeGreaterThan(at('systemctl is-active --quiet volti-imds-guard'));
      expect(at('systemctl start docker')).toBeGreaterThan(at('systemctl is-active --quiet volti-imds-guard'));
      expect(calls.findIndex((c) => c.startsWith('docker '))).toBeGreaterThan(at('systemctl start docker'));
    }
  });

  itBash('update.sh: a failed removal of the old network warns on stderr and the update goes on', () => {
    const { r, calls } = runUpdate(true);
    expect(r.status).toBe(0);
    expect(calls).toContain('docker network rm volti_default');
    expect(r.stderr).toMatch(/AVISO.*volti_default/);
    expect(calls.some((c) => c.startsWith('docker compose') && c.includes(' ps'))).toBe(true);
  });
});
