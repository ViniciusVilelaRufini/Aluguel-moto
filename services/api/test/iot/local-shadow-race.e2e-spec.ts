import { MemoryRedisStore } from '../../src/redis/redis-store';
import { LocalShadowStore } from '../../src/modules/iot/local-shadow';

/**
 * QA-23 (diagnóstico). Causa provável do "desired pendente não entregue na reconexão" intermitente: `LocalShadowStore`
 * faz leitura-modificação-gravação sem serializar por thing, e o `load` a frio não deduplica a leitura do Redis.
 * Duas operações concorrentes sobre uma thing ainda não carregada (ex.: `POST /commands` gravando o desired enquanto o
 * rastreador reconectado publica `reported`; no MQTT cada mensagem vira um `route()` sem fila) carregam o mesmo
 * documento antigo; a segunda a retomar sobrescreve o cache e o Redis com um documento construído do estado velho e o
 * desired some. O `get` seguinte não traz `delta`, então a moto nunca recebe o limite pendente e o comando fica `pending`.
 *
 * Correção sugerida (em services/api/src/modules/iot/local-shadow.ts, fora do escopo desta branch): guardar a
 * `Promise` do load no cache e executar `applyDesired`/`applyReported` numa fila por thing (mesmo padrão do `serial` do TelemetryService).
 * Quando corrigido, troque `it.skip` por `it`.
 */
class SlowRedis extends MemoryRedisStore {
  override async get(key: string): Promise<string | null> {
    const v = await super.get(key);
    await new Promise((r) => setTimeout(r, 15));
    return v;
  }
}

describe('QA-23 LocalShadowStore: operações concorrentes numa thing fria', () => {
  it.skip('não perde o desired quando um reported chega durante o primeiro load (BUG conhecido, ver cabeçalho)', async () => {
    const store = new LocalShadowStore(new SlowRedis());
    const T = 'moto-0059';
    await Promise.all([store.applyDesired(T, { limite_kmh: 20 }), store.applyReported(T, { travada: true, limite_kmh: 32 })]);
    const [msg] = await store.get(T);
    const state = (msg.payload as { state: { desired: Record<string, unknown>; delta?: Record<string, unknown> } }).state;
    expect(state.desired.limite_kmh).toBe(20);
    expect(state.delta).toEqual({ limite_kmh: 20 });
  });
});
