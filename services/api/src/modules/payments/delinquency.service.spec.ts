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
  const receipts = { issueForPayment: jest.fn().mockResolvedValue(undefined) };
  const svc = new DelinquencyService(db as any, provider, state, customers, billing, audit as any, queue as any, billingOpts, receipts as any);
  return { db, provider, svc, state, billing, audit, reviews, queue, customers, receipts };
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

describe('DelinquencyService — corrida entre duas quitações', () => {
  it('índice de uma pendente por dívida (P2002) → 409, sem cobrar', async () => {
    const { db, svc, state, provider } = await setup();
    const d = await debt(db, 3000);
    const { Prisma } = await import('@prisma/client');
    jest.spyOn(state, 'create').mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(svc.payDebt(CUSTOMER, d.id, { method: 'card' })).rejects.toMatchObject({ status: 409, slug: 'conflict' });
    expect(provider.operations('charge')).toBe(0);
  });

  it('dívida quitada entre a conferência e a criação → 409 debt-not-payable', async () => {
    const { db, svc } = await setup();
    const d = await debt(db, 3000);
    const real = db.payment.findUnique.bind(db.payment);
    let calls = 0;
    jest.spyOn(db.payment, 'findUnique').mockImplementation(async (args: any) => {
      const row = await real(args);
      // 1ª leitura (payDebt) vê a dívida aberta; a releitura antes de criar a vê quitada.
      if (args.where.id === d.id && ++calls === 2) return { ...row, debtSettledAt: new Date() };
      return row;
    });
    await expect(svc.payDebt(CUSTOMER, d.id, { method: 'pix' })).rejects.toMatchObject({ slug: 'debt-not-payable' });
  });
});

describe('DelinquencyService — fix round 1 (I-1): nunca dar como falha o que o gateway pode ter cobrado', () => {
  async function expiredPix(ctx: Awaited<ReturnType<typeof setup>>, d: { id: string }) {
    const pix = await ctx.svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    await ctx.db.payment.update({ where: { id: pix.id }, data: { pix: { ...(pix.pix as any), expiresAt: new Date(Date.now() - 60_000).toISOString() } } });
    return pix;
  }

  it('Pix vencido mas pago no gateway (cancelamento recusado): quita a dívida e responde 409, sem nova cobrança', async () => {
    const ctx = await setup();
    const d = await debt(ctx.db, 3000);
    const pix = await expiredPix(ctx, d);
    ctx.provider.simulatePixPaid(pix.providerPaymentId!);
    await expect(ctx.svc.payDebt(CUSTOMER, d.id, { method: 'pix' })).rejects.toMatchObject({ slug: 'debt-not-payable' });
    expect(await ctx.db.payment.findUnique({ where: { id: pix.id } })).toMatchObject({ status: 'paid' });
    expect(await ctx.db.payment.findUnique({ where: { id: d.id } })).toMatchObject({ debtSettlement: 'payment' });
    expect(ctx.provider.operations('createPix')).toBe(1);
  });

  it('Pix vencido com o gateway fora (cancelamento e consulta falham): 503 e a tentativa continua pending', async () => {
    const ctx = await setup();
    const d = await debt(ctx.db, 3000);
    const pix = await expiredPix(ctx, d);
    jest.spyOn(ctx.provider, 'cancelPix').mockRejectedValueOnce(new PaymentProviderError('fora'));
    jest.spyOn(ctx.provider, 'getPayment').mockRejectedValueOnce(new PaymentProviderError('fora'));
    await expect(ctx.svc.payDebt(CUSTOMER, d.id, { method: 'pix' })).rejects.toMatchObject({ slug: 'gateway-unavailable' });
    expect((await ctx.db.payment.findUnique({ where: { id: pix.id } })).status).toBe('pending');
  });

  it('Pix vencido e cancelado no gateway: a tentativa falha e um Pix novo é criado', async () => {
    const ctx = await setup();
    const d = await debt(ctx.db, 3000);
    const pix = await expiredPix(ctx, d);
    const next = await ctx.svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    expect(next.id).not.toBe(pix.id);
    expect((await ctx.db.payment.findUnique({ where: { id: pix.id } })).status).toBe('failed');
  });

  it('cartão sem resposta e busca no gateway com erro: 503, tentativa pending (nunca "nada encontrado")', async () => {
    const ctx = await setup();
    const d = await debt(ctx.db, 3000);
    jest.spyOn(ctx.provider, 'charge').mockRejectedValueOnce(new PaymentProviderError('timeout'));
    await expect(ctx.svc.payDebt(CUSTOMER, d.id, { method: 'card' })).rejects.toMatchObject({ slug: 'gateway-unavailable' });
    const [attempt] = await ctx.db.payment.findMany({ where: { settlesPaymentId: d.id } });
    await ctx.db.payment.update({ where: { id: attempt.id }, data: { createdAt: new Date(Date.now() - 3600_000) } });
    jest.spyOn(ctx.provider, 'searchPayments').mockRejectedValueOnce(new PaymentProviderError('fora'));
    await expect(ctx.svc.payDebt(CUSTOMER, d.id, { method: 'card' })).rejects.toMatchObject({ slug: 'gateway-unavailable' });
    expect((await ctx.db.payment.findUnique({ where: { id: attempt.id } })).status).toBe('pending');
  });

  it('webhook pago numa quitação já failed: quita a dívida, tira a flag e abre revisão (payment_needs_review)', async () => {
    const ctx = await setup();
    const d = await debt(ctx.db, 3000);
    const pix = await ctx.svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    await ctx.state.transition(pix.id, 'failed', { failureReason: 'pix_expired' });
    ctx.provider.simulatePixPaid(pix.providerPaymentId!);
    const webhook = new WebhookProcessor(ctx.db as any, ctx.provider, ctx.billing, { onTopUpPayment: jest.fn() } as any, { onRecurringPayment: jest.fn() } as any, { subscribe: jest.fn() } as any, ctx.svc);
    expect(await webhook.process({ provider: 'fake', eventId: 'late-1', type: 'payment', dataId: pix.providerPaymentId! })).toBe('processed');
    expect(await ctx.db.payment.findUnique({ where: { id: d.id } })).toMatchObject({ debtSettlement: 'payment' });
    expect((await ctx.db.customer.findUnique({ where: { id: CUSTOMER } })).delinquent).toBe(false);
    expect(ctx.reviews).toEqual([{ paymentId: pix.id, reason: 'debt_settlement_paid_after_failed' }]);
    expect((await ctx.db.payment.findUnique({ where: { id: pix.id } })).failureReason).toBe('paid_after_failed');
  });

  it('webhook pago numa quitação failed com a dívida já quitada: só revisão (para devolver)', async () => {
    const ctx = await setup();
    const d = await debt(ctx.db, 3000);
    const pix = await ctx.svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    await ctx.state.transition(pix.id, 'failed', { failureReason: 'pix_expired' });
    await ctx.svc.clearManually(STAFF, CUSTOMER, 'Pago por fora');
    await ctx.svc.onLatePaid((await ctx.db.payment.findUnique({ where: { id: pix.id } }))!, 'pp');
    expect(ctx.reviews).toEqual([{ paymentId: pix.id, reason: 'debt_settlement_after_settled' }]);
  });
});

describe('DelinquencyService — fix round 1 (I-2): dívida de assinatura com a recorrência ainda cobrando', () => {
  async function subDebt(db: InMemoryPrisma, status: string, over: Record<string, unknown> = {}) {
    const sub = await db.subscription.create({
      data: { customerId: CUSTOMER, planCode: 'weekly', status, priceCents: 24900, currentPeriodStart: new Date(), currentPeriodEnd: new Date(), gatewayCancelPendingAt: null, ...over },
    });
    const pay = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'subscription', method: 'card', status: 'failed', amountCents: 24900, subscriptionId: sub.id } });
    return { sub, pay };
  }

  it('assinatura past_due → 409 debt-in-collection (cliente e financeiro), sem cobrança', async () => {
    const { db, svc, provider } = await setup();
    const { pay } = await subDebt(db, 'past_due');
    await expect(svc.payDebt(CUSTOMER, pay.id, { method: 'card' })).rejects.toMatchObject({ slug: 'debt-in-collection' });
    await expect(svc.clearManually(STAFF, CUSTOMER, 'Pago')).rejects.toMatchObject({ slug: 'debt-in-collection' });
    expect(provider.operations('charge')).toBe(0);
  });

  it('assinatura expirada com cancelamento no gateway pendente → 409; confirmado → pode quitar', async () => {
    const { db, svc } = await setup();
    const { sub, pay } = await subDebt(db, 'expired', { gatewayCancelPendingAt: new Date() });
    await expect(svc.payDebt(CUSTOMER, pay.id, { method: 'card' })).rejects.toMatchObject({ slug: 'debt-in-collection' });
    await db.subscription.update({ where: { id: sub.id }, data: { gatewayCancelPendingAt: null } });
    expect(await svc.payDebt(CUSTOMER, pay.id, { method: 'card' })).toMatchObject({ status: 'paid', amountCents: 24900 });
  });

  it('assinatura em cobrança não bloqueia quitar dívida de aluguel', async () => {
    const { db, svc } = await setup();
    await subDebt(db, 'past_due');
    const d = await debt(db, 3000);
    expect(await svc.payDebt(CUSTOMER, d.id, { method: 'card' })).toMatchObject({ status: 'paid' });
  });
});

describe('Task 16: recibo depois da quitação e menores da re-revisão da Task 14', () => {
  const webhookFor = (ctx: Awaited<ReturnType<typeof setup>>) =>
    new WebhookProcessor(ctx.db as any, ctx.provider, ctx.billing, { onTopUpPayment: jest.fn() } as any, { onRecurringPayment: jest.fn() } as any, { subscribe: jest.fn() } as any, ctx.svc);

  it('R2-01: dívida de aluguel quitada por Pix (webhook) → recibo (PDF + NFS-e) emitido para o pagamento do aluguel', async () => {
    const ctx = await setup({ card: null });
    const d = await debt(ctx.db, 26635, 5000);
    const pix = await ctx.svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    expect(pix).toMatchObject({ method: 'pix', status: 'pending', amountCents: 21635 });
    expect(ctx.receipts.issueForPayment).not.toHaveBeenCalled();
    ctx.provider.simulatePixPaid(pix.providerPaymentId!);
    await webhookFor(ctx).process({ provider: 'fake', eventId: 'pix-1', type: 'payment', dataId: pix.providerPaymentId! });
    expect(ctx.receipts.issueForPayment).toHaveBeenCalledWith(d.id);
    expect(await ctx.billing.isDelinquent(CUSTOMER)).toBe(false);
  });

  it('R2-01: quitação manual também deixa o recibo do aluguel pronto (assinatura não ganha recibo de aluguel)', async () => {
    const ctx = await setup();
    const d = await debt(ctx.db, 3000);
    await ctx.svc.clearManually(STAFF, CUSTOMER, 'Transferência recebida');
    expect(ctx.receipts.issueForPayment).toHaveBeenCalledTimes(1);
    expect(ctx.receipts.issueForPayment).toHaveBeenCalledWith(d.id);
  });

  it('onLatePaid é idempotente por pagamento: notificações repetidas do gateway não abrem alerta falso debt_settlement_after_settled', async () => {
    const ctx = await setup();
    const d = await debt(ctx.db, 3000);
    const pix = await ctx.svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    await ctx.state.transition(pix.id, 'failed', { failureReason: 'pix_expired' });
    ctx.provider.simulatePixPaid(pix.providerPaymentId!);
    const webhook = webhookFor(ctx);
    // Dois eventos diferentes do Mercado Pago para o mesmo pagamento (o dedupe por evento não segura).
    expect(await webhook.process({ provider: 'fake', eventId: 'late-a', type: 'payment', dataId: pix.providerPaymentId! })).toBe('processed');
    expect(await webhook.process({ provider: 'fake', eventId: 'late-b', type: 'payment', dataId: pix.providerPaymentId! })).toBe('processed');
    expect(ctx.reviews).toEqual([{ paymentId: pix.id, reason: 'debt_settlement_paid_after_failed' }]);
    expect(ctx.receipts.issueForPayment).toHaveBeenCalledTimes(1);
  });

  it('onLatePaid repetido depois de uma queda entre a anotação e a quitação: conclui a quitação (sem perder o dinheiro recebido)', async () => {
    const ctx = await setup();
    const d = await debt(ctx.db, 3000);
    const pix = await ctx.svc.payDebt(CUSTOMER, d.id, { method: 'pix' });
    await ctx.state.transition(pix.id, 'failed', { failureReason: 'paid_after_failed' });
    await ctx.svc.onLatePaid((await ctx.db.payment.findUnique({ where: { id: pix.id } }))!, 'pp');
    expect(await ctx.db.payment.findUnique({ where: { id: d.id } })).toMatchObject({ debtSettlement: 'payment' });
    expect(ctx.reviews).toEqual([{ paymentId: pix.id, reason: 'debt_settlement_paid_after_failed' }]);
  });

  it('quitação manual só é bloqueada pela assinatura ligada à dívida, não por outra assinatura do cliente', async () => {
    const ctx = await setup();
    // Outra assinatura do cliente em past_due, sem dívida registrada aqui.
    await ctx.db.subscription.create({ data: { customerId: CUSTOMER, planCode: 'weekly', status: 'past_due', priceCents: 24900, currentPeriodStart: new Date(), currentPeriodEnd: new Date(), gatewayCancelPendingAt: null } });
    const d = await debt(ctx.db, 3000);
    await ctx.svc.clearManually(STAFF, CUSTOMER, 'Pago por fora');
    expect(await ctx.db.payment.findUnique({ where: { id: d.id } })).toMatchObject({ debtSettlement: 'manual' });
    // A assinatura da própria dívida em past_due continua bloqueando.
    const ctx2 = await setup();
    const sub = await ctx2.db.subscription.create({ data: { customerId: CUSTOMER, planCode: 'weekly', status: 'past_due', priceCents: 24900, currentPeriodStart: new Date(), currentPeriodEnd: new Date(), gatewayCancelPendingAt: null } });
    await ctx2.db.payment.create({ data: { customerId: CUSTOMER, kind: 'subscription', method: 'card', status: 'failed', amountCents: 24900, subscriptionId: sub.id } });
    await expect(ctx2.svc.clearManually(STAFF, CUSTOMER, 'Pago')).rejects.toMatchObject({ slug: 'debt-in-collection' });
  });
});
