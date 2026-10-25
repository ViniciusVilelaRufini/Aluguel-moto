import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { approvedCustomer, bootE2eApp, devToken, freeVehicleInReturnZone } from '../helpers/e2e-app';
import { loadSpecAs30 } from './openapi-30';

jestOpenAPI(loadSpecAs30() as any);

/** Sobe a API e valida status + corpo das respostas dos endpoints principais contra o `openapi.yaml`. */
describe('Contrato: respostas reais × openapi.yaml', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let customer: string;
  let admin: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    customer = (await approvedCustomer(app, prisma, 'contract')).token;
    // Caução no cartão exige cartão cadastrado (gateway fake, Task 5); a resposta também é validada contra o contrato.
    const card = await http().post('/payments/cards').set('Authorization', `Bearer ${customer}`).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' });
    expect(card.status).toBe(201);
    expect(card).toSatisfyApiSpec();
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('1. GET /health', async () => {
    expect(await http().get('/health')).toSatisfyApiSpec();
  });

  it('2. POST /dev/token', async () => {
    expect(await http().post('/dev/token').send({ sub: 'x-contract', email: 'x@example.com', groups: [], pool: 'customer' })).toSatisfyApiSpec();
  });

  it('3. GET /me (cliente e staff)', async () => {
    expect(await http().get('/me').set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
    expect(await http().get('/me').set('Authorization', `Bearer ${admin}`)).toSatisfyApiSpec();
  });

  it('4. GET /vehicles/nearby e GET /vehicles/by-code/{code}', async () => {
    const nearby = await http().get('/vehicles/nearby?lat=-23.5614&lng=-46.6559&radiusM=3000').set('Authorization', `Bearer ${customer}`);
    expect(nearby.status).toBe(200);
    expect(nearby).toSatisfyApiSpec();
    expect(await http().get('/vehicles/by-code/0001').set('Authorization', `Bearer ${admin}`)).toSatisfyApiSpec();
  });

  it('5. GET /zones', async () => {
    const res = await http().get('/zones').set('Authorization', `Bearer ${customer}`);
    expect(res.body.items.length).toBeGreaterThanOrEqual(10);
    expect(res).toSatisfyApiSpec();
  });

  it('6. GET /pricing/plans e POST /pricing/quote', async () => {
    expect(await http().get('/pricing/plans').set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
    const quote = await http().post('/pricing/quote').set('Authorization', `Bearer ${customer}`).send({ planCode: 'minute', coverage: 'basic', couponCode: 'VOLTI20', estimatedMinutes: 10 });
    expect(quote.body.breakdown.totalCents).toBe(872 + 200);
    expect(quote).toSatisfyApiSpec();
  });

  it('7. reservas: POST /reservations, GET /reservations/current, DELETE', async () => {
    const vehicle = await freeVehicleInReturnZone(prisma);
    const created = await http().post('/reservations').set('Authorization', `Bearer ${customer}`).send({ vehicleId: vehicle.id });
    expect(created).toSatisfyApiSpec();
    expect(await http().get('/reservations/current').set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
    expect(await http().delete(`/reservations/${created.body.id}`).set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
  });

  it('8. aluguel: POST /rentals, GET /rentals/current, GET /rentals/{id}, events, force-end', async () => {
    const vehicle = await freeVehicleInReturnZone(prisma);
    const start = await http()
      .post('/rentals')
      .set('Authorization', `Bearer ${customer}`)
      .set('Idempotency-Key', randomUUID())
      .send({ vehicleId: vehicle.id, planCode: 'hour', coverage: 'full', depositMethod: 'card' });
    expect(start.status).toBe(201);
    expect(start).toSatisfyApiSpec();
    const id = start.body.rental.id;
    expect(await http().get('/rentals/current').set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
    expect(await http().get(`/rentals/${id}`).set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
    expect(await http().get(`/rentals/${id}/events`).set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
    // Lacunas T5: link público do SOS (sem autenticação) — 200 com o aluguel aberto, 404 depois do encerramento.
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { lastSeenAt: new Date() } });
    const share = await http().post(`/rentals/${id}/location-share`).set('Authorization', `Bearer ${customer}`).send({ durationMinutes: 30 });
    expect(share.status).toBe(201);
    expect(share).toSatisfyApiSpec();
    const token = String(share.body.url).split('/').pop();
    const shared = await http().get(`/public/location-shares/${token}`);
    expect(shared.status).toBe(200);
    expect(shared).toSatisfyApiSpec();
    const forced = await http().post(`/rentals/${id}/force-end`).set('Authorization', `Bearer ${admin}`).send({ reason: 'Teste de contrato' });
    expect(forced.body.status).toBe('force_ended');
    expect(forced).toSatisfyApiSpec();
    expect(await http().get(`/rentals/${id}/receipt`).set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
    const closed = await http().get(`/public/location-shares/${token}`);
    expect(closed.status).toBe(404);
    expect(closed).toSatisfyApiSpec();
  });

  it('9. staff: GET /vehicles, GET /alerts, GET /reports/dashboard, GET /audit-logs', async () => {
    for (const path of ['/vehicles?limit=5', '/alerts', '/reports/dashboard', '/audit-logs?limit=5', '/customers?limit=5']) {
      const res = await http().get(path).set('Authorization', `Bearer ${admin}`);
      expect(res.status).toBe(200);
      expect(res).toSatisfyApiSpec();
    }
  });

  it('10. erros RFC 7807: 401, 403, 400, 404', async () => {
    expect(await http().get('/rentals/current')).toSatisfyApiSpec();
    expect(await http().get('/vehicles').set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
    expect(await http().post('/rentals').set('Authorization', `Bearer ${customer}`).send({})).toSatisfyApiSpec();
    expect(await http().get(`/rentals/${randomUUID()}`).set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
  });

  it('12. contrato v2: catálogo, estações, carteira, cupons, indicação, manutenção e baterias', async () => {
    for (const path of ['/vehicle-models', '/swap-stations?lat=-23.5614&lng=-46.6559', '/wallet', '/me/coupons', '/me/referral', '/me/referral/rewards', '/me/maintenance-requests', '/payments/subscriptions']) {
      const res = await http().get(path).set('Authorization', `Bearer ${customer}`);
      expect(res.status).toBe(200);
      expect(res).toSatisfyApiSpec();
    }
    for (const path of ['/maintenance/vehicles?limit=5', '/batteries?limit=5', '/batteries/van-stock', '/vehicle-models?includeInactive=true']) {
      const res = await http().get(path).set('Authorization', `Bearer ${admin}`);
      expect(res.status).toBe(200);
      expect(res).toSatisfyApiSpec();
    }
    const v = await http().get('/vehicles/by-code/0001').set('Authorization', `Bearer ${admin}`);
    expect(v.body.service).toBeDefined();
    expect(v).toSatisfyApiSpec();
    expect(await http().get('/me/maintenance-slots').set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec(); // 403 subscription-required
    expect(await http().post('/me/coupons/validate').set('Authorization', `Bearer ${customer}`).send({ code: 'VOLTI20', planCode: 'minute' })).toSatisfyApiSpec();
  });

  it('11. LGPD: consentimentos e exportação', async () => {
    expect(await http().get('/lgpd/consents').set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
    expect(await http().get('/lgpd/export').set('Authorization', `Bearer ${customer}`)).toSatisfyApiSpec();
  });

  it('13. Task 14: quitação da dívida, quitação manual, saldo no detalhe do cliente, alerta de pagamento e chat na exportação', async () => {
    const c = await approvedCustomer(app, prisma, 'contract-t14');
    await prisma.customer.update({ where: { id: c.customerId }, data: { delinquent: true } });
    const debt = await prisma.payment.create({ data: { customerId: c.customerId, kind: 'rental', method: 'card', status: 'failed', amountCents: 3000 } });
    const conv = await prisma.supportConversation.create({ data: { customerId: c.customerId, subject: 'Ajuda' } });
    await prisma.supportMessage.create({ data: { conversationId: conv.id, authorType: 'staff', authorName: 'Ana Lima', body: 'Oi', attachmentObjectKeys: [] } });
    const auth = { Authorization: `Bearer ${c.token}` };

    const failed = await http().get('/payments?status=failed').set(auth);
    expect(failed.body.items[0].outstandingCents).toBe(3000);
    expect(failed).toSatisfyApiSpec();
    const pix = await http().post(`/payments/${debt.id}/retry`).set(auth).set('Idempotency-Key', randomUUID()).send({ method: 'pix' });
    expect(pix.status).toBe(201);
    expect(pix).toSatisfyApiSpec();
    expect(await http().get('/lgpd/export').set(auth)).toSatisfyApiSpec();

    const detail = await http().get(`/customers/${c.customerId}`).set('Authorization', `Bearer ${admin}`);
    expect(detail.body).toMatchObject({ walletBalanceCents: 0, debtCents: 3000 });
    expect(detail).toSatisfyApiSpec();
    const cleared = await http().post(`/customers/${c.customerId}/delinquency/clear`).set('Authorization', `Bearer ${admin}`).send({ reason: 'Pago por transferência' });
    expect(cleared.status).toBe(200);
    expect(cleared).toSatisfyApiSpec();
    expect(await http().get(`/payments/${debt.id}`).set('Authorization', `Bearer ${admin}`)).toSatisfyApiSpec();

    await prisma.alert.create({ data: { type: 'payment_needs_review', priority: 'high', message: 'Revisar', paymentId: debt.id } });
    const alerts = await http().get('/alerts?type=payment_needs_review&limit=5').set('Authorization', `Bearer ${admin}`);
    expect(alerts.status).toBe(200);
    expect(alerts).toSatisfyApiSpec();
  });

  it('14. Task 16 (R2-01): recibo com pagamento pendente (caução usada, saldo a pagar, sem PDF) e reserva recusada com 409 payment-pending', async () => {
    const c = await approvedCustomer(app, prisma, 'contract-t16');
    const auth = { Authorization: `Bearer ${c.token}` };
    const vehicle = await freeVehicleInReturnZone(prisma);
    const deposit = await prisma.deposit.create({ data: { customerId: c.customerId, method: 'pix', status: 'captured', amountCents: 5000, capturedCents: 5000 } });
    const endedAt = new Date();
    const rental = await prisma.rental.create({
      data: {
        customerId: c.customerId, vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', status: 'ended', startedAt: new Date(endedAt.getTime() - 3600_000), endedAt,
        endRequestedAt: endedAt, priceSnapshot: {}, depositId: deposit.id, costCents: 8000,
        breakdown: { lines: [{ code: 'time', description: 'Tempo de uso (por minuto)', amountCents: 8000 }], subtotalCents: 8000, discountCents: 0, insuranceCents: 0, feesCents: 0, totalCents: 8000 },
      },
    });
    const pay = await prisma.payment.create({ data: { customerId: c.customerId, rentalId: rental.id, depositId: deposit.id, kind: 'rental', method: 'card', status: 'failed', amountCents: 8000, failureReason: 'card_not_found' } });
    await prisma.rental.update({ where: { id: rental.id }, data: { paymentId: pay.id } });
    await prisma.customer.update({ where: { id: c.customerId }, data: { delinquent: true } });

    const receipt = await http().get(`/rentals/${rental.id}/receipt`).set(auth);
    expect(receipt.status).toBe(200);
    expect(receipt.body).toMatchObject({ paymentId: pay.id, paymentStatus: 'pending', amountDueCents: 3000, depositUsedCents: 5000, depositReleasedCents: 0 });
    expect(receipt.body).not.toHaveProperty('pdfUrl');
    expect(receipt.body).not.toHaveProperty('paymentMethod');
    expect(receipt).toSatisfyApiSpec();

    const denied = await http().post('/reservations').set(auth).send({ vehicleId: (await freeVehicleInReturnZone(prisma)).id });
    expect(denied.status).toBe(409);
    expect(denied.body).toMatchObject({ type: expect.stringMatching(/payment-pending$/), detail: 'Pague o valor pendente para alugar de novo.' });
    expect(denied).toSatisfyApiSpec();
  });
});

