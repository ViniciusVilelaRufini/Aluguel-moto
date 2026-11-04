import { buildCounterQuote, COUNTER_QUANTITY_MAX, counterPeriodSeconds, counterSnapshot } from './counter-pricing';
import { calculatePrice } from './pricing.service';

describe('preço do balcão', () => {
  const weekly = { code: 'weekly', unit: 'week', unitPriceCents: 25000 } as any;
  const day = { unitPriceCents: 6000 } as any;
  const snap = counterSnapshot(
    { ...weekly, pausePerMinuteCents: 0, unlockFeeCents: 0 } as any,
    buildCounterQuote({ plan: weekly, dayPlan: day, premiumCents: 1500, coverage: 'basic', quantity: 1 }),
  );
  const at = (s: number, paused = 0) => calculatePrice({ snapshot: snap, elapsedSeconds: s, pausedSeconds: paused, walletAvailableCents: 99999 });

  it('cotação: plano × quantidade + seguro único', () => {
    expect(buildCounterQuote({ plan: weekly, dayPlan: day, premiumCents: 1500, coverage: 'basic', quantity: 2 })).toEqual({
      planCode: 'weekly', quantity: 2, coverage: 'basic', planUnitCents: 25000, planCents: 50000, insuranceCents: 1500, totalCents: 51500,
      excessDayCents: 6000, periodDays: 14,
    });
  });

  it('snapshot congela quantidade, pré-pago e diária do excedente', () => {
    expect(snap).toMatchObject({ planCode: 'weekly', unit: 'week', unitPriceCents: 25000, insurancePremiumCents: 1500, coverage: 'basic', unlockFeeCents: 0 });
    expect(snap.counter).toEqual({ quantity: 1, prepaidCents: 26500, excessDayCents: 6000 });
    expect(snap.subscriptionCovered).toBeFalsy();
    expect(snap.coupon).toBeUndefined();
  });

  it('counter excess boundaries', () => {
    expect(at(7 * 86400).totalCents).toBe(0);
    expect(at(7 * 86400 + 1).totalCents).toBe(6000);
    expect(at(9 * 86400 + 1).lines.find((l) => l.code === 'excess_day')).toMatchObject({ quantity: 3, unitCents: 6000, amountCents: 18000 });
    expect(at(7 * 86400 + 1, 3 * 86400).totalCents).toBe(6000); // pausa não estende o período
    expect(at(10).lines.map((l) => l.code)).toEqual(['counter_plan', 'insurance_basic', 'counter_prepaid']);
    expect(at(10).walletAppliedCents).toBeUndefined();
  });

  it('linhas com textos em pt-BR e "Pago no balcão" negativo', () => {
    const b = at(8 * 86400);
    expect(b.lines).toEqual([
      { code: 'counter_plan', description: 'Plano semanal (balcão)', quantity: 1, unitCents: 25000, amountCents: 25000 },
      { code: 'excess_day', description: 'Excedente (por dia iniciado)', quantity: 1, unitCents: 6000, amountCents: 6000 },
      { code: 'insurance_basic', description: 'Seguro básico', quantity: 1, unitCents: 1500, amountCents: 1500 },
      { code: 'counter_prepaid', description: 'Pago no balcão', amountCents: -26500 },
    ]);
    expect(b).toMatchObject({ subtotalCents: 31000, discountCents: 0, insuranceCents: 1500, feesCents: 0, totalCents: 6000 });
  });

  it('ignora cupom, desbloqueio e pacote de minutos', () => {
    const s = { ...snap, unlockFeeCents: 300, coupon: { code: 'X', discountType: 'percent' as const, percentOff: 50 } };
    const b = calculatePrice({ snapshot: s, elapsedSeconds: 60, pausedSeconds: 0, minutesAvailable: 100 });
    expect(b.lines.map((l) => l.code)).toEqual(['counter_plan', 'insurance_basic', 'counter_prepaid']);
    expect(b.totalCents).toBe(0);
  });

  it('taxas viram excedente mesmo dentro do período', () => {
    expect(
      calculatePrice({ snapshot: snap, elapsedSeconds: 60, pausedSeconds: 0, fees: [{ code: 'zone_fine', description: 'Multa', amountCents: 3000 }] }).totalCents,
    ).toBe(3000);
  });

  it('diária × 30 e mês × 3', () => {
    const daily = { code: 'day', unit: 'day', unitPriceCents: 6000 } as any;
    expect(buildCounterQuote({ plan: daily, dayPlan: day, premiumCents: 0, coverage: 'full', quantity: 30 })).toMatchObject({
      planCents: 180000, totalCents: 180000, periodDays: 30,
    });
    const monthly = { code: 'monthly', unit: 'month', unitPriceCents: 80000 } as any;
    expect(buildCounterQuote({ plan: monthly, dayPlan: day, premiumCents: 2000, coverage: 'full', quantity: 3 })).toMatchObject({
      planCents: 240000, insuranceCents: 2000, periodDays: 90,
    });
  });

  it('counterPeriodSeconds', () => {
    expect(counterPeriodSeconds('month', 3)).toBe(90 * 86400);
    expect(counterPeriodSeconds('day', 1)).toBe(86400);
  });

  it('limites de quantidade', () => {
    expect(COUNTER_QUANTITY_MAX).toEqual({ day: 30, weekly: 4, monthly: 3 });
  });
});
