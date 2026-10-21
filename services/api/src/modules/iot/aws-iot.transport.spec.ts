import { GetThingShadowCommand, PublishCommand, UpdateThingShadowCommand } from '@aws-sdk/client-iot-data-plane';
import { AwsIotTransport } from './aws-iot.transport';
import type { InboundHandler } from './shadow-transport';

function setup(shadow: unknown = { state: { reported: { travada: true, limite_kmh: 8 } }, version: 3 }) {
  const sent: any[] = [];
  const client = {
    send: jest.fn(async (cmd: any) => {
      sent.push(cmd);
      if (cmd instanceof GetThingShadowCommand) return { payload: new TextEncoder().encode(JSON.stringify(shadow)) };
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

  it('fila telemetria: mensagens da regra IoT (com thingName) → telemetria ou evento', async () => {
    const { t, inbound, deliver, queue } = setup();
    await t.start(inbound);
    expect(queue.subscribe).toHaveBeenCalledWith('telemetria', expect.any(Function));
    await deliver({ lat: -23.5, lng: -46.6, thingName: 'moto-0001', ingestedAt: 1 });
    await deliver({ tipo: 'queda', timestamp: '2026-10-21T15:00:00Z', thingName: 'moto-0002' });
    await deliver({ lat: 1 }); // sem thingName → descartada
    expect(inbound.telemetry).toHaveBeenCalledWith('moto-0001', { lat: -23.5, lng: -46.6 });
    expect(inbound.deviceEvent).toHaveBeenCalledWith('moto-0002', { tipo: 'queda', timestamp: '2026-10-21T15:00:00Z' });
    expect(inbound.telemetry).toHaveBeenCalledTimes(1);
  });

  it('enquanto houver comando aguardando, consulta o shadow e repassa o reported (só versão nova)', async () => {
    const { t, inbound, sent } = setup();
    await t.start(inbound);
    t.watch('moto-0001', true);
    await t.pollOnce();
    await t.pollOnce();
    expect(sent.filter((c) => c instanceof GetThingShadowCommand)).toHaveLength(2);
    expect(inbound.reported).toHaveBeenCalledTimes(1);
    expect(inbound.reported).toHaveBeenCalledWith('moto-0001', { travada: true, limite_kmh: 8 });
    t.watch('moto-0001', false);
    await t.pollOnce();
    expect(sent.filter((c) => c instanceof GetThingShadowCommand)).toHaveLength(2);
  });
});
