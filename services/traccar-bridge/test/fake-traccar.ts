import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import type { TraccarDevice, TraccarPosition, TraccarSocketMessage } from '../src/traccar/types';


/**
 * Traccar falso (HTTP + WebSocket em 127.0.0.1, porta aleatória): sessão, dispositivos, comandos e o /api/socket.
 * Como o Traccar 6, ao abrir o WebSocket manda `{ positions: <últimas conhecidas> }` (`latest`): replay, não status novo.
 */
export class FakeTraccar {
  url = '';
  devices: TraccarDevice[] = [];
  /** Todo POST /api/commands/send recebido. */
  readonly commands: Array<{ deviceId: number; type: string }> = [];
  /** Corpo bruto de cada comando (para conferir `attributes.noQueue`). */
  readonly commandBodies: Array<Record<string, unknown>> = [];
  /** Comandos que o Traccar guardou para entregar na reconexão (o perigo para `engineStop`). */
  readonly queued: Array<{ deviceId: number; type: string }> = [];
  /** `true` = o dispositivo não tem sessão no Traccar: sem `noQueue` responde 202 (enfileirado); com `noQueue`, 400. */
  queueCommands = false;
  /** `false` imita um Traccar que ignora `noQueue` (enfileira mesmo assim). */
  honorNoQueue = true;
  /** Últimas posições mandadas no replay de cada conexão do WebSocket. */
  latest: TraccarPosition[] = [];
  /** `GET /api/server` → `{ version }` (C1: `noQueue` só a partir do 6.7.0). `undefined` = campo ausente. */
  serverVersion: string | undefined = '6.7.0';
  serverStatus = 200;
  /** Chamadas a `GET /api/server`. */
  serverCalls = 0;
  /** Atraso (ms) da resposta de `GET /api/server` (leitura lenta da versão). */
  serverDelayMs = 0;
  /** Chamado ao receber `GET /api/server`, antes do atraso (ex.: avançar o relógio da ponte). */
  onServer?: () => void;
  /**
   * `false` (padrão, como um Traccar sem Notification configurada): alarmes NÃO chegam como `events` no WebSocket, só em
   * `position.attributes.alarm`. `true` = há Notification de alarme e `push` repassa `events`.
   */
  notifications = false;
  /** Conexões de WebSocket aceitas até agora. */
  connections = 0;
  /** Logins (`POST /api/session`) aceitos. */
  logins = 0;
  /** Atraso (ms) da resposta do login. */
  sessionDelayMs = 0;
  /** Chamado ao receber o login, antes do atraso (ex.: avançar o relógio da ponte). */
  onSession?: () => void;
  /** Geração da sessão: `expireSessions` invalida os cookies já emitidos (o Traccar reiniciou ou a sessão expirou). */
  private sessionGen = 0;
  private get session(): string {
    return `JSESSIONID=fake-session-${this.sessionGen}`;
  }
  expireSessions(): void {
    this.sessionGen++;
  }
  private server?: Server;
  private wss?: WebSocketServer;
  private readonly sockets = new Set<WebSocket>();

  async start(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req, res));
    this.wss = new WebSocketServer({ noServer: true });
    this.server.on('upgrade', (req, socket, head) => {
      if (req.url !== '/api/socket' || !this.hasSession(req)) {
        socket.destroy();
        return;
      }
      this.wss!.handleUpgrade(req, socket, head, (ws) => {
        this.sockets.add(ws);
        this.connections++;
        ws.on('close', () => this.sockets.delete(ws));
        ws.send(JSON.stringify({ positions: this.latest }));
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await new Promise<string>((resolve) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve(data));
    });
    const json = (status: number, v: unknown): void => void res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(v));
    if (req.method === 'POST' && req.url === '/api/session') {
      const p = new URLSearchParams(body);
      if (p.get('email') !== 'bridge@volti.local' || p.get('password') !== 'secret') return void res.writeHead(401).end();
      this.logins++;
      this.onSession?.();
      if (this.sessionDelayMs) await new Promise((r) => setTimeout(r, this.sessionDelayMs));
      return void res.writeHead(200, { 'Set-Cookie': `${this.session}; Path=/; HttpOnly`, 'Content-Type': 'application/json' }).end('{}');
    }
    if (req.method === 'GET' && req.url === '/api/server') {
      this.serverCalls++;
      this.onServer?.();
      if (this.serverDelayMs) await new Promise((r) => setTimeout(r, this.serverDelayMs));
      return this.serverStatus === 200 ? json(200, { id: 1, ...(this.serverVersion !== undefined ? { version: this.serverVersion } : {}) }) : void res.writeHead(this.serverStatus).end();
    }
    if (!this.hasSession(req)) return void res.writeHead(401).end();
    if (req.method === 'GET' && req.url === '/api/devices') return json(200, this.devices);
    if (req.method === 'POST' && req.url === '/api/commands/send') {
      const c = JSON.parse(body) as { deviceId: number; type: string; attributes?: Record<string, unknown> };
      this.commands.push({ deviceId: c.deviceId, type: c.type });
      this.commandBodies.push(c);
      if (!this.queueCommands) return json(200, c);
      if (this.honorNoQueue && c.attributes?.noQueue === true) return void res.writeHead(400).end('Failed to send command');
      this.queued.push({ deviceId: c.deviceId, type: c.type });
      return json(202, c);
    }
    res.writeHead(404).end();
  }

  private hasSession(req: IncomingMessage): boolean {
    return (req.headers.cookie ?? '').split(/;\s*/).includes(this.session);
  }

  /** Mensagem do WebSocket do Traccar para todos os clientes conectados. */
  push(msg: TraccarSocketMessage): void {
    const { events, ...rest } = msg;
    const out: TraccarSocketMessage = this.notifications && events ? { ...rest, events } : rest;
    if (!Object.keys(out).length) return;
    for (const ws of this.sockets) ws.send(JSON.stringify(out));
  }

  /** Derruba as conexões do WebSocket (o cliente deve reconectar). */
  dropSockets(): void {
    for (const ws of this.sockets) ws.terminate();
  }

  async stop(): Promise<void> {
    for (const ws of this.sockets) ws.terminate();
    this.wss?.close();
    await new Promise<void>((resolve) => this.server?.close(() => resolve()) ?? resolve());
  }
}

export function position(over: Partial<TraccarPosition> & { deviceId: number; fixTime: string }): TraccarPosition {
  return {
    id: 1, protocol: 'gt06', serverTime: over.fixTime, deviceTime: over.fixTime, outdated: false, valid: true,
    latitude: -23.5614, longitude: -46.6914, speed: 0, course: 0, attributes: { ignition: true, blocked: false, rssi: 4, power: 72 },
    ...over,
  };
}
