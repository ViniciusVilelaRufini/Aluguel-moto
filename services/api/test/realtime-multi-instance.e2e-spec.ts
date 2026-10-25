import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import type { AlertCreatedEvent } from '../src/common/events';
import { RealtimeGateway } from '../src/modules/realtime/realtime.gateway';
import { useRedisSocketAdapter } from '../src/modules/realtime/redis-io.adapter';
import { devToken } from './helpers/e2e-app';

/**
 * Lacunas T5: duas instâncias da API (como duas tasks do ECS) com o adaptador Redis do Socket.IO. Um evento de domínio
 * processado na instância A chega ao socket conectado na instância B; a revogação de acesso também atravessa.
 * As duas apps rodam no mesmo processo e o Nest compartilha o EventEmitter2 entre elas: por isso o teste chama o gateway da
 * instância A diretamente (o que cada listener `@OnEvent` faz), em vez de emitir o evento no emissor compartilhado.
 */
describe('Tempo real com várias instâncias (adaptador Redis do Socket.IO)', () => {
  const key = `volti:socket.io:e2e:${randomUUID()}`; // isola dos outros worktrees que usam o mesmo Redis
  const apps: INestApplication[] = [];
  const sockets: Socket[] = [];
  let urlB: string;
  let a: INestApplication;

  async function boot(): Promise<{ app: INestApplication; url: string }> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
    configureApp(app);
    const adapter = await useRedisSocketAdapter(app, process.env.REDIS_URL!, key);
    expect(adapter).toBeDefined();
    await app.listen(0);
    apps.push(app);
    return { app, url: `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}` };
  }

  function connect(url: string, token: string): Promise<{ socket: Socket; events: Array<{ name: string; payload: unknown }> }> {
    const socket = io(`${url}/realtime`, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(socket);
    const events: Array<{ name: string; payload: unknown }> = [];
    socket.onAny((name: string, payload: unknown) => events.push({ name, payload }));
    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve({ socket, events }));
      socket.once('connect_error', reject);
    });
  }

  async function until(fn: () => boolean, ms = 5000): Promise<boolean> {
    const end = Date.now() + ms;
    while (!fn() && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
    return fn();
  }

  beforeAll(async () => {
    ({ app: a } = await boot());
    ({ url: urlB } = await boot());
    expect(a.get(RealtimeGateway)).not.toBe(apps[1].get(RealtimeGateway));
  });

  afterAll(async () => {
    for (const s of sockets) s.disconnect();
    for (const app of apps) await app.close();
  });

  it('evento de domínio emitido na instância A chega ao painel conectado na instância B (sala fleet)', async () => {
    const token = await devToken(a, { sub: 'dev-operacao-multi-e2e', email: 'operacao-multi-e2e@volti.dev', groups: ['operacao'], pool: 'staff' });
    const ws = await connect(urlB, token);
    // A adesão às salas é propagada pelo Redis; dá um tempo curto para a assinatura do canal da sala.
    await new Promise((r) => setTimeout(r, 200));
    const alertId = randomUUID();
    const ev: AlertCreatedEvent = { alertId, type: 'tamper', priority: 'high', createdAt: new Date().toISOString() };
    a.get(RealtimeGateway).onAlert(ev);
    expect(await until(() => ws.events.some((e) => e.name === 'alert.created' && (e.payload as { alertId: string }).alertId === alertId))).toBe(true);
  });

  it('revogação processada na instância A desconecta o socket do usuário na instância B', async () => {
    const sub = `dev-suporte-multi-e2e-${Date.now()}`;
    const token = await devToken(a, { sub, email: `${sub}@volti.dev`, groups: ['suporte'], pool: 'staff' });
    const ws = await connect(urlB, token);
    let disconnected = false;
    ws.socket.on('disconnect', () => (disconnected = true));
    // O userId do principal staff é o id do StaffUser criado no primeiro acesso.
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const staff = await prisma.staffUser.findFirst({ where: { cognitoSub: sub }, select: { id: true } });
      expect(staff).not.toBeNull();
      a.get(RealtimeGateway).onPrincipalRevoked({ pool: 'staff', userId: staff!.id });
      expect(await until(() => disconnected)).toBe(true);
    } finally {
      await prisma.$disconnect();
    }
  });
});
