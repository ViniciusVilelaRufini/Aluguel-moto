import { ProblemException } from '../../common/problem';
import { loadV2Config } from '../../config/v2-config';
import { SubscriptionsService } from './subscriptions.service';

/** Contrato v2, fix round 1: pausa/retomada com o gateway como fonte da verdade (I1), ciclo de vida (C1), moto fixa (I2/M9). */

type Row = Record<string, any>;
const DAY = 86_400_000;

/** Casa um `where` simples do Prisma (igualdade, in, lte, gt, NOT). */
function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, cond]) => {
    if (k === 'NOT') return !matches(row, cond);
    const v = row[k];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond) return cond.in.includes(v);
      if ('lte' in cond) return v != null && v <= cond.lte;
      if ('gt' in cond) return v != null && v > cond.gt;
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
    findMany: jest.fn(async ({ where } = {}) => rows.filter((r) => matches(r, where)).map((r) => ({ ...r }))),
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
  };
}

function setup(sub: Row, opts: { vehicles?: Row[]; others?: Row[] } = {}) {
  const now = new Date();
  const base = {
    id: 's1', customerId: 'c1', planCode: 'weekly', status: 'active', cardId: null, priceCents: 24900, currentPeriodStart: new Date(now.getTime() - DAY),
    currentPeriodEnd: new Date(now.getTime() + 6 * DAY), cancelAtPeriodEnd: false, canceledAt: null, pausedAt: null, pauseEndsAt: null, pausesUsedInPeriod: 0,
    assignedVehicleId: null, assignedVehicleAt: null, createdAt: now, updatedAt: now,
  };
  const subscription = table([{ ...base, ...sub }, ...(opts.others ?? [])]);
  const prisma: any = {
    subscription,
    rental: { findFirst: jest.fn(async () => null) },
    paymentCard: { findUnique: jest.fn(async () => null) },
    payment: { findFirst: jest.fn(async () => null) },
    vehicle: table(opts.vehicles ?? []),
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const provider: any = { setSubscriptionPaused: jest.fn(async () => undefined), cancelSubscription: jest.fn() };
  const customers: any = { providerRef: jest.fn(async () => 'pre-1') };
  const svc = new SubscriptionsService(prisma, provider, {} as any, customers, {} as any, { record: jest.fn() } as any, loadV2Config());
  return { svc, prisma, provider, row: subscription.rows[0] };
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
