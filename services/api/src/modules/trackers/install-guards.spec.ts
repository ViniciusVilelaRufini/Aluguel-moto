import { ProblemException } from '../../common/problem';
import { MemoryRedisStore } from '../../redis/redis-store';
import { ENGINE_COMMAND_IN_FLIGHT_MS } from '../../common/vehicle-in-use';
import { assertVehicleFreeForTrackerChange, pendingLockOn, vehicleInUseReason } from './install-guards';

const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const NOW = new Date('2026-11-05T12:00:00Z').getTime();

function fakeTx(opts: { rental?: boolean; reservation?: boolean; engineAt?: Date } = {}) {
  return {
    rental: { findFirst: jest.fn().mockResolvedValue(opts.rental ? { id: 'r-1' } : null) },
    reservation: { findFirst: jest.fn().mockResolvedValue(opts.reservation ? { id: 'res-1' } : null) },
    vehicleCommand: {
      findFirst: jest.fn(async (a: any) => (opts.engineAt && opts.engineAt >= a.where.createdAt.gte ? { id: 'cmd-1' } : null)),
    },
  };
}

async function problem(p: Promise<unknown>): Promise<ProblemException> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ProblemException);
    return e as ProblemException;
  }
  throw new Error('não lançou');
}

describe('install-guards', () => {
  it('vehicleInUseReason: aluguel aberto antes da reserva (não consulta a reserva)', async () => {
    const tx = fakeTx({ rental: true, reservation: true });
    await expect(vehicleInUseReason(tx as any, VEHICLE_ID)).resolves.toBe('rental');
    expect(tx.reservation.findFirst).not.toHaveBeenCalled();
    await expect(vehicleInUseReason(fakeTx({ reservation: true }) as any, VEHICLE_ID)).resolves.toBe('reservation');
    await expect(vehicleInUseReason(fakeTx() as any, VEHICLE_ID)).resolves.toBeNull();
  });

  it('pendingLockOn: devolve o primeiro thing com trava (chave ou só no índice)', async () => {
    const redis = new MemoryRedisStore();
    await expect(pendingLockOn(redis, ['moto-0001', 'gt06-1'])).resolves.toBeNull();
    await redis.hset('iot:safe-lock:index', { 'gt06-1': '{}' });
    await expect(pendingLockOn(redis, ['moto-0001', 'gt06-1'])).resolves.toEqual({ thingName: 'gt06-1', kind: 'rampa de bloqueio speed_control' });
    await redis.set('iot:relay-lock:moto-0001', '{}');
    await expect(pendingLockOn(redis, ['moto-0001', 'gt06-1'])).resolves.toEqual({ thingName: 'moto-0001', kind: 'trava só relé' });
  });

  describe('assertVehicleFreeForTrackerChange', () => {
    const redis = () => new MemoryRedisStore();

    it('moto livre, sem comando e sem trava → passa', async () => {
      await expect(assertVehicleFreeForTrackerChange(fakeTx() as any, redis(), VEHICLE_ID, ['moto-0001'], NOW)).resolves.toBeUndefined();
    });

    it('aluguel aberto → 409 vehicle-unavailable', async () => {
      const e = await problem(assertVehicleFreeForTrackerChange(fakeTx({ rental: true }) as any, redis(), VEHICLE_ID, ['moto-0001'], NOW));
      expect(e.getStatus()).toBe(409);
      expect(e.slug).toBe('vehicle-unavailable');
      expect(e.detail).toContain('aluguel aberto');
    });

    it('reserva em uso → 409', async () => {
      const e = await problem(assertVehicleFreeForTrackerChange(fakeTx({ reservation: true }) as any, redis(), VEHICLE_ID, ['moto-0001'], NOW));
      expect(e.getStatus()).toBe(409);
      expect(e.detail).toContain('reserva');
    });

    it('lock/unlock em andamento criado há menos de 5 min → 409; mais antigo não bloqueia', async () => {
      const recent = fakeTx({ engineAt: new Date(NOW - 60_000) });
      const e = await problem(assertVehicleFreeForTrackerChange(recent as any, redis(), VEHICLE_ID, ['moto-0001'], NOW));
      expect(e.getStatus()).toBe(409);
      expect(e.detail).toContain('bloqueio/desbloqueio em andamento');
      expect(recent.vehicleCommand.findFirst).toHaveBeenCalledWith({
        where: { vehicleId: VEHICLE_ID, type: { in: ['lock', 'unlock'] }, status: { in: ['pending', 'in_progress'] }, createdAt: { gte: new Date(NOW - ENGINE_COMMAND_IN_FLIGHT_MS) } },
        select: { id: true },
      });
      const old = fakeTx({ engineAt: new Date(NOW - ENGINE_COMMAND_IN_FLIGHT_MS - 1) });
      await expect(assertVehicleFreeForTrackerChange(old as any, redis(), VEHICLE_ID, ['moto-0001'], NOW)).resolves.toBeUndefined();
    });

    it('trava em andamento no Redis em qualquer thing envolvido → 409', async () => {
      const r = redis();
      await r.set('iot:relay-lock:moto-0001', '{}');
      const e = await problem(assertVehicleFreeForTrackerChange(fakeTx() as any, r, VEHICLE_ID, ['gt06-869890080273430', 'moto-0001'], NOW));
      expect(e.getStatus()).toBe(409);
      expect(e.detail).toContain('trava em andamento');
    });

    it('erro de leitura do Redis propaga (falha fechada)', async () => {
      const r = { exists: jest.fn().mockRejectedValue(new Error('down')), hgetall: jest.fn() };
      await expect(assertVehicleFreeForTrackerChange(fakeTx() as any, r as any, VEHICLE_ID, ['moto-0001'], NOW)).rejects.toThrow('down');
    });
  });
});
