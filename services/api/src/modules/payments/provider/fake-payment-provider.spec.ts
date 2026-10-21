import { createHmac } from 'node:crypto';
import { FakePaymentProvider } from './fake-payment-provider';
import { verifyMercadoPagoSignature } from './mercadopago-signature';
import { CardDeclinedError, PaymentProviderError } from './payment-provider';

const SECRET = 'segredo-webhook';
const sign = (dataId: string, requestId: string, ts: string, secret = SECRET) =>
  `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex')}`;

describe('verifyMercadoPagoSignature', () => {
  it('aceita a assinatura do manifesto id/request-id/ts', () => {
    expect(verifyMercadoPagoSignature({ secret: SECRET, signature: sign('123', 'req-1', '1700000000'), requestId: 'req-1', dataId: '123' })).toBe(true);
  });
  it('aceita espaços e ordem trocada', () => {
    const s = sign('123', 'req-1', '1700000000');
    const [ts, v1] = s.split(',');
    expect(verifyMercadoPagoSignature({ secret: SECRET, signature: ` ${v1} , ${ts}`, requestId: 'req-1', dataId: '123' })).toBe(true);
  });
  it.each([
    ['v1 errado', { signature: 'ts=1700000000,v1=' + '0'.repeat(64), requestId: 'req-1', dataId: '123' }],
    ['outro data.id', { signature: sign('999', 'req-1', '1700000000'), requestId: 'req-1', dataId: '123' }],
    ['outro request-id', { signature: sign('123', 'req-2', '1700000000'), requestId: 'req-1', dataId: '123' }],
    ['sem ts', { signature: 'v1=abc', requestId: 'req-1', dataId: '123' }],
    ['sem assinatura', { signature: undefined, requestId: 'req-1', dataId: '123' }],
    ['sem request-id', { signature: sign('123', 'req-1', '1700000000'), requestId: undefined, dataId: '123' }],
  ])('rejeita: %s', (_n, input) => {
    expect(verifyMercadoPagoSignature({ secret: SECRET, ...input })).toBe(false);
  });
  it('rejeita tudo sem segredo configurado', () => {
    expect(verifyMercadoPagoSignature({ secret: undefined, signature: sign('123', 'req-1', '1'), requestId: 'req-1', dataId: '123' })).toBe(false);
  });
  it('usa o data.id em minúsculas (regra do Mercado Pago para ids alfanuméricos)', () => {
    expect(verifyMercadoPagoSignature({ secret: SECRET, signature: sign('abc', 'r', '1'), requestId: 'r', dataId: 'ABC' })).toBe(true);
  });
});

describe('FakePaymentProvider', () => {
  let p: FakePaymentProvider;
  const card = async () => {
    const { providerCustomerId } = await p.createCustomer({ customerId: 'c1', email: 'x@example.com' });
    const c = await p.attachCard({ providerCustomerId, cardToken: 'tok_visa_4242' });
    return { providerCustomerId, providerCardId: c.providerCardId };
  };
  const base = { amountCents: 5000, description: 'Caução', externalReference: 'ref' };

  beforeEach(() => {
    p = new FakePaymentProvider(SECRET);
  });

  it('cartão: guarda só o token do gateway, last4 vem do token', async () => {
    const { providerCustomerId } = await p.createCustomer({ customerId: 'c1', email: 'x@example.com' });
    const c = await p.attachCard({ providerCustomerId, cardToken: 'tok_visa_4242' });
    expect(c).toMatchObject({ brand: 'visa', last4: '4242' });
    expect(c.providerCardId).toMatch(/^fake-card-/);
  });

  it('token tok_fail → CardDeclinedError', async () => {
    const { providerCustomerId } = await p.createCustomer({ customerId: 'c1', email: 'x@example.com' });
    await expect(p.attachCard({ providerCustomerId, cardToken: 'tok_fail_123' })).rejects.toBeInstanceOf(CardDeclinedError);
  });

  it('pré-autoriza → captura parcial (resto liberado)', async () => {
    const c = await card();
    const auth = await p.preAuthorize({ ...c, ...base, idempotencyKey: 'k1' });
    expect(auth.status).toBe('authorized');
    const cap = await p.capture({ providerPaymentId: auth.providerPaymentId, amountCents: 1290, idempotencyKey: 'k2' });
    expect(cap).toMatchObject({ status: 'captured', capturedCents: 1290 });
  });

  it('captura acima do autorizado → erro', async () => {
    const c = await card();
    const auth = await p.preAuthorize({ ...c, ...base, idempotencyKey: 'k1' });
    await expect(p.capture({ providerPaymentId: auth.providerPaymentId, amountCents: 5001, idempotencyKey: 'k2' })).rejects.toBeInstanceOf(PaymentProviderError);
  });

  it('cancelar pré-autorização → canceled; capturar depois → erro', async () => {
    const c = await card();
    const auth = await p.preAuthorize({ ...c, ...base, idempotencyKey: 'k1' });
    expect((await p.cancelPreAuthorization({ providerPaymentId: auth.providerPaymentId, idempotencyKey: 'k2' })).status).toBe('canceled');
    await expect(p.capture({ providerPaymentId: auth.providerPaymentId, amountCents: 100, idempotencyKey: 'k3' })).rejects.toThrow('canceled → captured');
  });

  it('mesma idempotencyKey → mesmo resultado, uma operação só', async () => {
    const c = await card();
    const a = await p.preAuthorize({ ...c, ...base, idempotencyKey: 'same' });
    const b = await p.preAuthorize({ ...c, ...base, idempotencyKey: 'same' });
    expect(b.providerPaymentId).toBe(a.providerPaymentId);
    expect(p.operations('preAuthorize')).toBe(1);
  });

  it('cobrança direta → paid; estorno parcial e total', async () => {
    const c = await card();
    const ch = await p.charge({ ...c, ...base, idempotencyKey: 'c1' });
    expect(ch.status).toBe('paid');
    expect(await p.refund({ providerPaymentId: ch.providerPaymentId, amountCents: 1000, idempotencyKey: 'r1' })).toMatchObject({ status: 'partially_refunded', refundedCents: 1000 });
    expect(await p.refund({ providerPaymentId: ch.providerPaymentId, idempotencyKey: 'r2' })).toMatchObject({ status: 'refunded', refundedCents: 5000 });
  });

  it('falhas programadas: capture e charge recusados', async () => {
    const c = await card();
    const auth = await p.preAuthorize({ ...c, ...base, idempotencyKey: 'k1' });
    p.failNext('capture', 'insufficient_funds');
    expect(await p.capture({ providerPaymentId: auth.providerPaymentId, amountCents: 100, idempotencyKey: 'k2' })).toMatchObject({ status: 'failed', failureReason: 'insufficient_funds' });
    p.failNext('charge');
    expect((await p.charge({ ...c, ...base, idempotencyKey: 'c9' })).status).toBe('failed');
  });

  it('cartão tok_..._fail_charge: pré-autoriza mas recusa capture/charge', async () => {
    const { providerCustomerId } = await p.createCustomer({ customerId: 'c1', email: 'x@example.com' });
    const { providerCardId } = await p.attachCard({ providerCustomerId, cardToken: 'tok_visa_fail_charge' });
    const auth = await p.preAuthorize({ providerCustomerId, providerCardId, ...base, idempotencyKey: 'k1' });
    expect(auth.status).toBe('authorized');
    expect((await p.capture({ providerPaymentId: auth.providerPaymentId, amountCents: 100, idempotencyKey: 'k2' })).status).toBe('failed');
    expect((await p.charge({ providerCustomerId, providerCardId, ...base, idempotencyKey: 'k3' })).status).toBe('failed');
  });

  it('Pix: pending com QR e copia e cola; simula pagamento; cancelar Pix pendente', async () => {
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const pix = await p.createPix({ ...base, expiresAt, payerEmail: 'x@example.com', idempotencyKey: 'p1' });
    expect(pix.status).toBe('pending');
    expect(pix.pix.copyPaste).toContain('br.gov.bcb.pix');
    expect(pix.pix.expiresAt).toBe(expiresAt.toISOString());
    p.simulatePixPaid(pix.providerPaymentId);
    expect((await p.getPayment(pix.providerPaymentId)).status).toBe('paid');
    const other = await p.createPix({ ...base, expiresAt, payerEmail: 'x@example.com', idempotencyKey: 'p2' });
    expect((await p.cancelPix({ providerPaymentId: other.providerPaymentId, idempotencyKey: 'p3' })).status).toBe('failed');
  });

  it('assinatura semanal/mensal e cancelamento', async () => {
    const c = await card();
    const s = await p.createSubscription({ ...c, payerEmail: 'x@example.com', planCode: 'weekly', amountCents: 24900, idempotencyKey: 's1', externalReference: 'subscription:1' });
    expect(s.status).toBe('active');
    await p.cancelSubscription({ providerSubscriptionId: s.providerSubscriptionId });
    expect(p.subscriptionStatus(s.providerSubscriptionId)).toBe('canceled');
  });

  it('verifyWebhook usa o HMAC do Mercado Pago', () => {
    expect(p.verifyWebhook({ signature: sign('1', 'r', '2'), requestId: 'r', dataId: '1' })).toBe(true);
    expect(p.verifyWebhook({ signature: sign('1', 'r', '2', 'outro'), requestId: 'r', dataId: '1' })).toBe(false);
  });
});
