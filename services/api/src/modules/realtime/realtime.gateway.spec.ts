import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClusterEventsBridge } from '../../common/cluster-events';
import { EV } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { RealtimeGateway, zoneMessage } from './realtime.gateway';

const RENTAL_ID = '88888888-8888-4888-8888-888888888888';

function setup() {
  const prisma = mockDeep<PrismaClient>();
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  const gw = new RealtimeGateway({} as any, {} as any, prisma as any);
  gw.server = { to, in: jest.fn(() => ({ socketsJoin: jest.fn(), socketsLeave: jest.fn() })) } as any;
  return { gw, prisma, emit, to };
}

describe('RealtimeGateway', () => {
  it('payment.updated de um aluguel → rental.updated na sala rental:{id}', async () => {
    const { gw, prisma, emit, to } = setup();
    const now = new Date();
    prisma.rental.findUnique.mockResolvedValue({
      id: RENTAL_ID, customerId: 'c', vehicleId: 'v', status: 'ended', startedAt: new Date(now.getTime() - 600_000), pausedAt: null, pausedSecondsAcc: 0,
      endRequestedAt: now, endedAt: now, priceSnapshot: {}, costCents: 1290, breakdown: { lines: [], subtotalCents: 1090, discountCents: 0, insuranceCents: 200, feesCents: 0, totalCents: 1290 },
      createdAt: now, updatedAt: now,
    } as any);
    await gw.onPaymentUpdated({ paymentId: 'p', rentalId: RENTAL_ID, status: 'paid' });
    expect(to).toHaveBeenCalledWith(`rental:${RENTAL_ID}`);
    expect(emit).toHaveBeenCalledWith('rental.updated', expect.objectContaining({ rentalId: RENTAL_ID, status: 'ended', costCents: 1290, elapsedSeconds: 600 }));
  });

  it('payment.updated sem aluguel não emite', async () => {
    const { gw, emit } = setup();
    await gw.onPaymentUpdated({ paymentId: 'p', status: 'paid' });
    expect(emit).not.toHaveBeenCalled();
  });

  it('fix round 1: acesso revogado → desconecta os sockets daquele usuário (sala principal:{pool}:{id})', () => {
    const { gw } = setup();
    const disconnectSockets = jest.fn();
    const inFn = jest.fn(() => ({ disconnectSockets }));
    (gw.server as any).in = inFn;
    gw.onPrincipalRevoked({ pool: 'customer', userId: 'c1' });
    expect(inFn).toHaveBeenCalledWith('principal:customer:c1');
    expect(disconnectSockets).toHaveBeenCalledWith(true);
  });

  it('zone.notice: mensagens em pt-BR', () => {
    expect(zoneMessage({ zoneType: 'reduced_speed', transition: 'ENTER', speedLimitKmh: 6 })).toBe('Você entrou numa área de pedestres. Velocidade máxima: 6 km/h.');
    expect(zoneMessage({ zoneType: 'operation', transition: 'EXIT' })).toMatch(/5 minutos/);
  });
  it('Task 6: handover.pending e handover.updated vão para customer:{id} e depot:{id}, sem dados pessoais', () => {
    const { gw, emit, to } = setup();
    gw.onHandoverPending({ handoverId: 'h1', reservationId: 'r1', customerId: 'c1', depotId: 'd1' });
    expect(to).toHaveBeenCalledWith('customer:c1');
    expect(to).toHaveBeenCalledWith('depot:d1');
    expect(emit).toHaveBeenCalledWith('handover.pending', { handoverId: 'h1', reservationId: 'r1' });
    emit.mockClear();
    gw.onHandoverUpdated({ handoverId: 'h1', status: 'pending_customer', lastError: 'payment-declined', customerId: 'c1', depotId: 'd1' });
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith('handover.updated', { handoverId: 'h1', status: 'pending_customer', lastError: 'payment-declined' });
    emit.mockClear();
    gw.onHandoverUpdated({ handoverId: 'h1', status: 'accepted', customerId: 'c1', depotId: 'd1' });
    expect(emit).toHaveBeenCalledWith('handover.updated', { handoverId: 'h1', status: 'accepted' });
  });

  it('troca na estação: station_swap.updated { swapId, status } só na sala customer:{id} do dono', () => {
    const { gw, emit, to } = setup();
    gw.onStationSwapUpdated({ swapId: 's1', customerId: 'c1', status: 'awaiting_return' });
    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('customer:c1');
    expect(emit).toHaveBeenCalledWith('station_swap.updated', { swapId: 's1', status: 'awaiting_return' });
  });

  describe('token, revogação e cache entre instâncias', () => {
    const tick = () => new Promise((r) => setTimeout(r, 5));
    const jwt = (claims: Record<string, unknown>) =>
      ['{"alg":"none"}', JSON.stringify(claims)].map((x) => Buffer.from(x).toString('base64url')).join('.') + '.sig';

    /** Servidor Socket.IO mínimo: salas por socket, `in(room)` com disconnectSockets/socketsLeave e `to(room).emit`. */
    function miniServer() {
      const sockets = new Set<any>();
      const emitted: Array<{ room: string; event: string }> = [];
      let middleware: (s: any, n: (e?: Error) => void) => void = () => undefined;
      const server: any = {
        use: (fn: any) => (middleware = fn),
        in: (room: string) => ({
          disconnectSockets: () => sockets.forEach((s) => s.rooms.has(room) && s.disconnect(true)),
          socketsLeave: (r: string) => sockets.forEach((s) => s.rooms.has(room) && s.rooms.delete(r)),
          socketsJoin: (r: string) => sockets.forEach((s) => s.rooms.has(room) && s.rooms.add(r)),
        }),
        to: (room: string) => ({ emit: (event: string) => emitted.push({ room, event }) }),
      };
      const connect = (token: string) =>
        new Promise<any>((resolve, reject) => {
          const handlers: Record<string, () => void> = {};
          const socket: any = {
            handshake: { auth: { token } }, data: {}, rooms: new Set<string>(), connected: true,
            join: async (r: string) => void socket.rooms.add(r),
            on: (e: string, h: () => void) => void (handlers[e] = h),
            disconnect: jest.fn(() => { socket.connected = false; handlers.disconnect?.(); }),
          };
          sockets.add(socket);
          middleware(socket, (err) => (err ? reject(err) : resolve(socket)));
        });
      return { server, connect, emitted };
    }

    function instance(redis: MemoryRedisStore, claimsExp: () => number | undefined) {
      const prisma = mockDeep<PrismaClient>();
      const verifier = { verify: jest.fn(async () => ({ sub: 'u1', email: '', groups: [], pool: 'customer' })) };
      const resolver = { resolve: jest.fn(async () => ({ pool: 'customer', userId: 'u1', customerId: 'c1', groups: [] })) };
      const emitter = new EventEmitter2();
      const bridge = new ClusterEventsBridge(emitter, redis);
      bridge.onModuleInit();
      const gw = new RealtimeGateway(verifier as any, resolver as any, prisma as any, bridge);
      const mini = miniServer();
      gw.server = mini.server;
      gw.afterInit(mini.server);
      emitter.on(EV.PRINCIPAL_REVOKED, (e) => gw.onPrincipalRevoked(e));
      emitter.on(EV.RENTAL_CHANGED, (e) => gw.onRental(e));
      const token = () => jwt({ sub: 'u1', exp: claimsExp() });
      return { gw, prisma, emitter, token, ...mini };
    }
    const nowSec = () => Math.floor(Date.now() / 1000);

    it('desconecta o socket no exp do token', async () => {
      jest.useFakeTimers();
      try {
        const a = instance(new MemoryRedisStore(), () => nowSec() + 2);
        const socket = await a.connect(a.token());
        expect(socket.connected).toBe(true);
        jest.advanceTimersByTime(3_000);
        expect(socket.disconnect).toHaveBeenCalledWith(true);
      } finally {
        jest.useRealTimers();
      }
    });

    it('recusa token sem exp ou já expirado', async () => {
      const a = instance(new MemoryRedisStore(), () => undefined);
      await expect(a.connect(a.token())).rejects.toThrow('unauthorized');
      const b = instance(new MemoryRedisStore(), () => nowSec() - 1);
      await expect(b.connect(b.token())).rejects.toThrow('unauthorized');
    });

    it('limpa o timer ao desconectar antes do exp', async () => {
      jest.useFakeTimers();
      try {
        const a = instance(new MemoryRedisStore(), () => nowSec() + 60);
        const socket = await a.connect(a.token());
        socket.disconnect();
        socket.disconnect.mockClear();
        jest.advanceTimersByTime(61_000);
        expect(socket.disconnect).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('PRINCIPAL_REVOKED emitido na instância A desconecta o socket conectado na B', async () => {
      const redis = new MemoryRedisStore();
      const a = instance(redis, () => nowSec() + 600);
      const b = instance(redis, () => nowSec() + 600);
      const socket = await b.connect(b.token());
      a.emitter.emit(EV.PRINCIPAL_REVOKED, { pool: 'customer', userId: 'u1' });
      await tick();
      expect(socket.connected).toBe(false);
    });

    it('RENTAL_CHANGED encerrado só na A invalida o cache da B: telemetria não vai para rental:{id}', async () => {
      const redis = new MemoryRedisStore();
      const a = instance(redis, () => nowSec() + 600);
      const b = instance(redis, () => nowSec() + 600);
      b.prisma.vehicle.findUnique.mockResolvedValue({ status: 'rented', speedLimitKmh: 20 } as any);
      b.prisma.rental.findFirst.mockResolvedValueOnce({ id: RENTAL_ID, speedLimitKmh: 20 } as any).mockResolvedValue(null);
      const telemetry = { vehicleId: 'v1', lat: 0, lng: 0, speedKmh: 5, batteryPct: 80, ts: new Date().toISOString() } as any;
      await b.gw.onTelemetry(telemetry);
      expect(b.emitted).toContainEqual({ room: `rental:${RENTAL_ID}`, event: 'vehicle.position' });
      b.emitted.length = 0;
      a.emitter.emit(EV.RENTAL_CHANGED, { rentalId: RENTAL_ID, customerId: 'c1', vehicleId: 'v1', status: 'ended', elapsedSeconds: 1, costCents: 1, ts: new Date().toISOString() });
      await tick();
      await b.gw.onTelemetry(telemetry);
      expect(b.emitted.some((e) => e.room === `rental:${RENTAL_ID}` && e.event === 'vehicle.position')).toBe(false);
    });

    it('RENTAL_CHANGED replicado não reemite rental.updated na B (o adaptador Redis do Socket.IO já entrega a da A)', async () => {
      const redis = new MemoryRedisStore();
      const a = instance(redis, () => nowSec() + 600);
      const b = instance(redis, () => nowSec() + 600);
      a.emitter.emit(EV.RENTAL_CHANGED, { rentalId: RENTAL_ID, customerId: 'c1', vehicleId: 'v1', status: 'ended', elapsedSeconds: 1, costCents: 1, ts: new Date().toISOString() });
      await tick();
      expect(a.emitted).toContainEqual({ room: `rental:${RENTAL_ID}`, event: 'rental.updated' });
      expect(b.emitted).toEqual([]);
    });

    it('cache veículo→aluguel vale no máximo 5 s', async () => {
      jest.useFakeTimers();
      try {
        const a = instance(new MemoryRedisStore(), () => nowSec() + 600);
        a.prisma.vehicle.findUnique.mockResolvedValue({ status: 'rented', speedLimitKmh: 20 } as any);
        a.prisma.rental.findFirst.mockResolvedValue({ id: RENTAL_ID, speedLimitKmh: 20 } as any);
        const t = { vehicleId: 'v1', lat: 0, lng: 0, speedKmh: 5, batteryPct: 80, ts: 'x' } as any;
        await a.gw.onTelemetry(t);
        jest.advanceTimersByTime(6_000);
        await a.gw.onTelemetry(t);
        expect(a.prisma.vehicle.findUnique).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
