import { ProblemException } from '../../common/problem';
import { loadV2Config } from '../../config/v2-config';
import { PaymentProviderError, RefundRejectedError } from './provider/payment-provider';
import { SubscriptionsService } from './subscriptions.service';

/** Contrato v2, fix round 1: pausa/retomada com o gateway como fonte da verdade (I1), ciclo de vida (C1), moto fixa (I2/M9). */

type Row = Record<string, any>;
const DAY = 86_400_000;

/** Casa um `where` simples do Prisma (igualdade, in, lte, gt, NOT). */
function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, cond]) => {
    if (k === 'NOT') return !matches(row, cond);
    if (k === 'OR') return (cond as Row[]).some((c) => matches(row, c));
    if (k === 'AND') return (cond as Row[]).every((c) => matches(row, c));
    const v = row[k];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond) return cond.in.includes(v);
      if ('lte' in cond) return v != null && v <= cond.lte;
      if ('gt' in cond) return v != null && v > cond.gt;
      if ('not' in cond) return cond.not === null ? v != null : v !== cond.not;
      return false;
    }
    return v instanceof Date && cond instanceof Date ? v.getTime() === cond.getTime() : v === cond;
  });
}

function table(rows: Row[] = []) {
  const apply = (r: Row, data: Row) => {
    for (const [k, v] of Object.entries(data)) r[k] = v && typeof v === 'object' && 'increment' in v ? r[k] + v.increment : v;
  };
  return {
    rows,
    findUnique: jest.fn(async ({ where }) => { const r = rows.find((x) => matches(x, where)); return r ? { ...r } : null; }),
    findFirst: jest.fn(async ({ where }) => { const r = rows.find((x) => matches(x, where)); return r ? { ...r } : null; }),
    findMany: jest.fn(async ({ where, take, orderBy }: Row = {}) => {
      let out = rows.filter((r) => matches(r, where));
      if (orderBy?.id) out = [...out].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return out.slice(0, take ?? out.length).map((r) => ({ ...r }));
    }),
    updateMany: jest.fn(async ({ where, data }) => {
      const hit = rows.filter((r) => matches(r, where));
      hit.forEach((r) => apply(r, data));
      return { count: hit.length };
    }),
    update: jest.fn(async ({ where, data }) => {
      const r = rows.find((x) => matches(x, where))!;
      apply(r, data);
      return { ...r };
    }),
    create: jest.fn(async ({ data }) => {
      const r = { id: `id-${rows.length + 1}`, attempts: 0, ...data };
      rows.push(r);
      return { ...r };
    }),
  };
}

function setup(sub: Row, opts: { vehicles?: Row[]; others?: Row[]; payments?: Row[] } = {}) {
  const now = new Date();
  const base = {
    id: 's1', customerId: 'c1', planCode: 'weekly', status: 'active', cardId: null, priceCents: 24900, currentPeriodStart: new Date(now.getTime() - DAY),
    currentPeriodEnd: new Date(now.getTime() + 6 * DAY), cancelAtPeriodEnd: false, canceledAt: null, pausedAt: null, pauseEndsAt: null, pausesUsedInPeriod: 0,
    assignedVehicleId: null, assignedVehicleAt: null, gatewayCancelPendingAt: null, gatewayCancelAttempts: 0, createdAt: now, updatedAt: now,
  };
  const subscription = table([{ ...base, ...sub }, ...(opts.others ?? [])]);
  const prisma: any = {
    subscription,
    rental: { findFirst: jest.fn(async () => null) },
    paymentCard: { findUnique: jest.fn(async () => null) },
    payment: { ...table(opts.payments ?? []), findFirst: jest.fn(async () => null) },
    paymentRefund: table([]),
    vehicle: table(opts.vehicles ?? []),
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const provider: any = {
    setSubscriptionPaused: jest.fn(async () => undefined),
    cancelSubscription: jest.fn(async () => undefined),
    refund: jest.fn(async (i: any) => ({ providerRefundId: 'ref-1', refundedCents: i.amountCents, status: 'refunded' })),
  };
  const customers: any = { providerRef: jest.fn(async () => 'pre-1') };
  const state: any = {
    claimRefund: jest.fn(async (tx: any, read: Row, to: string, refundedCents: number) => {
      const res = await tx.payment.updateMany({ where: { id: read.id, status: read.status, refundedCents: read.refundedCents }, data: { status: to, refundedCents } });
      return res.count === 1;
    }),
    emitUpdated: jest.fn(),
    needsReview: jest.fn(),
  };
  const billing: any = { markDelinquent: jest.fn(async () => undefined), clearDelinquencyIfSettled: jest.fn(async () => undefined) };
  const svc = new SubscriptionsService(prisma, provider, state, customers, billing, { record: jest.fn() } as any, loadV2Config());
  return { svc, prisma, provider, billing, customers, state, row: subscription.rows[0] };
}

async function problem(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof ProblemException) return { status: e.getStatus(), slug: e.slug };
    throw e;
  }
  throw new Error('não lançou');
}

describe('SubscriptionsService — gateway como fonte da verdade das datas (I1)', () => {
  it('cenário A: pausar e retomar empurra ao gateway a nova próxima cobrança (= fim do período estendido)', async () => {
    const { svc, provider, row } = setup({});
    const endBefore = row.currentPeriodEnd.getTime();
    await svc.pause('c1', 's1', 2);
    expect(row.status).toBe('paused');
    expect(provider.setSubscriptionPaused).toHaveBeenLastCalledWith({ providerSubscriptionId: 'pre-1', paused: true, nextChargeAt: undefined });
    row.pausedAt = new Date(Date.now() - DAY);
    const out = await svc.resume('c1', 's1');
    expect(row.status).toBe('active');
    expect(row.currentPeriodEnd.getTime() - endBefore).toBeGreaterThanOrEqual(DAY - 1000);
    expect(provider.setSubscriptionPaused).toHaveBeenLastCalledWith({ providerSubscriptionId: 'pre-1', paused: false, nextChargeAt: row.currentPeriodEnd });
    expect(out.nextChargeAt).toBe(row.currentPeriodEnd.toISOString());
  });

  it('cenário B: gateway falha na pausa → 503 gateway-unavailable e nada muda', async () => {
    const { svc, provider, row } = setup({});
    provider.setSubscriptionPaused.mockRejectedValueOnce(new Error('timeout'));
    expect(await problem(svc.pause('c1', 's1', 2))).toEqual({ status: 503, slug: 'gateway-unavailable' });
    expect(row).toMatchObject({ status: 'active', pausedAt: null, pauseEndsAt: null, pausesUsedInPeriod: 0 });
  });

  it('gateway falha na retomada → 503 e continua pausada com as datas originais', async () => {
    const pausedAt = new Date(Date.now() - DAY);
    const { svc, provider, row } = setup({ status: 'paused', pausedAt, pauseEndsAt: new Date(pausedAt.getTime() + 3 * DAY), pausesUsedInPeriod: 1 });
    const endBefore = row.currentPeriodEnd;
    provider.setSubscriptionPaused.mockRejectedValueOnce(new Error('503'));
    expect(await problem(svc.resume('c1', 's1'))).toEqual({ status: 503, slug: 'gateway-unavailable' });
    expect(row).toMatchObject({ status: 'paused', pausedAt, currentPeriodEnd: endBefore });
    // A retomada automática só registra e tenta de novo depois.
    provider.setSubscriptionPaused.mockRejectedValueOnce(new Error('503'));
    row.pauseEndsAt = new Date(Date.now() - 1000);
    expect(await svc.autoResume(new Date())).toBe(0);
    expect(row.status).toBe('paused');
    expect(await svc.autoResume(new Date())).toBe(1);
    expect(row.status).toBe('active');
  });

  it('cenário C: renovação paga durante a pausa mantém a pausa e o contador; a retomada soma o tempo pausado ao período novo', async () => {
    const pausedAt = new Date(Date.now() - DAY);
    const { svc, row } = setup({ status: 'paused', pausedAt, pauseEndsAt: new Date(pausedAt.getTime() + 3 * DAY), pausesUsedInPeriod: 1 });
    const oldEnd = row.currentPeriodEnd.getTime();
    await (svc as any).renew({ ...row });
    expect(row).toMatchObject({ status: 'paused', pausesUsedInPeriod: 1 });
    expect(row.currentPeriodEnd.getTime()).toBe(oldEnd + 7 * DAY);
    await svc.resume('c1', 's1');
    expect(row.currentPeriodEnd.getTime() - (oldEnd + 7 * DAY)).toBeGreaterThanOrEqual(DAY - 1000);
  });
});

describe('SubscriptionsService — ciclo de vida (C1) e moto fixa (I2/M9)', () => {
  it('fecha cancelamento agendado vencido e expira sem renovação além da carência', async () => {
    const now = new Date();
    const { svc, prisma } = setup(
      { cancelAtPeriodEnd: true, currentPeriodEnd: new Date(now.getTime() - 1000) },
      { others: [{ id: 's2', customerId: 'c2', planCode: 'monthly', status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: new Date(now.getTime() - 4 * DAY), canceledAt: null }] },
    );
    expect(await svc.expireStale(now)).toBe(2);
    expect(prisma.subscription.rows.map((r: Row) => r.status)).toEqual(['canceled', 'expired']);
  });

  it('fix round 2 (achado 3): expireStale filtra a carência no WHERE e pagina — 250 dentro da carência não escondem a vencida', async () => {
    const now = new Date();
    const fresh = Array.from({ length: 250 }, (_, i) => ({
      id: `a${String(i).padStart(3, '0')}`, customerId: `c${i}`, planCode: 'weekly', status: 'active', cancelAtPeriodEnd: false, canceledAt: null,
      currentPeriodEnd: new Date(now.getTime() - 3600_000), // venceu há 1 h: ainda na carência de 72 h
    }));
    const due = Array.from({ length: 205 }, (_, i) => ({
      id: `z${String(i).padStart(3, '0')}`, customerId: `d${i}`, planCode: 'weekly', status: 'past_due', cancelAtPeriodEnd: false, canceledAt: null,
      currentPeriodEnd: new Date(now.getTime() - 4 * DAY),
    }));
    const { svc, prisma } = setup({ id: '0', status: 'canceled' }, { others: [...fresh, ...due] });
    expect(await svc.expireStale(now)).toBe(205);
    expect(prisma.subscription.rows.filter((r: Row) => r.status === 'expired')).toHaveLength(205);
    expect(prisma.subscription.rows.filter((r: Row) => r.id.startsWith('a') && r.status === 'active')).toHaveLength(250);
    for (const [args] of prisma.subscription.findMany.mock.calls) expect(args.take).toBeLessThanOrEqual(200);
  });

  it('cliente troca a moto fixa no máximo uma vez a cada 24 h; staff não espera', async () => {
    const { svc, row } = setup(
      { assignedVehicleId: 'v1', assignedVehicleAt: new Date(Date.now() - 3600_000) },
      { vehicles: [{ id: 'v1', status: 'free', code: 'VLT-0001' }, { id: 'v2', status: 'free', code: 'VLT-0002' }] },
    );
    const customer: any = { pool: 'customer', customerId: 'c1', userId: 'c1', groups: [] };
    expect(await problem(svc.assignVehicle(customer, 's1', 'v2'))).toEqual({ status: 422, slug: 'subscription-vehicle-cooldown' });
    const staff: any = { pool: 'staff', userId: 'st', staffId: 'st', groups: ['operacao'] };
    await svc.assignVehicle(staff, 's1', 'v2');
    expect(row.assignedVehicleId).toBe('v2');
  });

  it('moto ocupada por outro assinante vigente → 409 antes de qualquer cobrança (I2)', async () => {
    const now = new Date();
    const { svc } = setup(
      {},
      { vehicles: [{ id: 'v9', status: 'free', code: 'VLT-0009' }], others: [{ id: 's9', customerId: 'c9', status: 'active', assignedVehicleId: 'v9', currentPeriodEnd: new Date(now.getTime() + DAY), cancelAtPeriodEnd: false }] },
    );
    expect(await problem((svc as any).assertAssignableByCustomer('c1', 'v9'))).toEqual({ status: 409, slug: 'vehicle-unavailable' });
    expect(await problem((svc as any).assertAssignableByCustomer('c1', 'nope'))).toEqual({ status: 404, slug: 'not-found' });
  });
});

describe('SubscriptionsService.create valida a moto antes de cobrar (fix round 2, I2)', () => {
  function forCreate(vehicles: Row[], others: Row[] = []) {
    const t = setup({ id: 's0', customerId: 'c0', status: 'canceled' }, { vehicles, others });
    t.prisma.customer = { findUnique: jest.fn(async () => ({ id: 'c1', email: 'a@example.com', kycStatus: 'approved', status: 'active', delinquent: false })) };
    t.prisma.pricingPlan = { findFirst: jest.fn(async () => ({ code: 'weekly', unitPriceCents: 24900 })) };
    t.provider.createSubscription = jest.fn();
    t.customers.card = jest.fn(async () => ({ id: 'card-1', providerCardId: 'pc-1', last4: '4242' }));
    t.customers.ensureCustomer = jest.fn(async () => 'cus-1');
    const state = (t.svc as any).state;
    state.create = jest.fn();
    return { ...t, state };
  }

  it.each([
    ['fixa de outro assinante vigente', [{ id: 'v9', status: 'free', code: 'VLT-0009' }], [{ id: 's9', customerId: 'c9', status: 'active', assignedVehicleId: 'v9', currentPeriodEnd: new Date(Date.now() + DAY), cancelAtPeriodEnd: false }], 409],
    ['em uso', [{ id: 'v9', status: 'in_use', code: 'VLT-0009' }], [], 409],
    ['inexistente', [], [], 404],
  ])('moto %s → erro sem chamar o gateway nem criar pagamento/assinatura', async (_label, vehicles, others, status) => {
    const { svc, prisma, provider, state } = forCreate(vehicles as Row[], others as Row[]);
    const rowsBefore = prisma.subscription.rows.length;
    expect((await problem(svc.create('c1', { planCode: 'weekly', vehicleId: 'v9' }))).status).toBe(status);
    expect(provider.createSubscription).not.toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
    expect(prisma.subscription.rows).toHaveLength(rowsBefore);
  });
});

describe('SubscriptionsService — assinatura fechada não reabre (fix round 2, achado 1)', () => {
  const renewal = (over: Row = {}): Row => ({
    id: 'p2', customerId: 'c1', subscriptionId: 's1', kind: 'subscription', method: 'card', status: 'paid', amountCents: 24900, refundedCents: 0,
    providerPaymentId: 'mp-2', idempotencyKey: 'subscription-charge:mp-2', failureReason: null, ...over,
  });

  it.each(['expired', 'canceled'])('cobrança tardia paga em assinatura %s: não reabre, estorna pelo gateway uma vez só e pede o cancelamento de novo', async (status) => {
    const { svc, prisma, provider, row } = setup({ status, currentPeriodEnd: new Date(Date.now() - 5 * DAY) }, { payments: [renewal()] });
    const endBefore = row.currentPeriodEnd;
    await svc.onSubscriptionPaymentChanged(renewal() as any);
    expect(row).toMatchObject({ status, currentPeriodEnd: endBefore });
    expect(provider.refund).toHaveBeenCalledWith({ providerPaymentId: 'mp-2', amountCents: 24900, idempotencyKey: 'subscription-late-refund:p2' });
    expect(prisma.payment.rows[0]).toMatchObject({ status: 'refunded', refundedCents: 24900 });
    expect(prisma.paymentRefund.rows[0]).toMatchObject({ paymentId: 'p2', status: 'succeeded', providerRefundId: 'ref-1', amountCents: 24900 });
    expect(provider.cancelSubscription).toHaveBeenCalledWith({ providerSubscriptionId: 'pre-1' });
    // Webhook repetido (ou o evento `refunded` do próprio estorno): idempotente, sem novo estorno.
    await svc.onSubscriptionPaymentChanged(renewal() as any);
    await svc.onSubscriptionPaymentChanged({ ...renewal(), status: 'refunded' } as any);
    expect(provider.refund).toHaveBeenCalledTimes(1);
    expect(row.status).toBe(status);
  });

  it('cobrança recusada em assinatura expirada não vira past_due nem deixa o cliente inadimplente', async () => {
    const { svc, billing, row } = setup({ status: 'expired', currentPeriodEnd: new Date(Date.now() - 5 * DAY) });
    await svc.onSubscriptionPaymentChanged(renewal({ status: 'failed', failureReason: 'cc_rejected' }) as any);
    expect(row.status).toBe('expired');
    expect(billing.markDelinquent).not.toHaveBeenCalled();
  });

  it('renovação que perde a corrida para o job (expirou entre a leitura e a gravação) também é estornada, sem reabrir', async () => {
    const { svc, prisma, provider, row } = setup({ status: 'past_due', currentPeriodEnd: new Date(Date.now() - 4 * DAY) }, { payments: [renewal()] });
    const stale = { ...row };
    row.status = 'expired'; // o job fechou depois de o webhook ler a assinatura
    prisma.subscription.findUnique.mockResolvedValueOnce(stale);
    await svc.onSubscriptionPaymentChanged(renewal() as any);
    expect(row.status).toBe('expired');
    expect(provider.refund).toHaveBeenCalledTimes(1);
  });

  it('estorno com resultado desconhecido fica pending (a reconciliação de estornos repete); recusa definitiva desfaz e vai para revisão do financeiro', async () => {
    const a = setup({ status: 'expired', currentPeriodEnd: new Date(Date.now() - 5 * DAY) }, { payments: [renewal()] });
    a.provider.refund.mockRejectedValueOnce(new PaymentProviderError('timeout'));
    await a.svc.onSubscriptionPaymentChanged(renewal() as any);
    expect(a.prisma.paymentRefund.rows[0]).toMatchObject({ status: 'pending', attempts: 1, idempotencyKey: 'subscription-late-refund:p2' });
    expect(a.prisma.payment.rows[0].status).toBe('refunded');

    const b = setup({ status: 'expired', currentPeriodEnd: new Date(Date.now() - 5 * DAY) }, { payments: [renewal()] });
    b.provider.refund.mockRejectedValueOnce(new RefundRejectedError('recusado'));
    await b.svc.onSubscriptionPaymentChanged(renewal() as any);
    expect(b.prisma.paymentRefund.rows[0]).toMatchObject({ status: 'needs_review' });
    expect(b.prisma.payment.rows[0]).toMatchObject({ status: 'paid', refundedCents: 0 });
    // Task 14: a revisão vira alerta payment_needs_review (evento do PaymentStateService).
    expect(b.state.needsReview).toHaveBeenCalledWith({ paymentId: 'p2', reason: 'subscription_late_charge_refund_rejected' }, expect.objectContaining({ refundId: expect.any(String) }));
  });

  it('expirar cancela no gateway; falha fica pendente e o job tenta de novo até cancelar', async () => {
    const now = new Date();
    const { svc, provider, row } = setup({ status: 'active', currentPeriodEnd: new Date(now.getTime() - 4 * DAY) });
    provider.cancelSubscription.mockRejectedValueOnce(new Error('timeout')).mockRejectedValueOnce(new Error('503'));
    expect(await svc.expireStale(now)).toBe(1);
    expect(row).toMatchObject({ status: 'expired', gatewayCancelAttempts: 1 });
    expect(row.gatewayCancelPendingAt).toBeInstanceOf(Date);
    expect(await svc.retryGatewayCancellations()).toBe(0);
    expect(row.gatewayCancelAttempts).toBe(2);
    expect(await svc.retryGatewayCancellations()).toBe(1);
    expect(row.gatewayCancelPendingAt).toBeNull();
    expect(provider.cancelSubscription).toHaveBeenCalledTimes(3);
    expect(await svc.retryGatewayCancellations()).toBe(0);
    expect(provider.cancelSubscription).toHaveBeenCalledTimes(3);
  });

  it('exclusão de conta (LGPD) não engole a falha do gateway: fecha localmente e deixa o cancelamento pendente para o job', async () => {
    const { svc, provider, row } = setup({ assignedVehicleId: 'v1' });
    provider.cancelSubscription.mockRejectedValueOnce(new Error('timeout'));
    await svc.closeForAccountDeletion('c1');
    expect(row).toMatchObject({ status: 'canceled', assignedVehicleId: null, gatewayCancelAttempts: 1 });
    expect(row.gatewayCancelPendingAt).toBeInstanceOf(Date);
    expect(await svc.retryGatewayCancellations()).toBe(1);
    expect(row.gatewayCancelPendingAt).toBeNull();
  });

  it('cancelamento agendado (já cancelado no gateway) fecha sem nova chamada ao gateway', async () => {
    const now = new Date();
    const { svc, provider, row } = setup({ cancelAtPeriodEnd: true, currentPeriodEnd: new Date(now.getTime() - 1000) });
    await svc.expireStale(now);
    expect(row.status).toBe('canceled');
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
    expect(row.gatewayCancelPendingAt).toBeNull();
  });
});

describe('SubscriptionsService — renovação paga quita o ciclo recusado (Task 14, fix round 1, I-2)', () => {
  it('as tentativas recusadas do ciclo viram quitadas (payment) e a flag é reavaliada; outra assinatura não é tocada', async () => {
    const t0 = Date.now();
    const failed = (id: string, ago: number, sub = 's1') => ({
      id, customerId: 'c1', subscriptionId: sub, kind: 'subscription', method: 'card', status: 'failed', amountCents: 24900, refundedCents: 0, debtSettledAt: null, createdAt: new Date(t0 - ago),
    });
    const paid = { id: 'p9', customerId: 'c1', subscriptionId: 's1', kind: 'subscription', method: 'card', status: 'paid', amountCents: 24900, refundedCents: 0, providerPaymentId: 'mp-9', idempotencyKey: 'subscription-charge:mp-9', debtSettledAt: null, createdAt: new Date(t0) };
    const { svc, prisma, billing } = setup({ status: 'past_due' }, { payments: [failed('f1', 3 * DAY), failed('f2', DAY), failed('fx', DAY, 's2'), paid] });
    await svc.onSubscriptionPaymentChanged(paid as any);
    const byId = Object.fromEntries(prisma.payment.rows.map((r: any) => [r.id, r]));
    expect(byId.f1).toMatchObject({ debtSettlement: 'payment', debtSettledAt: expect.any(Date) });
    expect(byId.f2).toMatchObject({ debtSettlement: 'payment' });
    expect(byId.fx.debtSettledAt).toBeNull();
    expect(billing.clearDelinquencyIfSettled).toHaveBeenCalledWith('c1');
  });
});
