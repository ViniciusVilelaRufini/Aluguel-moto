import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { ProblemException } from '../../common/problem';
import { CounterCheckoutService } from './counter-checkout.service';

describe('CounterCheckoutService.quote', () => {
  const prisma = mockDeep<PrismaClient>();
  const plans: Record<string, unknown> = {
    day: { code: 'day', unit: 'day', unitPriceCents: 6000 },
    weekly: { code: 'weekly', unit: 'week', unitPriceCents: 25000 },
    monthly: { code: 'monthly', unit: 'month', unitPriceCents: 80000 },
  };
  const pricing = { activePlan: jest.fn((code: string) => Promise.resolve(plans[code])) };
  const insurance = { quote: jest.fn().mockResolvedValue({ premiumCents: 2500 }) };
  const svc = new CounterCheckoutService(prisma as any, pricing as any, insurance as any);
  const problem = (p: Promise<unknown>) =>
    p.then(
      () => {
        throw new Error('esperava erro');
      },
      (e: ProblemException) => e,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.handover.findUnique.mockResolvedValue({ id: 'h1', type: 'pickup' } as any);
  });

  it('cota o plano semanal com a diária do plano day e o seguro do plano', async () => {
    const q = await svc.quote('h1', { planCode: 'weekly', coverage: 'full', quantity: 2 });
    expect(pricing.activePlan).toHaveBeenCalledWith('weekly');
    expect(pricing.activePlan).toHaveBeenCalledWith('day');
    expect(insurance.quote).toHaveBeenCalledWith({ coverage: 'full', planCode: 'weekly' });
    expect(insurance.quote).toHaveBeenCalledTimes(1);
    expect(q).toEqual({
      planCode: 'weekly', quantity: 2, coverage: 'full', planUnitCents: 25000, planCents: 50000, insuranceCents: 2500, totalCents: 52500,
      excessDayCents: 6000, periodDays: 14,
    });
  });

  it('quantidade acima do limite do plano → 400 validation-error em quantity', async () => {
    const e = await problem(svc.quote('h1', { planCode: 'weekly', coverage: 'basic', quantity: 5 }));
    expect(e.getStatus()).toBe(400);
    const body = e.getResponse() as { slug: string; errors?: Array<{ field: string }> };
    expect(body.slug).toBe('validation-error');
    expect(body.errors?.map((x) => x.field)).toEqual(['quantity']);
    expect(pricing.activePlan).not.toHaveBeenCalled();
  });

  it('mensal até 3 e diária até 30', async () => {
    await expect(svc.quote('h1', { planCode: 'monthly', coverage: 'basic', quantity: 3 })).resolves.toMatchObject({ periodDays: 90 });
    expect((await problem(svc.quote('h1', { planCode: 'monthly', coverage: 'basic', quantity: 4 }))).getStatus()).toBe(400);
    await expect(svc.quote('h1', { planCode: 'day', coverage: 'basic', quantity: 30 })).resolves.toMatchObject({ periodDays: 30 });
  });

  it('entrega de chegada → 404', async () => {
    prisma.handover.findUnique.mockResolvedValue({ id: 'h1', type: 'return_depot' } as any);
    const e = await problem(svc.quote('h1', { planCode: 'day', coverage: 'basic', quantity: 1 }));
    expect(e.getStatus()).toBe(404);
    expect((e.getResponse() as { slug: string }).slug).toBe('not-found');
  });

  it('entrega inexistente → 404', async () => {
    prisma.handover.findUnique.mockResolvedValue(null);
    expect((await problem(svc.quote('hx', { planCode: 'day', coverage: 'basic', quantity: 1 }))).getStatus()).toBe(404);
  });
});
