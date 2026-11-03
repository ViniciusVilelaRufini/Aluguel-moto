import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PricingService } from '../pricing/pricing.service';
import { RentalEndService } from './rental-end.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const RENTAL_ID = '88888888-8888-4888-8888-888888888888';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const NOW = new Date('2026-11-20T15:00:00.000Z');
const DAY = 86400_000;
const WEEK_CENTS = 24900;

/**
 * Auditoria run-4 (rentals/subscription-coverage-frozen-at-start): a cobertura da assinatura vale até o fim do período
 * (`subscriptionCoveredUntil`); no fechamento ela se estende até o `currentPeriodEnd` atual se a assinatura do mesmo plano
 * continuar `active` (renovada). O tempo além da cobertura é cobrado como plano não coberto (semanas iniciadas).
 */
function setup(opts: { coveredUntil?: string; startedDaysAgo: number; sub?: { status: string; currentPeriodEnd: Date } | null }) {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const startedAt = new Date(NOW.getTime() - opts.startedDaysAgo * DAY);
  const rental: any = {
    id: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, planCode: 'weekly', coverage: 'basic', status: 'ending',
    startedAt, pausedAt: null, pausedSecondsAcc: 0, endRequestedAt: NOW, endLastAttemptAt: NOW, endAttempts: 1, endedAt: null,
    priceSnapshot: {
      planCode: 'weekly', unit: 'week', unlockFeeCents: 0, unitPriceCents: WEEK_CENTS, pausePerMinuteCents: 0, insurancePremiumCents: 0, coverage: 'basic',
      subscriptionCovered: true, ...(opts.coveredUntil ? { subscriptionCoveredUntil: opts.coveredUntil } : {}),
    },
    costCents: 0, breakdown: null, endZoneId: null, createdAt: startedAt, updatedAt: startedAt,
  };
  const vehicle: any = { id: VEHICLE_ID, code: 'VLT-0001', thingName: 'moto-0001', lat: 0, lng: 0, status: 'rented', depotId: null };
  prisma.rental.findUnique.mockImplementation((async () => ({ ...rental, vehicle })) as any);
  prisma.rental.updateMany.mockImplementation((async (a: any) => {
    if (a.where.status?.in && !a.where.status.in.includes(rental.status)) return { count: 0 };
    Object.assign(rental, a.data);
    return { count: 1 };
  }) as any);
  prisma.rental.update.mockImplementation((async (a: any) => Object.assign(rental, a.data)) as any);
  prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
  prisma.stationSwap.findMany.mockResolvedValue([]);
  prisma.subscription.findFirst.mockResolvedValue((opts.sub === undefined ? null : opts.sub) as any);
  const billing = { settle: jest.fn().mockResolvedValue({ paymentId: 'pay-1', status: 'paid' }) };
  const commands = { dispatch: jest.fn(), isLockedByStaff: jest.fn().mockResolvedValue(false) };
  const service = new RentalEndService(prisma as any, new PricingService(prisma as any), billing as any, commands as any, { findContaining: jest.fn() } as any,
    { getLiveState: jest.fn().mockResolvedValue(null) } as any, new EventEmitter2(), { record: jest.fn() } as any, { create: jest.fn() } as any);
  return { service, rental, prisma };
}

const iso = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();

describe('Auditoria run-4: cobertura da assinatura no fechamento', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOW }));
  afterEach(() => jest.useRealTimers());

  it('dentro do período coberto → não cobra tempo', async () => {
    const { service, rental } = setup({ startedDaysAgo: 2, coveredUntil: new Date(NOW.getTime() + DAY).toISOString(), sub: { status: 'active', currentPeriodEnd: new Date(NOW.getTime() + DAY) } });
    await service.finalize(RENTAL_ID, 'ended');
    expect(rental.costCents).toBe(0);
  });

  it('assinatura cancelada/expirada no meio: cobra as semanas iniciadas além do fim da cobertura (linha time)', async () => {
    // Coberto até 3 dias atrás; 3 dias além = 1 semana iniciada.
    const { service, rental, prisma } = setup({ startedDaysAgo: 5, coveredUntil: iso(3 * DAY), sub: { status: 'canceled', currentPeriodEnd: new Date(NOW.getTime() - 3 * DAY) } });
    await service.finalize(RENTAL_ID, 'ended');
    expect(rental.costCents).toBe(WEEK_CENTS);
    expect(rental.breakdown.lines).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'time', quantity: 1, amountCents: WEEK_CENTS })]));
    expect((prisma.subscription.findFirst.mock.calls[0][0] as any).where).toMatchObject({ customerId: CUSTOMER_ID, planCode: 'weekly' });
  });

  it('assinatura renovada (active, currentPeriodEnd novo) → cobertura estendida, não cobra tempo', async () => {
    const { service, rental } = setup({ startedDaysAgo: 5, coveredUntil: iso(3 * DAY), sub: { status: 'active', currentPeriodEnd: new Date(NOW.getTime() + 4 * DAY) } });
    await service.finalize(RENTAL_ID, 'ended');
    expect(rental.costCents).toBe(0);
  });

  it('renovada mas ainda além do novo fim (ex.: 10 dias depois) → cobra só o excedente sobre o novo fim', async () => {
    const { service, rental } = setup({ startedDaysAgo: 20, coveredUntil: iso(17 * DAY), sub: { status: 'active', currentPeriodEnd: new Date(NOW.getTime() - 10 * DAY) } });
    await service.finalize(RENTAL_ID, 'ended');
    // 10 dias além do novo fim = 2 semanas iniciadas.
    expect(rental.costCents).toBe(2 * WEEK_CENTS);
  });

  it('snapshot antigo sem subscriptionCoveredUntil: usa o currentPeriodEnd da assinatura encontrada no fechamento', async () => {
    const { service, rental } = setup({ startedDaysAgo: 5, sub: { status: 'expired', currentPeriodEnd: new Date(NOW.getTime() - 2 * DAY) } });
    await service.finalize(RENTAL_ID, 'ended');
    expect(rental.costCents).toBe(WEEK_CENTS);
  });

  it('snapshot antigo e nenhuma assinatura encontrada → mantém coberto (comportamento anterior)', async () => {
    const { service, rental } = setup({ startedDaysAgo: 5, sub: null });
    await service.finalize(RENTAL_ID, 'ended');
    expect(rental.costCents).toBe(0);
  });
});
