import { MemoryRedisStore } from '../../redis/redis-store';
import { LocalShadowStore } from './local-shadow';

describe('LocalShadowStore (emulação do serviço de shadow do IoT Core)', () => {
  const T = 'moto-0001';
  const now = () => 1_760_000_000_000;

  it('desired gera accepted, documents e delta só com o que difere do reported', async () => {
    const s = new LocalShadowStore(new MemoryRedisStore(), now);
    await s.applyReported(T, { travada: true, limite_kmh: 32, modo_roubada: false });
    const out = await s.applyDesired(T, { travada: false, limite_kmh: 32 });
    const topics = out.map((m) => m.topic);
    expect(topics).toEqual([
      '$aws/things/moto-0001/shadow/update/accepted',
      '$aws/things/moto-0001/shadow/update/documents',
      '$aws/things/moto-0001/shadow/update/delta',
    ]);
    const delta = out[2].payload as { state: Record<string, unknown>; version: number };
    expect(delta.state).toEqual({ travada: false });
    expect(delta.version).toBe(2);
  });

  it('desired igual ao reported não gera delta', async () => {
    const s = new LocalShadowStore(new MemoryRedisStore(), now);
    await s.applyReported(T, { limite_kmh: 20 });
    const out = await s.applyDesired(T, { limite_kmh: 20 });
    expect(out.map((m) => m.topic)).not.toContain('$aws/things/moto-0001/shadow/update/delta');
  });

  it('reported que alcança o desired zera o delta; documents traz previous/current', async () => {
    const s = new LocalShadowStore(new MemoryRedisStore(), now);
    await s.applyDesired(T, { limite_kmh: 6 });
    const out = await s.applyReported(T, { limite_kmh: 6, velocidade_kmh: 5 });
    const docs = out.find((m) => m.topic.endsWith('/documents'))!.payload as any;
    expect(docs.previous.state.reported).toEqual({});
    expect(docs.current.state.reported).toEqual({ limite_kmh: 6, velocidade_kmh: 5 });
    expect(s.delta(T)).toEqual({});
  });

  it('get devolve o documento completo com o delta pendente (aplicado ao reconectar)', async () => {
    const s = new LocalShadowStore(new MemoryRedisStore(), now);
    await s.applyReported(T, { travada: true, limite_kmh: 32 });
    await s.applyDesired(T, { limite_kmh: 20, modo_roubada: true });
    const [msg] = await s.get(T);
    expect(msg.topic).toBe('$aws/things/moto-0001/shadow/get/accepted');
    expect((msg.payload as any).state).toEqual({
      desired: { limite_kmh: 20, modo_roubada: true },
      reported: { travada: true, limite_kmh: 32 },
      delta: { limite_kmh: 20, modo_roubada: true },
    });
  });

  it('persiste no Redis e recarrega depois de reiniciar', async () => {
    const redis = new MemoryRedisStore();
    const a = new LocalShadowStore(redis, now);
    await a.applyDesired(T, { travada: true });
    const b = new LocalShadowStore(redis, now);
    expect(await b.load(T)).toEqual(expect.objectContaining({ desired: { travada: true } }));
  });
});
