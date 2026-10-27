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
    ['ensureSession', (r: TraccarRest) => r.ensureSession()],
    ['sendCommand', (r: TraccarRest) => r.sendCommand(1, 'engineResume')],
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

  it('N3: engineStop sem sessão aberta falha na hora (sem login); com sessão, 401 não faz login nem reenvia', async () => {
    const seen: string[] = [];
    let commandStatus = 401;
    const fetchImpl = (async (url: string) => {
      seen.push(url);
      if (url.endsWith('/api/session')) return new Response('{}', { status: 200, headers: { 'set-cookie': 'JSESSIONID=abc; Path=/' } });
      return new Response('{}', { status: commandStatus });
    }) as unknown as typeof fetch;
    const rest = new TraccarRest('http://traccar', 'e', 'p', fetchImpl);
    await expect(rest.sendCommand(1, 'engineStop')).rejects.toThrow('traccar_no_session');
    expect(seen).toEqual([]);
    await rest.ensureSession();
    await rest.ensureSession(); // já há sessão: nenhum login a mais
    expect(seen).toEqual(['http://traccar/api/session']);
    await expect(rest.sendCommand(1, 'engineStop')).rejects.toThrow('traccar_command_failed_401');
    expect(seen).toEqual(['http://traccar/api/session', 'http://traccar/api/commands/send']);
    // A sessão rejeitada foi esquecida: o próximo engineStop exige ensureSession de novo.
    await expect(rest.sendCommand(1, 'engineStop')).rejects.toThrow('traccar_no_session');
    // engineResume mantém o novo login + reenvio no 401.
    seen.length = 0;
    commandStatus = 200;
    await rest.ensureSession();
    commandStatus = 401;
    const resume = rest.sendCommand(1, 'engineResume');
    await expect(resume).rejects.toThrow('traccar_command_failed_401');
    expect(seen).toEqual(['http://traccar/api/session', 'http://traccar/api/commands/send', 'http://traccar/api/session', 'http://traccar/api/commands/send']);
  });
});
