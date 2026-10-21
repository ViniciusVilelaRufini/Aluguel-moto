import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, type PaymentUpdatedEvent } from '../../common/events';
import { MockInsuranceProvider } from '../insurance/insurance-provider';
import { InsuranceService } from '../insurance/insurance.service';
import { PaymentStateService } from './payment-state.service';
import { InvalidPaymentTransitionError } from './payment-state';
import { FakePaymentProvider } from './provider/fake-payment-provider';
import { PaymentProviderError } from './provider/payment-provider';
import { ProviderCustomersService } from './provider-customers.service';
import { RentalBillingService } from './rental-billing.service';
import { createInMemoryPrisma, type InMemoryPrisma } from './testing/in-memory-prisma';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const RENTAL = '88888888-8888-4888-8888-888888888888';
const KEY = `deposit:${CUSTOMER}:idem-1`;
const SETTLE_KEY = `rental-settlement:${RENTAL}`;

async function setup(opts: { card?: string | null } = {}) {
  const db: InMemoryPrisma = createInMemoryPrisma();
  const provider = new FakePaymentProvider('segredo');
  const events = new EventEmitter2();
  const emitted: PaymentUpdatedEvent[] = [];
  events.on(EV.PAYMENT_UPDATED, (e: PaymentUpdatedEvent) => emitted.push(e));
  await db.customer.create({ data: { id: CUSTOMER, cognitoSub: 'sub', email: 'cliente@example.com' } });
  await db.fee.create({ data: { code: 'deposit', amountCents: 5000, active: true } });
  await db.insuranceCoverageConfig.create({ data: { coverage: 'basic', name: 'Básico', description: 'x', premiumCents: 200, mandatory: true } });
  const state = new PaymentStateService(db as any, events);
  const customers = new ProviderCustomersService(db as any, provider);
  if (opts.card !== null) await customers.addCard(CUSTOMER, opts.card ?? 'tok_visa_4242', true);
  const insurance = new InsuranceService(db as any, new MockInsuranceProvider());
  const receipts = { issueForPayment: jest.fn().mockResolvedValue(undefined) };
  const queue = { publish: jest.fn(), subscribe: jest.fn() };
  const svc = new RentalBillingService(db as any, provider, state, customers, insurance, receipts as any, queue as any, { pixExpirationMinutes: 15, fakePixAutoConfirmSeconds: 0 });
  return { db, provider, svc, emitted, receipts, insurance, state };
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

  it('cancelamento final que sempre falha → liquidação estacionada para revisão manual após 5 execuções (o job para)', async () => {
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
    expect(cancel).toHaveBeenCalledTimes(5);
    expect(pay.status).toBe('pending');
    expect(await ctx.svc.isDelinquent(CUSTOMER)).toBe(true);
  });
});
