import { spawnSync } from 'child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Auditoria run-4 (onda 2, mosquitto-anonymous-no-acl): o Mosquitto do dev single não aceita anônimo; cada serviço entra com
 * usuário e senha próprios (gerados pelo render-env.sh no SSM) e a ACL limita cada papel aos tópicos dele.
 */
const REPO = join(__dirname, '..', '..');
const single = (name: string) => readFileSync(join(REPO, 'deploy', 'single', name), 'utf8');
const compose = single('compose.yml');

/** Bloco de um serviço (até o próximo serviço de 2 espaços ou a próxima chave de topo). */
function service(c: string, name: string): string {
  const start = c.indexOf(`\n  ${name}:`);
  if (start < 0) throw new Error(`serviço ${name} ausente`);
  const rest = c.slice(start + 1);
  const next = rest.slice(1).search(/\n( {2}[a-z][a-z0-9-]*:|[a-z]+:)/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

/** ACL do Mosquitto: usuário → regras (acesso, filtro). */
function parseAcl(text: string): Map<string, Array<{ access: string; filter: string }>> {
  const acl = new Map<string, Array<{ access: string; filter: string }>>();
  let user = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [kw, ...rest] = line.split(/\s+/);
    if (kw === 'user') {
      user = rest[0];
      acl.set(user, []);
    } else if (kw === 'topic') {
      if (!user) throw new Error(`regra fora de um bloco de usuário: ${line}`);
      const [access, filter] = rest.length === 1 ? ['readwrite', rest[0]] : rest;
      acl.get(user)!.push({ access, filter });
    } else {
      throw new Error(`linha não suportada no teste: ${line}`);
    }
  }
  return acl;
}

/** Casamento MQTT com a regra do Mosquitto: curinga no primeiro nível não casa tópico que começa com `$`. */
function matches(filter: string, topic: string): boolean {
  if (topic.startsWith('$') && (filter.startsWith('+') || filter.startsWith('#'))) return false;
  const f = filter.split('/');
  const t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length || (f[i] !== '+' && f[i] !== t[i])) return false;
  }
  return f.length === t.length;
}

const acl = parseAcl(single('mosquitto/acl'));
const may = (user: string, op: 'read' | 'write', topic: string) =>
  (acl.get(user) ?? []).some((r) => (r.access === op || r.access === 'readwrite') && matches(r.filter, topic));

const T = 'moto-0001';
const DEVICE_WRITES = [`motos/${T}/telemetria`, `motos/${T}/eventos`, `$aws/things/${T}/shadow/update`, `$aws/things/${T}/shadow/get`, `$aws/events/presence/connected/${T}`, `$aws/events/presence/disconnected/${T}`];
const DEVICE_READS = [`$aws/things/${T}/shadow/update/delta`, `$aws/things/${T}/shadow/get/accepted`, `motos/${T}/comandos`];
const SERVER_ONLY_WRITES = [`$aws/things/${T}/shadow/update/delta`, `$aws/things/${T}/shadow/update/accepted`, `$aws/things/${T}/shadow/update/documents`, `$aws/things/${T}/shadow/get/accepted`, `motos/${T}/comandos`, 'estacoes/e1/comandos'];

describe('dev single: Mosquitto sem anônimo, senha por serviço e ACL por papel', () => {
  it('mosquitto.conf: allow_anonymous false, arquivo de senhas do start.sh e acl montada', () => {
    const conf = single('mosquitto/mosquitto.conf');
    expect(conf).toMatch(/^allow_anonymous false$/m);
    expect(conf).not.toMatch(/^allow_anonymous true/m);
    expect(conf).toMatch(/^password_file \/mosquitto\/auth\/passwd$/m);
    expect(conf).toMatch(/^acl_file \/mosquitto\/config\/acl$/m);
  });

  it('compose: o Mosquitto sobe pelo start.sh com as três senhas obrigatórias, sem portas publicadas', () => {
    const m = service(compose, 'mosquitto');
    expect(m).toContain('entrypoint: ["/bin/sh", "/mosquitto/start.sh"]');
    expect(m).toContain('./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro');
    expect(m).toContain('./mosquitto/acl:/mosquitto/config/acl:ro');
    expect(m).toContain('./mosquitto/start.sh:/mosquitto/start.sh:ro');
    for (const v of ['MQTT_API_PASSWORD', 'MQTT_BRIDGE_PASSWORD', 'MQTT_SIM_PASSWORD']) expect(m).toContain(`${v}: \${${v}:?`);
    expect(m).not.toMatch(/ports:/);
    expect(m).not.toContain('infra/mosquitto/mosquitto.conf');
  });

  it('compose: cada cliente MQTT entra com o próprio usuário (credenciais na MQTT_URL, lidas pelo mqtt.js); nenhum anônimo', () => {
    expect(service(compose, 'api')).toContain('MQTT_URL: mqtt://api:${MQTT_API_PASSWORD:?');
    expect(service(compose, 'traccar-bridge')).toContain('MQTT_URL: mqtt://traccar-bridge:${MQTT_BRIDGE_PASSWORD:?');
    expect(service(compose, 'iot-sim')).toContain('MQTT_URL: mqtt://iot-sim:${MQTT_SIM_PASSWORD:?');
    const urls = compose.match(/MQTT_URL: .+/g) ?? [];
    expect(urls).toHaveLength(3);
    for (const u of urls) expect(u).toMatch(/^MQTT_URL: mqtt:\/\/[a-z-]+:\$\{MQTT_[A-Z]+_PASSWORD:\?[^}]*\}@mosquitto:1883$/);
    // A ponte e o simulador não recebem a senha dos outros papéis.
    expect(service(compose, 'traccar-bridge')).not.toMatch(/MQTT_(API|SIM)_PASSWORD/);
    expect(service(compose, 'iot-sim')).not.toMatch(/MQTT_(API|BRIDGE)_PASSWORD/);
  });

  it('render-env.sh gera as três senhas no SSM (só cria, nunca sobrescreve) e as deixa entrar no .env', () => {
    const env = single('render-env.sh');
    const generated = env.match(/^for name in ([A-Z_ ]+); do/m)![1].split(' ');
    const secrets = env.match(/^SECRET_NAMES=\(([^)]*)\)/m)![1].trim().split(/\s+/);
    for (const v of ['MQTT_API_PASSWORD', 'MQTT_BRIDGE_PASSWORD', 'MQTT_SIM_PASSWORD']) {
      expect(generated).toContain(v);
      expect(secrets).toContain(v);
    }
  });

  it('gt06.sh e2e: o mosquitto_sub dentro do container usa as opções padrão do observador (sem senha na linha de comando)', () => {
    const gt06 = single('gt06.sh');
    expect(gt06).toMatch(/dc exec -T mosquitto mosquitto_sub -W/);
    expect(gt06).not.toMatch(/mosquitto_sub[^\n]* -P /);
    expect(single('mosquitto/start.sh')).toContain('${MOSQUITTO_SUB_CONF:-${HOME:-/root}/.config/mosquitto_sub}');
  });

  it('ACL: os quatro usuários e nenhum outro (o passwd do start.sh tem os mesmos)', () => {
    expect([...acl.keys()].sort()).toEqual(['api', 'iot-sim', 'observador', 'traccar-bridge']);
  });

  it('ACL: ponte e simulador só fazem o lado do aparelho — nunca escrevem delta, accepted, documents nem comandos', () => {
    for (const user of ['traccar-bridge', 'iot-sim']) {
      for (const t of DEVICE_WRITES) expect([user, t, may(user, 'write', t)]).toEqual([user, t, true]);
      for (const t of DEVICE_READS) expect([user, t, may(user, 'read', t)]).toEqual([user, t, true]);
      for (const t of SERVER_ONLY_WRITES) expect([user, t, may(user, 'write', t)]).toEqual([user, t, false]);
      expect(may(user, 'read', 'estacoes/e1/comandos')).toBe(false);
      expect(may(user, 'write', 'estacoes/e1/eventos')).toBe(false);
    }
  });

  it('ACL: a API faz o lado do servidor (shadow, comandos, estações) e lê presença; o observador só lê', () => {
    for (const t of [...SERVER_ONLY_WRITES, 'estacoes/e1/comandos']) expect([t, may('api', 'write', t)]).toEqual([t, true]);
    for (const t of [...DEVICE_WRITES, 'estacoes/e1/eventos']) expect([t, may('api', 'read', t)]).toEqual([t, true]);
    for (const t of [`motos/${T}/telemetria`, `$aws/things/${T}/shadow/update/delta`, `$aws/things/${T}/shadow/update`]) expect(may('observador', 'read', t)).toBe(true);
    for (const t of [...DEVICE_WRITES, ...SERVER_ONLY_WRITES]) expect([t, may('observador', 'write', t)]).toEqual([t, false]);
  });
});

/** Git Bash no Windows (nunca o bash.exe do WSL); `bash` nos demais. null = sem bash: os testes de shell são pulados. */
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
const slash = (p: string) => p.replace(/\\/g, '/');

describe('deploy/single/mosquitto/start.sh (fakes do mosquitto_passwd, chown e mosquitto)', () => {
  function run(env: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), 'volti-mqtt-'));
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    const log = join(dir, 'calls.log');
    const fake = (name: string, body: string) => {
      writeFileSync(join(bin, name), `#!/usr/bin/env bash\n${body}\n`);
      chmodSync(join(bin, name), 0o755);
    };
    // mosquitto_passwd -U: troca a senha por um "hash" falso e registra a chamada.
    fake('mosquitto_passwd', 'echo "mosquitto_passwd $*" >> "$FAKE_LOG"; f="${@: -1}"; sed -i -E "s/^([^:]+):.*/\\1:HASH/" "$f"');
    fake('chown', 'echo "chown $*" >> "$FAKE_LOG"');
    fake('mosquitto', 'echo "mosquitto $*" >> "$FAKE_LOG"');
    const wrapper = 'd="$1"; shift; if command -v cygpath >/dev/null 2>&1; then d="$(cygpath -u "$d")"; fi; export PATH="$d:$PATH"; exec sh "$@"';
    const script = join(REPO, 'deploy', 'single', 'mosquitto', 'start.sh');
    const authDir = join(dir, 'auth');
    const subConf = join(dir, 'home', '.config', 'mosquitto_sub');
    const r = spawnSync(BASH!, ['-c', wrapper, '_', slash(bin), slash(script)], {
      env: { ...process.env, FAKE_LOG: slash(log), MOSQUITTO_AUTH_DIR: slash(authDir), MOSQUITTO_SUB_CONF: slash(subConf), MOSQUITTO_CONF: '/conf/mosquitto.conf', ...env },
      encoding: 'utf8',
    });
    const read = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
    return { r, calls: read(log).trim().split('\n').filter(Boolean), passwd: read(join(authDir, 'passwd')), subConf: read(subConf), tmpLeft: existsSync(join(authDir, 'passwd.tmp')) };
  }
  const pw = { MQTT_API_PASSWORD: 'a'.repeat(64), MQTT_BRIDGE_PASSWORD: 'b'.repeat(64), MQTT_SIM_PASSWORD: 'c'.repeat(64) };

  itBash('gera o passwd com hash (mosquitto_passwd -U), dono mosquitto, opções do observador e sobe o broker com o conf', () => {
    const { r, calls, passwd, subConf, tmpLeft } = run(pw);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(passwd.trim().split('\n')).toEqual(['api:HASH', 'traccar-bridge:HASH', 'iot-sim:HASH', 'observador:HASH']);
    expect(tmpLeft).toBe(false);
    expect(calls[0]).toMatch(/^mosquitto_passwd -U /);
    expect(calls).toContainEqual(expect.stringMatching(/^chown -R mosquitto:mosquitto /));
    expect(calls[calls.length - 1]).toBe('mosquitto -c /conf/mosquitto.conf');
    const m = /^-u observador\n-P ([0-9a-f]{48})\n$/.exec(subConf);
    expect(m).not.toBeNull();
    // Nenhuma senha na saída.
    expect(r.stdout + r.stderr).not.toMatch(/aaaa|bbbb|cccc/);
    expect(r.stdout).not.toContain(m![1]);
  });

  itBash('senha ausente ou com caractere fora de [A-Za-z0-9] recusa subir, sem imprimir o valor', () => {
    const missing = run({ ...pw, MQTT_SIM_PASSWORD: '' });
    expect(missing.r.status).not.toBe(0);
    expect(missing.r.stderr).toContain('MQTT_SIM_PASSWORD ausente');
    expect(missing.calls.some((c) => c.startsWith('mosquitto '))).toBe(false);
    const bad = run({ ...pw, MQTT_BRIDGE_PASSWORD: 'x:y@z' });
    expect(bad.r.status).not.toBe(0);
    expect(bad.r.stderr).toContain('MQTT_BRIDGE_PASSWORD');
    expect(bad.r.stderr).not.toContain('x:y@z');
    expect(bad.passwd).toBe('');
  });
});

describe('docker-compose.yml da raiz (dev no PC)', () => {
  it('Mosquitto só em 127.0.0.1 (segue anônimo no PC, documentado em infra/mosquitto/mosquitto.conf)', () => {
    const local = readFileSync(join(REPO, 'docker-compose.yml'), 'utf8');
    expect(service(local, 'mosquitto')).toContain('ports: ["127.0.0.1:1883:1883"]');
    expect(readFileSync(join(REPO, 'infra', 'mosquitto', 'mosquitto.conf'), 'utf8')).toMatch(/^allow_anonymous true$/m);
  });
});
