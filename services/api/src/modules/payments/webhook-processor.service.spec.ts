import { EventEmitter2 } from '@nestjs/event-emitter';
import { MockInsuranceProvider } from '../insurance/insurance-provider';
import { InsuranceService } from '../insurance/insurance.service';
import { WalletService } from '../wallet/wallet.service';
import { PaymentStateService } from './payment-state.service';
import { FakePaymentProvider } from './provider/fake-payment-provider';
import type { WebhookQueueMessage } from './provider/fake-pix-autoconfirm';
import { ProviderCustomersService } from './provider-customers.service';
import { RentalBillingService } from './rental-billing.service';
import { SubscriptionsService } from './subscriptions.service';
import { createInMemoryPrisma, type InMemoryPrisma } from './testing/in-memory-prisma';
import { WebhookProcessor } from './webhook-processor.service';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const RENTAL = '88888888-8888-4888-8888-888888888888';
const opts = { pixExpirationMinutes: 15, fakePixAutoConfirmSeconds: 0 };

async function setup() {
  const db: InMemoryPrisma = createInMemoryPrisma();
  const provider = new FakePaymentProvider('s');
  const events = new EventEmitter2();
  const state = new PaymentStateService(db as any, events);
  const customers = new ProviderCustomersService(db as any, provider);
  const queue = { publish: jest.fn(), subscribe: jest.fn() };
  await db.customer.create({ data: { id: CUSTOMER, cognitoSub: 'sub', email: 'c@example.com' } });
  await db.fee.create({ data: { code: 'deposit', amountCents: 5000, active: true } });
  const billing = new RentalBillingService(db as any, provider, state, customers, new InsuranceService(db as any, new MockInsuranceProvider()), { issueForPayment: jest.fn() } as any, queue as any, events, opts);
  const wallet = new WalletService(db as any, { record: jest.fn() } as any, provider, state, customers, queue as any, opts);
  const subscriptions = new SubscriptionsService(db as any, provider, state, customers, billing);
  const processor = new WebhookProcessor(db as any, provider, billing, wallet, subscriptions, queue as any);
  return { db, provider, billing, wallet, subscriptions, processor, queue };
}

const event = (dataId: string, eventId = `evt-${dataId}`): WebhookQueueMessage => ({ provider: 'mercadopago', eventId, type: 'payment', action: 'payment.updated', dataId });

describe('WebhookProcessor (fila pagamentos-webhook, dedup por eventId)', () => {
  it('assina a fila pagamentos-webhook ao iniciar', async () => {
    const { processor, queue } = await setup();
    processor.onModuleInit();
    expect(queue.subscribe).toHaveBeenCalledWith('pagamentos-webhook', expect.any(Function));
  });

  it('Pix de caução pago → caução held; o mesmo evento duas vezes gera um efeito só', async () => {
    const { db, provider, billing, processor } = await setup();
    const held = await billing.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'pix', idempotencyKey: 'k' });
    const dp = await db.payment.findFirst({ where: { depositId: held.depositId } });
    provider.simulatePixPaid(dp.providerPaymentId);
    const apply = jest.spyOn(billing, 'applyProviderPayment');
    expect(await processor.process(event(dp.providerPaymentId))).toBe('processed');
    expect(await processor.process(event(dp.providerPaymentId))).toBe('duplicate');
    expect(apply).toHaveBeenCalledTimes(1);
    expect((await db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
    expect((await db.payment.findUnique({ where: { id: dp.id } })).status).toBe('paid');
    expect(await db.processedWebhook.count()).toBe(1);
  });

  it('entregas concorrentes do mesmo evento → um efeito só', async () => {
    const { db, provider, wallet, processor } = await setup();
    const t = await wallet.topUp(CUSTOMER, { amountCents: 2000, method: 'pix' });
    const pay = await db.payment.findUnique({ where: { id: t.paymentId } });
    provider.simulatePixPaid(pay.providerPaymentId);
    const results = await Promise.all([processor.process(event(pay.providerPaymentId)), processor.process(event(pay.providerPaymentId))]);
    expect(results.sort()).toEqual(['duplicate', 'processed']);
    expect(await db.walletEntry.count()).toBe(1);
    expect((await wallet.get(CUSTOMER)).balanceCents).toBe(2000);
  });

  it('eventos diferentes para o mesmo pagamento já aplicado → nenhum efeito extra (estado igual)', async () => {
    const { db, provider, wallet, processor } = await setup();
    const t = await wallet.topUp(CUSTOMER, { amountCents: 2000, method: 'pix' });
    const pay = await db.payment.findUnique({ where: { id: t.paymentId } });
    provider.simulatePixPaid(pay.providerPaymentId);
    await processor.process(event(pay.providerPaymentId, 'e1'));
    await processor.process(event(pay.providerPaymentId, 'e2'));
    expect(await db.walletEntry.count()).toBe(1);
  });

  it('Pix expirado (cancelled no gateway) → Payment failed e recarga expired', async () => {
    const { db, provider, wallet, processor } = await setup();
    const t = await wallet.topUp(CUSTOMER, { amountCents: 2000, method: 'pix' });
    const pay = await db.payment.findUnique({ where: { id: t.paymentId } });
    jest.spyOn(provider, 'getPayment').mockResolvedValueOnce({ providerPaymentId: pay.providerPaymentId, status: 'canceled', amountCents: 2000, externalReference: pay.id });
    await processor.process(event(pay.providerPaymentId));
    expect(await db.payment.findUnique({ where: { id: pay.id } })).toMatchObject({ status: 'failed', failureReason: 'pix_expired' });
    expect((await db.topUp.findUnique({ where: { id: t.id } })).status).toBe('expired');
  });

  it('se o processamento falha, o evento não fica marcado (a reentrega processa)', async () => {
    const { db, provider, billing, processor } = await setup();
    const held = await billing.holdDeposit({ customerId: CUSTOMER, rentalId: RENTAL, method: 'pix', idempotencyKey: 'k' });
    const dp = await db.payment.findFirst({ where: { depositId: held.depositId } });
    provider.simulatePixPaid(dp.providerPaymentId);
    jest.spyOn(billing, 'applyProviderPayment').mockRejectedValueOnce(new Error('db down'));
    await expect(processor.process(event(dp.providerPaymentId))).rejects.toThrow('db down');
    expect(await db.processedWebhook.count()).toBe(0);
    expect(await processor.process(event(dp.providerPaymentId))).toBe('processed');
    expect((await db.deposit.findUnique({ where: { id: held.depositId } })).status).toBe('held');
  });

  it('tipos que não são pagamento são registrados e ignorados', async () => {
    const { db, processor } = await setup();
    expect(await processor.process({ provider: 'mercadopago', eventId: 'x1', type: 'plan', dataId: '1' })).toBe('ignored');
    expect(await db.processedWebhook.count()).toBe(1);
  });

  it('cobrança recorrente da assinatura recusada → Payment failed, assinatura past_due e cliente inadimplente', async () => {
    const { db, provider, customers, subscriptions, processor } = await setup().then(async (c) => ({ ...c, customers: new ProviderCustomersService(c.db as any, c.provider) }));
    await customers.addCard(CUSTOMER, 'tok_visa_4242', true);
    await db.pricingPlan.create({ data: { code: 'weekly', name: 'Semanal', unit: 'week', unitPriceCents: 24900, active: true } });
    const sub = await subscriptions.create(CUSTOMER, { planCode: 'weekly' });
    jest.spyOn(provider, 'getPayment').mockResolvedValueOnce({ providerPaymentId: 'mp-rec-2', status: 'failed', amountCents: 24900, externalReference: `subscription:${sub.id}`, failureReason: 'cc_rejected_insufficient_amount' });
    await processor.process(event('mp-rec-2'));
    const rec = await db.payment.findFirst({ where: { providerPaymentId: 'mp-rec-2' } });
    expect(rec).toMatchObject({ kind: 'subscription', status: 'failed', subscriptionId: sub.id });
    expect((await db.subscription.findUnique({ where: { id: sub.id } })).status).toBe('past_due');
    expect((await db.customer.findUnique({ where: { id: CUSTOMER } })).delinquent).toBe(true);
  });

  it('Task 30: assinatura sem cardId usa o cartão ativo mesmo sem padrão marcado (dado antigo); sem cartão → 422 card-required', async () => {
    const { db, provider, subscriptions } = await setup();
    await db.pricingPlan.create({ data: { code: 'weekly', name: 'Semanal', unit: 'week', unitPriceCents: 24900, active: true } });
    await expect(subscriptions.create(CUSTOMER, { planCode: 'weekly' })).rejects.toMatchObject({ status: 422, slug: 'card-required', detail: 'Cadastre um cartão para assinar.' });
    const card = await new ProviderCustomersService(db as any, provider).addCard(CUSTOMER, 'tok_visa_4242');
    await db.paymentCard.update({ where: { id: card.id }, data: { isDefault: false } });
    const sub = await subscriptions.create(CUSTOMER, { planCode: 'weekly' });
    expect(sub.status).toBe('active');
    expect((await db.subscription.findUnique({ where: { id: sub.id } })).cardId).toBe(card.id);
  });

  it('fix round 1: renovação vista primeiro pendente e depois aprovada → um Payment, período renovado uma vez', async () => {
    const { db, provider, subscriptions, processor } = await setup();
    await new ProviderCustomersService(db as any, provider).addCard(CUSTOMER, 'tok_visa_4242', true);
    await db.pricingPlan.create({ data: { code: 'weekly', name: 'Semanal', unit: 'week', unitPriceCents: 24900, active: true } });
    const sub = await subscriptions.create(CUSTOMER, { planCode: 'weekly' });
    const end = new Date(sub.currentPeriodEnd).getTime();
    const getPayment = jest.spyOn(provider, 'getPayment');
    getPayment.mockResolvedValueOnce({ providerPaymentId: 'mp-ren-1', status: 'pending', amountCents: 24900, externalReference: `subscription:${sub.id}` });
    await processor.process(event('mp-ren-1', 'ev-pend'));
    getPayment.mockResolvedValueOnce({ providerPaymentId: 'mp-ren-1', status: 'paid', amountCents: 24900, externalReference: `subscription:${sub.id}` });
    await processor.process(event('mp-ren-1', 'ev-paid'));
    expect(await db.payment.count({ where: { subscriptionId: sub.id, providerPaymentId: 'mp-ren-1' } })).toBe(1);
    expect(await db.payment.findFirst({ where: { providerPaymentId: 'mp-ren-1' } })).toMatchObject({ status: 'paid' });
    const after = (await db.subscription.findUnique({ where: { id: sub.id } })).currentPeriodEnd.getTime();
    expect(after - end).toBe(7 * 86_400_000);
  });

  it('cobrança recorrente paga → Payment paid e período renovado', async () => {
    const { db, provider, subscriptions, processor } = await setup();
    await new ProviderCustomersService(db as any, provider).addCard(CUSTOMER, 'tok_visa_4242', true);
    await db.pricingPlan.create({ data: { code: 'monthly', name: 'Mensal', unit: 'month', unitPriceCents: 79900, active: true } });
    const sub = await subscriptions.create(CUSTOMER, { planCode: 'monthly' });
    const end = new Date(sub.currentPeriodEnd).getTime();
    jest.spyOn(provider, 'getPayment').mockResolvedValueOnce({ providerPaymentId: 'mp-rec-3', status: 'paid', amountCents: 79900, externalReference: `subscription:${sub.id}` });
    await processor.process(event('mp-rec-3'));
    expect(await db.payment.findFirst({ where: { providerPaymentId: 'mp-rec-3' } })).toMatchObject({ status: 'paid', kind: 'subscription' });
    expect((await db.subscription.findUnique({ where: { id: sub.id } })).currentPeriodEnd.getTime()).toBeGreaterThan(end);
  });
});

describe('SubscriptionsService', () => {
  it('cria assinatura semanal no gateway: primeira cobrança paga, ref do gateway gravada', async () => {
    const { db, provider, subscriptions } = await setup();
    await new ProviderCustomersService(db as any, provider).addCard(CUSTOMER, 'tok_visa_4242', true);
    await db.pricingPlan.create({ data: { code: 'weekly', name: 'Semanal', unit: 'week', unitPriceCents: 24900, active: true } });
    const sub = await subscriptions.create(CUSTOMER, { planCode: 'weekly' });
    expect(sub).toMatchObject({ planCode: 'weekly', status: 'active', priceCents: 24900 });
    expect(provider.operations('createSubscription')).toBe(1);
    expect(await db.payment.findFirst({ where: { subscriptionId: sub.id } })).toMatchObject({ status: 'paid', amountCents: 24900, kind: 'subscription' });
    expect(await db.paymentProviderRef.findFirst({ where: { entityType: 'subscription', entityId: sub.id } })).toBeTruthy();
  });

  it('recusa no gateway → 402 e assinatura cancelada', async () => {
    const { db, provider, subscriptions } = await setup();
    await new ProviderCustomersService(db as any, provider).addCard(CUSTOMER, 'tok_visa_4242', true);
    await db.pricingPlan.create({ data: { code: 'weekly', name: 'Semanal', unit: 'week', unitPriceCents: 24900, active: true } });
    provider.failNext('createSubscription');
    await expect(subscriptions.create(CUSTOMER, { planCode: 'weekly' })).rejects.toMatchObject({ slug: 'payment-failed' });
    expect((await db.subscription.findFirst({ where: { customerId: CUSTOMER } })).status).toBe('canceled');
  });

  it('cancelar → cancela no gateway e marca cancelAtPeriodEnd', async () => {
    const { db, provider, subscriptions } = await setup();
    await new ProviderCustomersService(db as any, provider).addCard(CUSTOMER, 'tok_visa_4242', true);
    await db.pricingPlan.create({ data: { code: 'weekly', name: 'Semanal', unit: 'week', unitPriceCents: 24900, active: true } });
    const sub = await subscriptions.create(CUSTOMER, { planCode: 'weekly' });
    const ref = await db.paymentProviderRef.findFirst({ where: { entityId: sub.id } });
    const out = await subscriptions.cancel(CUSTOMER, sub.id);
    expect(out.cancelAtPeriodEnd).toBe(true);
    expect(provider.subscriptionStatus(ref.providerId)).toBe('canceled');
  });
});
