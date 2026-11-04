import { toDeposit, toRental } from './rentals.mapper';

const now = new Date('2026-11-04T12:00:00Z');

describe('rentals.mapper — balcão', () => {
  it('toRental expõe prepaidUntil em ISO', () => {
    const r = {
      id: 'r1', customerId: 'c1', vehicleId: 'v1', status: 'active', planCode: 'day', coverage: 'basic', startedAt: now, pausedAt: null, pausedSecondsAcc: 0,
      endRequestedAt: null, endedAt: null, costCents: 0, breakdown: null, depositId: 'd1', createdAt: now, updatedAt: now,
      prepaidUntil: new Date('2026-11-05T12:00:00Z'),
      priceSnapshot: { planCode: 'day', unit: 'day', unlockFeeCents: 0, unitPriceCents: 5000, pausePerMinuteCents: 0, insurancePremiumCents: 0 },
    } as any;
    expect(toRental(r, now).prepaidUntil).toBe('2026-11-05T12:00:00.000Z');
    expect(toRental({ ...r, prepaidUntil: null }, now)).not.toHaveProperty('prepaidUntil');
  });

  it('toDeposit expõe refundedCents e reference', () => {
    const d = { id: 'd1', rentalId: null, customerId: 'c1', method: 'cash', status: 'held', amountCents: 10000, capturedCents: null, refundedCents: 2000, reference: 'R1', pix: null, createdAt: now, updatedAt: now } as any;
    const out = toDeposit(d);
    expect(out.refundedCents).toBe(2000);
    expect(out.reference).toBe('R1');
    expect(toDeposit({ ...d, reference: null })).not.toHaveProperty('reference');
  });
});
