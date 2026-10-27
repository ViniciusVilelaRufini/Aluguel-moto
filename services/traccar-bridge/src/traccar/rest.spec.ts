import { TRACCAR_HTTP_TIMEOUT_MS, TraccarRest } from './rest';

/** fetch falso que nunca responde, mas respeita o `signal` (como o fetch do Node). */
function hangingFetch(seen: Array<RequestInit | undefined>): typeof fetch {
  return ((_url: string, init?: RequestInit) => {
    seen.push(init);
    return new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
    });
  }) as unknown as typeof fetch;
}

describe('TraccarRest (B-I3: toda chamada HTTP com prazo)', () => {
  it('prazo padrão de 10 s', () => {
    expect(TRACCAR_HTTP_TIMEOUT_MS).toBe(10_000);
  });

  it.each([
    ['login', (r: TraccarRest) => r.login()],
    ['devices', (r: TraccarRest) => r.devices()],
    ['server', (r: TraccarRest) => r.server()],
    ['sendCommand', (r: TraccarRest) => r.sendCommand(1, 'engineStop')],
    ['bootstrapFirstUser', (r: TraccarRest) => r.bootstrapFirstUser('x')],
  ])('%s sem resposta → aborta no prazo', async (_name, call) => {
    const seen: Array<RequestInit | undefined> = [];
    const rest = new TraccarRest('http://traccar', 'e', 'p', hangingFetch(seen), 30);
    const t0 = Date.now();
    await expect(call(rest)).rejects.toThrow();
    expect(Date.now() - t0).toBeLessThan(2_000);
    expect(seen.length).toBeGreaterThan(0);
    for (const init of seen) expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('requisição autenticada leva o signal também depois do login', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      seen.push({ url, init });
      if (url.endsWith('/api/session')) return new Response('{}', { status: 200, headers: { 'set-cookie': 'JSESSIONID=abc; Path=/' } });
      return new Response('[]', { status: 200 });
    }) as unknown as typeof fetch;
    await new TraccarRest('http://traccar', 'e', 'p', fetchImpl).devices();
    expect(seen.map((s) => s.url)).toEqual(['http://traccar/api/session', 'http://traccar/api/devices']);
    for (const s of seen) expect(s.init?.signal).toBeInstanceOf(AbortSignal);
    expect((seen[1].init?.headers as Record<string, string>).Cookie).toBe('JSESSIONID=abc');
  });
});
