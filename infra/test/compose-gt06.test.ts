import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..');
const compose = readFileSync(join(REPO, 'docker-compose.yml'), 'utf8');
const initSql = readFileSync(join(REPO, 'infra', 'postgres', 'traccar-db.sql'), 'utf8');
const grantsSql = readFileSync(join(REPO, 'infra', 'postgres', 'bridge-grants.sql'), 'utf8');

/** Bloco de um serviço (até o próximo serviço de 2 espaços ou a próxima chave de topo). */
function service(c: string, name: string): string {
  const start = c.indexOf(`\n  ${name}:`);
  if (start < 0) throw new Error(`serviço ${name} ausente`);
  const rest = c.slice(start + 1);
  const next = rest.slice(1).search(/\n( {2}[a-z][a-z0-9-]*:|[a-z]+:)/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

const semver = (v: string) => v.split('.').map(Number);
const gte = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return true;
};

describe('docker-compose.yml: profile gt06 (spec GT06 §7)', () => {
  it('traccar, traccar-bridge, gt06-emulator e bridge-db-grants existem só no profile gt06', () => {
    for (const s of ['traccar', 'traccar-bridge', 'gt06-emulator', 'bridge-db-grants']) expect(service(compose, s)).toContain('profiles: ["gt06"]');
  });

  it('serviços antigos não ganharam profile nem foram quebrados', () => {
    for (const s of ['postgres', 'redis', 'mosquitto', 'api']) expect(service(compose, s)).not.toContain('profiles:');
  });

  it('Traccar: imagem fixada >= 6.7.0 (noQueue), banco traccar separado, só GT06, portas só em localhost, memória limitada', () => {
    const t = service(compose, 'traccar');
    const m = /image: traccar\/traccar:(\d+\.\d+\.\d+)-ubuntu/.exec(t);
    expect(m).not.toBeNull();
    expect(gte(m![1], '6.7.0')).toBe(true);
    expect(t).toContain('DATABASE_URL: jdbc:postgresql://postgres:5432/traccar');
    expect(t).toContain('PROTOCOLS_ENABLE: gt06');
    expect(t).toContain('ports: ["127.0.0.1:5023:5023", "127.0.0.1:8082:8082"]');
    expect(t).toMatch(/-Xmx\d+m/);
    expect(t).toMatch(/mem_limit: \d+m/);
  });

  it('a imagem do compose é a mesma do CDK', () => {
    const cdk = readFileSync(join(REPO, 'infra', 'lib', 'stacks', 'traccar-stack.ts'), 'utf8');
    const tag = /TRACCAR_IMAGE = '(traccar\/traccar:[^']+)'/.exec(cdk)![1];
    expect(service(compose, 'traccar')).toContain(`image: ${tag}`);
  });

  it('o Postgres local cria o banco traccar (papel próprio) e o papel só-leitura da ponte na primeira subida', () => {
    expect(service(compose, 'postgres')).toContain('./infra/postgres/traccar-db.sql:/docker-entrypoint-initdb.d/20-traccar.sql:ro');
    expect(initSql).toMatch(/CREATE ROLE traccar LOGIN/);
    expect(initSql).toMatch(/CREATE DATABASE traccar OWNER traccar;/);
    expect(initSql).toMatch(/CREATE ROLE volti_bridge LOGIN/);
    expect(initSql).toMatch(/REVOKE ALL ON DATABASE traccar FROM PUBLIC/);
  });

  it('o papel da ponte só lê as colunas do registro IMEI -> thing (GRANT por coluna, depois das migrações)', () => {
    expect(grantsSql).toContain('GRANT SELECT ("imei", "thingName", "controlMode") ON "Tracker" TO volti_bridge;');
    expect(grantsSql).not.toMatch(/GRANT (ALL|INSERT|UPDATE|DELETE)/i);
    const g = service(compose, 'bridge-db-grants');
    expect(g).toContain('./infra/postgres/bridge-grants.sql:/bridge-grants.sql:ro');
    expect(g).toContain('restart: "no"');
  });

  it('ponte: Mosquitto local, Traccar pela rede do compose, papel só-leitura, sem AWS nem portas; cria o primeiro usuário do Traccar', () => {
    const b = service(compose, 'traccar-bridge');
    expect(b).toContain('dockerfile: services/traccar-bridge/Dockerfile');
    expect(b).toContain('IOT_MODE: local');
    expect(b).toContain('MQTT_URL: mqtt://mosquitto:1883');
    expect(b).toContain('TRACCAR_URL: http://traccar:8082');
    expect(b).toContain('TRACCAR_BOOTSTRAP_ADMIN: "true"');
    expect(b).toMatch(/DATABASE_URL: postgresql:\/\/volti_bridge:[^@\s]+@postgres:5432\/volti/);
    expect(b).not.toMatch(/DATABASE_URL: postgresql:\/\/volti:/);
    expect(b).toContain('BATTERY_MODEL: ${GT06_BATTERY_MODEL:-72v}');
    expect(b).toMatch(/bridge-db-grants:\s+condition: service_completed_successfully/);
    expect(b).not.toMatch(/AWS_|ports:|healthcheck:/);
  });

  it('emulador: imagem da ponte, aponta para traccar:5023, cenário e bateria por variável', () => {
    const e = service(compose, 'gt06-emulator');
    expect(e).toContain('command: ["node", "dist/gt06/emulator-main.js"]');
    expect(e).toContain('GT06_HOST: traccar');
    expect(e).toContain('GT06_SCENARIO: ${GT06_SCENARIO:-parked}');
    expect(e).toContain('BATTERY_MODEL: ${GT06_BATTERY_MODEL:-72v}');
    expect(e).not.toContain('GT06_POWER_VOLTS');
  });

  it('o compose não semeia shadow com desired travada:false', () => {
    expect(compose).not.toMatch(/travada/i);
  });
});
