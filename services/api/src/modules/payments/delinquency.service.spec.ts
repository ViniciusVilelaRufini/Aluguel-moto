import { EventEmitter2 } from '@nestjs/event-emitter';
import { MockInsuranceProvider } from '../insurance/insurance-provider';
import { InsuranceService } from '../insurance/insurance.service';
import { DelinquencyService } from './delinquency.service';
import { PaymentStateService } from './payment-state.service';
import { PAYMENT_NEEDS_REVIEW, type PaymentNeedsReviewEvent } from './payment-review';
import { FakePaymentProvider } from './provider/fake-payment-provider';
import { PaymentProviderError } from './provider/payment-provider';
import { ProviderCustomersService } from './provider-customers.service';
import { RentalBillingService } from './rental-billing.service';
import { createInMemoryPrisma, type InMemoryPrisma } from './testing/in-memory-prisma';
import { WebhookProcessor } from './webhook-processor.service';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const STAFF = { pool: 'staff', userId: '33333333-3333-4333-8333-333333333333', groups: ['financeiro'], sub: 's', email: 'f@volti.com.br' } as any;

async function setup(opts: { card?: string | null } = {}) {
  const db: InMemoryPrisma = createInMemoryPrisma();
  const provider = new FakePaymentProvider('segredo');
  const events = new EventEmitter2();
  const reviews: PaymentNeedsReviewEvent[] = [];
  events.on(PAYMENT_NEEDS_REVIEW, (e: PaymentNeedsReviewEvent) => reviews.push(e));
  await db.customer.create({ data: { id: CUSTOMER, cognitoSub: 'sub', email: 'cliente@example.com', delinquent: true } });
  await db.customer.create({ data: { id: OTHER, cognitoSub: 'sub2', email: 'outro@example.com' } });
  const state = new PaymentStateService(db as any, events);
  const customers = new ProviderCustomersService(db as any, provider);
  if (opts.card !== null) await customers.addCard(CUSTOMER, opts.card ?? 'tok_visa_4242', true);
  const insurance = new InsuranceService(db as any, new MockInsuranceProvider());
  const queue = { publish: jest.fn(), subscribe: jest.fn() };
  const billingOpts = { pixExpirationMinutes: 15, fakePixAutoConfirmSeconds: 0, reviewMaxDays: 7 };
  const billing = new RentalBillingService(db as any, provider, state, customers, insurance, { issueForPayment: jest.fn() } as any, queue as any, events, billingOpts);
  const audit = { record: jest.fn(async (entry: any, tx: any = db) => tx.auditLog.create({ data: { action: entry.action, entityId: entry.entityId, reason: entry.reason, metadata: entry.metadata } })) };
  const svc = new DelinquencyService(db as any, provider, state, customers, billing, audit as any, queue as any, billingOpts);
  return { db, provider, svc, state, billing, audit, reviews, queue, customers };
}

/** Dívida: liquidação de aluguel que terminou `failed`; com caução capturada como garantia (opcional). */
async function debt(db: InMemoryPrisma, amountCents: number, captured?: number, over: Record<string, unknown> = {}) {
  const deposit = captured !== undefined ? await db.deposit.create({ data: { customerId: CUSTOMER, method: 'card', status: 'captured', amountCents: 5000, capturedCents: captured } }) : null;
  return db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'failed', amountCents, depositId: deposit?.id ?? null, rentalId: 'r-1', failureReason: 'cc_rejected', ...over } });
}

describe('DelinquencyService — saldo devedor', () => {
  it('valor − caução capturada como garantia; sem caução capturada, o valor cheio; quitada ou não-dívida fica fora', async () => {
    const { db, svc } = await setup();
    const withGuarantee = await debt(db, 12000, 5000);
    const plain = await debt(db, 3000);
    const settled = await debt(db, 1000, undefined, { debtSettledAt: new Date(), debtSettlement: 'manual' });
    const topUp = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'top_up', method: 'card', status: 'failed', amountCents: 2000 } });
    const map = await svc.outstandingMap([withGuarantee, plain, settled, topUp]);
    expect(Object.fromEntries(map)).toEqual({ [withGuarantee.id]: 7000, [plain.id]: 3000 });
    expect(await svc.debtCents(CUSTOMER)).toBe(10000);
  });
});

describe('DelinquencyService — cliente quita (POST /payments/{id}/retry)', () => {
  it('cartão aprovado: cobra o saldo devedor, quita a dívida e tira a flag', async () => {
    const { db, svc, provider } = await setup();
    const d = await debt(db, 12000, 5000);
    const pay = await svc.payDebt(CUSTOMER, d.id, { method: 'card' });
    expect(pay).toMatchObject({ kind: 'debt_settlement', method: 'card', status: 'paid', amountCents: 7000, settlesPaymentId: d.id, cardLast4: '4242' });
    expect(pay.rentalId).toBeNull();
    expect(await db.payment.findUnique({ where: { id: d.id } })).toMatchObject({ status: 'failed', debtSettlement: 'payment', debtSettledAt: expect.any(Date) });
    expect((await db.customer.findUnique({ where: { id: CUSTOMER } })).delinquent).toBe(false);
    expect(provider.operations('charge')).toBe(1);
  });

  it('com outra dívida em aberto, quita só uma e a flag continua', async () => {
    const { db, svc } = await setup();
    const a = await debt(db, 3000);
    await debt(db, 4000);
    await svc.payDebt(CUSTOMER, a.id, { method: 'card' });
    expect((await db.customer.findUnique({ where: { id: CUSTOMER } })).delinquent).toBe(true);
  });

  it('cartão recusado: 402 payment-failed, tentativa failed e a dívida continua', async () => {
    const { db, svc, provider } = await setup();
    const d = await debt(db, 3000);
    provider.failNext('charge');
    await expect(svc.payDebt(CUSTOMER, d.id, { method: 'card' })).rejects.toMatchObject({ slug: 'payment-failed' });
    const attempts = await db.payment.findMany({ where: { settlesPaymentId: d.id } });
    expect(attempts.map((p: any) => p.status)).toEqual(['failed']);
    expect((await db.payment.findUnique({ where: { id: d.id } })).debtSettledAt).toBeNull();
  });

  it('sem cartão: 402 card-not-found e nenhuma cobrança criada', async () => {
    const { db, svc } = await setup({ card: null });
    const d = await debt(db, 3000);
    await expect(svc.payDebt(CUSTOMER, d.id, { method: 'card' })).rejects.toMatchObject({ slug: 'card-not-found' });
    expect(await db.payment.count({ where: { kind: 'debt_settlement' } })).toBe(0);
  });

  it('gateway sem resposta: 503 e a tentativa fica pending (o webhook ou a próxima tentativa confere)', async () => {
    const { db, svc, provider } = await setup();
    const d = await debt(db, 3000);
    jest.spyOn(provider, 'charge').mockRejectedValueOnce(new PaymentProviderError('timeout'));
    await expect(svc.payDebt(CUSTOMER, d.id, { method: 'card' })).rejects.toMatchObject({ slug: 'gateway-unavailable' });
    const [attempt] = await db.payment.findMany({ where: { settlesPaymentId: d.id } });
    expect(attempt.status).toBe('pending');
    // Logo em seguida, outra tentativa não cobra de novo por cima da que está sem resposta.
    await expect(svc.payDebt(CUSTOMER, d.id, { method: 'card' })).rejects.toMatchObject({ status: 409 });
  });

  it('Pix: cria a cobrança pending com QR; repetir reaproveita; o webhook pago quita a dívida', async () => {
    const { db, svc, provider, billing } = await setup();
    const d = await debt(db, 3000);
    const pix = await svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    expect(pix).toMatchObject({ kind: 'debt_settlement', method: 'pix', status: 'pending', amountCents: 3000 });
    expect((pix.pix as any).copyPaste).toBeTruthy();
    const again = await svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    expect(again.id).toBe(pix.id);
    expect(provider.operations('createPix')).toBe(1);

    provider.simulatePixPaid(pix.providerPaymentId!);
    const wallet = { onTopUpPayment: jest.fn() };
    const webhook = new WebhookProcessor(db as any, provider, billing, wallet as any, { onRecurringPayment: jest.fn() } as any, { subscribe: jest.fn() } as any, svc);
    expect(await webhook.process({ provider: 'fake', eventId: 'e1', type: 'payment', dataId: pix.providerPaymentId! })).toBe('processed');
    expect(await db.payment.findUnique({ where: { id: d.id } })).toMatchObject({ debtSettlement: 'payment' });
    expect((await db.customer.findUnique({ where: { id: CUSTOMER } })).delinquent).toBe(false);
  });

  it('cartão com Pix pendente da mesma dívida: 409 (um pagamento por vez)', async () => {
    const { db, svc } = await setup();
    const d = await debt(db, 3000);
    await svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    await expect(svc.payDebt(CUSTOMER, d.id, { method: 'card' })).rejects.toMatchObject({ status: 409, slug: 'conflict' });
  });

  it('pagamento de outro cliente → 404; não-dívida ou já quitada → 409 debt-not-payable', async () => {
    const { db, svc } = await setup();
    const mine = await debt(db, 3000);
    await expect(svc.payDebt(OTHER, mine.id, { method: 'card' })).rejects.toMatchObject({ status: 404 });
    const paid = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'paid', amountCents: 100 } });
    await expect(svc.payDebt(CUSTOMER, paid.id, { method: 'card' })).rejects.toMatchObject({ slug: 'debt-not-payable' });
    const settled = await debt(db, 100, undefined, { debtSettledAt: new Date() });
    await expect(svc.payDebt(CUSTOMER, settled.id, { method: 'card' })).rejects.toMatchObject({ slug: 'debt-not-payable' });
  });

  it('liquidação ainda retentando no gateway → 409 debt-in-collection (nunca cobra duas vezes)', async () => {
    const { db, svc, provider } = await setup();
    const d = await debt(db, 3000);
    const pending = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'pending', amountCents: 900 } });
    await db.settlementProgress.create({ data: { paymentId: pending.id, plan: 'charge_only', attempts: 1 } });
    await expect(svc.payDebt(CUSTOMER, d.id, { method: 'card' })).rejects.toMatchObject({ slug: 'debt-in-collection' });
    expect(provider.operations('charge')).toBe(0);
  });

  it('quitação paga depois de a dívida já ter sido quitada manualmente → revisão manual (alerta para devolver)', async () => {
    const { db, svc, state, reviews } = await setup();
    const d = await debt(db, 3000);
    const pix = await svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    await svc.clearManually(STAFF, CUSTOMER, 'Transferência recebida');
    await svc.onSettlementPaid(await state.transition(pix.id, 'paid'));
    expect(reviews).toEqual([{ paymentId: pix.id, reason: 'debt_settlement_after_settled' }]);
  });
});

describe('DelinquencyService — quitação manual (POST /customers/{id}/delinquency/clear)', () => {
  it('quita todas as dívidas em aberto, tira a flag e grava o AuditLog com motivo e valor', async () => {
    const { db, svc, audit } = await setup();
    const a = await debt(db, 12000, 5000);
    const b = await debt(db, 3000);
    await svc.clearManually(STAFF, CUSTOMER, 'Acordo pago no balcão');
    for (const id of [a.id, b.id]) expect(await db.payment.findUnique({ where: { id } })).toMatchObject({ debtSettlement: 'manual', debtSettledAt: expect.any(Date) });
    expect((await db.customer.findUnique({ where: { id: CUSTOMER } })).delinquent).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actor: STAFF, action: 'customer.delinquency_clear', entityType: 'Customer', entityId: CUSTOMER, reason: 'Acordo pago no balcão', metadata: { paymentIds: [a.id, b.id], amountCents: 10000 } }),
      expect.anything(),
    );
  });

  it('cliente em dia → 409 debt-not-payable; cobrança automática em andamento → 409 debt-in-collection', async () => {
    const { db, svc } = await setup();
    await expect(svc.clearManually(STAFF, OTHER, 'x y z')).rejects.toMatchObject({ slug: 'debt-not-payable' });
    await debt(db, 3000);
    const pending = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'pending', amountCents: 900 } });
    await db.settlementProgress.create({ data: { paymentId: pending.id, plan: 'charge_only', attempts: 2 } });
    await expect(svc.clearManually(STAFF, CUSTOMER, 'Pago')).rejects.toMatchObject({ slug: 'debt-in-collection' });
    expect((await db.customer.findUnique({ where: { id: CUSTOMER } })).delinquent).toBe(true);
  });

  it('flag sem dívida registrada (legado) também sai, com AuditLog', async () => {
    const { db, svc, audit } = await setup();
    await svc.clearManually(STAFF, CUSTOMER, 'Flag antiga');
    expect((await db.customer.findUnique({ where: { id: CUSTOMER } })).delinquent).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ metadata: { paymentIds: [], amountCents: 0 } }), expect.anything());
  });

  it('cliente inexistente → 404', async () => {
    const { svc } = await setup();
    await expect(svc.clearManually(STAFF, '99999999-9999-4999-8999-999999999999', 'motivo')).rejects.toMatchObject({ status: 404 });
  });
});
