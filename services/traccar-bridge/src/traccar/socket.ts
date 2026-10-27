import WebSocket from 'ws';
import type { Logger } from '../log';
import type { TraccarRest } from './rest';
import type { TraccarSocketMessage } from './types';

/** O Traccar manda keepalive `{}` a cada 55 s: 130 s sem nenhuma mensagem = conexão morta (meia-aberta). */
export const SOCKET_WATCHDOG_MS = 130_000;

/** Subconjunto do `ws` usado aqui (o teste injeta um falso). */
export interface WebSocketLike {
  on(event: 'open' | 'close', cb: () => void): unknown;
  on(event: 'error', cb: (err: Error) => void): unknown;
  on(event: 'message', cb: (data: { toString(): string }) => void): unknown;
  terminate(): void;
  close(): void;
}

export interface TraccarSocketOptions {
  watchdogMs?: number;
  createWs?: (url: string, cookie: string) => WebSocketLike;
}

/**
 * WebSocket `/api/socket` do Traccar (devices/positions/events), com a sessão da REST e reconexão com backoff (1 s → 30 s).
 * `onOpen` roda em cada abertura (inclusive reconexão) ANTES da primeira mensagem — a ponte usa para esquecer o bit de
 * corte e marcar o replay de últimas posições que o Traccar manda ao conectar. Watchdog: sem mensagem por
 * `SOCKET_WATCHDOG_MS`, `terminate()` e reconecta.
 */
export class TraccarSocket {
  private ws?: WebSocketLike;
  private stopped = false;
  private backoffMs = 1_000;
  private watchdog?: ReturnType<typeof setTimeout>;
  private readonly watchdogMs: number;
  private readonly createWs: (url: string, cookie: string) => WebSocketLike;

  constructor(
    private readonly baseUrl: string,
    private readonly rest: Pick<TraccarRest, 'login'>,
    private readonly onMessage: (m: TraccarSocketMessage) => void,
    private readonly log: Logger,
    private readonly onOpen?: () => void,
    opts: TraccarSocketOptions = {},
  ) {
    this.watchdogMs = opts.watchdogMs ?? SOCKET_WATCHDOG_MS;
    this.createWs = opts.createWs ?? ((url, cookie) => new WebSocket(url, { headers: { Cookie: cookie } }));
  }

  async connect(): Promise<void> {
    const cookie = await this.rest.login();
    const url = `${this.baseUrl.replace(/^http/, 'ws')}/api/socket`;
    await new Promise<void>((resolve, reject) => {
      const ws = this.createWs(url, cookie);
      let opened = false;
      this.ws = ws;
      ws.on('open', () => {
        opened = true;
        this.backoffMs = 1_000;
        this.log.info({ msg: 'traccar_socket_open' });
        this.armWatchdog(ws);
        this.onOpen?.();
        resolve();
      });
      ws.on('error', (err) => {
        if (!opened) reject(err);
      });
      ws.on('message', (data) => {
        this.armWatchdog(ws);
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
        if (this.ws === ws) this.clearWatchdog();
        if (!opened || this.stopped) return;
        this.log.warn({ msg: 'traccar_socket_closed' });
        this.scheduleReconnect();
      });
    });
  }

  private armWatchdog(ws: WebSocketLike): void {
    this.clearWatchdog();
    if (this.stopped) return;
    this.watchdog = setTimeout(() => {
      this.log.warn({ msg: 'traccar_socket_watchdog' });
      ws.terminate(); // dispara `close` → reconexão
    }, this.watchdogMs);
    this.watchdog.unref?.();
  }

  private clearWatchdog(): void {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = undefined;
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
    this.clearWatchdog();
    this.ws?.close();
  }
}
