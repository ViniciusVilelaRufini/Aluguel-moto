import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { planFromArgs, provision } from '../scripts/provision-station';

const STATION = '5b0e7c1a-1111-4111-8111-111111111111';

describe('CI workflow (.github/workflows/infra.yml)', () => {
  const yml = readFileSync(join(__dirname, '..', '..', '.github', 'workflows', 'infra.yml'), 'utf8').replace(/\r\n/g, '\n');

  it('builds the API image from the repo root with -f services/api/Dockerfile', () => {
    expect(yml).toMatch(/docker build -f services\/api\/Dockerfile -t "\$REPO:\$\{\{ github\.sha \}\}" \.\n/);
    expect(yml).not.toMatch(/docker build -t [^\n]* services\/api\s*\n/);
  });

  it('a checks job runs api lint + unit tests, admin lint + vitest and the redocly contract lint, and gates the deploy', () => {
    const checks = yml.slice(yml.indexOf('\n  checks:'), yml.indexOf('\n  synth:'));
    for (const cmd of [
      'pnpm --filter @volti/contracts lint',
      'pnpm --filter api lint',
      'pnpm --filter api test',
      'pnpm --filter admin lint',
      'pnpm --filter admin test',
      'pnpm --filter traccar-bridge lint',
      'pnpm --filter traccar-bridge test',
      'pnpm --filter iot-sim lint',
      'pnpm --filter iot-sim test',
    ]) {
      expect(checks).toContain(cmd);
    }
    const deploy = yml.slice(yml.indexOf('\n  deploy-dev:'));
    expect(deploy).toMatch(/needs: \[checks, synth\]/);
  });

  it('runs on changes to the API, the panel and the contract too', () => {
    for (const p of ["'services/api/**'", "'services/traccar-bridge/**'", "'apps/admin/**'", "'packages/contracts/**'"]) {
      expect(yml.split(p).length - 1).toBe(2); // pull_request and push
    }
  });

  it('also runs on the dev single deploy files, the local compose and the tracker simulator', () => {
    for (const p of ["'deploy/**'", "'docker-compose.yml'", "'services/iot-sim/**'"]) {
      expect(yml.split(p).length - 1).toBe(2); // pull_request and push
    }
  });
});

describe('.github/workflows/*.yml', () => {
  const dir = join(__dirname, '..', '..', '.github', 'workflows');
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));

  it.each(files)('%s is valid UTF-8 (no Latin-1 bytes)', (f) => {
    const bytes = readFileSync(join(dir, f));
    expect(() => new TextDecoder('utf-8', { fatal: true }).decode(bytes)).not.toThrow();
  });
});

describe('scripts/provision-station.ts', () => {
  it('plans thing station-<id>, the estacao policy of the env and an output dir outside the repo', () => {
    const plan = planFromArgs(['--station', STATION.toUpperCase(), '--env', 'prod'], { home: '/home/op' });
    expect(plan.thingName).toBe(`station-${STATION}`);
    expect(plan.policyName).toBe('volti-prod-estacao-policy');
    expect(plan.outDir.replace(/\\/g, '/')).toMatch(new RegExp(`/home/op/\\.volti/certs/station-${STATION}$`));
    expect(plan.dryRun).toBe(false);
  });

  it('rejects a missing/invalid station id or env', () => {
    expect(() => planFromArgs([])).toThrow(/--station/);
    expect(() => planFromArgs(['--station', 'station-1'])).toThrow(/--station/);
    expect(() => planFromArgs(['--station', STATION, '--env', 'staging'])).toThrow(/--env/);
  });

  const fakeIot = (opts: { exists: boolean; principals?: string[]; failAttach?: boolean }) => {
    const calls: { name: string; input: any }[] = [];
    const send = async (cmd: any) => {
      const name = cmd.constructor.name as string;
      calls.push({ name, input: cmd.input });
      if (name === 'DescribeThingCommand' && !opts.exists) throw Object.assign(new Error('nope'), { name: 'ResourceNotFoundException' });
      if (name === 'ListThingPrincipalsCommand') return { principals: opts.principals ?? [] };
      if (name === 'CreateKeysAndCertificateCommand') {
        return { certificateArn: 'arn:cert/1', certificateId: '1', certificatePem: 'PEM', keyPair: { PrivateKey: 'PRIV', PublicKey: 'PUB' } };
      }
      if (name === 'AttachThingPrincipalCommand' && opts.failAttach) throw new Error('boom');
      return {};
    };
    return { iot: { send } as any, calls };
  };
  const quiet = () => jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

  it('new station: creates the thing (type estacao), issues the certificate (files 600), attaches policy and thing', async () => {
    const spy = quiet();
    const out = mkdtempSync(join(tmpdir(), 'volti-st-'));
    const plan = planFromArgs(['--station', STATION, '--out', out]);
    const { iot, calls } = fakeIot({ exists: false });
    const res = await provision(iot, plan);
    expect(res).toEqual({ certificateArn: 'arn:cert/1', issued: true });
    const names = calls.map((c) => c.name);
    expect(names).toEqual(['DescribeThingCommand', 'CreateThingCommand', 'CreateKeysAndCertificateCommand', 'AttachPolicyCommand', 'AttachThingPrincipalCommand']);
    expect(calls[1].input).toEqual({ thingName: `station-${STATION}`, thingTypeName: 'estacao', attributePayload: { attributes: { stationId: STATION } } });
    expect(calls[3].input).toEqual({ policyName: 'volti-dev-estacao-policy', target: 'arn:cert/1' });
    expect(readFileSync(join(plan.outDir, 'private.pem.key'), 'utf8')).toBe('PRIV');
    if (process.platform !== 'win32') expect(statSync(join(plan.outDir, 'private.pem.key')).mode & 0o777).toBe(0o600);
    // The private key never reaches the log.
    expect(spy.mock.calls.map((c) => String(c[0])).join('')).not.toContain('PRIV');
    spy.mockRestore();
  });

  it('existing station with a certificate: idempotent, no new certificate; dry-run touches nothing', async () => {
    const spy = quiet();
    const { iot, calls } = fakeIot({ exists: true, principals: ['arn:cert/old'] });
    const res = await provision(iot, planFromArgs(['--station', STATION]));
    expect(res).toEqual({ certificateArn: 'arn:cert/old', issued: false });
    expect(calls.map((c) => c.name)).toEqual(['DescribeThingCommand', 'ListThingPrincipalsCommand']);
    const dry = fakeIot({ exists: false });
    await provision(dry.iot, planFromArgs(['--station', STATION, '--dry-run']));
    expect(dry.calls.map((c) => c.name)).toEqual(['DescribeThingCommand']);
    spy.mockRestore();
  });

  it('attach failure: the loose certificate is deactivated and deleted', async () => {
    const spy = quiet();
    const out = mkdtempSync(join(tmpdir(), 'volti-st-'));
    const { iot, calls } = fakeIot({ exists: true, failAttach: true });
    await expect(provision(iot, planFromArgs(['--station', STATION, '--out', out]))).rejects.toThrow('boom');
    const names = calls.map((c) => c.name);
    expect(names.slice(-3)).toEqual(['DetachPolicyCommand', 'UpdateCertificateCommand', 'DeleteCertificateCommand']);
    expect(existsSync(join(out, `station-${STATION}`))).toBe(false); // key files removed with the certificate
    spy.mockRestore();
  });
});
