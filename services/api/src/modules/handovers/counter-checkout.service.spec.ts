import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { EV } from '../../common/events';
import { ProblemException } from '../../common/problem';
import { CounterCheckoutDto } from './counter-checkout.dto';
import { CounterCheckoutService } from './counter-checkout.service';
import { HANDOVER_CONTRACT_KEY } from './handovers.dto';
import { ACCEPT_LOCK_SCOPE } from './handovers.service';

describe('CounterCheckoutService.quote', () => {
  const prisma = mockDeep<PrismaClient>();
  const plans: Record<string, unknown> = {
    day: { code: 'day', unit: 'day', unitPriceCents: 6000 },
    weekly: { code: 'weekly', unit: 'week', unitPriceCents: 25000 },
    monthly: { code: 'monthly', unit: 'month', unitPriceCents: 80000 },
  };
  const pricing = { activePlan: jest.fn((code: string) => Promise.resolve(plans[code])) };
  const insurance = { quote: jest.fn().mockResolvedValue({ premiumCents: 2500 }) };
  const svc = new CounterCheckoutService(prisma as any, pricing as any, insurance as any, {} as any, {} as any, {} as any, {} as any);
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

describe('HANDOVER_CONTRACT_KEY', () => {
  it.each(['contracts/5b1e7c3a-2f4d-4a8e-9c11-3d2e1f0a9b8c.jpg', 'contracts/abc.png', 'contracts/2026/x_y-z.webp'])('aceita %s', (k) => {
    expect(HANDOVER_CONTRACT_KEY.test(k)).toBe(true);
  });
  it.each(['contracts/../handovers/a.jpg', 'contracts/a..jpg', 'handovers/a.jpg', 'returns/a.jpg', '/contracts/a.jpg', 'contracts/', 'contracts/a b.jpg', 'x/contracts/a.jpg'])(
    'recusa %s',
    (k) => {
      expect(HANDOVER_CONTRACT_KEY.test(k)).toBe(false);
    },
  );
});

describe('CounterCheckoutService.checkout', () => {
  const HO_ID = '55555555-5555-4555-8555-555555555555';
  const RES_ID = '44444444-4444-4444-8444-444444444444';
  const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
  const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
  const STAFF_ID = '12121212-1212-4212-8212-121212121212';
  const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
  const RENTAL_ID = '88888888-8888-4888-8888-888888888888';
  const POLICY_ID = '77777777-7777-4777-8777-777777777777';
  const operator = { pool: 'staff', sub: 'op', email: 'op@volti.test', groups: ['campo'], userId: STAFF_ID, staffId: STAFF_ID } as any;
  const dayPlan = { id: 'pd', code: 'day', name: 'Diária', unit: 'day', unlockFeeCents: 0, unitPriceCents: 6000, pausePerMinuteCents: 0, recurring: false, active: true };
  const dto = (over: object = {}) =>
    ({ planCode: 'day', quantity: 1, coverage: 'basic', contractPhotoKeys: ['contracts/c1.jpg'], payment: { method: 'cash', amountCents: 7500 }, ...over }) as any;
  const handover = (over: object = {}) => ({
    id: HO_ID, type: 'pickup', status: 'pending_customer', depotId: DEPOT_ID, vehicleId: VEHICLE_ID, rentalId: null, reservationId: RES_ID,
    reservation: { id: RES_ID, customerId: CUSTOMER_ID }, ...over,
  });
  const rentalRow = {
    id: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, planCode: 'day', coverage: 'basic', status: 'active', startedAt: new Date(), pausedAt: null,
    pausedSecondsAcc: 0, endedAt: null, prepaidUntil: new Date(Date.now() + 86_400_000),
    priceSnapshot: {
      unit: 'day', unlockFeeCents: 0, unitPriceCents: 6000, pausePerMinuteCents: 0, insurancePremiumCents: 1500, coverage: 'basic', subscriptionCovered: false,
      counter: { quantity: 1, prepaidCents: 7500, excessDayCents: 6000 },
    },
    costCents: 0, breakdown: null, couponCode: null, depositId: 'd1', insurancePolicyId: POLICY_ID, paymentId: 'p1', endZoneId: null, returnPhotoObjectKey: null,
    forceEndReason: null, forcedEndById: null, rating: null, speedLimitKmh: 32, createdAt: new Date(), updatedAt: new Date(), vehicle: { code: 'VLT-0001' },
  };

  let prisma: ReturnType<typeof mockDeep<PrismaClient>>;
  let pricing: { activePlan: jest.Mock };
  let insurance: { quote: jest.Mock; registerRemittance: jest.Mock };
  let starter: { start: jest.Mock };
  let locks: { begin: jest.Mock; abort: jest.Mock; complete: jest.Mock };
  let audit: { record: jest.Mock };
  let events: { emit: jest.Mock };
  let svc: CounterCheckoutService;
  const problem = (p: Promise<unknown>) =>
    p.then(
      () => {
        throw new Error('esperava erro');
      },
      (e: ProblemException) => e,
    );
  const slugOf = (e: ProblemException) => (e.getResponse() as { slug: string }).slug;
  const detailOf = (e: ProblemException) => (e.getResponse() as { detail: string }).detail;
  const started = () => ({ status: 201, body: { outcome: 'started', rental: { id: RENTAL_ID, insurancePolicyId: POLICY_ID }, deposit: { id: 'd1' } } });

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    pricing = { activePlan: jest.fn().mockResolvedValue(dayPlan) };
    insurance = { quote: jest.fn().mockResolvedValue({ premiumCents: 1500 }), registerRemittance: jest.fn().mockResolvedValue(undefined) };
    starter = { start: jest.fn().mockResolvedValue(started()) };
    locks = { begin: jest.fn().mockResolvedValue({ state: 'new' }), abort: jest.fn().mockResolvedValue(undefined), complete: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    events = { emit: jest.fn() };
    svc = new CounterCheckoutService(prisma as any, pricing as any, insurance as any, starter as any, locks as any, audit as any, events as any);
    prisma.handover.findUnique.mockResolvedValue(handover() as any);
    prisma.handover.updateMany.mockResolvedValue({ count: 1 });
    prisma.rental.findUnique.mockResolvedValue(rentalRow as any);
  });

  it('sucesso: chama start com counter, AuditLog rental.counter_checkout sem dado pessoal, handover.updated accepted e repasse do seguro', async () => {
    const r = await svc.checkout(operator, HO_ID, dto({ payment: { method: 'counter_pix', amountCents: 7500, reference: 'E1' } }));
    expect(r).toEqual({ id: RENTAL_ID, insurancePolicyId: POLICY_ID });
    expect(starter.start).toHaveBeenCalledTimes(1);
    const [actor, startDto, key, opts] = starter.start.mock.calls[0];
    expect(actor).toBe(operator);
    expect(startDto).toEqual({ vehicleId: VEHICLE_ID, planCode: 'day', coverage: 'basic', depositMethod: 'card' });
    expect(key).toBe(`counter:${HO_ID}`);
    expect(opts.fromHandover).toEqual({ reservationId: RES_ID, handoverId: HO_ID });
    expect(opts.counter).toMatchObject({
      customerId: CUSTOMER_ID, operatorId: STAFF_ID, periodSeconds: 86_400, contractPhotoKeys: ['contracts/c1.jpg'],
      payment: { method: 'counter_pix', amountCents: 7500, reference: 'E1' },
      // C7: sem caução → caução de balcão de valor 0 com o método do pagamento.
      deposit: { method: 'counter_pix', amountCents: 0 },
      snapshot: { counter: { quantity: 1, prepaidCents: 7500, excessDayCents: 6000 }, unlockFeeCents: 0 },
    });
    expect(locks.begin).toHaveBeenCalledWith(ACCEPT_LOCK_SCOPE, HO_ID, 'accept');
    expect(locks.abort).toHaveBeenCalledWith(ACCEPT_LOCK_SCOPE, HO_ID);
    expect(audit.record).toHaveBeenCalledTimes(1);
    const entry = audit.record.mock.calls[0][0];
    expect(entry).toMatchObject({ actor: operator, action: 'rental.counter_checkout', entityType: 'Rental', entityId: RENTAL_ID });
    expect(entry.metadata).toEqual({ handoverId: HO_ID, rentalId: RENTAL_ID, planCode: 'day', quantity: 1, paymentMethod: 'counter_pix', amountCents: 7500, depositCents: 0 });
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_UPDATED, { handoverId: HO_ID, status: 'accepted', customerId: CUSTOMER_ID, depotId: DEPOT_ID });
    expect(insurance.registerRemittance).toHaveBeenCalledWith(POLICY_ID);
  });

  it('falha no repasse do seguro só loga (o aluguel já começou)', async () => {
    insurance.registerRemittance.mockRejectedValue(new Error('seguradora fora'));
    await expect(svc.checkout(operator, HO_ID, dto())).resolves.toMatchObject({ id: RENTAL_ID });
  });

  it('caução informada vai para o start como recebida', async () => {
    await svc.checkout(operator, HO_ID, dto({ deposit: { method: 'cash', amountCents: 20000, reference: 'R' } }));
    expect(starter.start.mock.calls[0][3].counter.deposit).toEqual({ method: 'cash', amountCents: 20000, reference: 'R' });
    expect(audit.record.mock.calls[0][0].metadata.depositCents).toBe(20000);
  });

  it('valor diferente da cotação → 422 counter-amount-mismatch, start não chamado', async () => {
    const e = await problem(svc.checkout(operator, HO_ID, dto({ payment: { method: 'cash', amountCents: 7499 } })));
    expect(e.getStatus()).toBe(422);
    expect(slugOf(e)).toBe('counter-amount-mismatch');
    expect(detailOf(e)).toBe('O valor não confere com o calculado. Atualize o valor e tente de novo.');
    expect(starter.start).not.toHaveBeenCalled();
    expect(locks.begin).not.toHaveBeenCalled();
  });

  it('quantidade acima do limite do plano → 400, start não chamado', async () => {
    const e = await problem(svc.checkout(operator, HO_ID, dto({ planCode: 'monthly', quantity: 4 })));
    expect(e.getStatus()).toBe(400);
    expect(starter.start).not.toHaveBeenCalled();
  });

  it('sem fotos → 422 contract-photos-required', async () => {
    for (const keys of [[], undefined]) {
      const e = await problem(svc.checkout(operator, HO_ID, dto({ contractPhotoKeys: keys })));
      expect(e.getStatus()).toBe(422);
      expect(slugOf(e)).toBe('contract-photos-required');
      expect(detailOf(e)).toBe('Fotografe o contrato assinado (1 a 4 fotos).');
    }
    expect(starter.start).not.toHaveBeenCalled();
  });

  it('atalho de teste (opts.test) dispensa as fotos', async () => {
    await expect(svc.checkout(operator, HO_ID, dto({ contractPhotoKeys: [] }), { test: true })).resolves.toMatchObject({ id: RENTAL_ID });
    expect(starter.start.mock.calls[0][3].counter.contractPhotoKeys).toEqual([]);
  });

  it('fotos fora de contracts/ → 400 (DTO)', async () => {
    const errorsFor = async (keys: unknown) => validate(plainToInstance(CounterCheckoutDto, { ...dto(), contractPhotoKeys: keys }));
    expect(await errorsFor(['contracts/5b1e7c3a-2f4d-4a8e-9c11-3d2e1f0a9b8c.jpg'])).toHaveLength(0);
    expect(await errorsFor(['handovers/a.jpg'])).not.toHaveLength(0);
    expect(await errorsFor(['contracts/../handovers/a.jpg'])).not.toHaveLength(0);
    expect(await errorsFor(['a', 'b', 'c', 'd', 'e'].map((x) => `contracts/${x}.jpg`))).not.toHaveLength(0);
  });

  it('DTO: método fora do balcão e caução negativa → erro; caução 0 vale', async () => {
    expect(await validate(plainToInstance(CounterCheckoutDto, dto({ payment: { method: 'card', amountCents: 7500 } })))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CounterCheckoutDto, dto({ deposit: { method: 'cash', amountCents: -1 } })))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CounterCheckoutDto, dto({ deposit: { method: 'cash', amountCents: 0 } })))).toHaveLength(0);
  });

  it('consentimento revogado → 422 location-consent-required com o texto do balcão, lastError gravado', async () => {
    starter.start.mockRejectedValue(new ProblemException(403, 'location-consent-required', 'Autorize o uso da localização durante o aluguel para continuar.'));
    const e = await problem(svc.checkout(operator, HO_ID, dto()));
    expect(e.getStatus()).toBe(422);
    expect(slugOf(e)).toBe('location-consent-required');
    expect(detailOf(e)).toBe('Peça ao cliente para permitir a localização no app.');
    expect(prisma.handover.updateMany).toHaveBeenCalledWith({ where: { id: HO_ID, status: 'pending_customer' }, data: { lastError: 'location-consent-required' } });
    expect(audit.record).not.toHaveBeenCalled();
  });

  it.each(['canceled', 'disputed'])('entrega %s → 422 handover-not-pending', async (status) => {
    prisma.handover.findUnique.mockResolvedValue(handover({ status }) as any);
    const e = await problem(svc.checkout(operator, HO_ID, dto()));
    expect(e.getStatus()).toBe(422);
    expect(slugOf(e)).toBe('handover-not-pending');
    expect(starter.start).not.toHaveBeenCalled();
  });

  it('entrega inexistente ou de chegada → 404', async () => {
    prisma.handover.findUnique.mockResolvedValue(null);
    expect((await problem(svc.checkout(operator, HO_ID, dto()))).getStatus()).toBe(404);
    prisma.handover.findUnique.mockResolvedValue(handover({ type: 'return_depot', reservation: null }) as any);
    expect((await problem(svc.checkout(operator, HO_ID, dto()))).getStatus()).toBe(404);
    expect(starter.start).not.toHaveBeenCalled();
  });

  it('moto já alugada → 409 vehicle-unavailable vindo do start, lastError gravado e evento pending_customer', async () => {
    starter.start.mockRejectedValue(new ProblemException(409, 'vehicle-unavailable', 'Esta moto não está disponível.'));
    const e = await problem(svc.checkout(operator, HO_ID, dto()));
    expect(e.getStatus()).toBe(409);
    expect(slugOf(e)).toBe('vehicle-unavailable');
    expect(prisma.handover.updateMany).toHaveBeenCalledWith({ where: { id: HO_ID, status: 'pending_customer' }, data: { lastError: 'vehicle-unavailable' } });
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_UPDATED, expect.objectContaining({ status: 'pending_customer', lastError: 'vehicle-unavailable' }));
    expect(locks.abort).toHaveBeenCalledWith(ACCEPT_LOCK_SCOPE, HO_ID);
  });

  it('moto sem conexão → 409 vehicle-offline com o texto do aceite; 402 do start vira 422', async () => {
    starter.start.mockRejectedValueOnce(new ProblemException(409, 'vehicle-offline', 'A moto não respondeu ao desbloqueio. Nada foi cobrado e a caução foi liberada.'));
    const off = await problem(svc.checkout(operator, HO_ID, dto()));
    expect(off.getStatus()).toBe(409);
    expect(detailOf(off)).not.toMatch(/caução foi liberada/);
    starter.start.mockRejectedValueOnce(new ProblemException(402, 'deposit-not-held', 'x'));
    expect((await problem(svc.checkout(operator, HO_ID, dto()))).getStatus()).toBe(422);
  });

  it('já aceita → devolve o mesmo aluguel sem chamar start', async () => {
    prisma.handover.findUnique.mockResolvedValue(handover({ status: 'accepted', rentalId: RENTAL_ID }) as any);
    const r = await svc.checkout(operator, HO_ID, dto({ payment: { method: 'cash', amountCents: 1 } }));
    expect(r).toMatchObject({ id: RENTAL_ID, prepaidUntil: expect.any(String) });
    expect(starter.start).not.toHaveBeenCalled();
    expect(locks.begin).not.toHaveBeenCalled();
  });

  it('start falha mas outra tentativa já aceitou a entrega → converge no mesmo aluguel', async () => {
    starter.start.mockRejectedValue(new ProblemException(409, 'vehicle-unavailable', 'Esta moto não está disponível.'));
    prisma.handover.findUnique.mockResolvedValueOnce(handover() as any).mockResolvedValueOnce(handover({ status: 'accepted', rentalId: RENTAL_ID }) as any);
    await expect(svc.checkout(operator, HO_ID, dto())).resolves.toMatchObject({ id: RENTAL_ID });
    expect(prisma.handover.updateMany).not.toHaveBeenCalled();
  });

  it('start falha porque a entrega foi cancelada no meio → 422 handover-not-pending, sem lastError', async () => {
    starter.start.mockRejectedValue(new ProblemException(422, 'handover-not-pending', 'x'));
    prisma.handover.findUnique.mockResolvedValueOnce(handover() as any).mockResolvedValueOnce(handover({ status: 'canceled' }) as any);
    const e = await problem(svc.checkout(operator, HO_ID, dto()));
    expect(slugOf(e)).toBe('handover-not-pending');
    expect(prisma.handover.updateMany).not.toHaveBeenCalled();
  });

  it('concurrent checkouts with different keys converge', async () => {
    let state: 'pending_customer' | 'accepted' = 'pending_customer';
    prisma.handover.findUnique.mockImplementation((() => Promise.resolve(handover(state === 'accepted' ? { status: 'accepted', rentalId: RENTAL_ID } : {}))) as any);
    let held = false;
    locks.begin.mockImplementation(async () => {
      if (held) return { state: 'in_progress' };
      held = true;
      return { state: 'new' };
    });
    locks.abort.mockImplementation(async () => {
      held = false;
    });
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    starter.start.mockImplementation(async () => {
      await gate;
      state = 'accepted';
      return started();
    });

    const first = svc.checkout(operator, HO_ID, dto());
    while (starter.start.mock.calls.length === 0) await new Promise((r) => setImmediate(r));
    const second = await problem(svc.checkout(operator, HO_ID, dto()));
    expect(second.getStatus()).toBe(409);
    expect(slugOf(second)).toBe('conflict');
    release();
    await expect(first).resolves.toMatchObject({ id: RENTAL_ID });
    const third = await svc.checkout(operator, HO_ID, dto());
    expect(third).toMatchObject({ id: RENTAL_ID });
    expect(starter.start).toHaveBeenCalledTimes(1);
  });
});
