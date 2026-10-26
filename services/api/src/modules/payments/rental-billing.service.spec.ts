import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, type PaymentUpdatedEvent } from '../../common/events';
import { MockInsuranceProvider } from '../insurance/insurance-provider';
import { InsuranceService } from '../insurance/insurance.service';
import { PaymentStateService } from './payment-state.service';
import { InvalidPaymentTransitionError } from './payment-state';
import { PAYMENT_NEEDS_REVIEW, type PaymentNeedsReviewEvent } from './payment-review';
import { FakePaymentProvider } from './provider/fake-payment-provider';
import { PaymentProviderError } from './provider/payment-provider';
import { ProviderCustomersService } from './provider-customers.service';
import { DEPOSIT_FAILED, type DepositFailedEvent } from './deposit-events';
import { RentalBillingService } from './rental-billing.service';
import { createInMemoryPrisma, type InMemoryPrisma } from './testing/in-memory-prisma';
import { receiptPaymentInfo } from './receipts/receipt-status';
import { debtInCollection, isOpenDebt } from './open-debt';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const RENTAL = '88888888-8888-4888-8888-888888888888';
const KEY = `deposit:${CUSTOMER}:idem-1`;
const SETTLE_KEY = `rental-settlement:${RENTAL}`;

async function setup(opts: { card?: string | null; now?: () => Date } = {}) {
  const db: InMemoryPrisma = createInMemoryPrisma();
  const provider = new FakePaymentProvider('segredo');
  const events = new EventEmitter2();
  const emitted: PaymentUpdatedEvent[] = [];
  const needsReview: PaymentNeedsReviewEvent[] = [];
  events.on(EV.PAYMENT_UPDATED, (e: PaymentUpdatedEvent) => emitted.push(e));
  events.on(PAYMENT_NEEDS_REVIEW, (e: PaymentNeedsReviewEvent) => needsReview.push(e));
  await db.customer.create({ data: { id: CUSTOMER, cognitoSub: 'sub', email: 'cliente@example.com' } });
  await db.fee.create({ data: { code: 'deposit', amountCents: 5000, active: true } });
  await db.insuranceCoverageConfig.create({ data: { coverage: 'basic', name: 'Básico', description: 'x', premiumCents: 200, mandatory: true } });
  const state = new PaymentStateService(db as any, events);
  const customers = new ProviderCustomersService(db as any, provider);
  if (opts.card !== null) await customers.addCard(CUSTOMER, opts.card ?? 'tok_visa_4242', true);
  const insurance = new InsuranceService(db as any, new MockInsuranceProvider());
  const receipts = { issueForPayment: jest.fn().mockResolvedValue(undefined) };
  const queue = { publish: jest.fn(), subscribe: jest.fn() };
  const billingOpts = { pixExpirationMinutes: 15, fakePixAutoConfirmSeconds: 0, reviewMaxDays: 7, ...(opts.now ? { now: opts.now } : {}) };
  const svc = new RentalBillingService(db as any, provider, state, customers, insurance, receipts as any, queue as any, events, billingOpts);
  return { db, provider, svc, emitted, needsReview, receipts, insurance, state };
}

/** Caução retida + aluguel criado (como o RentalStartService faz). */
async function rentalWithDeposit(ctx: Awaited<ReturnType<typeof setup>>, method: 'card' | 'pix' = 'card') {
  const held = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method, idempotencyKey: KEY });
  const policy = await ctx.insurance.issueForRental({ rentalId: RENTAL, customerId: CUSTOMER, coverage: 'basic' });
  await ctx.db.rental.create({ data: { id: RENTAL, customerId: CUSTOMER, vehicleId: 'v', planCode: 'minute', coverage: 'basic', status: 'ended', depositId: held.depositId, insurancePolicyId: policy.policyId, priceSnapshot: {} } });
  return { held, policyId: policy.policyId };
}

const depositPayment = (db: InMemoryPrisma, depositId: string) => db.payment.findFirst({ where: { depositId, kind: 'deposit' } });

describe('PaymentStateService', () => {
  it('aplica transição válida, grava e emite payment.updated', async () => {
    const { db, state, emitted } = await setup({ card: null });
    const p = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'deposit', method: 'card', status: 'pending', amountCents: 5000, rentalId: RENTAL } });
    await state.transition(p.id, 'authorized', { providerPaymentId: 'x' });
    expect(await db.payment.findUnique({ where: { id: p.id } })).toMatchObject({ status: 'authorized', providerPaymentId: 'x' });
    expect(emitted).toEqual([{ paymentId: p.id, rentalId: RENTAL, status: 'authorized' }]);
  });

  it('rejeita transição inválida (capture de canceled) sem gravar nem emitir', async () => {
    const { db, state, emitted } = await setup({ card: null });
    const p = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'deposit', method: 'card', status: 'canceled', amountCents: 5000 } });
    await expect(state.transition(p.id, 'captured')).rejects.toBeInstanceOf(InvalidPaymentTransitionError);
    expect((await db.payment.findUnique({ where: { id: p.id } })).status).toBe('canceled');
    expect(emitted).toEqual([]);
  });

  it('corrida: se outro processo mudou o status antes, não sobrescreve', async () => {
    const { db, state } = await setup({ card: null });
    const p = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'pending', amountCents: 10 } });
    const realUpdateMany = db.payment.updateMany.bind(db.payment);
    jest.spyOn(db.payment, 'updateMany').mockImplementationOnce(async (args: any) => {
      await db.payment.update({ where: { id: p.id }, data: { status: 'failed' } });
      return realUpdateMany(args);
    });
    await expect(state.transition(p.id, 'paid')).rejects.toThrow(/concorrente/);
    expect((await db.payment.findUnique({ where: { id: p.id } })).status).toBe('failed');
  });
});

describe('RentalBillingService.holdDeposit', () => {
  it('cartão: pré-autoriza 5000 → caução held e Payment authorized', async () => {
    const ctx = await setup();
    const r = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY });
    expect(r.status).toBe('held');
    const d = await ctx.db.deposit.findUnique({ where: { id: r.depositId } });
    expect(d).toMatchObject({ status: 'held', amountCents: 5000, method: 'card', rentalId: RENTAL, idempotencyKey: KEY });
    expect(d.providerReference).toMatch(/^fake-pay-/);
    expect(await depositPayment(ctx.db, r.depositId)).toMatchObject({ status: 'authorized', kind: 'deposit', amountCents: 5000, providerPaymentId: d.providerReference, cardLast4: '4242' });
  });

  it.each(['released', 'captured'] as const)('mesma idempotencyKey com a caução já %s → failed (nunca "held"; fix round 1)', async (status) => {
    const ctx = await setup();
    const a = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY });
    await ctx.db.deposit.update({ where: { id: a.depositId }, data: { status } });
    const b = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY });
    expect(b).toEqual({ depositId: a.depositId, status: 'failed' });
    expect(ctx.provider.operations('preAuthorize')).toBe(1);
  });

  it('mesma idempotencyKey → mesma resposta e uma única chamada ao provider', async () => {
    const ctx = await setup();
    const a = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY });
    const b = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY });
    expect(b).toEqual(a);
    expect(ctx.provider.operations('preAuthorize')).toBe(1);
    expect(await ctx.db.deposit.count()).toBe(1);
    expect(await ctx.db.payment.count()).toBe(1);
  });

  it('chamadas concorrentes com a mesma chave → uma caução, uma pré-autorização', async () => {
    const ctx = await setup();
    const [a, b] = await Promise.all([
      ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY }),
      ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY }),
    ]);
    expect(a.depositId).toBe(b.depositId);
    expect(ctx.provider.operations('preAuthorize')).toBe(1);
  });

  it('sem cartão cadastrado → failed (e a repetição devolve failed sem chamar o provider)', async () => {
    const ctx = await setup({ card: null });
    const r = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY });
    expect(r.status).toBe('failed');
    expect((await ctx.db.deposit.findUnique({ where: { id: r.depositId } })).status).toBe('failed');
    expect(await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY })).toEqual(r);
    expect(ctx.provider.operations('preAuthorize')).toBe(0);
  });

  it('pré-autorização recusada → failed, Payment failed com motivo', async () => {
    const ctx = await setup();
    ctx.provider.failNext('preAuthorize', 'cc_rejected_high_risk');
    const r = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY });
    expect(r.status).toBe('failed');
    expect(await depositPayment(ctx.db, r.depositId)).toMatchObject({ status: 'failed', failureReason: 'cc_rejected_high_risk' });
  });

  it('Pix: awaiting_pix com QR/copia e cola, expira em 15 min; mesma chave → mesmo Pix, um createPix', async () => {
    const ctx = await setup({ card: null });
    const before = Date.now();
    const r = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'pix', idempotencyKey: KEY });
    expect(r.status).toBe('awaiting_pix');
    expect(r.pix?.copyPaste).toContain('br.gov.bcb.pix');
    const exp = new Date(r.pix!.expiresAt).getTime();
    expect(exp - before).toBeGreaterThanOrEqual(15 * 60_000 - 1000);
    expect(exp - before).toBeLessThanOrEqual(15 * 60_000 + 1000);
    expect(await depositPayment(ctx.db, r.depositId)).toMatchObject({ status: 'pending', method: 'pix' });
    expect(await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'pix', idempotencyKey: KEY })).toEqual(r);
    expect(ctx.provider.operations('createPix')).toBe(1);
  });
});

describe('RentalBillingService.settle', () => {
  it('valor menor que a caução → captura 1290 e libera o restante; aluguel pago; payment.updated', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('paid');
    const pay = await ctx.db.payment.findUnique({ where: { id: r.paymentId } });
    expect(pay).toMatchObject({ kind: 'rental', status: 'paid', amountCents: 1290, rentalId: RENTAL, depositId: held.depositId, idempotencyKey: SETTLE_KEY, cardLast4: '4242' });
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 1290 });
    expect((await depositPayment(ctx.db, held.depositId)).status).toBe('captured');
    const dp = await depositPayment(ctx.db, held.depositId);
    expect((await ctx.provider.getPayment(dp.providerPaymentId)).capturedCents).toBe(1290);
    expect(ctx.emitted).toContainEqual({ paymentId: r.paymentId, rentalId: RENTAL, status: 'paid' });
  });

  it('mesma idempotencyKey → mesma resposta e uma única captura', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    const a = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    const b = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(b).toEqual(a);
    expect(ctx.provider.operations('capture')).toBe(1);
    expect(await ctx.db.payment.count({ where: { kind: 'rental' } })).toBe(1);
  });

  it('falha de captura → settle failed, cliente inadimplente e isDelinquent → true; liquidação fica pendente para retentativa', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(false);
    ctx.provider.failNext('capture', 'cc_rejected_insufficient_amount');
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('failed');
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ status: 'pending', failureReason: 'cc_rejected_insufficient_amount' });
    expect(await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } })).toMatchObject({ attempts: 1, plan: 'card_capture' });
    // Repetir a porta não retenta (só o job): mesma resposta, nenhuma captura nova.
    expect(await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY })).toEqual(r);
    expect(ctx.provider.operations('capture')).toBe(1);
    expect((await ctx.db.customer.findUnique({ where: { id: CUSTOMER } })).delinquent).toBe(true);
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
    expect(ctx.receipts.issueForPayment).not.toHaveBeenCalled();
  });

  it('valor acima da caução → cobra o total no cartão e cancela a pré-autorização', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('paid');
    expect(ctx.provider.operations('charge')).toBe(1);
    expect(ctx.provider.operations('capture')).toBe(0);
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect((await depositPayment(ctx.db, held.depositId)).status).toBe('canceled');
  });

  it('valor acima da caução e cobrança recusada 3× → captura a caução inteira como garantia, failed e inadimplente', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const charge = jest.spyOn(ctx.provider, 'charge').mockResolvedValue({ providerPaymentId: '', status: 'failed', amountCents: 7000, failureReason: 'cc_rejected_other_reason' });
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('failed');
    await ctx.svc.retryPendingSettlements(0);
    await ctx.svc.retryPendingSettlements(0);
    expect(charge).toHaveBeenCalledTimes(3);
    expect(new Set(charge.mock.calls.map((c) => c[0].idempotencyKey)).size).toBe(3);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('failed');
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 5000 });
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
  });

  it('valor zero → libera a caução sem capturar; pagamento 0 pago', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 0, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('paid');
    expect(ctx.provider.operations('capture')).toBe(0);
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
  });

  it('caução Pix paga → estorna a sobra (5000 − 1290) e marca a caução capturada', async () => {
    const ctx = await setup({ card: null });
    const { held } = await rentalWithDeposit(ctx, 'pix');
    const dp = await depositPayment(ctx.db, held.depositId);
    ctx.provider.simulatePixPaid(dp.providerPaymentId);
    await ctx.svc.applyProviderPayment(await ctx.provider.getPayment(dp.providerPaymentId));
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('paid');
    expect(await depositPayment(ctx.db, held.depositId)).toMatchObject({ status: 'partially_refunded', refundedCents: 3710 });
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 1290 });
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ method: 'pix', status: 'paid' });
  });

  it('caução Pix e valor acima, sem cartão → captura o Pix, falha o restante e inadimplente', async () => {
    const ctx = await setup({ card: null });
    const { held } = await rentalWithDeposit(ctx, 'pix');
    const dp = await depositPayment(ctx.db, held.depositId);
    ctx.provider.simulatePixPaid(dp.providerPaymentId);
    await ctx.svc.applyProviderPayment(await ctx.provider.getPayment(dp.providerPaymentId));
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 6500, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('failed');
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 5000 });
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
  });

  it('aluguel pago → repasse do seguro registrado e recibo emitido', async () => {
    const ctx = await setup();
    const { policyId } = await rentalWithDeposit(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(await ctx.db.insuranceRemittance.findUnique({ where: { policyId } })).toMatchObject({ amountCents: 200 });
    expect(ctx.receipts.issueForPayment).toHaveBeenCalledWith(r.paymentId);
  });

  it('pagamento pendente (erro do gateway) é retomado pela mesma chave sem duplicar', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'capture').mockRejectedValueOnce(new Error('timeout'));
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY })).rejects.toThrow('timeout');
    expect((await ctx.db.payment.findFirst({ where: { kind: 'rental' } })).status).toBe('pending');
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findFirst({ where: { kind: 'rental' } })).status).toBe('paid');
    expect(await ctx.db.payment.count({ where: { kind: 'rental' } })).toBe(1);
    // O módulo rentals liga rental.paymentId ao ouvir payment.updated (rentals.listeners), também quando o job conclui.
    const paid = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    expect(ctx.emitted).toContainEqual({ paymentId: paid.id, rentalId: RENTAL, status: 'paid' });
  });
});

describe('RentalBillingService: liberação da caução (deposit.release-requested)', () => {
  it('cartão sem aluguel → cancela a pré-autorização; caução released (repetir não chama de novo)', async () => {
    const ctx = await setup();
    const held = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY });
    await ctx.svc.onReleaseRequested({ depositId: held.depositId, customerId: CUSTOMER, reason: 'rental_not_started' });
    await ctx.svc.onReleaseRequested({ depositId: held.depositId, customerId: CUSTOMER, reason: 'rental_not_started' });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect((await depositPayment(ctx.db, held.depositId)).status).toBe('canceled');
    expect(ctx.provider.operations('cancelPreAuthorization')).toBe(1);
  });

  it('Pix pago → estorno total', async () => {
    const ctx = await setup({ card: null });
    const held = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'pix', idempotencyKey: KEY });
    const dp = await depositPayment(ctx.db, held.depositId);
    ctx.provider.simulatePixPaid(dp.providerPaymentId);
    await ctx.svc.applyProviderPayment(await ctx.provider.getPayment(dp.providerPaymentId));
    await ctx.svc.onReleaseRequested({ depositId: held.depositId, customerId: CUSTOMER, reason: 'reservation_expired' });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect(await depositPayment(ctx.db, held.depositId)).toMatchObject({ status: 'refunded', refundedCents: 5000 });
  });

  it('Pix pendente → cancela a cobrança (Payment failed) e libera', async () => {
    const ctx = await setup({ card: null });
    const held = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'pix', idempotencyKey: KEY });
    await ctx.svc.onReleaseRequested({ depositId: held.depositId, customerId: CUSTOMER, reason: 'reservation_canceled' });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect(await depositPayment(ctx.db, held.depositId)).toMatchObject({ status: 'failed', failureReason: 'pix_canceled' });
  });

  it('galpão (fix round 1): Pix da caução expira sem pagamento → caução failed e evento deposit.failed (uma vez)', async () => {
    const ctx = await setup({ card: null });
    const failed: DepositFailedEvent[] = [];
    (ctx.svc as any).events.on(DEPOSIT_FAILED, (e: DepositFailedEvent) => failed.push(e));
    const held = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'pix', idempotencyKey: KEY });
    const dp = await depositPayment(ctx.db, held.depositId);
    ctx.provider.simulatePixExpired(dp.providerPaymentId);
    await ctx.svc.applyProviderPayment(await ctx.provider.getPayment(dp.providerPaymentId));
    await ctx.svc.applyProviderPayment(await ctx.provider.getPayment(dp.providerPaymentId));
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('failed');
    expect(failed).toEqual([{ depositId: held.depositId, customerId: CUSTOMER }]);
  });

  it('Pix pago depois de liberado → estorno automático', async () => {
    const ctx = await setup({ card: null });
    const held = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'pix', idempotencyKey: KEY });
    const dp = await depositPayment(ctx.db, held.depositId);
    await ctx.svc.onReleaseRequested({ depositId: held.depositId, customerId: CUSTOMER, reason: 'reservation_expired' });
    // O cliente pagou mesmo assim (o gateway aceitou antes do cancelamento).
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'paid', amountCents: 5000 });
    const refund = jest.spyOn(ctx.provider, 'refund').mockResolvedValueOnce({ providerRefundId: 'r', refundedCents: 5000, status: 'refunded' });
    await ctx.svc.applyProviderPayment(await ctx.provider.getPayment(dp.providerPaymentId));
    expect(refund).toHaveBeenCalledWith(expect.objectContaining({ providerPaymentId: dp.providerPaymentId, idempotencyKey: `late-pix-refund:${dp.id}` }));
  });

  it('aluguel iniciado com a caução → ignora o pedido', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    await ctx.svc.onReleaseRequested({ depositId: held.depositId, customerId: CUSTOMER, reason: 'rental_not_started' });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
    expect(ctx.provider.operations('cancelPreAuthorization')).toBe(0);
  });
});

describe('fix round 1: liquidação retomável sem cobrança dupla', () => {
  /** Faz a transição para `paid` falhar uma vez (queda entre a chamada ao gateway e o registro final). */
  function crashBeforePaid(ctx: Awaited<ReturnType<typeof setup>>) {
    const real = ctx.state.transition.bind(ctx.state);
    let crashed = false;
    jest.spyOn(ctx.state, 'transition').mockImplementation(async (id: string, to: any, data?: any) => {
      if (to === 'paid' && !crashed) {
        crashed = true;
        throw new Error('caiu antes do paid');
      }
      return real(id, to, data);
    });
  }

  it('falha depois de capturar (antes do paid) → retentativa conclui sem nova captura e sem cobrança', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    crashBeforePaid(ctx);
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY })).rejects.toThrow('caiu antes do paid');
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('captured');
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findFirst({ where: { kind: 'rental' } })).status).toBe('paid');
    expect(ctx.provider.operations('capture')).toBe(1);
    expect(ctx.provider.operations('charge')).toBe(0);
  });

  it('Pix: falha depois de estornar a sobra → retentativa não estorna de novo nem cobra', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx, 'pix');
    const dp = await depositPayment(ctx.db, held.depositId);
    ctx.provider.simulatePixPaid(dp.providerPaymentId);
    await ctx.svc.applyProviderPayment(await ctx.provider.getPayment(dp.providerPaymentId));
    crashBeforePaid(ctx);
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY })).rejects.toThrow('caiu');
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findFirst({ where: { kind: 'rental' } })).status).toBe('paid');
    expect(ctx.provider.operations('refund')).toBe(1);
    expect(ctx.provider.operations('charge')).toBe(0);
  });

  it('duas liquidações concorrentes → exatamente uma captura, mesma resposta', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    const [a, b] = await Promise.all([
      ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY }),
      ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY }),
    ]);
    expect(a).toEqual(b);
    expect(a.status).toBe('paid');
    expect(ctx.provider.operations('capture')).toBe(1);
    expect(ctx.provider.operations('charge')).toBe(0);
  });

  it('valor acima da caução, concorrente com o job → exatamente uma cobrança', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    await Promise.all([
      ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY }),
      ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY }),
      ctx.svc.retryPendingSettlements(0),
    ]);
    expect(ctx.provider.operations('charge')).toBe(1);
    expect((await ctx.db.payment.findFirst({ where: { kind: 'rental' } })).status).toBe('paid');
  });

  it('job de retentativa não executa liquidação com lease válido de outro executor', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'capture').mockRejectedValueOnce(new Error('timeout'));
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY })).rejects.toThrow('timeout');
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    await ctx.db.settlementProgress.update({ where: { paymentId: pay.id }, data: { leaseOwner: 'outra-replica', leaseUntil: new Date(Date.now() + 60_000) } });
    const capture = jest.spyOn(ctx.provider, 'capture');
    capture.mockClear();
    await ctx.svc.retryPendingSettlements(0);
    expect(capture).not.toHaveBeenCalled();
    expect((await ctx.db.payment.findUnique({ where: { id: pay.id } })).status).toBe('pending');
  });

  it('captura falha 3× → pré-autorização cancelada (caução released), pagamento failed, inadimplência mantida', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const capture = jest.spyOn(ctx.provider, 'capture').mockResolvedValue({ providerPaymentId: 'x', status: 'failed', amountCents: 1290, failureReason: 'cc_rejected_other_reason' });
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
    await ctx.svc.retryPendingSettlements(0);
    expect(capture).toHaveBeenCalledTimes(3);
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ status: 'failed' });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect((await depositPayment(ctx.db, held.depositId)).status).toBe('canceled');
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
  });

  it('captura falha uma vez e passa na retentativa → paid e inadimplência removida', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    ctx.provider.failNext('capture');
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('paid');
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 1290 });
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(false);
  });

  it('valor capturado gravado para o Payment da caução (PaymentCapture)', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    const dp = await depositPayment(ctx.db, held.depositId);
    expect(await ctx.db.paymentCapture.findUnique({ where: { paymentId: dp.id } })).toMatchObject({ capturedCents: 1290 });
  });

  it('liberação sem confirmação do gateway → caução continua held; o job retenta e libera', async () => {
    const ctx = await setup();
    const held = await ctx.svc.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'card', idempotencyKey: KEY });
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'cancelPreAuthorization').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'authorized', amountCents: 5000 });
    await ctx.svc.onReleaseRequested({ depositId: held.depositId, customerId: CUSTOMER, reason: 'rental_not_started' });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
    expect(await ctx.db.depositRelease.findUnique({ where: { depositId: held.depositId } })).toMatchObject({ attempts: 1, confirmedAt: null });
    await ctx.svc.retryDepositReleases();
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect((await ctx.db.depositRelease.findUnique({ where: { depositId: held.depositId } })).confirmedAt).toBeInstanceOf(Date);
  });

  it('liberação na liquidação sem confirmação → liquidação fica pendente (não marca released nem paid)', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'cancelPreAuthorization').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'authorized', amountCents: 5000 });
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 0, idempotencyKey: SETTLE_KEY })).rejects.toThrow(/não confirmou/);
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
    expect((await ctx.db.payment.findFirst({ where: { kind: 'rental' } })).status).toBe('pending');
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findFirst({ where: { kind: 'rental' } })).status).toBe('paid');
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
  });
});

describe('fix round 2: resultados ambíguos do gateway', () => {
  /** Faz a gravação do passo indicado falhar uma vez (queda entre o sucesso no gateway e o registro). */
  function crashOnStepSave(ctx: Awaited<ReturnType<typeof setup>>, step: string) {
    const real = ctx.db.settlementProgress.update.bind(ctx.db.settlementProgress);
    let crashed = false;
    jest.spyOn(ctx.db.settlementProgress, 'update').mockImplementation(async (args: any) => {
      if (!crashed && args.data?.steps && args.data.steps[step] !== undefined && typeof args.data.steps[step] !== 'string' && step in args.data.steps) {
        const s = args.data.steps[step];
        if (s === true || (typeof s === 'object' && s?.providerPaymentId)) {
          crashed = true;
          throw new Error(`caiu antes de gravar ${step}`);
        }
      }
      return real(args);
    });
  }

  it('cobrança aprovada e queda antes de gravar o passo → retentativa reconcilia pela referência externa: 0 cobranças extras', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    crashOnStepSave(ctx, 'charge');
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY })).rejects.toThrow('caiu antes de gravar charge');
    // Como no Mercado Pago: repetir o POST (corpo/token diferente) com a mesma chave dá 4xx.
    const charge = jest.spyOn(ctx.provider, 'charge').mockRejectedValue(new PaymentProviderError('Mercado Pago: charge falhou (400).', 400));
    await ctx.svc.retryPendingSettlements(0);
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    expect(pay.status).toBe('paid');
    expect(charge).not.toHaveBeenCalled();
    expect(ctx.provider.operations('charge')).toBe(1);
    expect(pay.providerPaymentId).toMatch(/^fake-pay-/);
  });

  it('4xx/timeout na cobrança é ambíguo: não conta tentativa nem troca a chave', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    const charge = jest.spyOn(ctx.provider, 'charge').mockRejectedValueOnce(new PaymentProviderError('Mercado Pago: charge falhou (409).', 409));
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY })).rejects.toThrow('409');
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    expect(await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).toMatchObject({ attempts: 0, errorRuns: 1 });
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(false);
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findUnique({ where: { id: pay.id } })).status).toBe('paid');
    expect(charge.mock.calls.map((c) => c[0].idempotencyKey)).toEqual([`${SETTLE_KEY}:charge`, `${SETTLE_KEY}:charge`]);
    // O mesmo token do cartão nas duas chamadas do mesmo passo.
    expect(charge.mock.calls[0][0].cardToken).toBeDefined();
    expect(charge.mock.calls[1][0].cardToken).toBe(charge.mock.calls[0][0].cardToken);
  });

  it('captura feita e queda antes de registrar → retentativa vê captured no gateway e conclui sem capturar de novo', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const real = ctx.state.transition.bind(ctx.state);
    let crashed = false;
    jest.spyOn(ctx.state, 'transition').mockImplementation(async (id: string, to: any, data?: any) => {
      if (to === 'captured' && !crashed) {
        crashed = true;
        throw new Error('caiu depois da captura');
      }
      return real(id, to, data);
    });
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY })).rejects.toThrow('caiu depois da captura');
    const capture = jest.spyOn(ctx.provider, 'capture').mockRejectedValue(new PaymentProviderError('Mercado Pago: capture falhou (400).', 400));
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findFirst({ where: { kind: 'rental' } })).status).toBe('paid');
    expect(capture).not.toHaveBeenCalled();
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 1290 });
  });

  it('última tentativa: antes de cancelar, confere no gateway; se já estava capturado, conclui como pago', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'capture').mockResolvedValue({ providerPaymentId: dp.providerPaymentId, status: 'failed', amountCents: 1290, failureReason: 'cc_rejected_other_reason' });
    await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    await ctx.svc.retryPendingSettlements(0);
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValue({ providerPaymentId: dp.providerPaymentId, status: 'captured', amountCents: 5000, capturedCents: 1290 });
    const cancel = jest.spyOn(ctx.provider, 'cancelPreAuthorization');
    await ctx.svc.retryPendingSettlements(0);
    expect(cancel).not.toHaveBeenCalled();
    expect((await ctx.db.payment.findFirst({ where: { kind: 'rental' } })).status).toBe('paid');
  });

  it('cancelamento final que sempre falha → liquidação estacionada após 5 execuções (o job para); pré-autorização sem liberar → continua pending para revisão', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'capture').mockResolvedValue({ providerPaymentId: dp.providerPaymentId, status: 'failed', amountCents: 1290, failureReason: 'cc_rejected_other_reason' });
    const cancel = jest.spyOn(ctx.provider, 'cancelPreAuthorization').mockRejectedValue(new PaymentProviderError('Mercado Pago: cancelPreAuthorization falhou (502).', 502));
    await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    for (let i = 0; i < 10; i++) await ctx.svc.retryPendingSettlements(0);
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    const prog = await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } });
    expect(prog.parkedAt).toBeInstanceOf(Date);
    expect(prog.parkedReason).toMatch(/502/);
    // 5 execuções + a tentativa de liberar a pré-autorização ao estacionar (falha → continua pending para revisão).
    expect(cancel).toHaveBeenCalledTimes(6);
    expect(pay.status).toBe('pending');
    expect(prog.finishedAt).toBeNull();
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
    expect(ctx.needsReview).toEqual([expect.objectContaining({ paymentId: pay.id, rentalId: RENTAL })]);
  });

  it('card_charge: recusas e a garantia sempre com erro no gateway (fake reiniciado) → estacionada; quando o gateway volta, o job libera a caução e vira dívida pagável', async () => {
    let t = Date.now();
    const ctx = await setup({ now: () => new Date(t) });
    const { held } = await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockImplementation(async (i) => ({ providerPaymentId: `x-${i.idempotencyKey}`, status: 'failed', amountCents: i.amountCents, failureReason: 'card_not_found' }));
    const getPayment = jest.spyOn(ctx.provider, 'getPayment').mockRejectedValue(new PaymentProviderError('Pagamento não encontrado no gateway.', 404));
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('failed');
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
    for (let i = 0; i < 10; i++) await ctx.svc.retryPendingSettlements(0);
    const parked = await ctx.db.payment.findUnique({ where: { id: r.paymentId } });
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: parked.id } })).parkedAt).toBeInstanceOf(Date);
    // 5 execuções + a conferência da caução ao estacionar (sem resposta → continua pending).
    expect(getPayment).toHaveBeenCalledTimes(6);
    expect(parked.status).toBe('pending');
    expect(ctx.needsReview).toHaveLength(1);

    // Gateway de volta, mas antes do intervalo do job: nada acontece.
    getPayment.mockRestore();
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
    t += 10 * 60_000;
    await ctx.svc.retryPendingSettlements(0);
    const pay = await ctx.db.payment.findUnique({ where: { id: r.paymentId } });
    expect(pay).toMatchObject({ status: 'failed', failureReason: 'settlement_parked' });
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).finishedAt).toBeInstanceOf(Date);
    expect(isOpenDebt(pay)).toBe(true);
    expect(await debtInCollection(ctx.db as any, CUSTOMER, pay)).toBe(false);
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
    // Pré-autorização ainda authorized no gateway → liberada; o saldo devedor é o valor cheio.
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect(ctx.emitted).toContainEqual({ paymentId: pay.id, rentalId: RENTAL, status: 'failed' });
    expect(ctx.needsReview).toHaveLength(1);
  });

  it('estacionada com cobrança aprovada ou em análise no gateway (busca pela referência) → continua pending para revisão (nunca cobrar duas vezes)', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockRejectedValue(new PaymentProviderError('Mercado Pago: charge falhou (502).', 502));
    jest.spyOn(ctx.provider, 'searchPayments').mockResolvedValue([]);
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY })).rejects.toThrow('502');
    const pay0 = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    for (let i = 0; i < 3; i++) await ctx.svc.retryPendingSettlements(0);
    // Na 5ª execução com erro, a busca pela referência externa acha a cobrança aprovada.
    jest.spyOn(ctx.provider, 'searchPayments').mockResolvedValue([{ providerPaymentId: 'mp-1', status: 'paid', amountCents: 6999, externalReference: pay0.id }]);
    await ctx.svc.retryPendingSettlements(0);
    const pay = await ctx.db.payment.findUnique({ where: { id: pay0.id } });
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).parkedAt).toBeInstanceOf(Date);
    expect(pay.status).toBe('pending');
    expect(isOpenDebt(pay)).toBe(false);
  });

  it('estacionada sem conseguir consultar o gateway → continua pending para revisão', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockRejectedValue(new PaymentProviderError('Mercado Pago: charge falhou (502).', 502));
    jest.spyOn(ctx.provider, 'searchPayments').mockRejectedValue(new PaymentProviderError('Mercado Pago: search falhou (502).', 502));
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY })).rejects.toThrow('502');
    for (let i = 0; i < 6; i++) await ctx.svc.retryPendingSettlements(0);
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).parkedAt).toBeInstanceOf(Date);
    expect(pay.status).toBe('pending');
  });
});

describe('fix round 3: cobrança em análise e webhooks da liquidação', () => {
  const inReview = (id = 'mp-review-1') => ({ providerPaymentId: id, status: 'pending' as const, amountCents: 7000, externalReference: 'x' });

  it('cobrança em análise (pending) → não conta tentativa, não fica inadimplente, o job não cobra de novo; aprovada depois → paid', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const charge = jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce(inReview());
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('failed');
    const prog = await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } });
    expect(prog).toMatchObject({ attempts: 0, errorRuns: 0 });
    expect(prog.steps.chargeInReview).toBe('mp-review-1');
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(false);

    const getPayment = jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce(inReview());
    await ctx.svc.retryPendingSettlements(0);
    expect(charge).toHaveBeenCalledTimes(1);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');

    getPayment.mockResolvedValueOnce({ ...inReview(), status: 'paid' });
    await ctx.svc.retryPendingSettlements(0);
    expect(charge).toHaveBeenCalledTimes(1);
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ status: 'paid', providerPaymentId: 'mp-review-1' });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
  });

  it('cobrança em análise recusada depois → conta como uma recusa (a próxima tentativa usa :a1)', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    const charge = jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce(inReview());
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce({ ...inReview(), status: 'failed', failureReason: 'cc_rejected_high_risk' });
    await ctx.svc.retryPendingSettlements(0);
    expect(charge).toHaveBeenCalledTimes(1);
    expect(await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } })).toMatchObject({ attempts: 1, lastFailure: 'cc_rejected_high_risk' });
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
    await ctx.svc.retryPendingSettlements(0);
    expect(charge.mock.calls.map((c) => c[0].idempotencyKey)).toEqual([`${SETTLE_KEY}:charge`, `${SETTLE_KEY}:charge:a1`]);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('paid');
  });

  it('reconciliação por external_reference considera pagamento em análise (não cobra de novo)', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockRejectedValueOnce(new PaymentProviderError('timeout'));
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY })).rejects.toThrow('timeout');
    jest.spyOn(ctx.provider, 'searchPayments').mockResolvedValueOnce([inReview('mp-review-9')]);
    const charge = jest.spyOn(ctx.provider, 'charge');
    charge.mockClear();
    await ctx.svc.retryPendingSettlements(0);
    expect(charge).not.toHaveBeenCalled();
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).steps.chargeInReview).toBe('mp-review-9');
  });

  it('webhook de tentativa recusada da liquidação NÃO muda o Payment (só o motor da liquidação decide)', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce({ providerPaymentId: 'mp-dec-1', status: 'failed', amountCents: 7000, failureReason: 'cc_rejected_other_reason' });
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    const res = await ctx.svc.applyProviderPayment({ providerPaymentId: 'mp-dec-1', status: 'failed', amountCents: 7000, externalReference: r.paymentId, failureReason: 'cc_rejected_other_reason' });
    expect(res?.changed).toBe(false);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
    expect(await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } })).toMatchObject({ attempts: 1 });
  });

  it('webhook aprovando a cobrança em análise → roda o motor: paid com caução liberada e recibo', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce(inReview());
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce({ ...inReview(), status: 'paid' });
    await ctx.svc.applyProviderPayment({ ...inReview(), status: 'paid', externalReference: r.paymentId });
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('paid');
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect(ctx.receipts.issueForPayment).toHaveBeenCalledWith(r.paymentId);
  });

  it('webhook não mexe em liquidação estacionada', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce(inReview());
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    await ctx.db.settlementProgress.update({ where: { paymentId: r.paymentId }, data: { parkedAt: new Date(), parkedReason: 'revisão' } });
    const getPayment = jest.spyOn(ctx.provider, 'getPayment');
    await ctx.svc.applyProviderPayment({ ...inReview(), status: 'paid', externalReference: r.paymentId });
    expect(getPayment).not.toHaveBeenCalled();
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
  });

  it('errorRuns volta a 0 quando um passo conclui; falha ao registrar o erro preserva o erro original', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockRejectedValueOnce(new PaymentProviderError('Mercado Pago: charge falhou (502).', 502));
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY })).rejects.toThrow('502');
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).errorRuns).toBe(1);
    // Próxima execução: a cobrança passa, mas a liberação da caução falha → errorRuns recomeça do zero (1, não 2).
    jest.spyOn(ctx.provider, 'cancelPreAuthorization').mockRejectedValueOnce(new Error('rede caiu'));
    const realUpdate = ctx.db.settlementProgress.update.bind(ctx.db.settlementProgress);
    jest.spyOn(ctx.db.settlementProgress, 'update').mockImplementation(async (args: any) => {
      if (args.data?.parkedAt !== undefined || (args.data?.errorRuns !== undefined && args.data?.lastFailure)) throw new Error('banco indisponível');
      return realUpdate(args);
    });
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY })).rejects.toThrow('rede caiu');
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).errorRuns).toBe(0);
  });
});

describe('fix round 4: análise com prazo, garantia em análise, recusa explícita, job ordenado', () => {
  const DAY = 24 * 60 * 60_000;
  const inReview = (id = 'mp-review-1', amountCents = 7000) => ({ providerPaymentId: id, status: 'pending' as const, amountCents, externalReference: 'x' });
  /** Relógio controlável: o serviço lê `now()` em vez de `new Date()` para decidir o prazo da análise. */
  function fakeClock(start = Date.now()) {
    let t = start;
    return { now: () => new Date(t), advance: (ms: number) => { t += ms; } };
  }

  it('cobrança em análise além de PAYMENT_REVIEW_MAX_DAYS → estacionada (review_timeout) com log e evento payment.needs-review', async () => {
    const clock = fakeClock();
    const ctx = await setup({ now: clock.now });
    await rentalWithDeposit(ctx);
    const charge = jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce(inReview());
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    const prog0 = await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } });
    expect(prog0.steps.chargeInReview).toBe('mp-review-1');
    expect(new Date(prog0.steps.chargeInReviewSince).getTime()).toBe(clock.now().getTime());

    const getPayment = jest.spyOn(ctx.provider, 'getPayment').mockResolvedValue(inReview());
    // Antes do prazo: continua esperando (sem cobrar, sem estacionar, sem inadimplência).
    clock.advance(6 * DAY);
    await ctx.svc.retryPendingSettlements(0);
    let prog = await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } });
    expect(prog.parkedAt).toBeNull();
    expect(ctx.needsReview).toEqual([]);
    // No prazo: estaciona com motivo review_timeout e avisa o operador.
    clock.advance(1 * DAY);
    await ctx.svc.retryPendingSettlements(0);
    prog = await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } });
    expect(prog.parkedAt).toBeInstanceOf(Date);
    expect(prog.parkedReason).toBe('review_timeout');
    expect(ctx.needsReview).toEqual([{ paymentId: r.paymentId, rentalId: RENTAL, reason: 'review_timeout' }]);
    expect(charge).toHaveBeenCalledTimes(1);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
    // Estacionada: o job e a porta não consultam mais o gateway.
    getPayment.mockClear();
    await ctx.svc.retryPendingSettlements(0);
    expect(await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY })).toEqual({ paymentId: r.paymentId, status: 'failed' });
    expect(getPayment).not.toHaveBeenCalled();
  });

  it('cobrança em análise aprovada dentro do prazo → limpa o início da análise e conclui paid', async () => {
    const clock = fakeClock();
    const ctx = await setup({ now: clock.now });
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce(inReview());
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    clock.advance(3 * DAY);
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce({ ...inReview(), status: 'paid' });
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('paid');
    const prog = await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } });
    expect(prog.steps.chargeInReviewSince).toBeNull();
    expect(prog.parkedAt).toBeNull();
    expect(ctx.needsReview).toEqual([]);
  });

  it('captura em análise (plano card_capture) → espera sem cancelar; aprovada depois (job) → paid com caução capturada', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    const capture = jest.spyOn(ctx.provider, 'capture').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    const cancel = jest.spyOn(ctx.provider, 'cancelPreAuthorization');
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('failed');
    const prog = await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } });
    expect(prog).toMatchObject({ attempts: 0, errorRuns: 0 });
    expect(prog.steps.captureInReviewSince).toBeDefined();
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(false);
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');

    const getPayment = jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    await ctx.svc.retryPendingSettlements(0);
    expect(capture).toHaveBeenCalledTimes(1);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');

    getPayment.mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'captured', amountCents: 5000, capturedCents: 1290 });
    await ctx.svc.retryPendingSettlements(0);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('paid');
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 1290 });
    expect((await depositPayment(ctx.db, held.depositId)).status).toBe('captured');
  });

  it('captura em análise aprovada por webhook do Payment da caução → o motor é acionado e conclui paid', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'capture').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    const approved = { providerPaymentId: dp.providerPaymentId, status: 'captured' as const, amountCents: 5000, capturedCents: 1290, externalReference: dp.id };
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValue(approved);
    await ctx.svc.applyProviderPayment(approved);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('paid');
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 1290 });
    expect(ctx.receipts.issueForPayment).toHaveBeenCalledWith(r.paymentId);
  });

  it('captura em análise recusada depois → pré-autorização morta: caução released, Payment da caução failed, liquidação failed e inadimplente (sem cancelar no gateway)', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'capture').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    const cancel = jest.spyOn(ctx.provider, 'cancelPreAuthorization');
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'failed', amountCents: 5000, failureReason: 'cc_rejected_high_risk' });
    await ctx.svc.retryPendingSettlements(0);
    expect(cancel).not.toHaveBeenCalled();
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ status: 'failed', failureReason: 'cc_rejected_high_risk' });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect((await depositPayment(ctx.db, held.depositId)).status).toBe('failed');
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
  });

  it('garantia: captura da caução em análise na última tentativa → NÃO cancela a pré-autorização; aprovada depois → caução capturada e liquidação failed', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    const charge = jest.spyOn(ctx.provider, 'charge').mockResolvedValue({ providerPaymentId: '', status: 'failed', amountCents: 7000, failureReason: 'cc_rejected_other_reason' });
    const capture = jest.spyOn(ctx.provider, 'capture').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    const cancel = jest.spyOn(ctx.provider, 'cancelPreAuthorization');
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    await ctx.svc.retryPendingSettlements(0);
    await ctx.svc.retryPendingSettlements(0);
    expect(charge).toHaveBeenCalledTimes(3);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    // Em análise: nada é decidido ainda. Caução continua held, pagamento pending, cliente inadimplente, sem novas cobranças.
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
    const prog = await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } });
    expect(prog.attempts).toBe(3);
    expect(prog.steps.guaranteeCaptureInReview).toBe(true);
    expect(prog.steps.captureInReviewSince).toBeDefined();
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);

    const getPayment = jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    await ctx.svc.retryPendingSettlements(0);
    expect(charge).toHaveBeenCalledTimes(3);
    expect(capture).toHaveBeenCalledTimes(1);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');

    getPayment.mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'captured', amountCents: 5000, capturedCents: 5000 });
    await ctx.svc.retryPendingSettlements(0);
    expect(charge).toHaveBeenCalledTimes(3);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 5000 });
    expect((await depositPayment(ctx.db, held.depositId)).status).toBe('captured');
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('failed');
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
  });

  it('garantia em análise aprovada por webhook do Payment da caução → o motor conclui (caução capturada, liquidação failed)', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'charge').mockResolvedValue({ providerPaymentId: '', status: 'failed', amountCents: 7000, failureReason: 'cc_rejected_other_reason' });
    jest.spyOn(ctx.provider, 'capture').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    await ctx.svc.retryPendingSettlements(0);
    await ctx.svc.retryPendingSettlements(0);
    const approved = { providerPaymentId: dp.providerPaymentId, status: 'captured' as const, amountCents: 5000, capturedCents: 5000, externalReference: dp.id };
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValue(approved);
    await ctx.svc.applyProviderPayment(approved);
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 5000 });
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('failed');
  });

  it('garantia em análise recusada depois → caução released sem cancelar no gateway, Payment da caução failed, liquidação failed', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'charge').mockResolvedValue({ providerPaymentId: '', status: 'failed', amountCents: 7000, failureReason: 'cc_rejected_other_reason' });
    jest.spyOn(ctx.provider, 'capture').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    const cancel = jest.spyOn(ctx.provider, 'cancelPreAuthorization');
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    await ctx.svc.retryPendingSettlements(0);
    await ctx.svc.retryPendingSettlements(0);
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'failed', amountCents: 5000, failureReason: 'cc_rejected_other_reason' });
    await ctx.svc.retryPendingSettlements(0);
    expect(cancel).not.toHaveBeenCalled();
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect((await depositPayment(ctx.db, held.depositId)).status).toBe('failed');
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('failed');
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
  });

  it('garantia em análise além do prazo → estacionada (review_timeout), caução continua held', async () => {
    const clock = fakeClock();
    const ctx = await setup({ now: clock.now });
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'charge').mockResolvedValue({ providerPaymentId: '', status: 'failed', amountCents: 7000, failureReason: 'cc_rejected_other_reason' });
    jest.spyOn(ctx.provider, 'capture').mockResolvedValueOnce({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    await ctx.svc.retryPendingSettlements(0);
    await ctx.svc.retryPendingSettlements(0);
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValue({ providerPaymentId: dp.providerPaymentId, status: 'pending', amountCents: 5000 });
    clock.advance(8 * DAY);
    await ctx.svc.retryPendingSettlements(0);
    const prog = await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } });
    expect(prog.parkedReason).toBe('review_timeout');
    expect(ctx.needsReview).toEqual([{ paymentId: r.paymentId, rentalId: RENTAL, reason: 'review_timeout' }]);
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
  });

  it('cobrança em análise que aparece como refunded (nem aprovada nem recusada) → estaciona para revisão, sem nova cobrança (:a1)', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    const charge = jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce(inReview());
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValue({ ...inReview(), status: 'refunded', refundedCents: 7000 });
    await ctx.svc.retryPendingSettlements(0);
    await ctx.svc.retryPendingSettlements(0);
    expect(charge).toHaveBeenCalledTimes(1);
    expect(charge.mock.calls.map((c) => c[0].idempotencyKey)).toEqual([`${SETTLE_KEY}:charge`]);
    const prog = await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } });
    expect(prog.parkedAt).toBeInstanceOf(Date);
    expect(prog.parkedReason).toMatch(/refunded/);
    expect(prog.attempts).toBe(0);
    expect(ctx.needsReview).toHaveLength(1);
    expect(ctx.needsReview[0]).toMatchObject({ paymentId: r.paymentId, rentalId: RENTAL });
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
  });

  it('cobrança em análise cancelada pelo gateway → conta como recusa (próxima tentativa :a1)', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    const charge = jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce(inReview());
    await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    jest.spyOn(ctx.provider, 'getPayment').mockResolvedValueOnce({ ...inReview(), status: 'canceled' });
    await ctx.svc.retryPendingSettlements(0);
    await ctx.svc.retryPendingSettlements(0);
    expect(charge.mock.calls.map((c) => c[0].idempotencyKey)).toEqual([`${SETTLE_KEY}:charge`, `${SETTLE_KEY}:charge:a1`]);
  });

  it('estacionamento por erros repetidos também emite payment.needs-review', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'capture').mockResolvedValue({ providerPaymentId: dp.providerPaymentId, status: 'failed', amountCents: 1290, failureReason: 'cc_rejected_other_reason' });
    jest.spyOn(ctx.provider, 'cancelPreAuthorization').mockRejectedValue(new PaymentProviderError('Mercado Pago: cancelPreAuthorization falhou (502).', 502));
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    for (let i = 0; i < 10; i++) await ctx.svc.retryPendingSettlements(0);
    expect(ctx.needsReview).toHaveLength(1);
    expect(ctx.needsReview[0]).toMatchObject({ paymentId: r.paymentId, rentalId: RENTAL });
    expect(ctx.needsReview[0].reason).toMatch(/502/);
  });

  it('job de retomada: ordem por updatedAt crescente e liquidações estacionadas fora da consulta', async () => {
    const ctx = await setup();
    const CUSTOMER_B = '33333333-3333-4333-8333-333333333333';
    const RENTAL_B = '99999999-9999-4999-8999-999999999999';
    await ctx.db.customer.create({ data: { id: CUSTOMER_B, cognitoSub: 'sub-b', email: 'b@example.com' } });
    const customers = new ProviderCustomersService(ctx.db as any, ctx.provider);
    await customers.addCard(CUSTOMER_B, 'tok_visa_1111', true);
    const { held: heldA } = await rentalWithDeposit(ctx);
    const heldB = await ctx.svc.holdDeposit({ customerId: CUSTOMER_B, rentalId: RENTAL_B, method: 'card', idempotencyKey: `deposit:${CUSTOMER_B}:idem-b` });
    await ctx.db.rental.create({ data: { id: RENTAL_B, customerId: CUSTOMER_B, vehicleId: 'v2', planCode: 'minute', coverage: 'basic', status: 'ended', depositId: heldB.depositId, priceSnapshot: {} } });
    const dpA = await depositPayment(ctx.db, heldA.depositId);
    const dpB = await depositPayment(ctx.db, heldB.depositId);
    // As duas liquidações caem no gateway (timeout) e ficam pendentes; B ficou pendente primeiro.
    const capture = jest.spyOn(ctx.provider, 'capture').mockRejectedValueOnce(new Error('timeout')).mockRejectedValueOnce(new Error('timeout'));
    await expect(ctx.svc.settle({ rentalId: RENTAL_B, amountCents: 1000, idempotencyKey: `rental-settlement:${RENTAL_B}` })).rejects.toThrow('timeout');
    await new Promise((r) => setTimeout(r, 5));
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY })).rejects.toThrow('timeout');
    const payA = await ctx.db.payment.findFirst({ where: { rentalId: RENTAL, kind: 'rental' } });
    const payB = await ctx.db.payment.findFirst({ where: { rentalId: RENTAL_B, kind: 'rental' } });
    // Uma terceira liquidação estacionada não deve nem ser lida pelo job.
    await ctx.db.payment.create({ data: { id: '77777777-7777-4777-8777-777777777777', customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'pending', amountCents: 10, rentalId: RENTAL, idempotencyKey: 'rental-settlement:parked' } });
    await ctx.db.settlementProgress.create({ data: { paymentId: '77777777-7777-4777-8777-777777777777', plan: 'charge_only', parkedAt: new Date(), parkedReason: 'x' } });
    const findMany = jest.spyOn(ctx.db.settlementProgress, 'findMany');
    capture.mockClear();
    await ctx.svc.retryPendingSettlements(0);
    expect(capture.mock.calls.map((c) => c[0].providerPaymentId)).toEqual([dpB.providerPaymentId, dpA.providerPaymentId]);
    expect((await ctx.db.payment.findUnique({ where: { id: payA.id } })).status).toBe('paid');
    expect((await ctx.db.payment.findUnique({ where: { id: payB.id } })).status).toBe('paid');
    const listing = findMany.mock.calls.find((c) => c[0]?.orderBy)?.[0];
    expect(listing).toMatchObject({ where: expect.objectContaining({ parkedAt: null, finishedAt: null }), orderBy: { updatedAt: 'asc' }, take: 50 });
    // Concluídas ganham finishedAt e saem da fila do job (senão 50 liquidações antigas tomariam a página inteira).
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: payA.id } })).finishedAt).toBeInstanceOf(Date);
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: payB.id } })).finishedAt).toBeInstanceOf(Date);
  });

  it('job de retomada: registro sem finishedAt de liquidação já concluída (queda) é fechado pelo job, sem tocar no gateway', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    await ctx.db.settlementProgress.update({ where: { paymentId: r.paymentId }, data: { finishedAt: null } });
    const getPayment = jest.spyOn(ctx.provider, 'getPayment');
    const capture = jest.spyOn(ctx.provider, 'capture');
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } })).finishedAt).toBeInstanceOf(Date);
    expect(getPayment).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('liquidação que termina failed (3 recusas) também ganha finishedAt', async () => {
    const ctx = await setup();
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'capture').mockResolvedValue({ providerPaymentId: 'x', status: 'failed', amountCents: 1290, failureReason: 'cc_rejected_other_reason' });
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } })).finishedAt).toBeNull();
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('failed');
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: r.paymentId } })).finishedAt).toBeInstanceOf(Date);
  });
});

describe('Task 16 (R2-01): ordem de liquidação no fechamento — carteira → caução → cartão → dívida', () => {
  /** Caução Pix paga (como no QA: cliente só com Pix). */
  async function pixDepositPaid(ctx: Awaited<ReturnType<typeof setup>>) {
    const { held } = await rentalWithDeposit(ctx, 'pix');
    const dp = await depositPayment(ctx.db, held.depositId);
    ctx.provider.simulatePixPaid(dp.providerPaymentId);
    await ctx.svc.applyProviderPayment(await ctx.provider.getPayment(dp.providerPaymentId));
    return { held, dp };
  }
  const info = async (ctx: Awaited<ReturnType<typeof setup>>, paymentId: string) => {
    const rental = await ctx.db.rental.findUnique({ where: { id: RENTAL } });
    return receiptPaymentInfo(ctx.db as any, rental, await ctx.db.payment.findUnique({ where: { id: paymentId } }));
  };

  it('1) carteira cobriu tudo (o fechamento já abateu: nada a cobrar, walletCents = bruto) → paga pela carteira e a caução Pix volta inteira', async () => {
    const ctx = await setup({ card: null });
    const { held, dp } = await pixDepositPaid(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 0, walletCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('paid');
    // Fix round 1: o pagamento registra o bruto (NFS-e e PDF pelo valor cheio), com a parte da carteira.
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ status: 'paid', method: 'wallet', amountCents: 1290, walletCents: 1290 });
    expect(ctx.receipts.issueForPayment).toHaveBeenCalledWith(r.paymentId);
    expect(await ctx.db.payment.findUnique({ where: { id: dp.id } })).toMatchObject({ status: 'refunded', refundedCents: 5000 });
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'released' });
    expect(await info(ctx, r.paymentId)).toEqual({ status: 'paid', method: 'wallet', depositReleasedCents: 5000 });
  });

  it('2) caução Pix cobre o restante → abate e devolve só o saldo; recibo pago com "caução usada"', async () => {
    const ctx = await setup({ card: null });
    await pixDepositPaid(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('paid');
    expect(await info(ctx, r.paymentId)).toEqual({ status: 'paid', method: 'pix', depositUsedCents: 1290, depositReleasedCents: 3710 });
  });

  it('3) caução Pix menor que o valor e cartão salvo → a caução inteira abate e o cartão paga só o restante', async () => {
    const ctx = await setup();
    const { held } = await pixDepositPaid(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 6500, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('paid');
    expect(ctx.provider.operations('charge')).toBe(1);
    const charged = (await ctx.provider.searchPayments({ externalReference: r.paymentId }))[0];
    expect(charged.amountCents).toBe(1500);
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 5000 });
    expect(await info(ctx, r.paymentId)).toMatchObject({ status: 'paid', method: 'card', cardLast4: '4242', depositUsedCents: 5000, depositReleasedCents: 0 });
  });

  it('4) sem cartão (cenário do QA) → caução retida para abater, o restante vira dívida pagável no app e bloqueia novo aluguel', async () => {
    const ctx = await setup({ card: null });
    const { held } = await pixDepositPaid(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 26635, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('failed');
    expect(ctx.provider.operations('charge')).toBe(0);
    // A caução não é devolvida: abate o valor devido.
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 5000 });
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ status: 'failed', failureReason: 'card_not_found' });
    expect(await info(ctx, r.paymentId)).toEqual({ status: 'pending', amountDueCents: 21635, depositUsedCents: 5000, depositReleasedCents: 0 });
    expect(ctx.receipts.issueForPayment).not.toHaveBeenCalled();
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
    // Mesmo sem a flag (qualquer caminho que a limpe), a dívida em aberto continua impedindo alugar.
    await ctx.db.customer.update({ where: { id: CUSTOMER }, data: { delinquent: false } });
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
    await ctx.db.payment.update({ where: { id: r.paymentId }, data: { debtSettledAt: new Date(), debtSettlement: 'manual' } });
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(false);
  });

  it('fix round 1: carteira parcial + caução Pix + sem cartão → bruto no pagamento; dívida = bruto − carteira − caução', async () => {
    const ctx = await setup({ card: null });
    await pixDepositPaid(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 6500, walletCents: 1000, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('failed');
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ amountCents: 7500, walletCents: 1000, status: 'failed' });
    expect(await info(ctx, r.paymentId)).toEqual({ status: 'pending', amountDueCents: 1500, depositUsedCents: 5000, depositReleasedCents: 0 });
  });

  it('fix round 1: carteira parcial + caução Pix cobre o resto → captura só o restante (não o bruto)', async () => {
    const ctx = await setup({ card: null });
    const { held } = await pixDepositPaid(ctx);
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, walletCents: 300, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('paid');
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ amountCents: 1590, walletCents: 300, method: 'pix' });
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 1290 });
  });

  it('5) sem caução retida e sem cartão → o valor inteiro vira dívida (processando enquanto a liquidação está pendente)', async () => {
    const ctx = await setup({ card: null });
    await ctx.db.rental.create({ data: { id: RENTAL, customerId: CUSTOMER, vehicleId: 'v', planCode: 'minute', coverage: 'basic', status: 'ended', depositId: null, priceSnapshot: {} } });
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY });
    expect(r.status).toBe('failed');
    expect(await info(ctx, r.paymentId)).toEqual({ status: 'pending', amountDueCents: 1290 });
    // Liquidação ainda pendente (ex.: cartão recusado, retentando) → processando, sem forma de pagamento.
    await ctx.db.payment.update({ where: { id: r.paymentId }, data: { status: 'pending' } });
    expect(await info(ctx, r.paymentId)).toEqual({ status: 'processing' });
  });
});

describe('fix round 1 (revisão): caução ainda held ao estacionar', () => {
  const failCharges = (ctx: Awaited<ReturnType<typeof setup>>) =>
    jest.spyOn(ctx.provider, 'charge').mockRejectedValue(new PaymentProviderError('Mercado Pago: charge falhou (502).', 502));
  const parkByErrors = async (ctx: Awaited<ReturnType<typeof setup>>, amountCents: number) => {
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents, idempotencyKey: SETTLE_KEY })).rejects.toThrow();
    for (let i = 0; i < 4; i++) await ctx.svc.retryPendingSettlements(0);
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).parkedAt).toBeInstanceOf(Date);
    return pay;
  };
  const due = async (ctx: Awaited<ReturnType<typeof setup>>, paymentId: string) => {
    const rental = await ctx.db.rental.findUnique({ where: { id: RENTAL } });
    return (await receiptPaymentInfo(ctx.db as any, rental, await ctx.db.payment.findUnique({ where: { id: paymentId } }))).amountDueCents;
  };

  it('card_charge com a pré-autorização já capturada no gateway → caução capturada e dívida de R$ 20 (não R$ 70)', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    failCharges(ctx);
    const real = ctx.provider.getPayment.bind(ctx.provider);
    jest.spyOn(ctx.provider, 'getPayment').mockImplementation(async (id) =>
      id === dp.providerPaymentId ? { providerPaymentId: id, status: 'captured', amountCents: 5000, capturedCents: 5000 } : real(id));
    const pay0 = await parkByErrors(ctx, 7000);
    const pay = await ctx.db.payment.findUnique({ where: { id: pay0.id } });
    expect(pay).toMatchObject({ status: 'failed', failureReason: 'settlement_parked' });
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 5000 });
    expect(await due(ctx, pay.id)).toBe(2000);
  });

  it('card_capture com a captura que entrou no gateway → paga (sem dívida), não cobra de novo', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    jest.spyOn(ctx.provider, 'capture').mockRejectedValue(new PaymentProviderError('Mercado Pago: capture falhou (502).', 502));
    const getPayment = jest.spyOn(ctx.provider, 'getPayment').mockRejectedValue(new PaymentProviderError('Mercado Pago: getPayment falhou (502).', 502));
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 1290, idempotencyKey: SETTLE_KEY })).rejects.toThrow();
    for (let i = 0; i < 3; i++) await ctx.svc.retryPendingSettlements(0);
    // 5ª execução: a captura aparece como feita só na conferência ao estacionar.
    getPayment.mockRejectedValueOnce(new PaymentProviderError('Mercado Pago: getPayment falhou (502).', 502));
    getPayment.mockResolvedValue({ providerPaymentId: dp.providerPaymentId, status: 'captured', amountCents: 5000, capturedCents: 1290 });
    await ctx.svc.retryPendingSettlements(0);
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).parkedAt).toBeInstanceOf(Date);
    expect(pay.status).toBe('paid');
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 1290 });
    expect(isOpenDebt(pay)).toBe(false);
  });

  it('pré-autorização recusada/cancelada no gateway → caução liberada localmente e dívida do valor cheio', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    failCharges(ctx);
    const real = ctx.provider.getPayment.bind(ctx.provider);
    jest.spyOn(ctx.provider, 'getPayment').mockImplementation(async (id) =>
      id === dp.providerPaymentId ? { providerPaymentId: id, status: 'canceled', amountCents: 5000 } : real(id));
    const cancel = jest.spyOn(ctx.provider, 'cancelPreAuthorization');
    const pay = await parkByErrors(ctx, 7000);
    expect(pay).toMatchObject({ status: 'failed', failureReason: 'settlement_parked' });
    expect(cancel).not.toHaveBeenCalled();
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
    expect(await due(ctx, pay.id)).toBe(7000);
  });

  it('pré-autorização em estado inesperado no gateway → continua pending para revisão', async () => {
    const ctx = await setup();
    const { held } = await rentalWithDeposit(ctx);
    const dp = await depositPayment(ctx.db, held.depositId);
    failCharges(ctx);
    const real = ctx.provider.getPayment.bind(ctx.provider);
    jest.spyOn(ctx.provider, 'getPayment').mockImplementation(async (id) =>
      id === dp.providerPaymentId ? { providerPaymentId: id, status: 'refunded', amountCents: 5000 } : real(id));
    const pay = await parkByErrors(ctx, 7000);
    expect(pay.status).toBe('pending');
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
  });

  async function pixHeld(ctx: Awaited<ReturnType<typeof setup>>) {
    const { held } = await rentalWithDeposit(ctx, 'pix');
    const dp = await depositPayment(ctx.db, held.depositId);
    ctx.provider.simulatePixPaid(dp.providerPaymentId);
    await ctx.svc.applyProviderPayment(await ctx.provider.getPayment(dp.providerPaymentId));
    return { held, dp };
  }

  it('pix_keep_charge: caução Pix ainda held ao estacionar → retida (abate) e dívida só do restante', async () => {
    const ctx = await setup();
    const { held } = await pixHeld(ctx);
    failCharges(ctx);
    // As 5 execuções caem ao reter a caução (o passo `depositKept` nunca é gravado); a conferência ao estacionar retém.
    const realUpdateMany = ctx.db.deposit.updateMany.bind(ctx.db.deposit);
    let keepFailures = 5;
    jest.spyOn(ctx.db.deposit, 'updateMany').mockImplementation(async (args: any) => {
      if (args.data?.status === 'captured' && keepFailures-- > 0) throw new Error('banco indisponível');
      return realUpdateMany(args);
    });
    await expect(ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY })).rejects.toThrow();
    for (let i = 0; i < 4; i++) await ctx.svc.retryPendingSettlements(0);
    const pay = await ctx.db.payment.findFirst({ where: { kind: 'rental' } });
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: pay.id } })).parkedAt).toBeInstanceOf(Date);
    expect(pay).toMatchObject({ status: 'failed', failureReason: 'settlement_parked' });
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 5000 });
    expect(await due(ctx, pay.id)).toBe(2000);
  });

  it('pix_keep com o estorno do excedente falhando → continua pending; quando o estorno passa, retém e conclui paga', async () => {
    let t = Date.now();
    const ctx = await setup({ now: () => new Date(t) });
    const { held } = await pixHeld(ctx);
    const refund = jest.spyOn(ctx.provider, 'refund').mockRejectedValue(new PaymentProviderError('Mercado Pago: refund falhou (502).', 502));
    const pay0 = await parkByErrors(ctx, 1290);
    expect(pay0.status).toBe('pending');
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
    refund.mockRestore();
    t += 10 * 60_000;
    await ctx.svc.retryPendingSettlements(0);
    const pay = await ctx.db.payment.findUnique({ where: { id: pay0.id } });
    expect(pay.status).toBe('paid');
    expect(await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).toMatchObject({ status: 'captured', capturedCents: 1290 });
    expect(isOpenDebt(pay)).toBe(false);
  });

  it('fix round 2: 50+ estacionadas em análise (mais antigas) não impedem a conversão de outra cujo gateway voltou', async () => {
    let t = Date.now();
    const ctx = await setup({ now: () => new Date(t) });
    const { held } = await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockImplementation(async (i) => ({ providerPaymentId: `x-${i.idempotencyKey}`, status: 'failed', amountCents: i.amountCents, failureReason: 'card_not_found' }));
    const getPayment = jest.spyOn(ctx.provider, 'getPayment').mockRejectedValue(new PaymentProviderError('Pagamento não encontrado no gateway.', 404));
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    for (let i = 0; i < 10; i++) await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
    // 60 estacionadas em análise, todas mais antigas que a do cliente acima.
    const old = new Date(t - 24 * 60 * 60_000);
    for (let i = 0; i < 60; i++) {
      const id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, '0')}`;
      await ctx.db.payment.create({ data: { id, customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'pending', amountCents: 10, rentalId: `r-${i}`, idempotencyKey: `k-${i}` } });
      await ctx.db.settlementProgress.create({ data: { paymentId: id, plan: 'charge_only', steps: { chargeInReview: `mp-${i}`, chargeInReviewSince: old.toISOString() }, parkedAt: old, parkedReason: 'review_timeout', updatedAt: old } });
    }
    getPayment.mockRestore();
    t += 10 * 60_000;
    await ctx.svc.retryPendingSettlements(0);
    expect(await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).toMatchObject({ status: 'failed', failureReason: 'settlement_parked' });
    expect((await ctx.db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('released');
  });

  it('fix round 2: estacionada cujo Payment já saiu de pending (queda antes do carimbo) → o job fecha o registro', async () => {
    const ctx = await setup();
    const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await ctx.db.payment.create({ data: { id, customerId: CUSTOMER, kind: 'rental', method: 'card', status: 'failed', amountCents: 10, rentalId: 'r-x', idempotencyKey: 'k-x' } });
    await ctx.db.settlementProgress.create({ data: { paymentId: id, plan: 'charge_only', parkedAt: new Date(), parkedReason: 'x', errorRuns: 5, updatedAt: new Date(Date.now() - 60 * 60_000) } });
    await ctx.svc.retryPendingSettlements(0);
    expect((await ctx.db.settlementProgress.findUnique({ where: { paymentId: id } })).finishedAt).toBeInstanceOf(Date);
  });

  it('job de estacionadas: em análise no gateway nunca vira dívida, mesmo depois do intervalo', async () => {
    let t = Date.now();
    const ctx = await setup({ now: () => new Date(t) });
    await rentalWithDeposit(ctx);
    jest.spyOn(ctx.provider, 'charge').mockResolvedValueOnce({ providerPaymentId: 'mp-review-1', status: 'pending', amountCents: 7000, externalReference: 'x' });
    const r = await ctx.svc.settle({ rentalId: RENTAL, amountCents: 7000, idempotencyKey: SETTLE_KEY });
    await ctx.db.settlementProgress.update({ where: { paymentId: r.paymentId }, data: { parkedAt: new Date(), parkedReason: 'review_timeout' } });
    const getPayment = jest.spyOn(ctx.provider, 'getPayment');
    t += 24 * 60 * 60_000;
    await ctx.svc.retryPendingSettlements(0);
    expect(getPayment).not.toHaveBeenCalled();
    expect((await ctx.db.payment.findUnique({ where: { id: r.paymentId } })).status).toBe('pending');
  });
});
