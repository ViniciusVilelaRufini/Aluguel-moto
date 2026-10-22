import type { StationEvent } from '../../ports/station-gateway.port';
import { assertFifoQueueUrl, AwsStationGateway, MqttStationGateway, StubStationGateway } from './station-gateways';

const SWAP = '5b0e7c1a-1111-4111-8111-111111111111';
const THING = 'station-d0000000-0000-4000-8000-000000000001';
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('StubStationGateway (IOT_MODE=stub)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('open_slot: abre a vaga, recebe a bateria da moto (série esperada) e fecha, em passos curtos', async () => {
    const got: StationEvent[] = [];
    const gw = new StubStationGateway({ stepMs: 100 });
    await gw.start(async (_t, ev) => void got.push(ev));
    await gw.send(THING, { commandId: 'c1', swapId: SWAP, action: 'open_slot', expectedSerial: 'BAT-00001' });
    expect(got).toHaveLength(0);
    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(100);
      await flush();
    }
    expect(got.map((e) => e.type)).toEqual(['slot_opened', 'battery_returned', 'slot_closed']);
    expect(got[0].slotNumber).toBeGreaterThan(0);
    expect(got[1]).toEqual(expect.objectContaining({ serial: 'BAT-00001', swapId: SWAP }));
    expect(got[1].pct).toBeLessThan(50);
  });

  it('release_battery: libera a sugerida (ou gera uma série)', async () => {
    const got: StationEvent[] = [];
    const gw = new StubStationGateway({ stepMs: 50 });
    await gw.start(async (_t, ev) => void got.push(ev));
    await gw.send(THING, { commandId: 'c2', swapId: SWAP, action: 'release_battery', serialHint: 'BT-S1001' });
    await gw.send(THING, { commandId: 'c3', swapId: SWAP, action: 'release_battery' });
    jest.advanceTimersByTime(50);
    await flush();
    expect(got.map((e) => [e.type, e.serial])).toEqual([['battery_released', 'BT-S1001'], ['battery_released', expect.stringMatching(/^BT-STUB-/)]]);
  });

  it('fix 1 (I2): abort_swap fecha a vaga e confirma com slot_closed (nunca libera bateria)', async () => {
    const got: StationEvent[] = [];
    const gw = new StubStationGateway({ stepMs: 50 });
    await gw.start(async (_t, ev) => void got.push(ev));
    await gw.send(THING, { commandId: 'c9', swapId: SWAP, action: 'abort_swap', slotNumber: 2 });
    jest.advanceTimersByTime(50);
    await flush();
    expect(got.map((e) => e.type)).toEqual(['slot_closed']);
  });

  it('modo manual (auto desligado) não avança: e2e de timeout', async () => {
    const got: StationEvent[] = [];
    const gw = new StubStationGateway({ stepMs: 10 });
    gw.setAuto(false);
    await gw.start(async (_t, ev) => void got.push(ev));
    await gw.send(THING, { commandId: 'c1', swapId: SWAP, action: 'open_slot' });
    jest.advanceTimersByTime(1000);
    await flush();
    expect(got).toEqual([]);
    expect(gw.sent).toEqual([{ thing: THING, command: expect.objectContaining({ action: 'open_slot' }) }]);
    // Emissão manual de um evento (testes).
    await gw.emit(THING, { type: 'slot_opened', swapId: SWAP, slotNumber: 2, ts: new Date().toISOString() });
    expect(got).toHaveLength(1);
  });
});

describe('AwsStationGateway (IOT_MODE=aws) — fix 1, I4', () => {
  it('recusa fila sem .fifo (a ordem dos eventos de cada estação depende do MessageGroupId)', async () => {
    const queue = { subscribe: jest.fn(), publish: jest.fn() };
    expect(() => assertFifoQueueUrl(undefined)).toThrow(/SQS_QUEUE_ESTACOES_URL/);
    expect(() => assertFifoQueueUrl('https://sqs.sa-east-1.amazonaws.com/1/volti-estacoes')).toThrow(/\.fifo/);
    expect(() => assertFifoQueueUrl('https://sqs.sa-east-1.amazonaws.com/1/volti-estacoes.fifo')).not.toThrow();
    const gw = new AwsStationGateway({ send: jest.fn() }, queue as any, 'https://sqs.sa-east-1.amazonaws.com/1/volti-estacoes');
    await expect(gw.start(async () => undefined)).rejects.toThrow(/\.fifo/);
    expect(queue.subscribe).not.toHaveBeenCalled();
    const ok = new AwsStationGateway({ send: jest.fn() }, queue as any, 'https://sqs.sa-east-1.amazonaws.com/1/volti-estacoes.fifo');
    await ok.start(async () => undefined);
    expect(queue.subscribe).toHaveBeenCalledWith('estacoes', expect.any(Function));
  });
});

describe('MqttStationGateway (IOT_MODE=local)', () => {
  function fakeClient() {
    const handlers: Record<string, (...a: any[]) => void> = {};
    return {
      connected: true,
      handlers,
      published: [] as Array<[string, string]>,
      subscribed: [] as string[][],
      on(ev: string, cb: (...a: any[]) => void) {
        handlers[ev] = cb;
        return this;
      },
      async publishAsync(topic: string, payload: string) {
        this.published.push([topic, payload]);
      },
      async subscribeAsync(topics: string[]) {
        this.subscribed.push(topics);
      },
      async endAsync() {
        return undefined;
      },
    };
  }

  it('publica comandos em estacoes/{thing}/comandos e entrega só eventos válidos', async () => {
    const client = fakeClient();
    const gw = new MqttStationGateway(() => client);
    const got: Array<[string, StationEvent]> = [];
    await gw.start(async (t, ev) => void got.push([t, ev]));
    expect(client.subscribed).toEqual([['estacoes/+/eventos']]);
    await gw.send(THING, { commandId: 'c1', swapId: SWAP, action: 'open_slot', expectedSerial: 'BAT-1' });
    expect(client.published[0][0]).toBe(`estacoes/${THING}/comandos`);
    expect(JSON.parse(client.published[0][1])).toEqual(expect.objectContaining({ commandId: 'c1', swapId: SWAP, action: 'open_slot', expectedSerial: 'BAT-1' }));

    const ts = new Date().toISOString();
    client.handlers.message(`estacoes/${THING}/eventos`, Buffer.from(JSON.stringify({ type: 'slot_opened', swapId: SWAP, slotNumber: 4, ts })));
    client.handlers.message(`estacoes/${THING}/eventos`, Buffer.from('{lixo'));
    client.handlers.message(`estacoes/${THING}/eventos`, Buffer.from(JSON.stringify({ type: 'slot_opened', swapId: SWAP, ts })));
    client.handlers.message(`motos/moto-1/eventos`, Buffer.from(JSON.stringify({ type: 'slot_opened', swapId: SWAP, slotNumber: 4, ts })));
    await flush();
    expect(got).toEqual([[THING, { type: 'slot_opened', swapId: SWAP, slotNumber: 4, ts }]]);
  });
});
