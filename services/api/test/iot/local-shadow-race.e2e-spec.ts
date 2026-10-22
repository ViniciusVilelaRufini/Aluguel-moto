import { MemoryRedisStore } from '../../src/redis/redis-store';
import { LocalShadowStore } from '../../src/modules/iot/local-shadow';

/**
 * QA-23. Causa do "desired pendente não entregue na reconexão" intermitente: `LocalShadowStore`
 * faz leitura-modificação-gravação sem serializar por thing, e o `load` a frio não deduplica a leitura do Redis.
 * Duas operações concorrentes sobre uma thing ainda não carregada (ex.: `POST /commands` gravando o desired enquanto o
 * rastreador reconectado publica `reported`; no MQTT cada mensagem vira um `route()` sem fila) carregam o mesmo
 * documento antigo; a segunda a retomar sobrescreve o cache e o Redis com um documento construído do estado velho e o
 * desired some. O `get` seguinte não traz `delta`, então a moto nunca recebe o limite pendente e o comando fica `pending`.
 *
 * Correção (QA-23): load a frio deduplicado (a Promise fica no cache) e applyDesired/applyReported/get serializados por thing.
 */
class SlowRedis extends MemoryRedisStore {
  override async get(key: string): Promise<string | null> {
    const v = await super.get(key);
    await new Promise((r) => setTimeout(r, 15));
    return v;
  }
}

describe('QA-23 LocalShadowStore: operações concorrentes numa thing fria', () => {
  it('não perde o desired quando um reported chega durante o primeiro load', async () => {
    const store = new LocalShadowStore(new SlowRedis());
    const T = 'moto-0059';
    await Promise.all([store.applyDesired(T, { limite_kmh: 20 }), store.applyReported(T, { travada: true, limite_kmh: 32 })]);
    const [msg] = await store.get(T);
    const state = (msg.payload as { state: { desired: Record<string, unknown>; delta?: Record<string, unknown> } }).state;
    expect(state.desired.limite_kmh).toBe(20);
    expect(state.delta).toEqual({ limite_kmh: 20 });
  });
});

describe('QA-23 LocalShadowStore: muitas operações concorrentes', () => {
  it('aplica todas na ordem de chegada, sem perder campos nem repetir versão', async () => {
    const store = new LocalShadowStore(new SlowRedis());
    const T = 'moto-0058';
    const ops = [
      store.applyReported(T, { travada: false, limite_kmh: 32 }),
      store.applyDesired(T, { limite_kmh: 6 }),
      store.applyReported(T, { modo_roubada: false }),
      store.applyDesired(T, { modo_roubada: true }),
    ];
    const outs = await Promise.all(ops);
    const versions = outs.map((o) => (o[0].payload as { version: number }).version);
    expect(versions).toEqual([1, 2, 3, 4]);
    const doc = await store.load(T);
    expect(doc.desired).toEqual({ limite_kmh: 6, modo_roubada: true });
    expect(doc.reported).toEqual({ travada: false, limite_kmh: 32, modo_roubada: false });
  });
});
