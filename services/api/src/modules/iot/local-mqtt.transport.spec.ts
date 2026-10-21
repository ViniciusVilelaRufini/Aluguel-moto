import { EventEmitter } from 'node:events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { LocalShadowStore } from './local-shadow';
import { LocalMqttTransport, type MqttClientLike } from './local-mqtt.transport';
import type { InboundHandler } from './shadow-transport';

class FakeClient extends EventEmitter implements MqttClientLike {
  published: Array<{ topic: string; payload: any }> = [];
  subscribed: string[] = [];
  connected = true;
  publishAsync = jest.fn(async (topic: string, payload: string) => {
    this.published.push({ topic, payload: JSON.parse(payload) });
    return undefined;
  });
  subscribeAsync = jest.fn(async (topics: string[]) => {
    this.subscribed.push(...topics);
    return [];
  });
  endAsync = jest.fn(async () => undefined);
  deliver(topic: string, payload: unknown) {
    this.emit('message', topic, Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)));
  }
}

const flush = () => new Promise((r) => setImmediate(r));

function setup() {
  const client = new FakeClient();
  const inbound: jest.Mocked<InboundHandler> = { telemetry: jest.fn(), deviceEvent: jest.fn(), reported: jest.fn(), presence: jest.fn() } as any;
  const t = new LocalMqttTransport(() => client, new LocalShadowStore(new MemoryRedisStore()));
  return { client, inbound, t };
}

describe('LocalMqttTransport', () => {
  it('assina telemetria, eventos, shadow e presença', async () => {
    const { client, inbound, t } = setup();
    await t.start(inbound);
    expect(client.subscribed).toEqual(['motos/+/telemetria', 'motos/+/eventos', '$aws/things/+/shadow/update', '$aws/things/+/shadow/get', '$aws/events/presence/+/+']);
  });

  it('roteia telemetria, eventos e presença', async () => {
    const { client, inbound, t } = setup();
    await t.start(inbound);
    client.deliver('motos/moto-0001/telemetria', { lat: 1 });
    client.deliver('motos/moto-0001/eventos', { tipo: 'queda' });
    client.deliver('$aws/events/presence/disconnected/moto-0001', { clientId: 'moto-0001' });
    client.deliver('motos/moto-0001/telemetria', 'não é json');
    await flush();
    expect(inbound.telemetry).toHaveBeenCalledTimes(1);
    expect(inbound.telemetry).toHaveBeenCalledWith('moto-0001', { lat: 1 });
    expect(inbound.deviceEvent).toHaveBeenCalledWith('moto-0001', { tipo: 'queda' });
    expect(inbound.presence).toHaveBeenCalledWith('moto-0001', false);
  });

  it('desired → publica accepted/documents/delta nos tópicos do shadow', async () => {
    const { client, inbound, t } = setup();
    await t.start(inbound);
    await t.updateDesired('moto-0001', { limite_kmh: 15 });
    expect(client.published.map((p) => p.topic)).toEqual([
      '$aws/things/moto-0001/shadow/update/accepted',
      '$aws/things/moto-0001/shadow/update/documents',
      '$aws/things/moto-0001/shadow/update/delta',
    ]);
    expect(client.published[2].payload.state).toEqual({ limite_kmh: 15 });
  });

  it('reported do rastreador → accepted/documents e inbound.reported (campos saneados)', async () => {
    const { client, inbound, t } = setup();
    await t.start(inbound);
    client.deliver('$aws/things/moto-0001/shadow/update', { state: { reported: { limite_kmh: 15, velocidade_kmh: 12, lixo: 1 } } });
    await flush();
    await flush();
    expect(inbound.reported).toHaveBeenCalledWith('moto-0001', { limite_kmh: 15, velocidade_kmh: 12 });
    expect(client.published.map((p) => p.topic)).toEqual(['$aws/things/moto-0001/shadow/update/accepted', '$aws/things/moto-0001/shadow/update/documents']);
  });

  it('update inválido → /update/rejected', async () => {
    const { client, inbound, t } = setup();
    await t.start(inbound);
    client.deliver('$aws/things/moto-0001/shadow/update', 'x');
    await flush();
    expect(client.published[0].topic).toBe('$aws/things/moto-0001/shadow/update/rejected');
  });

  it('get → get/accepted com o delta pendente', async () => {
    const { client, inbound, t } = setup();
    await t.start(inbound);
    await t.updateDesired('moto-0001', { travada: true });
    client.published = [];
    client.deliver('$aws/things/moto-0001/shadow/get', {});
    await flush();
    await flush();
    expect(client.published[0].topic).toBe('$aws/things/moto-0001/shadow/get/accepted');
    expect(client.published[0].payload.state.delta).toEqual({ travada: true });
  });

  it('comando momentâneo → motos/{t}/comandos', async () => {
    const { client, inbound, t } = setup();
    await t.start(inbound);
    await t.publishCommand('moto-0001', { comando_id: 'c1', acao: 'buzina' });
    expect(client.published).toEqual([{ topic: 'motos/moto-0001/comandos', payload: { comando_id: 'c1', acao: 'buzina' } }]);
  });
});
