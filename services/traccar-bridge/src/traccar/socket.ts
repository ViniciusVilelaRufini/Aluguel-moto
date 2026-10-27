import WebSocket from 'ws';
import type { Logger } from '../log';
import type { TraccarRest } from './rest';
import type { TraccarSocketMessage } from './types';

/**
 * WebSocket `/api/socket` do Traccar (devices/positions/events), com a sessão da REST e reconexão com backoff (1 s → 30 s).
 * `onOpen` roda em cada abertura (inclusive reconexão) ANTES da primeira mensagem — a ponte usa para esquecer o bit de
 * corte e marcar o replay de últimas posições que o Traccar manda ao conectar.
 */
export class TraccarSocket {
  private ws?: WebSocket;
  private stopped = false;
  private backoffMs = 1_000;

  constructor(
    private readonly baseUrl: string,
    private readonly rest: Pick<TraccarRest, 'login'>,
    private readonly onMessage: (m: TraccarSocketMessage) => void,
    private readonly log: Logger,
    private readonly onOpen?: () => void,
  ) {}

  async connect(): Promise<void> {
    const cookie = await this.rest.login();
    const url = `${this.baseUrl.replace(/^http/, 'ws')}/api/socket`;
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url, { headers: { Cookie: cookie } });
      let opened = false;
      this.ws = ws;
      ws.on('open', () => {
        opened = true;
        this.backoffMs = 1_000;
        this.log.info({ msg: 'traccar_socket_open' });
        this.onOpen?.();
        resolve();
      });
      ws.on('error', (err) => {
        if (!opened) reject(err);
      });
      ws.on('message', (data) => {
        let msg: TraccarSocketMessage;
        try {
          msg = JSON.parse(data.toString()) as TraccarSocketMessage;
        } catch {
          this.log.warn({ msg: 'traccar_socket_invalid_json' });
          return;
        }
        this.onMessage(msg);
      });
      ws.on('close', () => {
        if (!opened || this.stopped) return;
        this.log.warn({ msg: 'traccar_socket_closed' });
        this.scheduleReconnect();
      });
    });
  }

  private scheduleReconnect(): void {
    const wait = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
    const t = setTimeout(() => {
      if (this.stopped) return;
      this.connect().catch((err: Error) => {
        this.log.error({ msg: 'traccar_socket_reconnect_failed', error: err.message });
        this.scheduleReconnect();
      });
    }, wait);
    t.unref?.();
  }

  close(): void {
    this.stopped = true;
    this.ws?.close();
  }
}
