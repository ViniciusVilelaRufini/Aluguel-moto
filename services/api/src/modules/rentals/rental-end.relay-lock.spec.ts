import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { EV } from '../../common/events';
import { PricingService } from '../pricing/pricing.service';
import { FORCE_END_FEE_CODE, LATE_LOCK_CONFIRMATION_MS, MAX_END_ATTEMPTS, RentalEndService } from './rental-end.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const RENTAL_ID = '88888888-8888-4888-8888-888888888888';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const ZONE_ID = '99999999-9999-4999-8999-999999999999';
const NOW = new Date('2026-10-21T15:00:00.000Z');

/**
 * Auditoria run-4 (rentals/billing-frozen-before-relay-lock-confirmed): em rastreador `relay_only` a trava do fim pode
 * terminar `failed` sem corte — o aluguel volta a `active`; confirmação tardia (> 150 s) cobra até a confirmação e reconfere
 * a zona de devolução. `speed_control` mantém o comportamento de antes.
 */
function setup(opts: { mode?: 'relay_only' | 'speed_control'; status?: string; endRequestedAgoMs?: number; inZone?: boolean; latestLock?: { id: string; status: string } | null } = {}) {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const startedAt = new Date(NOW.getTime() - 10 * 60 * 1000);
  const endRequestedAt = new Date(NOW.getTime() - (opts.endRequestedAgoMs ?? 60_000));
  const rental: any = {
    id: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, planCode: 'minute', coverage: 'basic', status: opts.status ?? 'ending',
    startedAt, pausedAt: null, pausedSecondsAcc: 0, endRequestedAt, endLastAttemptAt: endRequestedAt, endAttempts: 1, endedAt: null,
    priceSnapshot: { planCode: 'minute', unit: 'minute', unlockFeeCents: 0, unitPriceCents: 100, pausePerMinuteCents: 0, insurancePremiumCents: 0, coverage: 'basic' },
    costCents: 0, breakdown: null, couponCode: null, depositId: null, insurancePolicyId: null, paymentId: null,
    endZoneId: ZONE_ID, returnPhotoUploadKey: 'k', returnPhotoObjectKey: 'k', forceEndReason: null,
    forcedEndById: null, rating: null, speedLimitKmh: null, createdAt: startedAt, updatedAt: startedAt,
  };
  const vehicle: any = { id: VEHICLE_ID, code: 'VLT-0001', thingName: 'moto-0001', lat: -23.56, lng: -46.69, status: 'rented', depotId: null };
  prisma.rental.findUnique.mockImplementation((async () => ({ ...rental, vehicle })) as any);
  prisma.rental.updateMany.mockImplementation((async (args: any) => {
    const allowed: string[] | undefined = args.where.status?.in ?? (args.where.status ? [args.where.status] : undefined);
    if (allowed && !allowed.includes(rental.status)) return { count: 0 };
    const data = { ...args.data };
    if (data.endAttempts?.increment) data.endAttempts = rental.endAttempts + data.endAttempts.increment;
    Object.assign(rental, data);
    return { count: 1 };
  }) as any);
  prisma.rental.update.mockImplementation((async (args: any) => Object.assign(rental, args.data)) as any);
  prisma.vehicle.updateMany.mockImplementation((async (args: any) => {
    const allowed: string[] | undefined = args.where.status?.in ?? (args.where.status ? [args.where.status] : undefined);
    if (allowed && !allowed.includes(vehicle.status)) return { count: 0 };
    Object.assign(vehicle, args.data);
    return { count: 1 };
  }) as any);
  prisma.tracker.findUnique.mockResolvedValue((opts.mode ? { controlMode: opts.mode } : null) as any);
  prisma.vehicleCommand.findFirst.mockResolvedValue((opts.latestLock === undefined ? { id: 'cmd-1', status: 'failed' } : opts.latestLock) as any);
  prisma.fee.findUnique.mockResolvedValue({ code: FORCE_END_FEE_CODE, amountCents: 1500, active: true } as any);
  prisma.stationSwap.findMany.mockResolvedValue([]);

  const billing = { holdDeposit: jest.fn(), isDelinquent: jest.fn(), settle: jest.fn().mockResolvedValue({ paymentId: 'pay-1', status: 'paid' }) };
  const commands = { dispatch: jest.fn().mockResolvedValue({ id: 'cmd-2', status: 'in_progress' }), isLockedByStaff: jest.fn().mockResolvedValue(false) };
  const zones = { findContaining: jest.fn().mockResolvedValue(opts.inZone === false ? null : { id: ZONE_ID, type: 'return' }) };
  const iot = { getLiveState: jest.fn().mockResolvedValue(null) };
  const alerts = { create: jest.fn().mockResolvedValue({ id: 'alert-1' }) };
  const events = new EventEmitter2();
  const emitted: Array<{ name: string; payload: any }> = [];
  events.onAny((name, payload) => void emitted.push({ name: String(name), payload }));
  const service = new RentalEndService(prisma as any, new PricingService(prisma as any), billing as any, commands as any, zones as any, iot as any, events, { record: jest.fn() } as any, alerts as any);
  return { service, prisma, rental, vehicle, commands, zones, alerts, billing, emitted };
}

const failed = (over: Record<string, unknown> = {}) => ({
  commandId: 'cmd-1', vehicleId: VEHICLE_ID, type: 'lock' as const, status: 'failed' as const, reason: 'did_not_stop' as const,
  payload: { rentalId: RENTAL_ID, purpose: 'rental_end' }, ...over,
});

describe('Auditoria run-4: trava do fim falhou (relay_only) → aluguel volta a active', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOW }));
  afterEach(() => jest.useRealTimers());

  it('relay_only + falha da última trava de fim → active, sem endRequestedAt/endZoneId, tentativas zeradas, evento e rental.changed', async () => {
    const { service, rental, prisma, emitted, alerts } = setup({ mode: 'relay_only' });
    await service.onCommandChanged(failed() as any);
    expect(rental.status).toBe('active');
    expect(rental.endRequestedAt).toBeNull();
    expect(rental.endZoneId).toBeNull();
    expect(rental.endAttempts).toBe(0);
    expect(prisma.rentalEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ rentalId: RENTAL_ID, type: 'resumed', actorType: 'system', message: 'A moto não parou; pare e peça o encerramento de novo.' }),
    });
    const changed = emitted.find((e) => e.name === EV.RENTAL_CHANGED);
    expect(changed?.payload).toMatchObject({ rentalId: RENTAL_ID, status: 'active' });
    expect(alerts.create).not.toHaveBeenCalled();
    // Condicional: só sai de `ending`.
    expect(prisma.rental.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: RENTAL_ID, status: 'ending' } }));
  });

  it('o tempo volta a correr a partir do pedido: o aluguel ativo é cobrado até agora (não congelado no pedido)', async () => {
    const { service, rental } = setup({ mode: 'relay_only', endRequestedAgoMs: 5 * 60_000 });
    await service.onCommandChanged(failed() as any);
    const { rentalTimes } = await import('./rentals.mapper');
    expect(rentalTimes(rental, NOW).elapsedSeconds).toBe(600);
  });

  it('aluguel que estava pausado ao pedir o fim: moto paused volta a rented (com evento de status)', async () => {
    const { service, vehicle, emitted } = setup({ mode: 'relay_only' });
    vehicle.status = 'paused';
    await service.onCommandChanged(failed() as any);
    expect(vehicle.status).toBe('rented');
    expect(emitted.find((e) => e.name === EV.VEHICLE_STATUS_CHANGED)?.payload).toMatchObject({ vehicleId: VEHICLE_ID, status: 'rented' });
  });

  it('speed_control → nada muda (continua ending, retentativa como antes)', async () => {
    const { service, rental, prisma } = setup({ mode: 'speed_control' });
    await service.onCommandChanged(failed() as any);
    expect(rental.status).toBe('ending');
    expect(prisma.rentalEvent.create).not.toHaveBeenCalled();
  });

  it('sem rastreador cadastrado (padrão speed_control) → nada muda', async () => {
    const { service, rental } = setup();
    await service.onCommandChanged(failed() as any);
    expect(rental.status).toBe('ending');
  });

  it('falha de um comando antigo (há trava de fim mais nova) → nada muda', async () => {
    const { service, rental } = setup({ mode: 'relay_only', latestLock: { id: 'cmd-9', status: 'in_progress' } });
    await service.onCommandChanged(failed() as any);
    expect(rental.status).toBe('ending');
  });

  it('aluguel já fora de ending (encerrado/ativo) → nada muda', async () => {
    const { service, rental, prisma } = setup({ mode: 'relay_only', status: 'ended' });
    await service.onCommandChanged(failed() as any);
    expect(rental.status).toBe('ended');
    expect(prisma.rentalEvent.create).not.toHaveBeenCalled();
  });

  it('retryEnding: relay_only com a última trava de fim já failed → volta a active sem reenviar trava', async () => {
    const { service, rental, prisma, commands } = setup({ mode: 'relay_only' });
    rental.endLastAttemptAt = new Date(NOW.getTime() - 60_000);
    prisma.rental.findMany.mockResolvedValueOnce([{ ...rental }] as any).mockResolvedValueOnce([] as any);
    await service.retryEnding();
    expect(commands.dispatch).not.toHaveBeenCalled();
    expect(rental.status).toBe('active');
  });

  it('retryEnding: relay_only que já esgotou as tentativas e cuja trava falhou depois (evento perdido) → volta a active', async () => {
    const { service, rental, prisma, commands } = setup({ mode: 'relay_only' });
    rental.endAttempts = MAX_END_ATTEMPTS;
    prisma.rental.findMany.mockResolvedValueOnce([] as any).mockResolvedValueOnce([{ ...rental }] as any);
    await service.retryEnding();
    expect((prisma.rental.findMany.mock.calls[1][0] as any).where).toMatchObject({ status: 'ending', endAttempts: { gte: MAX_END_ATTEMPTS }, vehicle: { tracker: { controlMode: 'relay_only' } } });
    expect(commands.dispatch).not.toHaveBeenCalled();
    expect(rental.status).toBe('active');
  });

  it('retryEnding: relay_only com a trava ainda em curso → reenvia como antes (não volta a active)', async () => {
    const { service, rental, prisma, commands } = setup({ mode: 'relay_only', latestLock: { id: 'cmd-1', status: 'in_progress' } });
    rental.endLastAttemptAt = new Date(NOW.getTime() - 60_000);
    prisma.rental.findMany.mockResolvedValueOnce([{ ...rental }] as any).mockResolvedValueOnce([] as any);
    await service.retryEnding();
    expect(commands.dispatch).toHaveBeenCalledTimes(1);
    expect(rental.status).toBe('ending');
  });
});

describe('Auditoria run-4: confirmação tardia da trava do fim (relay_only)', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOW }));
  afterEach(() => jest.useRealTimers());

  const confirmed = { ...failed(), status: 'confirmed' as const, reason: undefined };

  it(`até ${LATE_LOCK_CONFIRMATION_MS / 1000} s depois do pedido: cobra até o pedido (como antes)`, async () => {
    const { service, rental } = setup({ mode: 'relay_only', endRequestedAgoMs: 120_000 });
    await service.onCommandChanged(confirmed as any);
    expect(rental.status).toBe('ended');
    // 10 min de aluguel − 2 min desde o pedido = 8 min × 100.
    expect(rental.costCents).toBe(800);
  });

  it('mais de 150 s depois do pedido: cobra até a confirmação e grava o fim do tempo cobrado', async () => {
    const { service, rental, zones } = setup({ mode: 'relay_only', endRequestedAgoMs: 5 * 60_000 });
    await service.onCommandChanged(confirmed as any);
    expect(rental.status).toBe('ended');
    expect(rental.costCents).toBe(1000);
    expect(rental.endRequestedAt).toEqual(NOW);
    expect(zones.findContaining).toHaveBeenCalledWith(expect.anything(), 'return');
    expect(rental.endZoneId).toBe(ZONE_ID);
  });

  it('mais de 150 s e a moto saiu da zona de devolução: taxa de fora da zona e endZoneId limpo', async () => {
    const { service, rental, prisma } = setup({ mode: 'relay_only', endRequestedAgoMs: 5 * 60_000, inZone: false });
    await service.onCommandChanged(confirmed as any);
    expect(rental.status).toBe('ended');
    expect(rental.costCents).toBe(1000 + 1500);
    expect(rental.breakdown.lines).toEqual(expect.arrayContaining([expect.objectContaining({ code: FORCE_END_FEE_CODE, amountCents: 1500 })]));
    expect(rental.endZoneId).toBeNull();
    expect(prisma.rentalEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'ended', data: expect.objectContaining({ lateLockConfirmation: true, outsideReturnZone: true }) }) });
  });

  it('speed_control mais de 150 s depois: comportamento de antes (cobra até o pedido, sem reconferir a zona)', async () => {
    const { service, rental, zones } = setup({ mode: 'speed_control', endRequestedAgoMs: 5 * 60_000, inZone: false });
    await service.onCommandChanged(confirmed as any);
    expect(rental.status).toBe('ended');
    expect(rental.costCents).toBe(500);
    expect(zones.findContaining).not.toHaveBeenCalled();
  });
});
