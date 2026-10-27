import { MemoryRedisStore } from '../../redis/redis-store';
import { MemoryRelayLockStore, RedisRelayLockStore, type RelayLockState, type RelayLockStore } from './relay-lock.store';

const state = (over: Partial<RelayLockState> = {}): RelayLockState => ({ id: 'l1', thingName: 'moto-0901', commandIds: ['c1'], phase: 'waiting_stop', ...over });

describe.each<[string, () => RelayLockStore]>([
  ['memória', () => new MemoryRelayLockStore()],
  ['Redis', () => new RedisRelayLockStore(new MemoryRedisStore())],
])('RelayLockStore (%s)', (_name, make) => {
  it('put/get devolve uma cópia; remove só a trava com o mesmo id', async () => {
    const s = make();
    const st = state();
    await s.put(st);
    st.commandIds.push('mutado-depois');
    expect(await s.get('moto-0901')).toEqual(state());
    await s.remove('moto-0901', 'outra');
    expect(await s.get('moto-0901')).not.toBeNull();
    await s.remove('moto-0901', 'l1');
    expect(await s.get('moto-0901')).toBeNull();
    expect((await s.scan()).active).toEqual([]);
  });

  it('scan lista as travas ativas', async () => {
    const s = make();
    await s.put(state());
    await s.put(state({ id: 'l2', thingName: 'moto-0902' }));
    expect((await s.scan()).active.sort()).toEqual(['moto-0901', 'moto-0902']);
  });

  it('withLock serializa por moto', async () => {
    const s = make();
    const order: string[] = [];
    await Promise.all([
      s.withLock('moto-0901', async () => { order.push('a1'); await new Promise((r) => setTimeout(r, 5)); order.push('a2'); }),
      s.withLock('moto-0901', async () => { order.push('b1'); }),
    ]);
    expect(order).toEqual(['a1', 'a2', 'b1']);
  });
});

describe('RedisRelayLockStore órfãs', () => {
  it('estado sumiu e o índice ficou → órfã com fase e comandos; clearOrphan tira do índice', async () => {
    const redis = new MemoryRedisStore();
    const s = new RedisRelayLockStore(redis);
    await s.put(state({ phase: 'cutting', commandIds: ['c1', 'c2'] }));
    await redis.del('iot:relay-lock:moto-0901');
    expect(await s.scan()).toEqual({ active: [], orphans: [{ thingName: 'moto-0901', lockId: 'l1', phase: 'cutting', commandIds: ['c1', 'c2'] }] });
    await s.clearOrphan('moto-0901', 'l1');
    expect(await s.scan()).toEqual({ active: [], orphans: [] });
  });

  it('isOrphan: só com o índice igual ao lockId e sem estado', async () => {
    const redis = new MemoryRedisStore();
    const s = new RedisRelayLockStore(redis);
    await s.put(state());
    expect(await s.isOrphan('moto-0901', 'l1')).toBe(false); // há estado
    await redis.del('iot:relay-lock:moto-0901');
    expect(await s.isOrphan('moto-0901', 'outra')).toBe(false);
    expect(await s.isOrphan('moto-0901', 'l1')).toBe(true);
    await s.clearOrphan('moto-0901', 'l1');
    expect(await s.isOrphan('moto-0901', 'l1')).toBe(false);
  });
});
