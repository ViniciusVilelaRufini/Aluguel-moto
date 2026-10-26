import { GetThingShadowCommand, PublishCommand, UpdateThingShadowCommand } from '@aws-sdk/client-iot-data-plane';
import { AwsIotTransport } from './aws-iot.transport';
import type { InboundHandler } from './shadow-transport';

const shadowDoc = { state: { reported: { travada: true, limite_kmh: 8 } }, metadata: { reported: { travada: { timestamp: 1_760_000_000 }, limite_kmh: { timestamp: 1_760_000_000 } } }, version: 3 };

function setup(shadow: any = shadowDoc) {
  const sent: any[] = [];
  const client = {
    send: jest.fn(async (cmd: any) => {
      sent.push(cmd);
      if (cmd instanceof GetThingShadowCommand) return { payload: new TextEncoder().encode(JSON.stringify(shadow)) };
      if (cmd instanceof UpdateThingShadowCommand) shadow.version += 1; // o nosso desired também muda a versão
      return {};
    }),
  };
  let handler: ((m: any) => Promise<void>) | undefined;
  const queue = { publish: jest.fn(), subscribe: jest.fn((_q: string, h: any) => (handler = h)) };
  const inbound: jest.Mocked<InboundHandler> = { telemetry: jest.fn(), deviceEvent: jest.fn(), reported: jest.fn(), presence: jest.fn() } as any;
  const t = new AwsIotTransport(client as any, queue as any, { pollMs: 0 });
  return { t, sent, queue, inbound, deliver: (m: unknown) => handler!(m) };
}

describe('AwsIotTransport', () => {
  it('desired → UpdateThingShadow { state: { desired } }', async () => {
    const { t, sent } = setup();
    await t.updateDesired('moto-0001', { limite_kmh: 15 });
    expect(sent[0]).toBeInstanceOf(UpdateThingShadowCommand);
    expect(sent[0].input.thingName).toBe('moto-0001');
    expect(JSON.parse(new TextDecoder().decode(sent[0].input.payload))).toEqual({ state: { desired: { limite_kmh: 15 } } });
  });

  it('comando momentâneo → Publish em motos/{t}/comandos (QoS 1)', async () => {
    const { t, sent } = setup();
    await t.publishCommand('moto-0001', { comando_id: 'c1', acao: 'buzina' });
    expect(sent[0]).toBeInstanceOf(PublishCommand);
    expect(sent[0].input.topic).toBe('motos/moto-0001/comandos');
    expect(sent[0].input.qos).toBe(1);
  });

  it('fila telemetria: mensagem da regra IoT { thingName, payload } → telemetria ou evento (canal do tópico)', async () => {
    const { t, inbound, deliver, queue } = setup();
    await t.start(inbound);
    expect(queue.subscribe).toHaveBeenCalledWith('telemetria', expect.any(Function));
    await deliver({ thingName: 'moto-0001', ingestedAt: 1, channel: 'telemetria', payload: { lat: -23.5, lng: -46.6 } });
    await deliver({ thingName: 'moto-0002', ingestedAt: 2, channel: 'eventos', payload: { tipo: 'violacao', timestamp: '2026-10-21T15:00:00Z' } });
    await deliver({ payload: { lat: 1 } }); // sem thingName → descartada
    expect(inbound.telemetry).toHaveBeenCalledWith('moto-0001', { lat: -23.5, lng: -46.6 });
    expect(inbound.deviceEvent).toHaveBeenCalledWith('moto-0002', { tipo: 'violacao', timestamp: '2026-10-21T15:00:00Z' });
    expect(inbound.telemetry).toHaveBeenCalledTimes(1);
  });

  it('identidade vem só do tópico: thingName dentro do payload não vale', async () => {
    const { t, inbound, deliver } = setup();
    await t.start(inbound);
    await deliver({ thingName: 'moto-0001', channel: 'telemetria', payload: { thingName: 'moto-9999', lat: -23.5, lng: -46.6 } });
    expect(inbound.telemetry.mock.calls[0][0]).toBe('moto-0001');
  });

  it('mensagem sem payload objeto é descartada (corpo nunca é lido do topo)', async () => {
    const { t, inbound, deliver } = setup();
    await t.start(inbound);
    await deliver({ thingName: 'moto-0001', lat: 1, lng: 2 });
    await deliver({ thingName: 'moto-0001', payload: 'x' });
    await deliver({ thingName: 'moto-0001', payload: [1] });
    await deliver({ thingName: 'moto-0001', payload: null });
    expect(inbound.telemetry).not.toHaveBeenCalled();
    expect(inbound.deviceEvent).not.toHaveBeenCalled();
  });

  it('enquanto houver comando aguardando, consulta o shadow e repassa só campos com metadata mais nova (fromPoll, nunca sinal de vida)', async () => {
    const shadow = JSON.parse(JSON.stringify(shadowDoc));
    const { t, inbound, sent } = setup(shadow);
    await t.start(inbound);
    t.watch('moto-0001', true);
    await t.pollOnce();
    await t.updateDesired('moto-0001', { limite_kmh: 3 }); // versão muda, reported do rastreador não
    await t.pollOnce();
    expect(sent.filter((c) => c instanceof GetThingShadowCommand)).toHaveLength(2);
    expect(inbound.reported).toHaveBeenCalledTimes(1);
    expect(inbound.reported).toHaveBeenCalledWith('moto-0001', { travada: true, limite_kmh: 8 }, { fromPoll: true, timestamps: { travada: 1_760_000_000_000, limite_kmh: 1_760_000_000_000 } });
    // o rastreador reporta só o limite: só ele é repassado
    shadow.state.reported.limite_kmh = 3;
    shadow.metadata.reported.limite_kmh.timestamp = 1_760_000_005;
    shadow.version += 1;
    await t.pollOnce();
    expect(inbound.reported).toHaveBeenLastCalledWith('moto-0001', { limite_kmh: 3 }, { fromPoll: true, timestamps: { limite_kmh: 1_760_000_005_000 } });
    t.watch('moto-0001', false);
    await t.pollOnce();
    expect(sent.filter((c) => c instanceof GetThingShadowCommand)).toHaveLength(3);
  });
});
