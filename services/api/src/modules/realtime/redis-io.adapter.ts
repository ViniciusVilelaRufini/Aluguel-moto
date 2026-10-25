import type { INestApplication, INestApplicationContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/** Prefixo dos canais pub/sub do adaptador (separa a API de outros usos do mesmo Redis). */
export const SOCKET_IO_REDIS_KEY = 'volti:socket.io';

/**
 * Socket.IO com o adaptador Redis (`@socket.io/redis-adapter`): com várias tasks da API atrás do ALB, um evento de domínio
 * processado na instância A (telemetria da fila, webhook, comando) é emitido para salas cujos sockets estão na instância B.
 * `to(sala).emit`, `socketsJoin/socketsLeave` e `disconnectSockets` passam a valer no cluster inteiro.
 * Ligado sempre que `REDIS_URL` aponta para um Redis (não `memory`); sem Redis, o adaptador em memória de sempre.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger('RedisIoAdapter');
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private clients: Redis[] = [];

  constructor(appOrHttpServer?: INestApplicationContext | object) {
    super(appOrHttpServer);
  }

  async connectToRedis(url: string, key = SOCKET_IO_REDIS_KEY): Promise<void> {
    const pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
    const sub = pub.duplicate();
    for (const c of [pub, sub]) c.on('error', (err) => this.logger.warn({ msg: 'socket_io_redis_error', error: err.message }));
    await Promise.all([pub.connect(), sub.connect()]);
    this.clients = [pub, sub];
    this.adapterConstructor = createAdapter(pub, sub, { key });
    this.logger.log({ msg: 'socket_io_redis_adapter_ready' });
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }

  /** Chamado pelo Nest no `app.close()` (encerramento da task): fecha também as conexões pub/sub. */
  async dispose(): Promise<void> {
    await super.dispose();
    await Promise.all(this.clients.map((c) => c.quit().catch(() => undefined)));
    this.clients = [];
  }
}

/**
 * Liga o adaptador Redis na aplicação quando há Redis (`REDIS_URL` diferente de `memory`). Devolve o adaptador (para fechar
 * as conexões no encerramento) ou `undefined` no modo local sem Redis.
 */
export async function useRedisSocketAdapter(app: INestApplication, redisUrl: string, key?: string): Promise<RedisIoAdapter | undefined> {
  if (!redisUrl || redisUrl === 'memory') return undefined;
  const adapter = new RedisIoAdapter(app);
  await adapter.connectToRedis(redisUrl, key);
  app.useWebSocketAdapter(adapter);
  return adapter;
}
