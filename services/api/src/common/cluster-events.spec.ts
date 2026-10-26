import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemoryRedisStore } from '../redis/redis-store';
import { CLUSTER_EVENTS_CHANNEL, ClusterEventsBridge } from './cluster-events';
import { EV } from './events';

const tick = () => new Promise((r) => setTimeout(r, 5));

function setup() {
  const redis = new MemoryRedisStore();
  const published: string[] = [];
  const origPublish = redis.publish.bind(redis);
  redis.publish = async (c, m) => {
    published.push(m);
    return origPublish(c, m);
  };
  const a = new EventEmitter2();
  const b = new EventEmitter2();
  new ClusterEventsBridge(a, redis).onModuleInit();
  new ClusterEventsBridge(b, redis).onModuleInit();
  return { redis, published, a, b };
}

describe('ClusterEventsBridge', () => {
  it('replica o evento para a outra instância uma única vez, sem eco nem laço', async () => {
    const { a, b, published } = setup();
    const onA = jest.fn();
    const onB = jest.fn();
    a.on(EV.PRINCIPAL_REVOKED, onA);
    b.on(EV.PRINCIPAL_REVOKED, onB);
    a.emit(EV.PRINCIPAL_REVOKED, { pool: 'staff', userId: 'u1' });
    await tick();
    expect(onB).toHaveBeenCalledTimes(1);
    expect(onB).toHaveBeenCalledWith({ pool: 'staff', userId: 'u1' });
    expect(onA).toHaveBeenCalledTimes(1);
    expect(published).toHaveLength(1);
  });

  it('não replica eventos fora da lista', async () => {
    const { a, b, published } = setup();
    const onB = jest.fn();
    b.on('outro.evento', onB);
    a.emit('outro.evento', { x: 1 });
    await tick();
    expect(onB).not.toHaveBeenCalled();
    expect(published).toHaveLength(0);
  });

  it('descarta mensagem malformada sem lançar', async () => {
    const { redis, b } = setup();
    const onB = jest.fn();
    b.on(EV.ZONE_CHANGED, onB);
    await expect(redis.publish(CLUSTER_EVENTS_CHANNEL, '{nao-json')).resolves.toBeUndefined();
    await expect(redis.publish(CLUSTER_EVENTS_CHANNEL, JSON.stringify({ origin: 'x', event: 'zone.changed' }))).resolves.toBeUndefined();
    await tick();
    expect(onB).not.toHaveBeenCalled();
  });
});
