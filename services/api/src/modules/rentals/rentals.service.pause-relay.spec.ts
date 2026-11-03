import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { EV } from '../../common/events';
import { PAUSE_LOCK_FAILED_MESSAGE, RentalsService } from './rentals.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const RENTAL_ID = '88888888-8888-4888-8888-888888888888';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const user = { pool: 'customer', sub: 's', email: 'e@example.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID } as any;

/** Auditoria run-4: pausa de moto `relay_only` sem trava efetiva não cobra pausa com a moto destravada. */
function setup(opts: { mode?: 'relay_only' | 'speed_control'; lock?: string; status?: string; latestLock?: { id: string; status: string; statusReason?: string | null } | null } = {}) {
  const prisma = mockDeep<PrismaClient>();
  const rental: any = {
    id: RENTAL_ID, customerId: CUSTOMER_ID, status: opts.status ?? 'active', vehicleId: VEHICLE_ID, startedAt: new Date(Date.now() - 600_000),
    pausedAt: opts.status === 'paused' ? new Date(Date.now() - 60_000) : null, pausedSecondsAcc: 30, endRequestedAt: null, endedAt: null,
    priceSnapshot: { planCode: 'minute', unit: 'minute', unlockFeeCents: 0, unitPriceCents: 79, pausePerMinuteCents: 20, insurancePremiumCents: 0 },
    costCents: 0, breakdown: null, createdAt: new Date(), updatedAt: new Date(),
  };
  const vehicle: any = { id: VEHICLE_ID, thingName: 't', status: opts.status === 'paused' ? 'paused' : 'rented', tracker: opts.mode ? { controlMode: opts.mode } : null };
  prisma.rental.findUnique.mockImplementation((async () => ({ ...rental, vehicle })) as any);
  prisma.rental.updateMany.mockImplementation((async (a: any) => {
    if (a.where.status && a.where.status !== rental.status) return { count: 0 };
    Object.assign(rental, a.data);
    return { count: 1 };
  }) as any);
  prisma.vehicle.updateMany.mockImplementation((async (a: any) => {
    if (a.where.status && a.where.status !== vehicle.status) return { count: 0 };
    Object.assign(vehicle, a.data);
    return { count: 1 };
  }) as any);
  prisma.tracker.findUnique.mockResolvedValue((opts.mode ? { controlMode: opts.mode } : null) as any);
  prisma.vehicleCommand.findFirst.mockResolvedValue((opts.latestLock === undefined ? { id: 'cmd-1', status: 'failed', statusReason: 'did_not_stop' } : opts.latestLock) as any);
  const commands = { dispatch: jest.fn().mockResolvedValue({ id: 'cmd-1', status: opts.lock ?? 'in_progress' }), isLockedByStaff: jest.fn().mockResolvedValue(false) };
  const events = { emit: jest.fn() };
  const svc = new RentalsService(prisma as any, commands as any, {} as any, events as any, {} as any, {} as any, {} as any);
  return { prisma, commands, svc, rental, vehicle, events };
}

const failed = { commandId: 'cmd-1', vehicleId: VEHICLE_ID, type: 'lock', status: 'failed', reason: 'did_not_stop', payload: { rentalId: RENTAL_ID, purpose: 'rental_pause' } };

describe('Auditoria run-4: pausa com trava só relé', () => {
  it('relay_only e a trava recusada na hora (failed) → 409 conflict, aluguel continua active', async () => {
    const { svc, rental, prisma } = setup({ mode: 'relay_only', lock: 'failed' });
    await expect(svc.pause(user, RENTAL_ID)).rejects.toMatchObject({ status: 409, slug: 'conflict' });
    expect(rental.status).toBe('active');
    expect(prisma.rental.updateMany).not.toHaveBeenCalled();
  });

  it('relay_only com a trava em curso (in_progress/pending) → pausa normalmente', async () => {
    for (const lock of ['in_progress', 'pending']) {
      const { svc, rental } = setup({ mode: 'relay_only', lock });
      await svc.pause(user, RENTAL_ID);
      expect(rental.status).toBe('paused');
    }
  });

  it('speed_control com a trava failed → pausa como antes', async () => {
    const { svc, rental } = setup({ mode: 'speed_control', lock: 'failed' });
    await svc.pause(user, RENTAL_ID);
    expect(rental.status).toBe('paused');
  });

  it('trava da pausa termina failed depois (relay_only) → active, sem somar o trecho pausado, moto rented, evento e rental.changed', async () => {
    const { svc, rental, vehicle, prisma, events } = setup({ mode: 'relay_only', status: 'paused' });
    await svc.onPauseLockChanged(failed as any);
    expect(rental.status).toBe('active');
    expect(rental.pausedAt).toBeNull();
    expect(rental.pausedSecondsAcc).toBe(30);
    expect(vehicle.status).toBe('rented');
    expect(prisma.rentalEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ rentalId: RENTAL_ID, type: 'resumed', actorType: 'system', message: PAUSE_LOCK_FAILED_MESSAGE, data: expect.objectContaining({ commandId: 'cmd-1' }) }) });
    expect(events.emit).toHaveBeenCalledWith(EV.RENTAL_CHANGED, expect.objectContaining({ rentalId: RENTAL_ID, status: 'active' }));
    expect(events.emit).toHaveBeenCalledWith(EV.VEHICLE_STATUS_CHANGED, expect.objectContaining({ vehicleId: VEHICLE_ID, status: 'rented' }));
  });

  it('timeout (fase de corte; a moto pode estar travada) → continua paused', async () => {
    const { svc, rental } = setup({ mode: 'relay_only', status: 'paused', latestLock: { id: 'cmd-1', status: 'failed', statusReason: 'timeout' } });
    await svc.onPauseLockChanged({ ...failed, reason: 'timeout' } as any);
    expect(rental.status).toBe('paused');
  });

  it('confirmed tardio da trava da pausa com o aluguel já active (relay_only, último lock) → volta a paused, sem destravar', async () => {
    const { svc, rental, vehicle, commands, prisma } = setup({ mode: 'relay_only', status: 'active', latestLock: { id: 'cmd-1', status: 'confirmed' } });
    await svc.onPauseLockChanged({ ...failed, status: 'confirmed', reason: undefined } as any);
    expect(rental.status).toBe('paused');
    expect(rental.pausedAt).toBeInstanceOf(Date);
    expect(vehicle.status).toBe('paused');
    expect(commands.dispatch).not.toHaveBeenCalled();
    expect(prisma.rentalEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'paused', data: expect.objectContaining({ commandId: 'cmd-1' }) }) });
  });

  it('corrida: a trava já terminou did_not_stop quando a pausa foi gravada → volta a active na hora', async () => {
    const { svc, rental, prisma } = setup({ mode: 'relay_only', lock: 'in_progress' });
    prisma.vehicleCommand.findUnique.mockResolvedValue({ id: 'cmd-1', status: 'failed', statusReason: 'did_not_stop' } as any);
    const out: any = await svc.pause(user, RENTAL_ID);
    expect(rental.status).toBe('active');
    expect(out.status).toBe('active');
  });

  it('corrida: em curso ao reler → continua paused', async () => {
    const { svc, rental, prisma } = setup({ mode: 'relay_only', lock: 'in_progress' });
    prisma.vehicleCommand.findUnique.mockResolvedValue({ id: 'cmd-1', status: 'in_progress', statusReason: null } as any);
    await svc.pause(user, RENTAL_ID);
    expect(rental.status).toBe('paused');
  });

  it('varredura: pausado em relay_only com a última trava de pausa failed por timeout → pede a trava de novo (sistema)', async () => {
    const { svc, prisma, commands } = setup({ mode: 'relay_only', status: 'paused', latestLock: { id: 'cmd-1', status: 'failed', statusReason: 'timeout' } });
    prisma.rental.findMany.mockResolvedValue([{ id: RENTAL_ID, vehicleId: VEHICLE_ID }] as any);
    await svc.retryPauseLocks();
    expect((prisma.rental.findMany.mock.calls[0][0] as any).where).toMatchObject({ status: 'paused', vehicle: { tracker: { controlMode: 'relay_only' } } });
    expect(commands.dispatch).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: VEHICLE_ID, type: 'lock', actor: expect.objectContaining({ system: true }), context: { rentalId: RENTAL_ID, purpose: 'rental_pause' } }));
  });

  it('varredura: trava de pausa em curso ou confirmada → não reenvia', async () => {
    for (const latest of [{ id: 'cmd-1', status: 'in_progress' }, { id: 'cmd-1', status: 'confirmed' }]) {
      const { svc, prisma, commands } = setup({ mode: 'relay_only', status: 'paused', latestLock: latest });
      prisma.rental.findMany.mockResolvedValue([{ id: RENTAL_ID, vehicleId: VEHICLE_ID }] as any);
      await svc.retryPauseLocks();
      expect(commands.dispatch).not.toHaveBeenCalled();
    }
  });

  it('speed_control: falha tardia da trava da pausa não muda nada', async () => {
    const { svc, rental } = setup({ mode: 'speed_control', status: 'paused' });
    await svc.onPauseLockChanged(failed as any);
    expect(rental.status).toBe('paused');
  });

  it('falha de uma trava de pausa antiga (há outra mais nova) → nada muda', async () => {
    const { svc, rental } = setup({ mode: 'relay_only', status: 'paused', latestLock: { id: 'cmd-2', status: 'in_progress' } });
    await svc.onPauseLockChanged(failed as any);
    expect(rental.status).toBe('paused');
  });

  it('outros comandos (confirmed, outro propósito) são ignorados', async () => {
    const { svc, rental, prisma } = setup({ mode: 'relay_only', status: 'paused' });
    await svc.onPauseLockChanged({ ...failed, status: 'in_progress' } as any);
    await svc.onPauseLockChanged({ ...failed, payload: { rentalId: RENTAL_ID, purpose: 'rental_end' } } as any);
    expect(rental.status).toBe('paused');
    expect(prisma.rental.findUnique).not.toHaveBeenCalled();
  });
});
