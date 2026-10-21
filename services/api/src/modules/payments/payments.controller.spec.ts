import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { createHarness, CUSTOMER_ID, customerToken, type Harness, staffToken } from '../../../test/helpers/http-harness';
import { QUEUE_BUS } from '../../ports/queue-bus.port';
import type { Principal } from '../auth/principal';
import { PaymentStateService } from './payment-state.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FakePaymentProvider } from './provider/fake-payment-provider';
import { PAYMENT_PROVIDER } from './provider/payment-provider';
import { ProviderCustomersService } from './provider-customers.service';
import { SubscriptionsService } from './subscriptions.service';
import { createInMemoryPrisma } from './testing/in-memory-prisma';

const SECRET = 'segredo-webhook-teste';
const sign = (dataId: string, requestId: string, ts = String(Math.floor(Date.now() / 1000)), secret = SECRET) =>
  `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex')}`;

describe('PaymentsController (HTTP)', () => {
  let h: Harness;
  const queue = { publish: jest.fn().mockResolvedValue(undefined), subscribe: jest.fn() };
  const customers = { addCard: jest.fn() };

  beforeAll(async () => {
    h = await createHarness({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        { provide: QUEUE_BUS, useValue: queue },
        { provide: PAYMENT_PROVIDER, useValue: new FakePaymentProvider(SECRET) },
        { provide: ProviderCustomersService, useValue: customers },
        { provide: PaymentStateService, useValue: {} },
        { provide: SubscriptionsService, useValue: {} },
      ],
    });
  });
  afterAll(async () => h.app.close());
  beforeEach(() => jest.clearAllMocks());

  const body = { id: 12345, type: 'payment', action: 'payment.updated', live_mode: false, data: { id: '999' } };

  it('webhook com assinatura inválida → 401 webhook-signature-invalid e nada enfileirado', async () => {
    const res = await request(h.app.getHttpServer()).post('/webhooks/mercadopago')
      .set('x-signature', sign('999', 'req-1', undefined, 'outro-segredo')).set('x-request-id', 'req-1').send(body).expect(401);
    expect(res.body.type).toMatch(/webhook-signature-invalid$/);
    expect(queue.publish).not.toHaveBeenCalled();
  });

  it('webhook sem x-signature → 401 e nada enfileirado', async () => {
    await request(h.app.getHttpServer()).post('/webhooks/mercadopago').set('x-request-id', 'req-1').send(body).expect(401);
    expect(queue.publish).not.toHaveBeenCalled();
  });

  it('webhook válido → 200 { received: true } e enfileira com dedupId = id do evento', async () => {
    const res = await request(h.app.getHttpServer()).post('/webhooks/mercadopago')
      .set('x-signature', sign('999', 'req-1')).set('x-request-id', 'req-1').send(body).expect(200);
    expect(res.body).toEqual({ received: true });
    expect(queue.publish).toHaveBeenCalledWith(
      'pagamentos-webhook',
      { provider: 'fake', eventId: '12345', type: 'payment', action: 'payment.updated', dataId: '999' },
      { dedupId: '12345' },
    );
  });

  it('cartão: o DTO só aceita cardToken — número/CVV são descartados antes do serviço', async () => {
    customers.addCard.mockResolvedValue({ id: '0b1c6c39-6d0a-4c39-9a4f-4f8f1a1f2e11', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030, isDefault: true, createdAt: new Date() });
    const token = await customerToken();
    await request(h.app.getHttpServer()).post('/payments/cards').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', 'k-card-1')
      .send({ cardToken: 'tok_visa_4242', cardNumber: '4111111111111111', cvv: '123', expMonth: 12 }).expect(201);
    expect(customers.addCard).toHaveBeenCalledWith(CUSTOMER_ID, 'tok_visa_4242', undefined);
    expect(JSON.stringify(customers.addCard.mock.calls)).not.toContain('4111111111111111');
  });

  it('cartão: sem cardToken → 400', async () => {
    const token = await customerToken();
    await request(h.app.getHttpServer()).post('/payments/cards').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', 'k-card-2')
      .send({ cardNumber: '4111111111111111', cvv: '123' }).expect(400);
    expect(customers.addCard).not.toHaveBeenCalled();
  });

  it('cartão: número de cartão no lugar do token → 400 (nunca vai ao gateway nem ao banco)', async () => {
    const token = await customerToken();
    await request(h.app.getHttpServer()).post('/payments/cards').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', 'k-card-3')
      .send({ cardToken: '4111 1111 1111 1111' }).expect(400);
    expect(customers.addCard).not.toHaveBeenCalled();
  });

  it('estorno é só para admin/financeiro', async () => {
    const token = await staffToken(['suporte']);
    await request(h.app.getHttpServer()).post('/payments/0b1c6c39-6d0a-4c39-9a4f-4f8f1a1f2e11/refund').set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'k-r').send({ reason: 'teste' }).expect(403);
  });
});

describe('PaymentsService.refund (via gateway)', () => {
  const admin: Principal = { pool: 'staff', sub: 'a', email: 'a@volti.com.br', groups: ['admin'], userId: '22222222-2222-4222-8222-222222222222', staffId: '22222222-2222-4222-8222-222222222222' };

  async function setup() {
    const db = createInMemoryPrisma();
    const provider = new FakePaymentProvider(SECRET);
    const state = new PaymentStateService(db as any, new EventEmitter2());
    const customers = new ProviderCustomersService(db as any, provider);
    await db.customer.create({ data: { id: CUSTOMER_ID, cognitoSub: 's', email: 'c@example.com' } });
    const card = await customers.addCard(CUSTOMER_ID, 'tok_visa_4242', true);
    const charged = await provider.charge({ providerCustomerId: 'x', providerCardId: card.providerCardId, amountCents: 5000, description: 'x', idempotencyKey: 'c', externalReference: 'r' });
    const p = await db.payment.create({ data: { customerId: CUSTOMER_ID, kind: 'rental', method: 'card', status: 'paid', amountCents: 5000, providerPaymentId: charged.providerPaymentId } });
    const audit = { record: jest.fn() };
    const svc = new PaymentsService(db as any, audit as any, { publish: jest.fn() } as any, provider, customers, state, {} as any);
    return { db, provider, svc, p, audit };
  }

  it('parcial → partially_refunded no gateway e no banco; depois total → refunded', async () => {
    const { db, svc, p, provider, audit } = await setup();
    expect(await svc.refund(admin, p.id, { amountCents: 1000, reason: 'Cobrança indevida' })).toMatchObject({ status: 'partially_refunded', refundedCents: 1000 });
    expect(await svc.refund(admin, p.id, { reason: 'Resto' })).toMatchObject({ status: 'refunded', refundedCents: 5000 });
    expect(provider.operations('refund')).toBe(2);
    expect(audit.record).toHaveBeenCalledTimes(2);
    expect((await db.payment.findUnique({ where: { id: p.id } })).status).toBe('refunded');
  });

  it('acima do disponível → 422; de pagamento falho → 422 (transição inválida)', async () => {
    const { db, svc, p } = await setup();
    await expect(svc.refund(admin, p.id, { amountCents: 6000, reason: 'x' })).rejects.toMatchObject({ slug: 'validation-error' });
    const failed = await db.payment.create({ data: { customerId: CUSTOMER_ID, kind: 'rental', method: 'card', status: 'failed', amountCents: 100 } });
    await expect(svc.refund(admin, failed.id, { reason: 'x' })).rejects.toMatchObject({ slug: 'validation-error' });
  });

  it('pagamento pela carteira → estorno volta como lançamento refund no ledger', async () => {
    const { db, svc } = await setup();
    const w = await db.payment.create({ data: { customerId: CUSTOMER_ID, kind: 'rental', method: 'wallet', status: 'paid', amountCents: 800 } });
    await svc.refund(admin, w.id, { reason: 'Devolução' });
    expect(await db.walletEntry.findFirst({ where: { customerId: CUSTOMER_ID } })).toMatchObject({ type: 'refund', amountCents: 800, paymentId: w.id });
  });

  it('fix round 1: dois estornos concorrentes pela carteira → um crédito só, o outro 409', async () => {
    const { db, svc } = await setup();
    const w = await db.payment.create({ data: { customerId: CUSTOMER_ID, kind: 'rental', method: 'wallet', status: 'paid', amountCents: 800 } });
    const results = await Promise.allSettled([svc.refund(admin, w.id, { reason: 'A' }, 'k-a'), svc.refund(admin, w.id, { reason: 'B' }, 'k-b')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ slug: 'conflict' });
    expect(await db.walletEntry.count({ where: { paymentId: w.id } })).toBe(1);
    expect((await db.payment.findUnique({ where: { id: w.id } })).refundedCents).toBe(800);
  });

  it('fix round 1: dois estornos concorrentes no gateway → uma chamada de refund, chave estável pela Idempotency-Key', async () => {
    const { svc, p, provider } = await setup();
    const refund = jest.spyOn(provider, 'refund');
    const results = await Promise.allSettled([svc.refund(admin, p.id, { reason: 'A' }, 'k-1'), svc.refund(admin, p.id, { reason: 'B' }, 'k-2')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(refund).toHaveBeenCalledTimes(1);
    expect(refund.mock.calls[0][0].idempotencyKey).toMatch(new RegExp(`^refund:${p.id}:k-[12]$`));
  });

  it('fix round 1: gateway falha no estorno → reserva desfeita (status e refundedCents voltam)', async () => {
    const { db, svc, p, provider } = await setup();
    jest.spyOn(provider, 'refund').mockRejectedValueOnce(new Error('502'));
    await expect(svc.refund(admin, p.id, { amountCents: 1000, reason: 'x' }, 'k')).rejects.toMatchObject({ slug: 'conflict' });
    expect(await db.payment.findUnique({ where: { id: p.id } })).toMatchObject({ status: 'paid', refundedCents: 0 });
    expect(await svc.refund(admin, p.id, { amountCents: 1000, reason: 'x' }, 'k')).toMatchObject({ status: 'partially_refunded', refundedCents: 1000 });
  });

  it('fix round 1: teto do estorno de caução capturada = valor capturado (PaymentCapture)', async () => {
    const { db, svc } = await setup();
    const dp = await db.payment.create({ data: { customerId: CUSTOMER_ID, kind: 'deposit', method: 'card', status: 'captured', amountCents: 5000, providerPaymentId: 'x' } });
    await db.paymentCapture.create({ data: { paymentId: dp.id, capturedCents: 1290 } });
    await expect(svc.refund(admin, dp.id, { amountCents: 2000, reason: 'x' })).rejects.toMatchObject({ slug: 'validation-error' });
  });
});
