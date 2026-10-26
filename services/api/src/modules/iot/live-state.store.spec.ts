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
