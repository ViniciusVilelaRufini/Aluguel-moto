import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import type { IotReportedEvent } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { TrackerInstallLockReconciler } from './tracker-install-lock.reconciler';
import { trackerInstalledKey } from './trackers.service';

const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const THING = 'moto-0059';
const INSTALLED_AT = Date.parse('2026-11-05T12:00:00Z');
const at = (s: number) => new Date(INSTALLED_AT + s * 1000).toISOString();
const reported = (over: Partial<IotReportedEvent> = {}): IotReportedEvent => ({ thingName: THING, vehicleId: VEHICLE_ID, locked: false, heard: true, ts: at(50), ...over });

function setup() {
  const prisma = mockDeep<PrismaClient>();
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.reservation.findFirst.mockResolvedValue(null);
  prisma.vehicleCommand.findFirst.mockResolvedValue(null);
  const redis = new MemoryRedisStore();
  const commands = { dispatch: jest.fn().mockResolvedValue({ id: 'cmd-1', status: 'in_progress' }) };
  const reconciler = new TrackerInstallLockReconciler(prisma as any, redis, commands as any);
  jest.spyOn(Date, 'now').mockReturnValue(INSTALLED_AT + 50_000);
  return { prisma, redis, commands, reconciler };
}
const mark = (redis: MemoryRedisStore) => redis.set(trackerInstalledKey(THING), String(INSTALLED_AT), 600_000);

afterEach(() => jest.restoreAllMocks());

describe('TrackerInstallLockReconciler (I1: J16 novo chega com o relé solto)', () => {
  it('instalado → primeiro reported travada:false com a moto livre → pede a trava uma vez (sistema, estacionar)', async () => {
    const { redis, commands, reconciler } = setup();
    await mark(redis);
    await reconciler.onReported(reported());
    expect(commands.dispatch).toHaveBeenCalledTimes(1);
    expect(commands.dispatch).toHaveBeenCalledWith({
      vehicleId: VEHICLE_ID,
      type: 'lock',
      reason: expect.any(String),
      actor: { system: true, name: 'instalacao-rastreador' },
      context: { purpose: 'tracker_install' },
      auditAction: 'tracker.install_lock',
    });
    expect(await redis.get(trackerInstalledKey(THING))).toBeNull();
  });

  it('segundo reported travada:false não duplica', async () => {
    const { redis, commands, reconciler } = setup();
    await mark(redis);
    await reconciler.onReported(reported());
    await reconciler.onReported(reported({ ts: at(90) }));
    expect(commands.dispatch).toHaveBeenCalledTimes(1);
  });

  it('dois reported ao mesmo tempo (outra instância): só um pede a trava', async () => {
    const { redis, commands, reconciler } = setup();
    await mark(redis);
    await Promise.all([reconciler.onReported(reported()), reconciler.onReported(reported({ ts: at(51) }))]);
    expect(commands.dispatch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['aluguel aberto', (s: ReturnType<typeof setup>) => s.prisma.rental.findFirst.mockResolvedValue({ id: 'r-1' } as any)],
    ['reserva em uso', (s: ReturnType<typeof setup>) => s.prisma.reservation.findFirst.mockResolvedValue({ id: 'res-1' } as any)],
    ['lock/unlock em andamento', (s: ReturnType<typeof setup>) => s.prisma.vehicleCommand.findFirst.mockResolvedValue({ id: 'cmd-0' } as any)],
    ['trava em andamento no Redis', async (s: ReturnType<typeof setup>) => s.redis.set(`iot:relay-lock:${THING}`, '{}')],
  ])('%s → não trava e limpa a marca', async (_n, arrange) => {
    const s = setup();
    await mark(s.redis);
    await arrange(s);
    await s.reconciler.onReported(reported());
    expect(s.commands.dispatch).not.toHaveBeenCalled();
    expect(await s.redis.get(trackerInstalledKey(THING))).toBeNull();
  });

  it('primeiro reported travada:true: já travada, só limpa a marca', async () => {
    const { redis, commands, reconciler } = setup();
    await mark(redis);
    await reconciler.onReported(reported({ locked: true }));
    await reconciler.onReported(reported({ ts: at(60) }));
    expect(commands.dispatch).not.toHaveBeenCalled();
    expect(await redis.get(trackerInstalledKey(THING))).toBeNull();
  });

  it('sem marca (moto sem instalação recente) ou reported sem trava: nada', async () => {
    const { redis, commands, reconciler } = setup();
    await reconciler.onReported(reported());
    await mark(redis);
    await reconciler.onReported(reported({ locked: undefined }));
    expect(commands.dispatch).not.toHaveBeenCalled();
    expect(await redis.get(trackerInstalledKey(THING))).toBe(String(INSTALLED_AT));
  });

  it('reported mais velho que a instalação (shadow do aparelho antigo, polling) é ignorado e a marca fica', async () => {
    const { redis, commands, reconciler } = setup();
    await mark(redis);
    await reconciler.onReported(reported({ heard: false, locked: true, ts: at(-60) }));
    expect(commands.dispatch).not.toHaveBeenCalled();
    expect(await redis.get(trackerInstalledKey(THING))).toBe(String(INSTALLED_AT));
  });

  it('N2: reported nos primeiros 45 s (aparelho antigo ainda com o thingName da moto) é ignorado e a marca fica', async () => {
    const { redis, commands, reconciler } = setup();
    await mark(redis);
    await reconciler.onReported(reported({ locked: true, ts: at(20) }));
    expect(await redis.get(trackerInstalledKey(THING))).toBe(String(INSTALLED_AT));
    await reconciler.onReported(reported({ locked: false, ts: at(44) }));
    expect(commands.dispatch).not.toHaveBeenCalled();
    expect(await redis.get(trackerInstalledKey(THING))).toBe(String(INSTALLED_AT));
    await reconciler.onReported(reported({ locked: false, ts: at(50) }));
    expect(commands.dispatch).toHaveBeenCalledTimes(1);
    expect(await redis.get(trackerInstalledKey(THING))).toBeNull();
  });

  it('falha ao pedir a trava só é registrada', async () => {
    const { redis, commands, reconciler } = setup();
    await mark(redis);
    commands.dispatch.mockRejectedValue(new Error('x'));
    await expect(reconciler.onReported(reported())).resolves.toBeUndefined();
  });
});
