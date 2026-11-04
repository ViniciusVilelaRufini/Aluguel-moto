import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProblemException } from '../../common/problem';
import { CounterSettlementService } from './counter-settlement.service';
import { DelinquencyService } from './delinquency.service';
import { PaymentStateService } from './payment-state.service';
import { createInMemoryPrisma, type InMemoryPrisma } from './testing/in-memory-prisma';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const RENTAL = '44444444-4444-4444-8444-444444444444';
const staff = { pool: 'staff', userId: '33333333-3333-4333-8333-333333333333', groups: ['campo'], sub: 's', email: 'campo@volti.com.br' } as any;

/**
 * `SELECT ... FOR UPDATE` em memória: a linha fica travada até o fim da transação que a travou; outra transação que pede
 * a mesma linha espera. Sem a trava no código, duas chamadas concorrentes leem o mesmo saldo e as duas passam.
 */
function withRowLocks(db: InMemoryPrisma): string[] {
  const held = new Map<string, Promise<void>>();
  const locked: string[] = [];
  db.$transaction = async (fn: any) => {
    const releases: Array<() => void> = [];
    const tx = Object.create(db);
    tx.$queryRaw = async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.join('?');
      if (sql.includes('FOR UPDATE')) {
        const key = `${/FROM "(\w+)"/.exec(sql)?.[1]}:${values[0]}`;
        while (held.has(key)) await held.get(key);
        let release!: () => void;
        held.set(key, new Promise<void>((r) => (release = () => { held.delete(key); r(); })));
        releases.push(release);
        locked.push(key);
      }
      return [];
    };
    try {
      return await fn(tx);
    } finally {
      releases.forEach((r) => r());
    }
  };
  return locked;
}

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});

async function setup() {
  const db = createInMemoryPrisma();
  const locked = withRowLocks(db);
  await db.customer.create({ data: { id: CUSTOMER, cognitoSub: 'sub', email: 'ana@example.com', name: 'Ana Maria Souza', delinquent: true } });
  await db.customer.create({ data: { id: OTHER, cognitoSub: 'sub2', email: 'bia@example.com', name: 'Bia Lima' } });
  await db.rental.create({ data: { id: RENTAL, customerId: CUSTOMER, status: 'ended' } });
  const events = new EventEmitter2();
  const state = new PaymentStateService(db as any, events);
  const audit = { record: jest.fn(async (entry: any, tx: any = db) => tx.auditLog.create({ data: { action: entry.action, entityId: entry.entityId, metadata: entry.metadata } })) };
  const billing = { clearDelinquencyIfSettled: jest.fn(async () => undefined) };
  const delinquency = new DelinquencyService(db as any, {} as any, state, {} as any, billing as any, audit as any, {} as any, {} as any);
  const svc = new CounterSettlementService(db as any, delinquency, state, billing as any, audit as any);
  return { db, svc, audit, billing, locked };
}

/** Excedente do balcão: `rental` `pending` com método de balcão. */
const counterDebt = (db: InMemoryPrisma, amountCents = 6000, over: Record<string, unknown> = {}) =>
  db.payment.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, kind: 'rental', method: 'cash', status: 'pending', amountCents, idempotencyKey: `counter-excess:${RENTAL}`, ...over } });

const counterDeposit = (db: InMemoryPrisma, over: Record<string, unknown> = {}) =>
  db.deposit.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, method: 'cash', status: 'held', amountCents: 10000, capturedCents: null, refundedCents: 0, ...over } });

async function problem(p: Promise<unknown>): Promise<ProblemException> {
  try {
    await p;
  } catch (err) {
    if (err instanceof ProblemException) return err;
    throw err;
  }
  throw new Error('esperava ProblemException');
}

describe('CounterSettlementService.settle', () => {
  it('quita parcial com dinheiro e depois com a caução', async () => {
    const { db, svc, audit, billing, locked } = await setup();
    const debt = await counterDebt(db);
    const dep = await counterDeposit(db);
    const depositUpdate = jest.spyOn(db.deposit, 'update');

    const a = await svc.settle(staff, debt.id, { amountCents: 2000, method: 'cash', reference: 'R1' });
    expect(a).toMatchObject({ id: debt.id, status: 'pending', outstandingCents: 4000 });
    expect(a.debtSettledAt).toBeUndefined();

    const b = await svc.settle(staff, debt.id, { amountCents: 4000, fromDepositId: dep.id });
    expect(b).toMatchObject({ id: debt.id, status: 'paid', debtSettlement: 'payment', outstandingCents: 0, debtSettledAt: expect.any(String) });
    expect(depositUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ capturedCents: 4000 }) }));
    // Caução com saldo: continua `held` (6000 disponíveis).
    expect(await db.deposit.findUnique({ where: { id: dep.id } })).toMatchObject({ status: 'held', capturedCents: 4000, refundedCents: 0 });

    const parts = await db.payment.findMany({ where: { kind: 'debt_settlement', settlesPaymentId: debt.id }, orderBy: { amountCents: 'asc' } });
    expect(parts).toEqual([
      expect.objectContaining({ status: 'paid', method: 'cash', amountCents: 2000, reference: 'R1', recordedById: staff.userId, depositId: null, customerId: CUSTOMER }),
      expect.objectContaining({ status: 'paid', method: 'cash', amountCents: 4000, depositId: dep.id, recordedById: staff.userId }),
    ]);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'payment.counter_settle', entityType: 'Payment', entityId: debt.id }), expect.anything());
    expect(billing.clearDelinquencyIfSettled).toHaveBeenCalledWith(CUSTOMER);
    expect(locked).toEqual(expect.arrayContaining([`Payment:${debt.id}`, `Deposit:${dep.id}`]));
  });

  it('abater a caução inteira deixa a caução captured', async () => {
    const { db, svc } = await setup();
    const debt = await counterDebt(db, 10000);
    const dep = await counterDeposit(db);
    await svc.settle(staff, debt.id, { amountCents: 10000, fromDepositId: dep.id });
    expect(await db.deposit.findUnique({ where: { id: dep.id } })).toMatchObject({ status: 'captured', capturedCents: 10000 });
  });

  it('valor acima do saldo → 422 counter-amount-mismatch', async () => {
    const { db, svc } = await setup();
    const debt = await counterDebt(db);
    await svc.settle(staff, debt.id, { amountCents: 2000, method: 'counter_pix' });
    const err = await problem(svc.settle(staff, debt.id, { amountCents: 4001, method: 'cash' }));
    expect(err.getStatus()).toBe(422);
    expect(err.slug).toBe('counter-amount-mismatch');
    expect(await db.payment.count({ where: { kind: 'debt_settlement' } })).toBe(1);
  });

  it('valor acima do disponível da caução → 422 counter-amount-mismatch', async () => {
    const { db, svc } = await setup();
    const debt = await counterDebt(db);
    const dep = await counterDeposit(db, { amountCents: 5000, capturedCents: 1000, refundedCents: 1000 });
    const err = await problem(svc.settle(staff, debt.id, { amountCents: 3001, fromDepositId: dep.id }));
    expect([err.getStatus(), err.slug]).toEqual([422, 'counter-amount-mismatch']);
    expect(await db.deposit.findUnique({ where: { id: dep.id } })).toMatchObject({ capturedCents: 1000 });
  });

  it('method e fromDepositId juntos → 400; nenhum → 400', async () => {
    const { db, svc } = await setup();
    const debt = await counterDebt(db);
    const dep = await counterDeposit(db);
    const both = await problem(svc.settle(staff, debt.id, { amountCents: 1000, method: 'cash', fromDepositId: dep.id }));
    expect([both.getStatus(), both.slug]).toEqual([400, 'validation-error']);
    const none = await problem(svc.settle(staff, debt.id, { amountCents: 1000 }));
    expect([none.getStatus(), none.slug]).toEqual([400, 'validation-error']);
  });

  it('débito failed antigo também quita no balcão', async () => {
    const { db, svc } = await setup();
    const debt = await db.payment.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, kind: 'rental', method: 'card', status: 'failed', amountCents: 3000, failureReason: 'cc_rejected' } });
    const out = await svc.settle(staff, debt.id, { amountCents: 3000, method: 'counter_card', reference: 'NSU9' });
    expect(out).toMatchObject({ status: 'failed', debtSettlement: 'payment', outstandingCents: 0 });
    expect(await db.payment.findUnique({ where: { id: debt.id } })).toMatchObject({ status: 'failed', debtSettledAt: expect.any(Date) });
  });

  it('não é dívida em aberto (pago, quitado manualmente, pending de cartão) → 409 debt-not-payable', async () => {
    const { db, svc } = await setup();
    const paid = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'cash', status: 'paid', amountCents: 3000 } });
    // `clearManually` grava `debtSettledAt` e mantém o débito do balcão `pending`: já não é dívida.
    const manual = await counterDebt(db, 3000, { debtSettledAt: new Date(), debtSettlement: 'manual', idempotencyKey: null });
    const gateway = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'pending', amountCents: 3000 } });
    for (const p of [paid, manual, gateway]) {
      const err = await problem(svc.settle(staff, p.id, { amountCents: 1000, method: 'cash' }));
      expect([err.getStatus(), err.slug]).toEqual([409, 'debt-not-payable']);
    }
  });

  it('pagamento inexistente → 404', async () => {
    const { svc } = await setup();
    const err = await problem(svc.settle(staff, '55555555-5555-4555-8555-555555555555', { amountCents: 1000, method: 'cash' }));
    expect(err.getStatus()).toBe(404);
  });

  it('caução de outro cliente → 404; caução que não é do balcão → 409', async () => {
    const { db, svc } = await setup();
    const debt = await counterDebt(db);
    const other = await counterDeposit(db, { customerId: OTHER });
    const card = await counterDeposit(db, { method: 'card' });
    expect((await problem(svc.settle(staff, debt.id, { amountCents: 1000, fromDepositId: other.id }))).getStatus()).toBe(404);
    const err = await problem(svc.settle(staff, debt.id, { amountCents: 1000, fromDepositId: card.id }));
    expect([err.getStatus(), err.slug]).toEqual([409, 'conflict']);
  });

  it('quitações concorrentes nunca passam do saldo', async () => {
    const { db, svc } = await setup();
    const debt = await counterDebt(db);
    const results = await Promise.allSettled([
      svc.settle(staff, debt.id, { amountCents: 6000, method: 'cash' }),
      svc.settle(staff, debt.id, { amountCents: 6000, method: 'counter_pix' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')!;
    expect([(rejected.reason as ProblemException).getStatus(), (rejected.reason as ProblemException).slug]).toEqual([409, 'debt-not-payable']);
    expect(await db.payment.count({ where: { kind: 'debt_settlement' } })).toBe(1);
  });

  it('assinatura ainda em cobrança automática (past_due) → 409 debt-in-collection, nada gravado', async () => {
    const { db, svc } = await setup();
    const sub = await db.subscription.create({ data: { customerId: CUSTOMER, planCode: 'weekly', status: 'past_due' } });
    const debt = await db.payment.create({ data: { customerId: CUSTOMER, subscriptionId: sub.id, kind: 'subscription', method: 'card', status: 'failed', amountCents: 5000, failureReason: 'cc_rejected' } });
    const err = await problem(svc.settle(staff, debt.id, { amountCents: 5000, method: 'cash' }));
    expect([err.getStatus(), err.slug]).toEqual([409, 'debt-in-collection']);
    expect(await db.payment.count({ where: { kind: 'debt_settlement' } })).toBe(0);
  });

  it('débito de aluguel failed quita mesmo com outra liquidação do cliente em retentativa', async () => {
    const { db, svc } = await setup();
    const retrying = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'pending', amountCents: 2000 } });
    await db.settlementProgress.create({ data: { paymentId: retrying.id, attempts: 2 } });
    const debt = await db.payment.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, kind: 'rental', method: 'card', status: 'failed', amountCents: 3000, failureReason: 'cc_rejected' } });
    const out = await svc.settle(staff, debt.id, { amountCents: 3000, method: 'cash' });
    expect(out).toMatchObject({ status: 'failed', debtSettlement: 'payment', outstandingCents: 0 });
  });
});

describe('CounterSettlementService.refund', () => {
  it('devolução fecha a caução quando o disponível zera', async () => {
    const { db, svc, audit } = await setup();
    const dep = await counterDeposit(db, { capturedCents: 4000 });
    const out = await svc.refund(staff, dep.id, { amountCents: 6000, reference: 'PIX1' });
    expect(out).toMatchObject({ id: dep.id, refundedCents: 6000, capturedCents: 4000, status: 'captured' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'deposit.counter_refund', entityType: 'Deposit', entityId: dep.id }), expect.anything());
  });

  it('devolução total sem abatimento → released; parcial continua held', async () => {
    const { db, svc } = await setup();
    const dep = await counterDeposit(db);
    expect(await svc.refund(staff, dep.id, { amountCents: 4000 })).toMatchObject({ refundedCents: 4000, status: 'held' });
    expect(await svc.refund(staff, dep.id, { amountCents: 6000 })).toMatchObject({ refundedCents: 10000, status: 'released' });
  });

  it('refund never exceeds available under concurrency', async () => {
    const { db, svc, locked } = await setup();
    const dep = await counterDeposit(db, { capturedCents: 4000 });
    const results = await Promise.allSettled([svc.refund(staff, dep.id, { amountCents: 6000 }), svc.refund(staff, dep.id, { amountCents: 6000 })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')!;
    expect([(rejected.reason as ProblemException).getStatus(), (rejected.reason as ProblemException).slug]).toEqual([422, 'counter-amount-mismatch']);
    expect(await db.deposit.findUnique({ where: { id: dep.id } })).toMatchObject({ refundedCents: 6000, status: 'captured' });
    expect(locked).toContain(`Deposit:${dep.id}`);
  });

  it('abatimento e devolução concorrentes na mesma caução nunca passam do valor retido', async () => {
    const { db, svc } = await setup();
    const debt = await counterDebt(db);
    const dep = await counterDeposit(db, { amountCents: 6000 });
    const results = await Promise.allSettled([svc.settle(staff, debt.id, { amountCents: 6000, fromDepositId: dep.id }), svc.refund(staff, dep.id, { amountCents: 6000 })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const d = await db.deposit.findUnique({ where: { id: dep.id } });
    expect((d.capturedCents ?? 0) + d.refundedCents).toBe(6000);
  });

  it('devolução com aluguel em andamento → 409', async () => {
    const { db, svc } = await setup();
    await db.rental.update({ where: { id: RENTAL }, data: { status: 'active' } });
    const dep = await counterDeposit(db);
    const err = await problem(svc.refund(staff, dep.id, { amountCents: 1000 }));
    expect([err.getStatus(), err.slug, err.detail]).toEqual([409, 'conflict', 'A caução só é devolvida depois do encerramento do aluguel.']);
    expect(await db.deposit.findUnique({ where: { id: dep.id } })).toMatchObject({ refundedCents: 0 });
  });

  it('caução que não é do balcão → 409; acima do disponível → 422; inexistente → 404', async () => {
    const { db, svc } = await setup();
    const card = await counterDeposit(db, { method: 'card' });
    const notCounter = await problem(svc.refund(staff, card.id, { amountCents: 1000 }));
    expect([notCounter.getStatus(), notCounter.slug, notCounter.detail]).toEqual([409, 'conflict', 'Esta caução não é do balcão.']);
    const dep = await counterDeposit(db, { amountCents: 3000 });
    const over = await problem(svc.refund(staff, dep.id, { amountCents: 3001 }));
    expect([over.getStatus(), over.slug]).toEqual([422, 'counter-amount-mismatch']);
    expect((await problem(svc.refund(staff, '55555555-5555-4555-8555-555555555555', { amountCents: 1 }))).getStatus()).toBe(404);
  });
});

describe('CounterSettlementService.balance', () => {
  it('balance traz débitos com saldo e cauções com disponível > 0, sem nome completo', async () => {
    const { db, svc } = await setup();
    const debt = await counterDebt(db);
    await db.payment.create({ data: { customerId: CUSTOMER, kind: 'debt_settlement', method: 'cash', status: 'paid', amountCents: 2000, settlesPaymentId: debt.id } });
    const old = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'failed', amountCents: 1500, failureReason: 'cc_rejected' } });
    // fora: quitado manualmente (pending de balcão com debtSettledAt), pago, de outro cliente
    await counterDebt(db, 999, { debtSettledAt: new Date(), debtSettlement: 'manual', idempotencyKey: null });
    await db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'cash', status: 'paid', amountCents: 777 } });
    await db.payment.create({ data: { customerId: OTHER, kind: 'rental', method: 'cash', status: 'pending', amountCents: 555 } });
    const dep = await counterDeposit(db, { capturedCents: 4000 });
    await counterDeposit(db, { amountCents: 5000, refundedCents: 5000, status: 'released' });
    await counterDeposit(db, { amountCents: 0, status: 'released' });
    await counterDeposit(db, { method: 'card' });
    await counterDeposit(db, { customerId: OTHER });

    const out = await svc.balance(RENTAL);
    expect(out).toEqual({
      rentalId: RENTAL,
      customerId: CUSTOMER,
      customerFirstName: 'Ana',
      rentalStatus: 'ended',
      debtTotalCents: 5500,
      debts: expect.arrayContaining([
        { paymentId: debt.id, rentalId: RENTAL, kind: 'rental', status: 'pending', method: 'cash', outstandingCents: 4000, createdAt: debt.createdAt.toISOString() },
        { paymentId: old.id, kind: 'rental', status: 'failed', method: 'card', outstandingCents: 1500, createdAt: old.createdAt.toISOString() },
      ]),
      deposits: [{ depositId: dep.id, rentalId: RENTAL, method: 'cash', status: 'held', amountCents: 10000, capturedCents: 4000, refundedCents: 0, availableCents: 6000 }],
    });
    expect(out.debts).toHaveLength(2);
    expect(JSON.stringify(out)).not.toContain('Souza');
  });

  it('aluguel inexistente → 404', async () => {
    const { svc } = await setup();
    expect((await problem(svc.balance('55555555-5555-4555-8555-555555555555'))).getStatus()).toBe(404);
  });
});
