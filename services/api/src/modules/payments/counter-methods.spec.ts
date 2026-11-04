import { COUNTER_METHODS, depositAvailableCents, isCounterMethod } from './counter-methods';

describe('counter-methods', () => {
  it('isCounterMethod', () => {
    expect(COUNTER_METHODS).toEqual(['counter_card', 'counter_pix', 'cash']);
    expect(isCounterMethod('cash')).toBe(true);
    expect(isCounterMethod('card')).toBe(false);
    expect(isCounterMethod(null)).toBe(false);
    expect(isCounterMethod(undefined)).toBe(false);
  });

  it('depositAvailableCents nunca é negativo', () => {
    expect(depositAvailableCents({ amountCents: 10000, capturedCents: 2500, refundedCents: 5000 })).toBe(2500);
    expect(depositAvailableCents({ amountCents: 0, capturedCents: null, refundedCents: 0 })).toBe(0);
    expect(depositAvailableCents({ amountCents: 100, capturedCents: 80, refundedCents: 80 })).toBe(0);
  });
});
