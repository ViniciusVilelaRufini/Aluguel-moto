import nock from 'nock';
import { MercadoPagoPaymentProvider } from './mercadopago-payment-provider';
import { CardDeclinedError, PaymentProviderError, RefundRejectedError } from './payment-provider';

const BASE = 'https://api.mercadopago.test';
const TOKEN = 'TEST-access-token';

describe('MercadoPagoPaymentProvider (HTTP mockado com nock, nunca rede real)', () => {
  let mp: MercadoPagoPaymentProvider;

  beforeAll(() => {
    nock.disableNetConnect();
  });
  afterAll(() => {
    nock.enableNetConnect();
  });
  beforeEach(() => {
    mp = new MercadoPagoPaymentProvider({ accessToken: TOKEN, webhookSecret: 's', baseUrl: BASE });
  });
  afterEach(() => {
    expect(nock.isDone()).toBe(true);
    nock.cleanAll();
  });

  const api = () => nock(BASE, { reqheaders: { authorization: `Bearer ${TOKEN}` } });

  it('exige access token', () => {
    expect(() => new MercadoPagoPaymentProvider({ accessToken: '', baseUrl: BASE })).toThrow(/MERCADOPAGO_ACCESS_TOKEN/);
  });

  it('createCustomer reaproveita o cliente existente pelo e-mail', async () => {
    api().get('/v1/customers/search').query({ email: 'a@example.com' }).reply(200, { results: [{ id: 'cus-1' }] });
    expect(await mp.createCustomer({ customerId: 'c', email: 'a@example.com' })).toEqual({ providerCustomerId: 'cus-1' });
  });

  it('createCustomer cria quando não existe', async () => {
    api().get('/v1/customers/search').query({ email: 'a@example.com' }).reply(200, { results: [] });
    api().post('/v1/customers', { email: 'a@example.com' }).reply(201, { id: 'cus-2' });
    expect(await mp.createCustomer({ customerId: 'c', email: 'a@example.com' })).toEqual({ providerCustomerId: 'cus-2' });
  });

  it('attachCard envia só o token e mapeia bandeira/last4/validade', async () => {
    api().post('/v1/customers/cus-1/cards', { token: 'card-token-abc' })
      .reply(201, { id: 'card-9', last_four_digits: '1234', expiration_month: 3, expiration_year: 2031, payment_method: { id: 'master' } });
    expect(await mp.attachCard({ providerCustomerId: 'cus-1', cardToken: 'card-token-abc' }))
      .toEqual({ providerCardId: 'card-9', brand: 'master', last4: '1234', expMonth: 3, expYear: 2031 });
  });

  it('attachCard recusado (400) → CardDeclinedError', async () => {
    api().post('/v1/customers/cus-1/cards').reply(400, { message: 'invalid token' });
    await expect(mp.attachCard({ providerCustomerId: 'cus-1', cardToken: 'x' })).rejects.toBeInstanceOf(CardDeclinedError);
  });

  it('preAuthorize: token do cartão salvo + POST /v1/payments com capture=false, reais e X-Idempotency-Key', async () => {
    api().post('/v1/card_tokens', { card_id: 'card-9', customer_id: 'cus-1' }).reply(201, { id: 'tok-1' });
    nock(BASE, { reqheaders: { authorization: `Bearer ${TOKEN}`, 'x-idempotency-key': 'deposit:c:k' } })
      .post('/v1/payments', (b) =>
        b.capture === false && b.transaction_amount === 50 && b.token === 'tok-1' && b.payer.id === 'cus-1' && b.payer.type === 'customer'
        && b.external_reference === 'pay-1' && b.installments === 1)
      .reply(201, { id: 777, status: 'authorized', transaction_amount: 50, card: { last_four_digits: '1234' }, external_reference: 'pay-1' });
    const r = await mp.preAuthorize({ providerCustomerId: 'cus-1', providerCardId: 'card-9', amountCents: 5000, description: 'Caução', idempotencyKey: 'deposit:c:k', externalReference: 'pay-1' });
    expect(r).toEqual({ providerPaymentId: '777', status: 'authorized', amountCents: 5000, cardLast4: '1234', externalReference: 'pay-1' });
  });

  it('preAuthorize rejeitado → failed com status_detail', async () => {
    api().post('/v1/card_tokens').reply(201, { id: 'tok-1' });
    api().post('/v1/payments').reply(201, { id: 778, status: 'rejected', status_detail: 'cc_rejected_insufficient_amount', transaction_amount: 50 });
    const r = await mp.preAuthorize({ providerCustomerId: 'cus-1', providerCardId: 'card-9', amountCents: 5000, description: 'Caução', idempotencyKey: 'k', externalReference: 'p' });
    expect(r).toMatchObject({ status: 'failed', failureReason: 'cc_rejected_insufficient_amount' });
  });

  it('capture parcial: PUT capture=true com o valor', async () => {
    nock(BASE, { reqheaders: { 'x-idempotency-key': 'cap-1' } })
      .put('/v1/payments/777', { capture: true, transaction_amount: 12.9 })
      .reply(200, { id: 777, status: 'approved', captured: true, transaction_amount: 12.9 });
    expect(await mp.capture({ providerPaymentId: '777', amountCents: 1290, idempotencyKey: 'cap-1' }))
      .toMatchObject({ providerPaymentId: '777', status: 'captured', capturedCents: 1290 });
  });

  it('fix round 2: capture com 4xx é ambíguo (pode já estar capturado) → lança PaymentProviderError, nunca "failed"', async () => {
    api().put('/v1/payments/777').reply(400, { message: 'cannot capture', cause: [{ code: 'x' }] });
    const err = await mp.capture({ providerPaymentId: '777', amountCents: 100, idempotencyKey: 'c' }).catch((e) => e);
    expect(err).toBeInstanceOf(PaymentProviderError);
    expect(err.httpStatus).toBe(400);
  });

  it('fix round 2: capture respondido 200 sem aprovar → recusa genuína (failed)', async () => {
    api().put('/v1/payments/777').reply(200, { id: 777, status: 'rejected', status_detail: 'cc_rejected_other_reason', transaction_amount: 1 });
    expect(await mp.capture({ providerPaymentId: '777', amountCents: 100, idempotencyKey: 'c' })).toMatchObject({ status: 'failed', failureReason: 'cc_rejected_other_reason' });
  });

  it('fix round 2: charge com 4xx (ex.: chave repetida com corpo diferente) é ambíguo → lança', async () => {
    api().post('/v1/payments').reply(400, { message: 'idempotency key already used' });
    await expect(mp.charge({ providerCustomerId: 'cus-1', providerCardId: 'card-9', cardToken: 'tok-fixo', amountCents: 100, description: 'x', idempotencyKey: 'k', externalReference: 'p' }))
      .rejects.toBeInstanceOf(PaymentProviderError);
  });

  it('fix round 2: charge com cardToken salvo reusa o token (não gera outro)', async () => {
    api().post('/v1/payments', (b) => b.token === 'tok-fixo').reply(201, { id: 901, status: 'approved', transaction_amount: 1 });
    expect((await mp.charge({ providerCustomerId: 'cus-1', providerCardId: 'card-9', cardToken: 'tok-fixo', amountCents: 100, description: 'x', idempotencyKey: 'k', externalReference: 'p' })).status).toBe('paid');
  });

  it('fix round 2: createCardToken e searchPayments por external_reference', async () => {
    api().post('/v1/card_tokens', { card_id: 'card-9', customer_id: 'cus-1' }).reply(201, { id: 'tok-9' });
    expect(await mp.createCardToken({ providerCustomerId: 'cus-1', providerCardId: 'card-9' })).toEqual({ cardToken: 'tok-9' });
    api().get('/v1/payments/search').query({ external_reference: 'pay-1', sort: 'date_created', criteria: 'desc' })
      .reply(200, { results: [{ id: 1, status: 'approved', transaction_amount: 70, external_reference: 'pay-1' }, { id: 2, status: 'rejected', transaction_amount: 70, external_reference: 'pay-1' }] });
    const found = await mp.searchPayments({ externalReference: 'pay-1' });
    expect(found.map((p) => [p.providerPaymentId, p.status])).toEqual([['1', 'paid'], ['2', 'failed']]);
  });

  it('fix round 3: refund aceito e GET seguinte com 404 → ambíguo (nunca RefundRejectedError)', async () => {
    api().post('/v1/payments/900/refunds').reply(201, { id: 7, amount: 1 });
    api().get('/v1/payments/900').reply(404, { message: 'not found' });
    const err = await mp.refund({ providerPaymentId: '900', amountCents: 100, idempotencyKey: 'r' }).catch((e) => e);
    expect(err).toBeInstanceOf(PaymentProviderError);
    expect(err).not.toBeInstanceOf(RefundRejectedError);
  });

  it('fix round 2: refund 400 → RefundRejectedError (recusa definitiva); 502 → ambíguo', async () => {
    api().post('/v1/payments/900/refunds').reply(400, { message: 'amount exceeds' });
    await expect(mp.refund({ providerPaymentId: '900', amountCents: 100, idempotencyKey: 'r' })).rejects.toBeInstanceOf(RefundRejectedError);
    api().post('/v1/payments/900/refunds').reply(502, 'bad gateway');
    const err = await mp.refund({ providerPaymentId: '900', amountCents: 100, idempotencyKey: 'r' }).catch((e) => e);
    expect(err).toBeInstanceOf(PaymentProviderError);
    expect(err).not.toBeInstanceOf(RefundRejectedError);
  });

  it('erro 5xx → PaymentProviderError (sem vazar o token)', async () => {
    api().put('/v1/payments/777').reply(502, 'bad gateway');
    const err = await mp.cancelPreAuthorization({ providerPaymentId: '777', idempotencyKey: 'c' }).catch((e) => e);
    expect(err).toBeInstanceOf(PaymentProviderError);
    expect(String(err.message)).not.toContain(TOKEN);
  });

  it('cancelPreAuthorization: PUT status=cancelled', async () => {
    api().put('/v1/payments/777', { status: 'cancelled' }).reply(200, { id: 777, status: 'cancelled', transaction_amount: 50 });
    expect((await mp.cancelPreAuthorization({ providerPaymentId: '777', idempotencyKey: 'c' })).status).toBe('canceled');
  });

  it('charge: capture=true; approved → paid', async () => {
    api().post('/v1/card_tokens').reply(201, { id: 'tok-2' });
    api().post('/v1/payments', (b) => b.capture === true && b.transaction_amount === 249).reply(201, { id: 900, status: 'approved', transaction_amount: 249 });
    expect((await mp.charge({ providerCustomerId: 'cus-1', providerCardId: 'card-9', amountCents: 24900, description: 'x', idempotencyKey: 'k', externalReference: 'p' })).status).toBe('paid');
  });

  it('refund parcial e total', async () => {
    api().post('/v1/payments/900/refunds', { amount: 10 }).reply(201, { id: 1, amount: 10 });
    api().get('/v1/payments/900').reply(200, { id: 900, status: 'approved', status_detail: 'partially_refunded', transaction_amount: 249, transaction_amount_refunded: 10 });
    expect(await mp.refund({ providerPaymentId: '900', amountCents: 1000, idempotencyKey: 'r1' })).toMatchObject({ providerRefundId: '1', status: 'partially_refunded', refundedCents: 1000 });
    api().post('/v1/payments/900/refunds', {}).reply(201, { id: 2, amount: 239 });
    api().get('/v1/payments/900').reply(200, { id: 900, status: 'refunded', transaction_amount: 249, transaction_amount_refunded: 249 });
    expect(await mp.refund({ providerPaymentId: '900', idempotencyKey: 'r2' })).toMatchObject({ status: 'refunded', refundedCents: 24900 });
  });

  it('Pix: payment_method_id=pix, expiração e QR/copia e cola do point_of_interaction', async () => {
    const expiresAt = new Date('2026-10-21T15:15:00.000Z');
    api().post('/v1/payments', (b) => b.payment_method_id === 'pix' && b.payer.email === 'a@example.com' && b.date_of_expiration === '2026-10-21T15:15:00.000Z' && b.transaction_amount === 50)
      .reply(201, { id: 555, status: 'pending', transaction_amount: 50, point_of_interaction: { transaction_data: { qr_code: '000201...', qr_code_base64: 'iVBOR' } } });
    const r = await mp.createPix({ amountCents: 5000, description: 'Caução', expiresAt, payerEmail: 'a@example.com', idempotencyKey: 'k', externalReference: 'p' });
    expect(r).toMatchObject({ providerPaymentId: '555', status: 'pending', pix: { chargeId: '555', copyPaste: '000201...', qrCodeBase64: 'iVBOR', expiresAt: expiresAt.toISOString() } });
  });

  it.each([
    ['pending', undefined, 'pending'],
    ['in_process', undefined, 'pending'],
    ['authorized', undefined, 'authorized'],
    ['approved', undefined, 'paid'],
    ['rejected', undefined, 'failed'],
    ['cancelled', undefined, 'canceled'],
    ['refunded', undefined, 'refunded'],
    ['charged_back', undefined, 'refunded'],
    ['approved', 'partially_refunded', 'partially_refunded'],
  ])('getPayment mapeia status %s/%s → %s', async (status, detail, expected) => {
    api().get('/v1/payments/1').reply(200, { id: 1, status, status_detail: detail, transaction_amount: 10 });
    expect((await mp.getPayment('1')).status).toBe(expected);
  });

  it('getPayment: aprovado depois de capturar uma pré-autorização → captured', async () => {
    api().get('/v1/payments/1').reply(200, { id: 1, status: 'approved', captured: true, capture: false, transaction_amount: 10 });
    expect((await mp.getPayment('1')).status).toBe('captured');
  });

  it('assinatura semanal: POST /preapproval a cada 7 dias', async () => {
    api().post('/v1/card_tokens').reply(201, { id: 'tok-3' });
    api().post('/preapproval', (b) => b.auto_recurring.frequency === 7 && b.auto_recurring.frequency_type === 'days' && b.auto_recurring.transaction_amount === 249
      && b.auto_recurring.currency_id === 'BRL' && b.card_token_id === 'tok-3' && b.status === 'authorized' && b.external_reference === 'subscription:1')
      .reply(201, { id: 'pre-1', status: 'authorized' });
    expect(await mp.createSubscription({ providerCustomerId: 'cus-1', providerCardId: 'card-9', payerEmail: 'a@example.com', planCode: 'weekly', amountCents: 24900, idempotencyKey: 'k', externalReference: 'subscription:1' }))
      .toEqual({ providerSubscriptionId: 'pre-1', status: 'active' });
  });

  it('assinatura mensal: 1 mês; cancelamento PUT status=cancelled', async () => {
    api().post('/v1/card_tokens').reply(201, { id: 'tok-4' });
    api().post('/preapproval', (b) => b.auto_recurring.frequency === 1 && b.auto_recurring.frequency_type === 'months').reply(201, { id: 'pre-2', status: 'authorized' });
    await mp.createSubscription({ providerCustomerId: 'cus-1', providerCardId: 'card-9', payerEmail: 'a@example.com', planCode: 'monthly', amountCents: 79900, idempotencyKey: 'k', externalReference: 's' });
    api().put('/preapproval/pre-2', { status: 'cancelled' }).reply(200, { id: 'pre-2', status: 'cancelled' });
    await mp.cancelSubscription({ providerSubscriptionId: 'pre-2' });
  });

  it('contrato v2 (fix round 1): pausa e retomada no preapproval, empurrando a próxima cobrança; erro do gateway propaga', async () => {
    api().put('/preapproval/pre-3', { status: 'paused' }).reply(200, { id: 'pre-3', status: 'paused' });
    await mp.setSubscriptionPaused({ providerSubscriptionId: 'pre-3', paused: true });
    const next = new Date('2026-11-02T12:00:00.000Z');
    api().put('/preapproval/pre-3', { status: 'authorized', auto_recurring: { start_date: next.toISOString() } }).reply(200, { id: 'pre-3', status: 'authorized' });
    await mp.setSubscriptionPaused({ providerSubscriptionId: 'pre-3', paused: false, nextChargeAt: next });
    api().put('/preapproval/pre-3').reply(503, { message: 'indisponível' });
    await expect(mp.setSubscriptionPaused({ providerSubscriptionId: 'pre-3', paused: true })).rejects.toThrow();
  });
});
