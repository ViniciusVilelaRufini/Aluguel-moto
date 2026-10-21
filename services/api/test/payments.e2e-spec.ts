import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { FakePaymentProvider } from '../src/modules/payments/provider/fake-payment-provider';
import { PAYMENT_PROVIDER } from '../src/modules/payments/provider/payment-provider';
import { approvedCustomer, bootE2eApp, freeVehicleInReturnZone } from './helpers/e2e-app';

/**
 * Pagamentos de ponta a ponta (Task 5) com `PAYMENT_PROVIDER=fake` contra Postgres + Redis + MinIO do compose:
 * caução no cartão → encerramento → captura parcial, recibo e repasse; Pix de caução confirmado por webhook assinado
 * (idempotente); falha de captura → inadimplência → novo aluguel 403.
 */
describe('Pagamentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let fake: FakePaymentProvider;
  const secret = () => process.env.MERCADOPAGO_WEBHOOK_SECRET!;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    fake = app.get(PAYMENT_PROVIDER);
    expect(fake).toBeInstanceOf(FakePaymentProvider);
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  async function until<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 5000): Promise<T> {
    const end = Date.now() + ms;
    let v = await fn();
    while (!ok(v) && Date.now() < end) {
      await new Promise((r) => setTimeout(r, 50));
      v = await fn();
    }
    return v;
  }

  async function settled(rentalId: string) {
    const p = await until(() => prisma.payment.findFirst({ where: { rentalId, kind: 'rental' } }), (v) => !!v && v.status !== 'pending');
    if (!p) throw new Error('liquidação não aconteceu');
    return p;
  }

  async function endRental(auth: Record<string, string>, rentalId: string) {
    const photo = await http().post(`/rentals/${rentalId}/return-photo`).set(auth).send({ contentType: 'image/jpeg' }).expect(201);
    const put = await fetch(photo.body.uploadUrl, { method: 'PUT', headers: photo.body.headers, body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
    expect(put.status).toBe(200);
    return http().post(`/rentals/${rentalId}/end`).set(auth).send({ returnPhotoObjectKey: photo.body.objectKey }).expect(200);
  }

  function signedWebhook(dataId: string, eventId: number) {
    const requestId = randomUUID();
    const ts = String(Math.floor(Date.now() / 1000));
    const v1 = createHmac('sha256', secret()).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');
    return http().post('/webhooks/mercadopago').set('x-signature', `ts=${ts},v1=${v1}`).set('x-request-id', requestId)
      .send({ id: eventId, type: 'payment', action: 'payment.updated', live_mode: false, data: { id: dataId } });
  }

  it('cartão: caução pré-autorizada → encerramento captura o valor e libera o resto; recibo no bucket, NFS-e e repasse do seguro', async () => {
    const { token, customerId } = await approvedCustomer(app, prisma, 'pay-card');
    const auth = { Authorization: `Bearer ${token}` };
    const card = await http().post('/payments/cards').set(auth).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242', cardNumber: '4111111111111111' }).expect(201);
    expect(card.body).toMatchObject({ brand: 'visa', last4: '4242', isDefault: true });
    const stored = await prisma.paymentCard.findUnique({ where: { id: card.body.id } });
    expect(JSON.stringify(stored)).not.toContain('4111111111111111');

    const vehicle = await freeVehicleInReturnZone(prisma);
    const started = await http().post('/rentals').set(auth).set('Idempotency-Key', randomUUID())
      .send({ vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' }).expect(201);
    const rentalId: string = started.body.rental.id;
    const depositId: string = started.body.deposit.id;
    expect(started.body.deposit).toMatchObject({ status: 'held', amountCents: 5000 });
    expect(await prisma.payment.findFirst({ where: { depositId, kind: 'deposit' } })).toMatchObject({ status: 'authorized' });

    const ended = await endRental(auth, rentalId);
    expect(ended.body.status).toBe('ended');
    const cost: number = ended.body.costCents;
    expect(cost).toBeGreaterThanOrEqual(300 + 200); // desbloqueio + seguro basic (+ minutos iniciados)
    expect(cost).toBeLessThan(5000);

    // A liquidação pode terminar logo depois da resposta (o travamento confirmado também dispara o encerramento).
    const pay = await settled(rentalId);
    expect(pay).toMatchObject({ status: 'paid', amountCents: cost, idempotencyKey: `rental-settlement:${rentalId}` });
    expect(await prisma.deposit.findUnique({ where: { id: depositId } })).toMatchObject({ status: 'captured', capturedCents: cost });
    expect(await prisma.payment.findFirst({ where: { depositId, kind: 'deposit' } })).toMatchObject({ status: 'captured' });
    const rental = await until(() => prisma.rental.findUniqueOrThrow({ where: { id: rentalId } }), (r) => !!r.insurancePolicyId);
    await until(() => prisma.insuranceRemittance.findUnique({ where: { policyId: rental.insurancePolicyId! } }), (v) => v?.status === 'sent');
    expect(await prisma.insuranceRemittance.findUnique({ where: { policyId: rental.insurancePolicyId! } })).toMatchObject({ amountCents: 200, status: 'sent' });
    // Recibo e NFS-e são gerados logo depois do 'paid'.
    await until(() => prisma.invoice.findUnique({ where: { paymentId: pay.id } }), (v) => !!v);
    const receipt = await prisma.paymentReceipt.findUniqueOrThrow({ where: { paymentId: pay.id } });
    expect(receipt).toMatchObject({ bucket: process.env.S3_BUCKET_REPORTS ?? 'relatorios' });
    expect(await prisma.invoice.findUnique({ where: { paymentId: pay.id } })).toMatchObject({ status: 'issued', amountCents: cost });

    // O PDF existe de verdade no MinIO (link assinado do recibo).
    const rec = await http().get(`/rentals/${rentalId}/receipt`).set(auth).expect(200);
    const pdf = await fetch(rec.body.pdfUrl);
    expect(pdf.status).toBe(200);
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
    expect(await http().get('/payments').set(auth).expect(200).then((r) => r.body.items.map((i: { kind: string }) => i.kind).sort())).toEqual(['deposit', 'rental']);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).delinquent).toBe(false);
  });

  it('Pix de caução: 202 + QR; webhook assinado confirma (duas entregas → um efeito); depois o aluguel inicia com o depositId', async () => {
    const { token } = await approvedCustomer(app, prisma, 'pay-pix');
    const auth = { Authorization: `Bearer ${token}` };
    const vehicle = await freeVehicleInReturnZone(prisma);
    const body = { vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', depositMethod: 'pix' };
    const pending = await http().post('/rentals').set(auth).set('Idempotency-Key', randomUUID()).send(body).expect(202);
    expect(pending.body.outcome).toBe('awaiting_deposit');
    const depositId: string = pending.body.deposit.id;
    expect(pending.body.deposit.pix.copyPaste).toContain('br.gov.bcb.pix');
    const dp = await prisma.payment.findFirstOrThrow({ where: { depositId, kind: 'deposit' } });

    // Assinatura inválida → 401, nada processado.
    await http().post('/webhooks/mercadopago').set('x-signature', 'ts=1,v1=' + '0'.repeat(64)).set('x-request-id', 'r')
      .send({ id: 1, type: 'payment', action: 'payment.updated', data: { id: dp.providerPaymentId } }).expect(401);

    fake.simulatePixPaid(dp.providerPaymentId!);
    const eventId = Math.floor(Math.random() * 1e12);
    await signedWebhook(dp.providerPaymentId!, eventId).expect(200, { received: true });
    const deposit = await until(() => prisma.deposit.findUniqueOrThrow({ where: { id: depositId } }), (d) => d.status === 'held');
    expect(deposit.status).toBe('held');
    await signedWebhook(dp.providerPaymentId!, eventId).expect(200);
    await new Promise((r) => setTimeout(r, 200));
    expect(await prisma.processedWebhook.count({ where: { eventId: String(eventId) } })).toBe(1);

    const started = await http().post('/rentals').set(auth).set('Idempotency-Key', randomUUID()).send({ ...body, depositId }).expect(201);
    expect(started.body.outcome).toBe('started');
    const ended = await endRental(auth, started.body.rental.id);
    await settled(started.body.rental.id);
    const dpAfter = await prisma.payment.findUniqueOrThrow({ where: { id: dp.id } });
    expect(dpAfter.status).toBe('partially_refunded');
    expect(dpAfter.refundedCents).toBe(5000 - ended.body.costCents);
  });

  it('falha de captura → cliente inadimplente → novo aluguel 403 customer-delinquent', async () => {
    const { token, customerId } = await approvedCustomer(app, prisma, 'pay-fail');
    const auth = { Authorization: `Bearer ${token}` };
    await http().post('/payments/cards').set(auth).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_fail_charge' }).expect(201);
    const vehicle = await freeVehicleInReturnZone(prisma);
    const started = await http().post('/rentals').set(auth).set('Idempotency-Key', randomUUID())
      .send({ vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' }).expect(201);
    await endRental(auth, started.body.rental.id);
    expect(await settled(started.body.rental.id)).toMatchObject({ status: 'failed', failureReason: 'cc_rejected_insufficient_amount' });
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).delinquent).toBe(true);

    const other = await freeVehicleInReturnZone(prisma);
    const denied = await http().post('/rentals').set(auth).set('Idempotency-Key', randomUUID())
      .send({ vehicleId: other.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' }).expect(403);
    expect(denied.body.type).toMatch(/customer-delinquent$/);
  });

  it('carteira: recarga no cartão gera lançamento e o saldo é a soma do ledger', async () => {
    const { token } = await approvedCustomer(app, prisma, 'pay-wallet');
    const auth = { Authorization: `Bearer ${token}` };
    await http().post('/payments/cards').set(auth).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);
    const t = await http().post('/wallet/top-ups').set(auth).set('Idempotency-Key', randomUUID()).send({ amountCents: 2000, method: 'card' }).expect(201);
    expect(t.body.status).toBe('paid');
    const w = await http().get('/wallet').set(auth).expect(200);
    expect(w.body.balanceCents).toBe(2000);
    const ledger = await http().get('/wallet/ledger').set(auth).expect(200);
    expect(ledger.body.items).toHaveLength(1);
    expect(ledger.body.items[0]).toMatchObject({ type: 'top_up', amountCents: 2000, balanceAfterCents: 2000 });
  });
});
