import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAP_LOAD_TIMEOUT_MS, startMapLoad, type MapLoadState } from '@/lib/map-load';

class FakeMap {
  handlers: Record<string, (e?: unknown) => void> = {};
  removed = false;
  on(ev: string, cb: (e?: unknown) => void) { this.handlers[ev] = cb; }
  remove() { this.removed = true; }
}
function fakeDoc() {
  const ls = new Set<() => void>();
  const d = { hidden: false, addEventListener: (_: string, cb: () => void) => ls.add(cb), removeEventListener: (_: string, cb: () => void) => ls.delete(cb), set(h: boolean) { d.hidden = h; ls.forEach((f) => f()); }, count: () => ls.size };
  return d;
}
function setup(doc = fakeDoc()) {
  const states: MapLoadState[] = [];
  const maps: FakeMap[] = [];
  const onReady = vi.fn();
  const onDestroy = vi.fn();
  const dispose = startMapLoad({ createMap: async () => { const m = new FakeMap(); maps.push(m); return m; }, onState: (s) => states.push(s), onReady, onDestroy, doc });
  return { states, maps, onReady, onDestroy, dispose, doc };
}
const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('startMapLoad', () => {
  it('load normal: ready e onReady, sem timeout depois', async () => {
    const t = setup(); await flush();
    t.maps[0].handlers.load();
    await vi.advanceTimersByTimeAsync(MAP_LOAD_TIMEOUT_MS * 2);
    expect(t.states).toEqual(['ready']);
    expect(t.onReady).toHaveBeenCalledWith(t.maps[0]);
  });
  it('15 s sem load: failed; load tardio recupera e chama onReady', async () => {
    const t = setup(); await flush();
    await vi.advanceTimersByTimeAsync(MAP_LOAD_TIMEOUT_MS);
    expect(t.states).toEqual(['failed']);
    t.maps[0].handlers.load();
    expect(t.states).toEqual(['failed', 'ready']);
    expect(t.onReady).toHaveBeenCalledTimes(1);
  });
  it('erro do estilo antes do load: failed na hora; erro de tile é ignorado', async () => {
    const t = setup(); await flush();
    t.maps[0].handlers.error({ tile: {} });
    expect(t.states).toEqual([]);
    t.maps[0].handlers.error({ error: new Error('style') });
    expect(t.states).toEqual(['failed']);
  });
  it('falha ao criar o mapa (import/new Map): failed imediato', async () => {
    const states: MapLoadState[] = [];
    startMapLoad({ createMap: async () => { throw new Error('boom'); }, onState: (s) => states.push(s), onReady: vi.fn(), doc: fakeDoc() });
    await flush();
    expect(states).toEqual(['failed']);
  });
  it('aba oculta pausa a contagem e reinicia ao voltar', async () => {
    const doc = fakeDoc(); const t = setup(doc); await flush();
    await vi.advanceTimersByTimeAsync(10_000);
    doc.set(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(t.states).toEqual([]);
    doc.set(false);
    await vi.advanceTimersByTimeAsync(14_000);
    expect(t.states).toEqual([]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(t.states).toEqual(['failed']);
  });
  it('desmontar (retry) remove o mapa antigo, chama onDestroy e solta o listener', async () => {
    const t = setup(); await flush();
    t.dispose();
    expect(t.maps[0].removed).toBe(true);
    expect(t.onDestroy).toHaveBeenCalled();
    expect(t.doc.count()).toBe(0);
    await vi.advanceTimersByTimeAsync(MAP_LOAD_TIMEOUT_MS * 2);
    expect(t.states).toEqual([]);
  });
  it('desmontar antes de o mapa ser criado remove o mapa assim que nasce', async () => {
    const t = setup(); t.dispose(); await flush();
    expect(t.maps[0].removed).toBe(true);
  });
});
