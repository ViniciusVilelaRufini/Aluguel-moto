import { EventEmitter } from 'node:events';
import { silentLogger } from '../log';
import { SOCKET_WATCHDOG_MS, TraccarSocket } from './socket';

class FakeWs extends EventEmitter {
  terminated = false;
  terminate(): void {
    this.terminated = true;
    this.emit('close');
  }
  close(): void {
    this.emit('close');
  }
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('TraccarSocket watchdog (M1)', () => {
  afterEach(() => jest.useRealTimers());

  it('sem nenhuma mensagem (keepalive {} do Traccar a cada 55 s) por 130 s → terminate() e reconecta', async () => {
    jest.useFakeTimers();
    const sockets: FakeWs[] = [];
    const messages: unknown[] = [];
    const opened = jest.fn();
    const s = new TraccarSocket('http://traccar', { login: async () => 'JSESSIONID=x' }, (m) => void messages.push(m), silentLogger, opened, {
      createWs: () => {
        const w = new FakeWs();
        sockets.push(w);
        return w;
      },
    });
    const p = s.connect();
    await flush();
    sockets[0].emit('open');
    await p;
    expect(SOCKET_WATCHDOG_MS).toBe(130_000);
    jest.advanceTimersByTime(129_000);
    expect(sockets[0].terminated).toBe(false);
    sockets[0].emit('message', Buffer.from('{}')); // keepalive renova o prazo
    jest.advanceTimersByTime(129_000);
    expect(sockets[0].terminated).toBe(false);
    jest.advanceTimersByTime(1_001);
    expect(sockets[0].terminated).toBe(true);
    jest.advanceTimersByTime(1_000); // backoff de 1 s
    await flush();
    expect(sockets).toHaveLength(2);
    sockets[1].emit('open');
    await flush();
    expect(opened).toHaveBeenCalledTimes(2);
    expect(messages).toEqual([{}]);
    s.close();
    jest.advanceTimersByTime(SOCKET_WATCHDOG_MS * 2);
    expect(sockets[1].terminated).toBe(false); // fechado de propósito: sem watchdog
  });
});
