import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Template } from 'aws-cdk-lib/assertions';
import { TRACCAR_IMAGE } from '../lib/stacks/traccar-stack';
import { createSingleDevApp } from '../lib/volti-app';

const REPO = join(__dirname, '..', '..');
const file = (name: string) => readFileSync(join(REPO, 'deploy', 'single', name), 'utf8');

/** Bloco de um serviço (até o próximo serviço de 2 espaços ou a próxima chave de topo). */
function service(c: string, name: string): string {
  const start = c.indexOf(`\n  ${name}:`);
  if (start < 0) throw new Error(`serviço ${name} ausente`);
  const rest = c.slice(start + 1);
  const next = rest.slice(1).search(/\n( {2}[a-z][a-z0-9-]*:|[a-z]+:)/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

/** Git Bash no Windows; `bash` nos outros. Sem bash, o teste de shell é pulado (como em single-profile-imds.test.ts). */
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

function ingress(opts: Parameters<typeof createSingleDevApp>[0]): Array<[string, number, string]> {
  const s = createSingleDevApp({ ...opts, outdir: mkdtempSync(join(tmpdir(), 'volti-gt06-cdk-')) });
  const sg = Object.values(Template.fromStack(s.single).findResources('AWS::EC2::SecurityGroup'))[0] as any;
  return sg.Properties.SecurityGroupIngress.map((r: any) => [r.IpProtocol, r.FromPort, r.CidrIp]);
}

describe('dev single: rastreador GT06 (spec GT06 §7, plano Task 13)', () => {
  const c = file('compose.yml');

  it('três serviços no profile gt06, sem IP fixo (sem IMDS), sem NET_RAW, sem o .env inteiro e com memória limitada', () => {
    for (const s of ['traccar', 'traccar-bridge', 'gt06-emulator']) {
      const block = service(c, s);
      expect(block).toContain('profiles: ["gt06"]');
      expect(block).toContain('cap_drop: [NET_RAW]');
      expect(block).toContain('restart: unless-stopped');
      expect(block).toMatch(/mem_limit: \d+m/);
      // Sob pressão de memória (t4g.small, 2 GiB), o OOM killer escolhe estes antes da API e do Postgres.
      expect(block).toContain('oom_score_adj: 500');
      expect(block).not.toMatch(/ipv4_address|env_file|AWS_/);
    }
  });

  it('Traccar: mesma imagem (>= 6.7.0, arm64) do docker-compose local e do CDK, heap pequeno, banco e papel próprios, REST só em 127.0.0.1', () => {
    const t = service(c, 'traccar');
    expect(t).toContain(`image: ${TRACCAR_IMAGE}`);
    const local = readFileSync(join(REPO, 'docker-compose.yml'), 'utf8');
    expect(service(local, 'traccar')).toContain(`image: ${TRACCAR_IMAGE}`);
    expect(t).toMatch(/-Xmx(3[0-9]{2}|[12][0-9]{2})m/);
    expect(t).toContain('DATABASE_URL: jdbc:postgresql://postgres:5432/traccar?sslmode=prefer');
    expect(t).toContain('DATABASE_USER: traccar');
    expect(t).toContain('DATABASE_PASSWORD: ${TRACCAR_DB_PASSWORD:?');
    expect(t).toContain('PROTOCOLS_ENABLE: gt06');
    // GT06 só em 127.0.0.1 por padrão (o emulador usa traccar:5023 pela rede interna); 0.0.0.0 só com GT06_BIND e gt06Port.
    expect(t).toContain('ports: ["${GT06_BIND:-127.0.0.1}:5023:5023", "127.0.0.1:8082:8082"]');
    expect(t).toMatch(/postgres:\s+condition: service_healthy/);
  });

  it('ponte: papel volti_bridge e usuário próprio do Traccar; nada do DB_PASSWORD da API, sem bootstrap de admin, sem portas', () => {
    const b = service(c, 'traccar-bridge');
    expect(b).toContain('dockerfile: services/traccar-bridge/Dockerfile');
    expect(b).toContain('IOT_MODE: local');
    expect(b).toContain('MQTT_URL: mqtt://mosquitto:1883');
    expect(b).toContain('TRACCAR_URL: http://traccar:8082');
    expect(b).toContain('DATABASE_URL: postgresql://volti_bridge:${BRIDGE_DB_PASSWORD:?');
    expect(b).toContain('TRACCAR_EMAIL: bridge@volti.local');
    expect(b).toContain('TRACCAR_PASSWORD: ${TRACCAR_BRIDGE_PASSWORD:?');
    expect(b).toContain('BATTERY_MODEL: ${GT06_BATTERY_MODEL:-72v}');
    expect(b).not.toContain('DB_PASSWORD}');
    expect(b).not.toContain('TRACCAR_BOOTSTRAP_ADMIN');
    expect(b).not.toMatch(/ports:/);
  });

  it('emulador: imagem da ponte, aponta para traccar:5023, IMEI/cenário/bateria por variável, sem portas', () => {
    const e = service(c, 'gt06-emulator');
    expect(e).toContain('image: volti/traccar-bridge:dev');
    expect(e).toContain('command: ["node", "dist/gt06/emulator-main.js"]');
    expect(e).toContain('GT06_HOST: traccar');
    expect(e).toContain('GT06_PORT: "5023"');
    expect(e).toContain('GT06_IMEI: ${GT06_EMULATOR_IMEI:-860000000000901}');
    expect(e).toContain('GT06_SCENARIO: ${GT06_SCENARIO:-parked}');
    expect(e).toContain('BATTERY_MODEL: ${GT06_BATTERY_MODEL:-72v}');
    expect(e).not.toMatch(/ports:|PASSWORD/);
  });

  it('render-env.sh gera e libera os quatro segredos novos e as configs GT06; o token do e2e fica fora', () => {
    const env = file('render-env.sh');
    const list = (name: string) => env.match(new RegExp(`^${name}=\\(([^)]*)\\)`, 'm'))![1].trim().split(/\s+/);
    const generated = env.match(/^for name in ([A-Z_ ]+); do/m)![1].split(' ');
    for (const n of ['TRACCAR_DB_PASSWORD', 'TRACCAR_ADMIN_PASSWORD', 'TRACCAR_BRIDGE_PASSWORD', 'BRIDGE_DB_PASSWORD']) {
      expect(generated).toContain(n);
      expect(list('SECRET_NAMES')).toContain(n);
    }
    expect(list('CONFIG_NAMES')).toEqual(expect.arrayContaining(['GT06', 'GT06_BATTERY_MODEL', 'GT06_BIND']));
    expect(list('SECRET_NAMES')).not.toContain('E2E_STAFF_TOKEN');
    expect(list('CONFIG_NAMES')).not.toContain('E2E_STAFF_TOKEN');
    // Tudo o que o gt06.sh lê do .env está nas allowlists (PUBLIC_HOST é escrito pelo próprio render-env.sh).
    const allowed = [...list('CONFIG_NAMES'), ...list('SECRET_NAMES'), 'PUBLIC_HOST'];
    for (const m of file('gt06.sh').matchAll(/envval ([A-Z_0-9]+)/g)) expect(allowed).toContain(m[1]);
  });

  it('update.sh: GT06 desligado por padrão; ligado, o init roda depois das migrações e antes de subir os containers', () => {
    const u = file('update.sh');
    expect(u).toMatch(/grep -E '\^GT06='/);
    expect(u).toMatch(/case "\$\{gt06_flag:-off\}" in/);
    const migrate = u.indexOf('prisma migrate deploy');
    const init = u.indexOf('bash deploy/single/gt06.sh init');
    const up = u.indexOf('up -d --remove-orphans');
    expect(migrate).toBeGreaterThan(-1);
    expect(init).toBeGreaterThan(migrate);
    expect(up).toBeGreaterThan(init);
    expect(u).toMatch(/dc "\$\{sim\[@\]\}" "\$\{gt06\[@\]\}" build api postgres "\$\{sim_services\[@\]\}" "\$\{gt06_services\[@\]\}"/);
    expect(u).toMatch(/rm -sf traccar traccar-bridge gt06-emulator/);
    // init com falha não derruba o deploy da API: o profile sai deste update (e os containers GT06 são removidos).
    expect(u).toMatch(/bash deploy\/single\/gt06\.sh init \|\| \{[^}]*AVISO[^}]*gt06=\(\);[^}]*\}/);
    const fallback = u.indexOf('gt06=();', init);
    expect(fallback).toBeGreaterThan(init);
    expect(fallback).toBeLessThan(up);
    expect(u.indexOf('if [ ${#gt06[@]} -eq 0 ]; then dc --profile gt06 rm -sf')).toBeGreaterThan(up);
  });

  it('gt06.sh: senhas e token nunca na linha de comando; token do e2e só do SSM; papel da ponte só com SELECT em 3 colunas', () => {
    const g = file('gt06.sh');
    expect(g).not.toMatch(/curl[^\n]*\s-u\s/);
    expect(g).toMatch(/curl -fsS -X "\$1" -K -/);
    expect(g).toMatch(/\$VOLTI_SECRETS_PREFIX\/E2E_STAFF_TOKEN/);
    expect(g).toMatch(/GRANT SELECT \("imei", "thingName", "controlMode"\) ON "Tracker" TO volti_bridge;/);
    expect(g).not.toMatch(/GRANT (ALL|INSERT|UPDATE|DELETE)[^\n]*volti_bridge/i);
    expect(g).toMatch(/REVOKE ALL ON DATABASE traccar FROM PUBLIC/);
    expect(g).not.toMatch(/echo "\$token"|printf '%s' "\$token"/);
    // IMEI nunca na saída (spec §6.5).
    expect(g).not.toMatch(/(echo|printf)[^\n]*\$(imei|4)\b/);
  });

  it('gt06.sh: a ponte é dona dos dispositivos (TRACCAR_BRIDGE_EMAIL no provision) e o e2e confere a linha do tempo com o log do emulador', () => {
    const g = file('gt06.sh');
    expect(g).toMatch(/TRACCAR_BRIDGE_EMAIL=bridge@volti\.local/);
    expect(g).toMatch(/-e TRACCAR_BRIDGE_EMAIL="\$TRACCAR_BRIDGE_EMAIL"/);
    expect(g).toContain('node dist/cli/provision-gt06.js');
    expect(g).toMatch(/check-timeline\.js "\$thing" --emulator-log=/);
    // O verificador roda sem rede e sem segredos.
    expect(g).toMatch(/docker run --rm -i --network none --cap-drop ALL --read-only --user 0:0/);
  });

  it('gt06.sh init: GET /api/users com falha não vira admin duplicado; cadastro aberto do Traccar desligado', () => {
    const g = file('gt06.sh');
    // Só 401 (admin ainda não existe) leva à criação; 000/5xx tenta de novo e depois falha com mensagem.
    expect(g).toMatch(/-w '%\{http_code\}'/);
    expect(g).toMatch(/200\)[^\n]*;;/);
    expect(g).toMatch(/401\)/);
    // registration:false com o objeto completo do servidor (PUT /api/server), idempotente.
    expect(g).toMatch(/traccar_admin GET \/api\/server/);
    expect(g).toMatch(/"registration":true/);
    expect(g).toMatch(/traccar_admin PUT \/api\/server/);
    // Corpo no config do curl: barra invertida escapada antes das aspas.
    expect(g).toContain('b="${3//\\\\/\\\\\\\\}"');
  });

  it('gt06.sh e2e: id do comando extraído sem morrer no pipefail; logs só do root; mqtt.log (posições) apagado no sucesso', () => {
    const g = file('gt06.sh');
    expect(g).toMatch(/cid="\$\(printf '%s' "\$resp" \| grep -o[^\n]*\|\| true\)"/);
    expect(g).toMatch(/chmod 700 "\$dir"/);
    expect(g).toMatch(/chmod 600 "\$dir\/mqtt\.log" "\$dir\/emulator\.log"/);
    expect(g).toMatch(/umask 077/);
    expect(g).toMatch(/if \[ "\$result" -eq 0 \]; then rm -f "\$dir\/mqtt\.log"/);
    expect(g).not.toMatch(/chmod 7?55 "\$dir"|chmod 644/);
    expect(file('cloudshell.md')).toMatch(/mqtt\.log[^\n]*apagado[^\n]*sucesso|sucesso[^\n]*mqtt\.log[^\n]*apagad/);
  });

  itBash('gt06.sh valida a ação e os argumentos antes de tocar no Docker (sai 2)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'volti-gt06-'));
    const inst = join(dir, 'instance.env');
    writeFileSync(inst, `VOLTI_REGION=sa-east-1\nVOLTI_REPO_DIR=${dir.replace(/\\/g, '/')}\nVOLTI_SECRETS_PREFIX=/volti/dev/secrets\n`);
    const run = (...args: string[]) =>
      spawnSync(BASH!, [join(REPO, 'deploy', 'single', 'gt06.sh').replace(/\\/g, '/'), ...args], { env: { ...process.env, VOLTI_INSTANCE_ENV: inst.replace(/\\/g, '/') }, encoding: 'utf8' });
    expect(run('qualquer').status).toBe(2);
    expect(run().status).toBe(2);
    expect(run('provision', 'VLT-0901', 'moto-0901', '123').status).toBe(2);
    expect(run('provision', 'VLT-0901', "moto-0901'; DROP", '860000000000901').status).toBe(2);
    expect(run('deprovision', "moto-0901' OR 1=1").status).toBe(2);
    expect(run('e2e', 'VLT-0901').status).toBe(2);
  });

  describe('security group: 5023 só com -c gt06Port=true e origem explícita; 8082 nunca', () => {
    it('padrão: só 80 e 443', () => {
      const rules = ingress({});
      expect(rules.map((r) => r[1]).sort()).toEqual([443, 80]);
    });

    it('gt06Port sem gt06Cidrs nem openGt06: erro (nunca abre em silêncio)', () => {
      expect(() => ingress({ gt06Port: true })).toThrow(/gt06Cidrs|openGt06/);
    });

    it('gt06Port com gt06Cidrs: 5023 só dessas origens', () => {
      const rules = ingress({ gt06Port: true, gt06Cidrs: ['198.51.100.7/32', '203.0.113.0/24'] });
      expect(rules).toContainEqual(['tcp', 5023, '198.51.100.7/32']);
      expect(rules).toContainEqual(['tcp', 5023, '203.0.113.0/24']);
      expect(rules.filter((r) => r[1] === 5023 && r[2] === '0.0.0.0/0')).toEqual([]);
      expect(() => ingress({ gt06Port: true, gt06Cidrs: ['não-é-cidr'] })).toThrow(/gt06Cidrs/);
      // Abrir para todos só pelo reconhecimento explícito.
      for (const all of ['0.0.0.0/0', '::/0', '10.0.0.0/0']) expect(() => ingress({ gt06Port: true, gt06Cidrs: [all] })).toThrow(/openGt06/);
    });

    it('gt06Port com openGt06 (reconhecimento explícito): 5023 aberta a 0.0.0.0/0; 8082 nunca', () => {
      const rules = ingress({ gt06Port: true, openGt06: true });
      expect(rules).toContainEqual(['tcp', 5023, '0.0.0.0/0']);
      expect(rules.filter((r) => r[1] === 8082)).toEqual([]);
    });

    it('openGt06/gt06Cidrs sem gt06Port: nada muda', () => {
      expect(ingress({ openGt06: true, gt06Cidrs: ['198.51.100.7/32'] }).map((r) => r[1]).sort()).toEqual([443, 80]);
    });

    it('bin/volti.ts lê gt06Port, gt06Cidrs e openGt06 do contexto', () => {
      const bin = readFileSync(join(REPO, 'infra', 'bin', 'volti.ts'), 'utf8');
      expect(bin).toMatch(/gt06Port: get\('gt06Port'\) === 'true'/);
      expect(bin).toMatch(/gt06Cidrs: get\('gt06Cidrs'\)\?\.split\(','\)/);
      expect(bin).toMatch(/openGt06: get\('openGt06'\) === 'true'/);
    });
  });

  it('cloudshell.md documenta o profile, o e2e e o reconhecimento da 5023', () => {
    const d = file('cloudshell.md');
    expect(d).toContain('## Rastreador GT06 (Traccar + ponte + emulador)');
    expect(d).toContain('/volti/dev/config/GT06');
    expect(d).toContain('/volti/dev/secrets/E2E_STAFF_TOKEN');
    expect(d).toContain('gt06.sh e2e');
    expect(d).toMatch(/-c gt06Port=true -c gt06Cidrs=/);
    expect(d).toContain('/volti/dev/config/GT06_BIND');
  });
});
