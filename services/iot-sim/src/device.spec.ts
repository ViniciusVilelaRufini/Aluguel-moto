import { readFileSync, readdirSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { join, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { SimDevice, type SimMqttClient } from './device';
import { VirtualMoto } from './model';
import { ROUTES } from './routes';

const SCHEMAS = resolve(__dirname, '../../../packages/contracts/schemas');
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const f of readdirSync(SCHEMAS)) ajv.addSchema(JSON.parse(readFileSync(join(SCHEMAS, f), 'utf8')), f);
function valid(schema: string, data: unknown) {
  const ok = ajv.validate(schema, data);
  if (!ok) throw new Error(`${schema}: ${ajv.errorsText()} — ${JSON.stringify(data)}`);
  return true;
}

class FakeClient extends EventEmitter implements SimMqttClient {
  published: Array<{ topic: string; payload: any }> = [];
  subscribed: string[] = [];
  connected = true;
  publish(topic: string, payload: string) {
    this.published.push({ topic, payload: JSON.parse(payload) });
    return this;
  }
  subscribe(topics: string | string[]) {
    this.subscribed.push(...(Array.isArray(topics) ? topics : [topics]));
    return this;
  }
  endCalls: Array<boolean | undefined> = [];
  end(force?: boolean) {
    this.endCalls.push(force);
    return this;
  }
  deliver(topic: string, payload: unknown) {
    this.emit('message', topic, Buffer.from(JSON.stringify(payload)));
  }
  reported() {
    return this.published.filter((p) => p.topic.endsWith('/shadow/update')).map((p) => p.payload.state.reported);
  }
  take() {
    const p = this.published;
    this.published = [];
    return p;
  }
}

const T = 'moto-0001';
const NOW = new Date('2026-10-21T15:00:00Z');

function setup(opts: { riding?: boolean; locked?: boolean } = {}) {
  const moto = new VirtualMoto({ thingName: T, route: ROUTES[0], cruiseKmh: 25, riding: opts.riding ?? true, locked: opts.locked ?? false });
  const client = new FakeClient();
  let now = NOW.getTime();
  const dev = new SimDevice(moto, client, { telemetryRidingMs: 5_000, telemetryParkedMs: 60_000, now: () => new Date(now) });
  dev.start();
  client.emit('connect');
  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) {
      now += 1000;
      dev.tick(1);
    }
  };
  return { moto, client, dev, tick };
}

describe('SimDevice (rastreador simulado via MQTT)', () => {
  it('na conexão: assina delta/get/comandos, anuncia presença, reporta o shadow, pede o documento e publica telemetria (contrato)', () => {
    const { client } = setup();
    expect(client.subscribed).toEqual(['$aws/things/moto-0001/shadow/update/delta', '$aws/things/moto-0001/shadow/get/accepted', 'motos/moto-0001/comandos']);
    const topics = client.published.map((p) => p.topic);
    expect(topics).toEqual(['$aws/events/presence/connected/moto-0001', '$aws/things/moto-0001/shadow/update', '$aws/things/moto-0001/shadow/get', 'motos/moto-0001/telemetria']);
    valid('shadow-update.schema.json', client.published[1].payload);
    valid('telemetria.schema.json', client.published[3].payload);
  });

  it('telemetria a cada 5 s andando e 60 s parada', () => {
    const a = setup();
    a.client.take();
    a.tick(15);
    expect(a.client.published.filter((p) => p.topic.endsWith('/telemetria'))).toHaveLength(3);
    const b = setup({ riding: false, locked: true });
    b.client.take();
    b.tick(119);
    expect(b.client.published.filter((p) => p.topic.endsWith('/telemetria'))).toHaveLength(1);
  });

  it('delta de limite → aplica e reporta limite e velocidade (contrato)', () => {
    const { client, tick } = setup();
    tick(20);
    client.take();
    client.deliver('$aws/things/moto-0001/shadow/update/delta', { state: { limite_kmh: 15 }, version: 2 });
    const [r] = client.reported();
    expect(r).toEqual({ limite_kmh: 15, velocidade_kmh: 25 });
    for (const p of client.published) valid('shadow-update.schema.json', p.payload);
  });

  it('obedece ao shadow no bloqueio: travada com a moto andando fica pendente; trava e reporta só abaixo de 3 km/h', () => {
    const { client, tick, moto } = setup();
    tick(20);
    client.take();
    client.deliver('$aws/things/moto-0001/shadow/update/delta', { state: { travada: true }, version: 3 });
    expect(client.reported().filter((r) => r.travada === true)).toEqual([]);
    client.deliver('$aws/things/moto-0001/shadow/update/delta', { state: { limite_kmh: 0 }, version: 4 });
    const lockReports: number[] = [];
    for (let i = 0; i < 15; i++) {
      tick(1);
      for (const r of client.reported()) if (r.travada === true) lockReports.push(r.velocidade_kmh);
      for (const p of client.published) {
        if (p.topic.endsWith('/telemetria') && p.payload.travada) expect(p.payload.velocidade_kmh).toBeLessThan(3);
      }
      client.take();
    }
    expect(lockReports).toHaveLength(1);
    expect(lockReports[0]).toBeLessThan(3);
    expect(moto.state.locked).toBe(true);
  });

  it('desacelerando, reporta a velocidade a cada segundo (alimenta a rampa do servidor)', () => {
    const { client, tick } = setup();
    tick(20);
    client.deliver('$aws/things/moto-0001/shadow/update/delta', { state: { limite_kmh: 8 }, version: 2 });
    client.take();
    tick(3);
    expect(client.reported().map((r) => r.velocidade_kmh)).toEqual([21, 17, 13]);
  });

  it('get/accepted com delta pendente (reconexão) aplica o desired', () => {
    const { client, moto } = setup({ riding: false, locked: true });
    client.deliver('$aws/things/moto-0001/shadow/get/accepted', { state: { desired: { travada: false, limite_kmh: 20 }, reported: {}, delta: { travada: false, limite_kmh: 20 } }, version: 7 });
    expect(moto.state.locked).toBe(false);
    expect(moto.state.limitKmh).toBe(20);
  });

  it('injeção de evento publica em motos/{t}/eventos (contrato)', () => {
    const { client, dev } = setup();
    client.take();
    dev.injectEvent('queda');
    expect(client.published[0].topic).toBe('motos/moto-0001/eventos');
    valid('eventos.schema.json', client.published[0].payload);
  });

  it('buzina em motos/{t}/comandos não altera o estado', () => {
    const { client, moto } = setup();
    const before = { ...moto.state };
    client.deliver('motos/moto-0001/comandos', { comando_id: '6f1d1c2e-1d7b-4c55-9a3a-0b8f1f3f2a10', acao: 'buzina' });
    expect(moto.state).toEqual(before);
  });

  it('stop() desconecta limpo (DISCONNECT, sem force): o broker descarta o will e não marca a moto offline', () => {
    const { client, dev } = setup();
    client.take();
    dev.stop();
    expect(client.endCalls).toEqual([false]);
    // Nada mais é publicado por ela (nem presença): a moto agora é de outra fonte (ponte GT06).
    client.deliver('$aws/things/moto-0001/shadow/update/delta', { state: { travada: true } });
    dev.tick(1);
    expect(client.take()).toEqual([]);
  });
});
