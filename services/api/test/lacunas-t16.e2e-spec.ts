import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { FakePaymentProvider } from '../src/modules/payments/provider/fake-payment-provider';
import { PAYMENT_PROVIDER } from '../src/modules/payments/provider/payment-provider';
import { approvedCustomer, bootE2eApp, freeVehicleInReturnZone } from './helpers/e2e-app';

/**
 * Task 16 das lacunas (R2-01) contra Postgres + Redis + MinIO, gateway fake: fechamento na ordem carteira → caução →
 * cartão → dívida. Cada caso percorre o fluxo real (caução Pix por webhook assinado → aluguel → encerramento) e confere o
 * pagamento, a caução, o ledger da carteira e o recibo (`paymentStatus`, PDF só pago); a dívida bloqueia a reserva (409)
 * até o cliente pagar o Pix da quitação.
 */
describe('Lacunas T16: fechamento sem cartão (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let fake: FakePaymentProvider;
  const http = () => request(app.getHttpServer());
  const DEPOSIT = 5000;

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

  function signedWebhook(dataId: string) {
    const requestId = randomUUID();
    const ts = String(Math.floor(Date.now() / 1000));
    const v1 = createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET!).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');
    return http().post('/webhooks/mercadopago').set('x-signature', `ts=${ts},v1=${v1}`).set('x-request-id', requestId)
      .send({ id: Math.floor(Math.random() * 1e12), type: 'payment', action: 'payment.updated', live_mode: false, data: { id: dataId } });
  }

  /** Cliente só com Pix: caução Pix paga, aluguel iniciado e "andado" por `minutes` (startedAt no passado). */
  async function pixRental(tag: string, opts: { walletCents?: number; card?: boolean; minutes?: number } = {}) {
    const { token, customerId } = await approvedCustomer(app, prisma, tag);
    const auth = { Authorization: `Bearer ${token}` };
    if (opts.card) await http().post('/payments/cards').set(auth).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242', setDefault: true }).expect(201);
    if (opts.walletCents) {
      await prisma.walletEntry.create({ data: { customerId, type: 'adjustment', amountCents: opts.walletCents, balanceAfterCents: opts.walletCents, description: 'Crédito de teste' } });
    }
    const vehicle = await freeVehicleInReturnZone(prisma);
    const body = { vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', depositMethod: 'pix' };
    const pending = await http().post('/rentals').set(auth).set('Idempotency-Key', randomUUID()).send(body).expect(202);
    const depositId: string = pending.body.deposit.id;
    const dp = await prisma.payment.findFirstOrThrow({ where: { depositId, kind: 'deposit' } });
    fake.simulatePixPaid(dp.providerPaymentId!);
    await signedWebhook(dp.providerPaymentId!).expect(200);
    await until(() => prisma.deposit.findUniqueOrThrow({ where: { id: depositId } }), (d) => d.status === 'held');
    const started = await http().post('/rentals').set(auth).set('Idempotency-Key', randomUUID()).send({ ...body, depositId }).expect(201);
    const rentalId: string = started.body.rental.id;
    if (opts.minutes) await prisma.rental.update({ where: { id: rentalId }, data: { startedAt: new Date(Date.now() - opts.minutes * 60_000) } });
    return { auth, customerId, rentalId, depositId, depositPaymentId: dp.id };
  }

  async function endRental(auth: Record<string, string>, rentalId: string) {
    const photo = await http().post(`/rentals/${rentalId}/return-photo`).set(auth).send({ contentType: 'image/jpeg' }).expect(201);
    const put = await fetch(photo.body.uploadUrl, { method: 'PUT', headers: photo.body.headers, body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
    expect(put.status).toBe(200);
    const ended = await http().post(`/rentals/${rentalId}/end`).set(auth).send({ returnPhotoObjectKey: photo.body.objectKey }).expect(200);
    const pay = await until(() => prisma.payment.findFirst({ where: { rentalId, kind: 'rental' } }), (v) => !!v && v.status !== 'pending');
    if (!pay) throw new Error('liquidação não aconteceu');
    return { rental: ended.body, pay };
  }

  const walletBalance = async (customerId: string) => (await prisma.walletEntry.aggregate({ where: { customerId }, _sum: { amountCents: true } }))._sum.amountCents ?? 0;

  it('sem cartão e carteira zerada (cenário do QA): caução abate, o restante vira dívida; recibo pendente; reserva 409; Pix da quitação pago → recibo pago com PDF', async () => {
    const { auth, customerId, rentalId, depositId } = await pixRental('t16-qa', { minutes: 120 });
    const { rental, pay } = await endRental(auth, rentalId);
    const cost: number = rental.costCents;
    expect(cost).toBeGreaterThan(DEPOSIT);
    expect(pay).toMatchObject({ status: 'failed', amountCents: cost, failureReason: 'card_not_found' });
    // A caução Pix não é devolvida: fica para abater o valor devido.
    expect(await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } })).toMatchObject({ status: 'captured', capturedCents: DEPOSIT });

    const pendingReceipt = await http().get(`/rentals/${rentalId}/receipt`).set(auth).expect(200);
    expect(pendingReceipt.body).toMatchObject({ paymentId: pay.id, paymentStatus: 'pending', amountDueCents: cost - DEPOSIT, depositUsedCents: DEPOSIT, depositReleasedCents: 0 });
    expect(pendingReceipt.body).not.toHaveProperty('pdfUrl');
    expect(pendingReceipt.body).not.toHaveProperty('paymentMethod');

    // Nova reserva (rua e galpão passam pela mesma regra) → 409 com o texto do app.
    const denied = await http().post('/reservations').set(auth).send({ vehicleId: (await freeVehicleInReturnZone(prisma)).id }).expect(409);
    expect(denied.body).toMatchObject({ type: expect.stringMatching(/payment-pending$/), detail: 'Pague o valor pendente para alugar de novo.' });

    // O app paga pelo Pix da quitação (rota da Task 14).
    const debts = await http().get('/payments?status=failed').set(auth).expect(200);
    expect(debts.body.items.find((p: { id: string }) => p.id === pay.id)).toMatchObject({ outstandingCents: cost - DEPOSIT });
    const pix = await http().post(`/payments/${pay.id}/retry`).set(auth).set('Idempotency-Key', randomUUID()).send({ method: 'pix' }).expect(201);
    expect(pix.body).toMatchObject({ kind: 'debt_settlement', method: 'pix', status: 'pending', amountCents: cost - DEPOSIT, pix: { copyPaste: expect.any(String) } });
    const pixProviderId = (await prisma.payment.findUniqueOrThrow({ where: { id: pix.body.id } })).providerPaymentId!;
    fake.simulatePixPaid(pixProviderId);
    await signedWebhook(pixProviderId).expect(200);
    await until(() => prisma.paymentReceipt.findUnique({ where: { paymentId: pay.id } }), (v) => !!v);

    const paidReceipt = await http().get(`/rentals/${rentalId}/receipt`).set(auth).expect(200);
    expect(paidReceipt.body).toMatchObject({ paymentStatus: 'paid', paymentMethod: 'pix', depositUsedCents: DEPOSIT });
    expect(paidReceipt.body).not.toHaveProperty('amountDueCents');
    expect(paidReceipt.body.pdfUrl).toContain('X-Amz-Expires=900');
    const pdf = await fetch(paidReceipt.body.pdfUrl);
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
    expect(await prisma.invoice.findUnique({ where: { paymentId: pay.id } })).toMatchObject({ status: 'issued' });
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).delinquent).toBe(false);
    // Quitada: reservar volta a ser possível.
    await http().post('/reservations').set(auth).send({ vehicleId: (await freeVehicleInReturnZone(prisma)).id }).expect(201);
  });

  it('carteira cobre tudo: debita o ledger uma vez, pagamento pela carteira e a caução Pix volta inteira', async () => {
    const { auth, customerId, rentalId, depositId, depositPaymentId } = await pixRental('t16-wallet-all', { walletCents: 100_000 });
    const { rental, pay } = await endRental(auth, rentalId);
    const applied = ((await prisma.rental.findUniqueOrThrow({ where: { id: rentalId } })).breakdown as { walletAppliedCents?: number }).walletAppliedCents ?? 0;
    expect(applied).toBeGreaterThan(0);
    expect(rental.costCents).toBe(0);
    expect(pay).toMatchObject({ status: 'paid', method: 'wallet', amountCents: 0 });
    expect(await prisma.walletEntry.findMany({ where: { customerId, type: 'rental_charge' } })).toEqual([expect.objectContaining({ amountCents: -applied, rentalId })]);
    expect(await walletBalance(customerId)).toBe(100_000 - applied);
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: depositPaymentId } })).toMatchObject({ status: 'refunded', refundedCents: DEPOSIT });
    expect((await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } })).status).toBe('released');
    const receipt = await http().get(`/rentals/${rentalId}/receipt`).set(auth).expect(200);
    expect(receipt.body).toMatchObject({ paymentStatus: 'paid', paymentMethod: 'wallet', depositReleasedCents: DEPOSIT });
    expect(receipt.body.breakdown.lines).toContainEqual(expect.objectContaining({ code: 'wallet', amountCents: -applied }));
  });

  it('carteira parcial + caução Pix: a carteira abate primeiro, a caução paga o restante e devolve só o saldo', async () => {
    const { auth, customerId, rentalId, depositId, depositPaymentId } = await pixRental('t16-wallet-part', { walletCents: 300 });
    const { rental, pay } = await endRental(auth, rentalId);
    const gross = rental.costCents + 300;
    expect((await prisma.rental.findUniqueOrThrow({ where: { id: rentalId } })).breakdown).toMatchObject({ walletAppliedCents: 300, totalCents: gross - 300 });
    expect(await walletBalance(customerId)).toBe(0);
    expect(pay).toMatchObject({ status: 'paid', method: 'pix', amountCents: rental.costCents });
    expect(await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } })).toMatchObject({ status: 'captured', capturedCents: rental.costCents });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: depositPaymentId } })).toMatchObject({ status: 'partially_refunded', refundedCents: DEPOSIT - rental.costCents });
    const receipt = await http().get(`/rentals/${rentalId}/receipt`).set(auth).expect(200);
    expect(receipt.body).toMatchObject({ paymentStatus: 'paid', paymentMethod: 'pix', depositUsedCents: rental.costCents, depositReleasedCents: DEPOSIT - rental.costCents });
    expect(receipt.body.pdfUrl).toBeDefined();
  });

  it('caução Pix menor que o valor e cartão salvo: a caução abate e o cartão paga só o restante', async () => {
    const { auth, rentalId, depositId } = await pixRental('t16-card', { card: true, minutes: 120 });
    const { rental, pay } = await endRental(auth, rentalId);
    expect(rental.costCents).toBeGreaterThan(DEPOSIT);
    expect(pay).toMatchObject({ status: 'paid', method: 'card', cardLast4: '4242' });
    const charges = await fake.searchPayments({ externalReference: pay.id });
    expect(charges.map((c) => c.amountCents)).toEqual([rental.costCents - DEPOSIT]);
    expect(await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } })).toMatchObject({ status: 'captured', capturedCents: DEPOSIT });
    const receipt = await http().get(`/rentals/${rentalId}/receipt`).set(auth).expect(200);
    expect(receipt.body).toMatchObject({ paymentStatus: 'paid', paymentMethod: 'card', cardLast4: '4242', depositUsedCents: DEPOSIT });
  });
});
