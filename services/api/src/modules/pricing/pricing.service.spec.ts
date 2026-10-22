import { PriceSnapshot, PricingService } from './pricing.service';

// Tabela de preços do seed (interfaces-compartilhadas.md, "Preços do seed").
const MINUTE: PriceSnapshot = { planCode: 'minute', unit: 'minute', unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, insurancePremiumCents: 0 };
const HOUR: PriceSnapshot = { planCode: 'hour', unit: 'hour', unlockFeeCents: 0, unitPriceCents: 2900, pausePerMinuteCents: 0, insurancePremiumCents: 0 };
const DAY: PriceSnapshot = { planCode: 'day', unit: 'day', unlockFeeCents: 0, unitPriceCents: 8900, pausePerMinuteCents: 0, insurancePremiumCents: 0 };

const MIN = 60;

describe('PricingService.calculate', () => {
  const pricing = new PricingService({} as any);

  it('minute: 10 min → 1090 (300 desbloqueio + 10 × 79)', () => {
    const b = pricing.calculate({ snapshot: MINUTE, elapsedSeconds: 10 * MIN, pausedSeconds: 0 });
    expect(b.totalCents).toBe(1090);
    expect(b.subtotalCents).toBe(1090);
  });

  it('minute: 10 min 01 s → 1169 (minuto parcial arredonda para cima)', () => {
    const b = pricing.calculate({ snapshot: MINUTE, elapsedSeconds: 10 * MIN + 1, pausedSeconds: 0 });
    expect(b.totalCents).toBe(1169);
  });

  it('minute: 10 min rodando + 5 min de pausa → 1190 (pausa 20/min)', () => {
    const b = pricing.calculate({ snapshot: MINUTE, elapsedSeconds: 15 * MIN, pausedSeconds: 5 * MIN });
    expect(b.totalCents).toBe(1190);
    expect(b.lines.find((l) => l.code === 'pause')?.amountCents).toBe(100);
  });

  it('cupom de 20% sobre 1090 → 872', () => {
    const b = pricing.calculate({
      snapshot: { ...MINUTE, coupon: { code: 'VOLTI20', discountType: 'percent', percentOff: 20 } },
      elapsedSeconds: 10 * MIN,
      pausedSeconds: 0,
    });
    expect(b.discountCents).toBe(218);
    expect(b.totalCents).toBe(872);
  });

  it('cupom de valor fixo nunca deixa o tempo negativo', () => {
    const b = pricing.calculate({
      snapshot: { ...MINUTE, coupon: { code: 'BIG', discountType: 'fixed', amountOffCents: 5000 } },
      elapsedSeconds: 10 * MIN,
      pausedSeconds: 0,
    });
    expect(b.discountCents).toBe(1090);
    expect(b.totalCents).toBe(0);
  });

  it('hour: 61 min → 5800 (2 horas iniciadas)', () => {
    const b = pricing.calculate({ snapshot: HOUR, elapsedSeconds: 61 * MIN, pausedSeconds: 0 });
    expect(b.totalCents).toBe(5800);
  });

  it('day: 25 h → 17800 (2 dias iniciados)', () => {
    const b = pricing.calculate({ snapshot: DAY, elapsedSeconds: 25 * 60 * MIN, pausedSeconds: 0 });
    expect(b.totalCents).toBe(17800);
  });

  it('valor final do encerramento inclui o seguro basic (+200)', () => {
    const b = pricing.calculate({ snapshot: { ...MINUTE, insurancePremiumCents: 200 }, elapsedSeconds: 10 * MIN, pausedSeconds: 0 });
    expect(b.insuranceCents).toBe(200);
    expect(b.totalCents).toBe(1290);
    expect(b.lines.find((l) => l.code === 'insurance_basic')?.amountCents).toBe(200);
  });

  it('cupom não incide sobre seguro nem taxas; taxa de encerramento forçado soma 1500', () => {
    const b = pricing.calculate({
      snapshot: { ...MINUTE, insurancePremiumCents: 200, coupon: { code: 'VOLTI20', discountType: 'percent', percentOff: 20 } },
      elapsedSeconds: 10 * MIN,
      pausedSeconds: 0,
      fees: [{ code: 'force_end_outside_return_zone', description: 'Encerramento fora da zona de devolução', amountCents: 1500 }],
    });
    expect(b.feesCents).toBe(1500);
    expect(b.totalCents).toBe(872 + 200 + 1500);
  });

  it('assinatura ativa cobre o tempo (só seguro e taxas)', () => {
    const weekly: PriceSnapshot = { planCode: 'weekly', unit: 'week', unlockFeeCents: 0, unitPriceCents: 24900, pausePerMinuteCents: 0, insurancePremiumCents: 200, subscriptionCovered: true };
    const b = pricing.calculate({ snapshot: weekly, elapsedSeconds: 3 * 3600, pausedSeconds: 0 });
    expect(b.subtotalCents).toBe(0);
    expect(b.totalCents).toBe(200);
  });

  it('0 segundos no plano minute cobra só o desbloqueio', () => {
    const b = pricing.calculate({ snapshot: MINUTE, elapsedSeconds: 0, pausedSeconds: 0 });
    expect(b.totalCents).toBe(300);
  });
});

describe('PricingService.snapshotFrom — preço por modelo (contrato v2)', () => {
  const plan = (unit: string, unitPriceCents: number, unlockFeeCents: number) => ({ code: unit === 'minute' ? 'minute' : 'hour', unit, unitPriceCents, unlockFeeCents, pausePerMinuteCents: 20 }) as any;

  it('plano por minuto usa o preço do modelo (e o desbloqueio do modelo, se houver)', () => {
    const cargo = PricingService.snapshotFrom(plan('minute', 79, 300), 200, 'basic', null, false, { pricePerMinuteCents: 99, unlockFeeCents: null });
    expect(cargo).toMatchObject({ unitPriceCents: 99, unlockFeeCents: 300, pausePerMinuteCents: 20 });
    const special = PricingService.snapshotFrom(plan('minute', 79, 300), 200, 'basic', null, false, { pricePerMinuteCents: 89, unlockFeeCents: 0 });
    expect(special).toMatchObject({ unitPriceCents: 89, unlockFeeCents: 0 });
  });

  it('planos por hora/dia ignoram o modelo; sem modelo vale o plano', () => {
    expect(PricingService.snapshotFrom(plan('hour', 2900, 0), 200, 'basic', null, false, { pricePerMinuteCents: 99 })).toMatchObject({ unitPriceCents: 2900 });
    expect(PricingService.snapshotFrom(plan('minute', 79, 300), 200, 'basic', null, false, null)).toMatchObject({ unitPriceCents: 79, unlockFeeCents: 300 });
  });
});
