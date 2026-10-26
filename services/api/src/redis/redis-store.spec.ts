import { MemoryRedisStore } from './redis-store';

describe('MemoryRedisStore: compare-and-delete', () => {
  it('hdelIf apaga só se o campo vale um dos aceitos (null = ausente)', async () => {
    const r = new MemoryRedisStore();
    await r.hset('h', { origin: 'staff' });
    expect(await r.hdelIf('h', 'origin', ['customer', null])).toBe(false);
    expect(await r.hgetall('h')).toEqual({ origin: 'staff' });
    await r.hset('h', { origin: 'customer' });
    expect(await r.hdelIf('h', 'origin', ['customer', null])).toBe(true);
    expect(await r.hgetall('h')).toEqual({});
    expect(await r.hdelIf('h', 'origin', ['customer', null])).toBe(true); // ausente conta como null
  });

  it('delIfEquals apaga só se o texto ainda é o esperado', async () => {
    const r = new MemoryRedisStore();
    await r.set('k', 'a');
    expect(await r.delIfEquals('k', 'b')).toBe(false);
    expect(await r.get('k')).toBe('a');
    expect(await r.delIfEquals('k', 'a')).toBe(true);
    expect(await r.get('k')).toBeNull();
    expect(await r.delIfEquals('k', 'a')).toBe(false);
  });
});
