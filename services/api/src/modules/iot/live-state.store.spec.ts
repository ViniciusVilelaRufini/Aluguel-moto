import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { LiveStateStore } from './live-state.store';
import type { DesiredState, IotTransport, MomentaryCommand } from './shadow-transport';

class FakeTransport implements IotTransport {
  readonly desired: DesiredState[] = [];
  async updateDesired(_thingName: string, desired: DesiredState) {
    this.desired.push(desired);
  }
  async publishCommand(_thingName: string, _command: MomentaryCommand) {}
  async start() {}
  async stop() {}
}

class TestGateway extends BaseIotGateway {}

const T = 'moto-0001';

describe('LiveStateStore — hold em 0 km/h compartilhado entre tasks (auditoria, item 2)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('(d) A leu "não segurado"; B segura; setSpeedLimit(20) servido por A → failed e nada publicado', async () => {
    const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
    const redis = new MemoryRedisStore();
    const a = new LiveStateStore(redis, clock);
    const b = new LiveStateStore(redis, clock);
    expect(await a.isHeld(T)).toBe(false);
    await b.setHeld(T, true);
    expect(await redis.get(`iot:held:${T}`)).toBe('1');
    expect(await a.isHeld(T)).toBe(true);

    const transport = new FakeTransport();
    const gw = new TestGateway(transport, a, clock, new EventEmitter2(), { confirmWaitMs: 1_000, commandTimeoutMs: 30_000 });
    expect((await gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 20)).status).toBe('failed');
    expect(transport.desired).toEqual([]);
  });

  it('unlock em B solta o hold também para A', async () => {
    const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
    const redis = new MemoryRedisStore();
    const a = new LiveStateStore(redis, clock);
    const b = new LiveStateStore(redis, clock);
    await a.setHeld(T, true);
    expect(await b.isHeld(T)).toBe(true);
    await b.setHeld(T, false);
    expect(await a.isHeld(T)).toBe(false);
  });

  it('(e) erro ao ler o Redis → isHeld = true (falha fechada) e log held_read_failed', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
    const redis = new MemoryRedisStore();
    redis.get = async () => {
      throw new Error('redis fora');
    };
    const live = new LiveStateStore(redis, clock);
    expect(await live.isHeld(T)).toBe(true);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ msg: 'held_read_failed', thingName: T }));
  });

  it('segurar com a escrita no Redis falhando continua segurado neste processo (falha fechada)', async () => {
    const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
    const redis = new MemoryRedisStore();
    const realSet = redis.set.bind(redis);
    redis.set = async () => {
      throw new Error('redis fora');
    };
    const live = new LiveStateStore(redis, clock);
    await expect(live.setHeld(T, true)).rejects.toThrow('redis fora');
    expect(await live.isHeld(T)).toBe(true);
    redis.set = realSet;
    await live.setHeld(T, false);
    expect(await live.isHeld(T)).toBe(false);
  });
});

describe('LiveStateStore.lockConfirmed — origem da trava (Task 4 fix 2, B)', () => {
  const tele = (clock: FakeClock, travada: boolean, ts = clock.now()) => ({
    lat: -23.5, lng: -46.6, velocidade_kmh: 0, bateria_pct: 80, travada, ignicao: false, sinal: 4, timestamp: new Date(ts).toISOString(),
  });
  const setup = () => {
    const clock = new FakeClock(Date.parse('2026-10-27T12:00:00Z'));
    const redis = new MemoryRedisStore();
    return { clock, redis, live: new LiveStateStore(redis, clock) };
  };

  it('só presença (estado em branco locked:true) → não confirmada', async () => {
    const { live } = setup();
    live.markReconnected(T);
    const s = await live.setOnline(T, true);
    expect(s.locked).toBe(true);
    expect(live.lockConfirmed(T)).toBe(false);
  });

  it('telemetria travada:true depois da reconexão → confirmada; travada:false → não', async () => {
    const { clock, live } = setup();
    live.markReconnected(T);
    await live.applyTelemetry(T, tele(clock, true));
    expect(live.lockConfirmed(T)).toBe(true);
    await clock.advance(5_000);
    await live.applyTelemetry(T, tele(clock, false));
    expect(live.lockConfirmed(T)).toBe(false);
  });

  it('reported MQTT travada:true → confirmada; anterior à reconexão deixa de valer', async () => {
    const { clock, live } = setup();
    await live.applyReported(T, { travada: true });
    expect(live.lockConfirmed(T)).toBe(true);
    await clock.advance(1_000);
    live.markReconnected(T);
    await live.setOnline(T, true);
    expect(live.lockConfirmed(T)).toBe(false);
  });

  it('telemetria da fila offline (timestamp antes da reconexão) não confirma', async () => {
    const { clock, live } = setup();
    await clock.advance(60_000);
    live.markReconnected(T);
    await live.applyTelemetry(T, tele(clock, true, clock.now() - 30_000));
    expect(live.lockConfirmed(T)).toBe(false);
  });

  it('reported do polling sem horário da travada não confirma; com horário depois da reconexão, confirma', async () => {
    const { clock, live } = setup();
    live.markReconnected(T);
    await live.setOnline(T, true);
    await clock.advance(1_000);
    await live.applyReported(T, { travada: true }, { fromPoll: true });
    expect(live.lockConfirmed(T)).toBe(false);
    await live.applyReported(T, { travada: true }, { fromPoll: true, travadaAt: clock.now() });
    expect(live.lockConfirmed(T)).toBe(true);
  });

  it('offline → não confirmada', async () => {
    const { live } = setup();
    await live.applyReported(T, { travada: true });
    await live.setOnline(T, false);
    expect(live.lockConfirmed(T)).toBe(false);
  });

  it('a origem vai pelo Redis para outra instância', async () => {
    const { clock, redis, live } = setup();
    await live.applyReported(T, { travada: true });
    const other = new LiveStateStore(redis, clock);
    await other.load(T);
    expect(other.lockConfirmed(T)).toBe(true);
    // Origem desconhecida gravada (polling sem horário) também apaga a de antes na outra instância.
    await clock.advance(1_000);
    await live.applyReported(T, { travada: true }, { fromPoll: true });
    await other.load(T);
    expect(other.lockConfirmed(T)).toBe(false);
  });
});
