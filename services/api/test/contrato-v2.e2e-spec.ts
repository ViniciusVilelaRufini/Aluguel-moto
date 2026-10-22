import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClient } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { EV } from '../src/common/events';
import { PAYMENT_PROVIDER } from '../src/modules/payments/provider/payment-provider';
import { loadSpecAs30 } from './contract/openapi-30';
import { approvedCustomer, bootE2eApp, devToken, freeVehicleInReturnZone } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);

/**
 * Contrato v2 (docs/decisoes.md, 2026-10-22) contra Postgres + Redis do compose: regras de negócio e respostas validadas
 * contra o `openapi.yaml`.
 */
describe('Contrato v2 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: string;
  let suporte: string;
  let campo: string;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
    suporte = await devToken(app, { sub: 'dev-suporte', email: 'suporte@volti.dev', groups: ['suporte'], pool: 'staff' });
    campo = await devToken(app, { sub: 'dev-campo', email: 'campo@volti.dev', groups: ['campo'], pool: 'staff' });
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  async function customerWithCard(tag: string) {
    const c = await approvedCustomer(app, prisma, tag);
    await http().post('/payments/cards').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);
    return c;
  }

  it('chave Pix para estornos: validação por tipo, máscara para staff e auditoria', async () => {
    const { token, customerId } = await approvedCustomer(app, prisma, 'pix');
    await prisma.customer.update({ where: { id: customerId }, data: { cpf: `${Date.now()}`.slice(-11).padStart(11, '9') } });
    const bad = await http().patch('/me').set(bearer(token)).send({ pixRefundKeyType: 'phone', pixRefundKey: '+551133334444' }).expect(422);
    expect(bad.body.code).toBe('pix-key-invalid');
    expect(bad).toSatisfyApiSpec();
    expect((await http().patch('/me').set(bearer(token)).send({ pixRefundKey: 'a@b.com' }).expect(422)).body.code).toBe('pix-key-invalid');
    expect((await http().patch('/me').set(bearer(token)).send({ pixRefundKeyType: 'cpf', pixRefundKey: '529.982.247-25' }).expect(422)).body.detail).toContain('CPF da sua conta');
    const ok = await http().patch('/me').set(bearer(token)).send({ pixRefundKeyType: 'email', pixRefundKey: ' Maria@Volti.DEV ' }).expect(200);
    expect(ok.body.customer).toMatchObject({ pixRefundKeyType: 'email', pixRefundKey: 'maria@volti.dev' });
    expect(ok).toSatisfyApiSpec();
    const staffView = await http().get(`/customers/${customerId}`).set(bearer(suporte)).expect(200);
    expect(staffView.body.pixRefundKey).toBe('m***@volti.dev');
    expect((await http().get(`/customers/${customerId}`).set(bearer(admin)).expect(200)).body.pixRefundKey).toBe('maria@volti.dev');
    const audit = await prisma.auditLog.findFirst({ where: { entityId: customerId, action: 'customer.pix_refund_key' } });
    expect(audit?.metadata).toEqual({ type: 'email', removed: false });
    const cleared = await http().patch('/me').set(bearer(token)).send({ pixRefundKey: '' }).expect(200);
    expect(cleared.body.customer.pixRefundKey).toBeUndefined();
  });

  it('carteira: limites da recarga de valor livre e recarga Pix de R$ 25', async () => {
    const { token } = await approvedCustomer(app, prisma, 'wallet');
    const w = await http().get('/wallet').set(bearer(token)).expect(200);
    expect(w.body).toMatchObject({ topUpMinCents: 1000, topUpMaxCents: 100000 });
    expect(w).toSatisfyApiSpec();
    const t = await http().post('/wallet/top-ups').set(bearer(token)).set('Idempotency-Key', randomUUID()).send({ amountCents: 2500, method: 'pix' }).expect(201);
    expect(t.body).toMatchObject({ status: 'pending', amountCents: 2500 });
    expect(t.body.pix.copyPaste).toBeTruthy();
    await http().post('/wallet/top-ups').set(bearer(token)).set('Idempotency-Key', randomUUID()).send({ amountCents: 999, method: 'pix' }).expect(400);
  });

  it('plano semanal: moto fixa, pausa com limites, retomada, staff troca a moto e cancela', async () => {
    const a = await customerWithCard('plan-a');
    const b = await customerWithCard('plan-b');
    const fixed = await freeVehicleInReturnZone(prisma);
    const created = await http().post('/payments/subscriptions').set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send({ planCode: 'weekly', vehicleId: fixed.id }).expect(201);
    expect(created.body).toMatchObject({ status: 'active', assignedVehicleId: fixed.id, nextChargeCents: 24900, maxPauseDays: 3, pausesRemainingInPeriod: 1, cardLast4: '4242' });
    expect(created.body.assignedVehicle.code).toBe(fixed.code);
    expect(created).toSatisfyApiSpec();
    const subId = created.body.id;

    // A moto fixa some do mapa dos outros clientes e não pode ser alugada por eles.
    const nearbyB = await http().get('/vehicles/nearby?lat=-23.5614&lng=-46.6559&radiusM=300').set(bearer(b.token)).expect(200);
    expect(nearbyB.body.items.map((v: { id: string }) => v.id)).not.toContain(fixed.id);
    const nearbyA = await http().get('/vehicles/nearby?lat=-23.5614&lng=-46.6559&radiusM=300').set(bearer(a.token)).expect(200);
    expect(nearbyA.body.items.map((v: { id: string }) => v.id)).toContain(fixed.id);
    const steal = await http().post('/rentals').set(bearer(b.token)).set('Idempotency-Key', randomUUID()).send({ vehicleId: fixed.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card', termsAccepted: true, termsVersion: '2026-10' });
    expect(steal.status).toBe(409);
    expect(steal.body.code).toBe('vehicle-unavailable');
    const meA = await http().get('/me').set(bearer(a.token)).expect(200);
    expect(meA.body.customer).toMatchObject({ activePlanCode: 'weekly', activeSubscriptionId: subId });

    // Fix round 1 (I3): reserva da moto fixa por outro cliente → 409.
    expect((await http().post('/reservations').set(bearer(b.token)).send({ vehicleId: fixed.id }).expect(409)).body.code).toBe('vehicle-unavailable');
    // Fix round 1 (I1): gateway indisponível → 503 e nada muda.
    (app.get(PAYMENT_PROVIDER) as any).failNextPauseCall = true;
    const down = await http().post(`/payments/subscriptions/${subId}/pause`).set(bearer(a.token)).send({ days: 2 }).expect(503);
    expect(down.body.code).toBe('gateway-unavailable');
    expect(down).toSatisfyApiSpec();
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: subId } })).status).toBe('active');
    // Pausa: 4 dias no semanal → 422; 2 dias → paused; segunda pausa no período → 422.
    expect((await http().post(`/payments/subscriptions/${subId}/pause`).set(bearer(a.token)).send({ days: 4 }).expect(422)).body.code).toBe('subscription-pause-limit-reached');
    const paused = await http().post(`/payments/subscriptions/${subId}/pause`).set(bearer(a.token)).send({ days: 2 }).expect(200);
    expect(paused.body).toMatchObject({ status: 'paused', pausesRemainingInPeriod: 0 });
    expect(paused.body.nextChargeAt).toBeUndefined();
    expect(paused).toSatisfyApiSpec();
    expect((await http().post(`/payments/subscriptions/${subId}/pause`).set(bearer(a.token)).send({ days: 1 }).expect(409)).body.code).toBe('subscription-not-pausable');
    // Simula 1 dia de pausa: a retomada estende o período em ~1 dia.
    const before = await prisma.subscription.findUniqueOrThrow({ where: { id: subId } });
    await prisma.subscription.update({ where: { id: subId }, data: { pausedAt: new Date(Date.now() - 86_400_000) } });
    const resumed = await http().post(`/payments/subscriptions/${subId}/resume`).set(bearer(a.token)).expect(200);
    expect(resumed.body.status).toBe('active');
    expect(new Date(resumed.body.currentPeriodEnd).getTime() - before.currentPeriodEnd.getTime()).toBeGreaterThanOrEqual(86_399_000);
    expect((await http().post(`/payments/subscriptions/${subId}/pause`).set(bearer(a.token)).send({ days: 1 }).expect(422)).body.code).toBe('subscription-pause-limit-reached');
    expect((await http().post(`/payments/subscriptions/${subId}/resume`).set(bearer(a.token)).expect(409)).body.code).toBe('subscription-not-pausable');

    // O gateway (fake) recebeu a nova data da próxima cobrança.
    const providerSubId = (await prisma.paymentProviderRef.findFirstOrThrow({ where: { entityType: 'subscription', entityId: subId } })).providerId;
    expect((app.get(PAYMENT_PROVIDER) as any).subscriptionNextChargeAt(providerSubId)?.toISOString()).toBe(resumed.body.currentPeriodEnd);
    // Fix round 1 (M9): o cliente não troca a moto fixa de novo antes de 24 h.
    const another = await freeVehicleInReturnZone(prisma);
    await prisma.subscription.update({ where: { id: subId }, data: { assignedVehicleAt: new Date() } });
    expect((await http().put(`/payments/subscriptions/${subId}/vehicle`).set(bearer(a.token)).send({ vehicleId: another.id }).expect(422)).body.code).toBe('subscription-vehicle-cooldown');
    // Cliente não troca para moto ocupada por outro plano; staff troca e audita.
    const other = await freeVehicleInReturnZone(prisma);
    const swapped = await http().put(`/payments/subscriptions/${subId}/vehicle`).set(bearer(admin)).send({ vehicleId: other.id }).expect(200);
    expect(swapped.body.assignedVehicleId).toBe(other.id);
    expect(await prisma.auditLog.count({ where: { entityId: subId, action: 'subscription.assign_vehicle' } })).toBe(1);
    const staffVehicle = await http().get(`/vehicles/${other.id}`).set(bearer(admin)).expect(200);
    expect(staffVehicle.body.assignedSubscriptionId).toBe(subId);
    await http().put(`/payments/subscriptions/${subId}/vehicle`).set(bearer(b.token)).send({ vehicleId: fixed.id }).expect(404);
    const got = await http().get(`/payments/subscriptions/${subId}`).set(bearer(a.token)).expect(200);
    expect(got).toSatisfyApiSpec();
    const canceled = await http().delete(`/payments/subscriptions/${subId}`).set(bearer(a.token)).expect(200);
    expect(canceled.body).toMatchObject({ cancelAtPeriodEnd: true });
    expect(canceled.body.nextChargeAt).toBeUndefined();
    // Fix round 1 (C1): período vencido → a assinatura fecha, a moto fixa volta ao mapa e o cliente assina de novo.
    await prisma.subscription.update({ where: { id: subId }, data: { currentPeriodEnd: new Date(Date.now() - 1000) } });
    const again = await http().get('/vehicles/nearby?lat=-23.5614&lng=-46.6559&radiusM=300').set(bearer(b.token)).expect(200);
    expect(again.body.items.map((v: { id: string }) => v.id)).toContain(other.id);
    expect((await http().get('/me').set(bearer(a.token)).expect(200)).body.customer.activePlanCode).toBeUndefined();
    const renewed = await http().post('/payments/subscriptions').set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send({ planCode: 'weekly' }).expect(201);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: subId } })).status).toBe('canceled');
    await http().delete(`/payments/subscriptions/${renewed.body.id}`).set(bearer(a.token)).expect(200);
    await prisma.subscription.update({ where: { id: renewed.body.id }, data: { status: 'canceled' } });
  });

  it('cliente não vê posição nem endereço de moto em uso por outra pessoa (I5)', async () => {
    const owner = await approvedCustomer(app, prisma, 'loc-owner');
    const other = await approvedCustomer(app, prisma, 'loc-other');
    const v = await freeVehicleInReturnZone(prisma);
    await http().post('/reservations').set(bearer(owner.token)).send({ vehicleId: v.id }).expect(201);
    const mine = await http().get(`/vehicles/${v.id}`).set(bearer(owner.token)).expect(200);
    expect(mine.body.lat).not.toBe(0);
    expect(mine.body.address).toBeTruthy();
    const theirs = await http().get(`/vehicles/${v.id}`).set(bearer(other.token)).expect(200);
    expect(theirs.body).toMatchObject({ status: 'reserved', lat: 0, lng: 0, locationHidden: true });
    expect(theirs.body.address).toBeUndefined();
    expect(theirs).toSatisfyApiSpec();
    expect((await http().get(`/vehicles/${v.id}`).set(bearer(admin)).expect(200)).body.locationHidden).toBeUndefined();
  });

  it('auto-retomada das pausas vencidas', async () => {
    const a = await customerWithCard('plan-auto');
    const sub = await http().post('/payments/subscriptions').set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send({ planCode: 'monthly' }).expect(201);
    await http().post(`/payments/subscriptions/${sub.body.id}/pause`).set(bearer(a.token)).send({ days: 7 }).expect(200);
    await prisma.subscription.update({ where: { id: sub.body.id }, data: { pausedAt: new Date(Date.now() - 8 * 86_400_000), pauseEndsAt: new Date(Date.now() - 86_400_000) } });
    const { SubscriptionsService } = await import('../src/modules/payments/subscriptions.service');
    expect(await app.get(SubscriptionsService).autoResume(new Date())).toBeGreaterThanOrEqual(1);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.body.id } })).status).toBe('active');
    await http().delete(`/payments/subscriptions/${sub.body.id}`).set(bearer(a.token)).expect(200);
  });

  it('fix round 2: assinatura expirada cancela no gateway com retentativa; cobrança tardia é estornada e não reabre', async () => {
    const { SubscriptionsService } = await import('../src/modules/payments/subscriptions.service');
    const svc = app.get(SubscriptionsService);
    const fake = app.get(PAYMENT_PROVIDER) as any;
    const a = await customerWithCard('plan-late');
    const old = await http().post('/payments/subscriptions').set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send({ planCode: 'weekly' }).expect(201);
    const providerSubId = (await prisma.paymentProviderRef.findFirstOrThrow({ where: { entityType: 'subscription', entityId: old.body.id } })).providerId;
    await prisma.subscription.update({ where: { id: old.body.id }, data: { currentPeriodEnd: new Date(Date.now() - 4 * 86_400_000) } });

    // Gateway fora na hora de expirar: fecha localmente, cancelamento fica pendente; o job confirma depois.
    fake.failNextCancelCall = true;
    expect(await svc.expireStale(new Date(), { customerId: a.customerId })).toBe(1);
    let row = await prisma.subscription.findUniqueOrThrow({ where: { id: old.body.id } });
    expect(row).toMatchObject({ status: 'expired', gatewayCancelAttempts: 1 });
    expect(row.gatewayCancelPendingAt).not.toBeNull();
    expect(fake.subscriptionStatus(providerSubId)).toBe('active');
    await svc.retryGatewayCancellations();
    expect(fake.subscriptionStatus(providerSubId)).toBe('canceled');
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: old.body.id } })).gatewayCancelPendingAt).toBeNull();

    // Cliente assina de novo; uma cobrança tardia da recorrência antiga chega pelo webhook.
    const fresh = await http().post('/payments/subscriptions').set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send({ planCode: 'weekly' }).expect(201);
    const card = await prisma.paymentCard.findFirstOrThrow({ where: { customerId: a.customerId } });
    const providerCustomerId = (await prisma.paymentProviderRef.findFirstOrThrow({ where: { entityType: 'customer', entityId: a.customerId } })).providerId;
    const late = await fake.charge({ providerCustomerId, providerCardId: card.providerCardId, amountCents: 24900, description: 'renovação', idempotencyKey: randomUUID(), externalReference: `subscription:${old.body.id}` });
    const refundsBefore = fake.operations('refund');
    await svc.onRecurringPayment({ ...late, externalReference: `subscription:${old.body.id}` });
    await svc.onRecurringPayment({ ...late, externalReference: `subscription:${old.body.id}` }); // webhook repetido
    row = await prisma.subscription.findUniqueOrThrow({ where: { id: old.body.id } });
    expect(row.status).toBe('expired');
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: fresh.body.id } })).status).toBe('active');
    const pay = await prisma.payment.findFirstOrThrow({ where: { providerPaymentId: late.providerPaymentId } });
    expect(pay).toMatchObject({ status: 'refunded', refundedCents: 24900 });
    expect(await prisma.paymentRefund.findFirstOrThrow({ where: { paymentId: pay.id } })).toMatchObject({ status: 'succeeded', idempotencyKey: `subscription-late-refund:${pay.id}` });
    expect(fake.operations('refund') - refundsBefore).toBe(1);
    expect((await fake.getPayment(late.providerPaymentId)).refundedCents).toBe(24900);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: a.customerId } })).delinquent).toBe(false);
    await http().delete(`/payments/subscriptions/${fresh.body.id}`).set(bearer(a.token)).expect(200);
    await prisma.subscription.update({ where: { id: fresh.body.id }, data: { status: 'canceled' } });
  });

  it('fix round 2 (M10): exclusão da conta fecha a assinatura e libera a moto mesmo com o gateway fora; o job cancela depois', async () => {
    const { SubscriptionsService } = await import('../src/modules/payments/subscriptions.service');
    const fake = app.get(PAYMENT_PROVIDER) as any;
    const a = await customerWithCard('plan-lgpd');
    const taken = (await prisma.subscription.findMany({ where: { assignedVehicleId: { not: null } }, select: { assignedVehicleId: true } })).map((x) => x.assignedVehicleId!);
    const v = await prisma.vehicle.findFirstOrThrow({ where: { status: 'free', id: { notIn: taken } } });
    const sub = await http().post('/payments/subscriptions').set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send({ planCode: 'weekly', vehicleId: v.id }).expect(201);
    const providerSubId = (await prisma.paymentProviderRef.findFirstOrThrow({ where: { entityType: 'subscription', entityId: sub.body.id } })).providerId;
    fake.failNextCancelCall = true;
    await http().delete('/lgpd/account').set(bearer(a.token)).expect(202);
    const row = await prisma.subscription.findUniqueOrThrow({ where: { id: sub.body.id } });
    expect(row).toMatchObject({ status: 'canceled', assignedVehicleId: null, gatewayCancelAttempts: 1 });
    expect(row.gatewayCancelPendingAt).not.toBeNull();
    expect(fake.subscriptionStatus(providerSubId)).toBe('active');
    await app.get(SubscriptionsService).retryGatewayCancellations();
    expect(fake.subscriptionStatus(providerSubId)).toBe('canceled');
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.body.id } })).gatewayCancelPendingAt).toBeNull();
  });

  it('cupons na conta: validar, salvar, duplicado e inválido', async () => {
    const { token } = await approvedCustomer(app, prisma, 'coupon');
    const v = await http().post('/me/coupons/validate').set(bearer(token)).send({ code: 'volti20' }).expect(200);
    expect(v.body).toMatchObject({ code: 'VOLTI20', valid: true, discountType: 'percent', percentOff: 20 });
    expect(v).toSatisfyApiSpec();
    const bad = await http().post('/me/coupons/validate').set(bearer(token)).send({ code: 'NAOEXISTE' }).expect(200);
    expect(bad.body).toMatchObject({ valid: false, message: 'Cupom não encontrado.' });
    const added = await http().post('/me/coupons').set(bearer(token)).send({ code: 'VOLTI20' }).expect(201);
    expect(added.body).toMatchObject({ code: 'VOLTI20', status: 'available', source: 'manual', usesRemaining: 3 });
    expect(added).toSatisfyApiSpec();
    expect((await http().post('/me/coupons').set(bearer(token)).send({ code: 'VOLTI20' }).expect(409)).body.code).toBe('conflict');
    expect((await http().post('/me/coupons').set(bearer(token)).send({ code: 'NAOEXISTE' }).expect(422)).body.code).toBe('coupon-invalid');
    const list = await http().get('/me/coupons').set(bearer(token)).expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list).toSatisfyApiSpec();
  });

  it('indicação: código, uso pelo amigo (bônus na hora) e bônus de quem indicou na primeira corrida', async () => {
    const a = await approvedCustomer(app, prisma, 'ref-a');
    const b = await approvedCustomer(app, prisma, 'ref-b');
    const s = await http().get('/me/referral').set(bearer(a.token)).expect(200);
    expect(s.body.code).toMatch(/^[A-Z]{1,5}[2-9A-Z]{4}$/);
    expect(s.body.inviteUrl).toContain(s.body.code);
    expect(s).toSatisfyApiSpec();
    expect((await http().get('/me/referral').set(bearer(a.token)).expect(200)).body.code).toBe(s.body.code);
    expect((await http().post('/me/referral/redeem').set(bearer(a.token)).send({ code: s.body.code }).expect(422)).body.code).toBe('referral-not-eligible');
    expect((await http().post('/me/referral/redeem').set(bearer(b.token)).send({ code: 'ZZZZ9999' }).expect(422)).body.code).toBe('referral-code-invalid');
    const r = await http().post('/me/referral/redeem').set(bearer(b.token)).send({ code: s.body.code.toLowerCase() }).expect(201);
    expect(r.body).toMatchObject({ code: s.body.code, rewardCents: 1000, walletEntry: { type: 'bonus', amountCents: 1000 } });
    expect(r).toSatisfyApiSpec();
    expect((await http().get('/wallet').set(bearer(b.token)).expect(200)).body.balanceCents).toBe(1000);
    expect((await http().post('/me/referral/redeem').set(bearer(b.token)).send({ code: s.body.code }).expect(422)).body.code).toBe('referral-not-eligible');
    const pending = await http().get('/me/referral/rewards').set(bearer(a.token)).expect(200);
    expect(pending.body.items[0]).toMatchObject({ refereeName: 'Cliente', status: 'pending', amountCents: 1000 });
    expect(pending).toSatisfyApiSpec();
    // Fix round 1 (M8): só o encerramento não paga; corrida paga abaixo do mínimo também não.
    await app.get(EventEmitter2).emitAsync(EV.RENTAL_CHANGED, { rentalId: randomUUID(), customerId: b.customerId, vehicleId: randomUUID(), status: 'ended', elapsedSeconds: 600, costCents: 900, ts: new Date().toISOString() });
    const small = await prisma.payment.create({ data: { customerId: b.customerId, kind: 'rental', method: 'card', status: 'paid', amountCents: 300 } });
    await app.get(EventEmitter2).emitAsync(EV.PAYMENT_UPDATED, { paymentId: small.id, status: 'paid' });
    expect((await http().get('/me/referral/rewards').set(bearer(a.token)).expect(200)).body.items[0].status).toBe('pending');
    const paid = await prisma.payment.create({ data: { customerId: b.customerId, kind: 'rental', method: 'card', status: 'paid', amountCents: 900 } });
    await app.get(EventEmitter2).emitAsync(EV.PAYMENT_UPDATED, { paymentId: paid.id, status: 'paid' });
    const granted = await http().get('/me/referral/rewards').set(bearer(a.token)).expect(200);
    expect(granted.body.items[0]).toMatchObject({ status: 'granted' });
    expect((await http().get('/wallet').set(bearer(a.token)).expect(200)).body.balanceCents).toBe(1000);
    expect((await http().get('/me/referral').set(bearer(a.token)).expect(200)).body).toMatchObject({ invitedCount: 1, qualifiedCount: 1, totalEarnedCents: 1000 });
    expect((await http().get('/me/referral').set(bearer(b.token)).expect(200)).body.referredBy).toBe('Cliente');
  });

  it('indicação e cupom: o CPF (HMAC) sobrevive à exclusão da conta e barra o reuso', async () => {
    const cpf = () => String(Date.now()).slice(-9) + String(Math.floor(Math.random() * 90) + 10);
    const a = await approvedCustomer(app, prisma, 'fraud-a');
    const b = await approvedCustomer(app, prisma, 'fraud-b');
    const bCpf = cpf();
    await prisma.customer.update({ where: { id: b.customerId }, data: { cpf: bCpf } });
    const code = (await http().get('/me/referral').set(bearer(a.token)).expect(200)).body.code;
    await http().post('/me/referral/redeem').set(bearer(b.token)).send({ code }).expect(201);
    const ref = await prisma.referral.findUniqueOrThrow({ where: { refereeId: b.customerId } });
    expect(ref.refereeCpfHash).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.refereeCpfHash).not.toContain(bCpf);
    // B usa o cupom de uso único e exclui a conta: o CPF some, o HMAC fica.
    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { code: 'BEMVINDO10' } });
    const vehicle = await freeVehicleInReturnZone(prisma);
    const rental = await prisma.rental.create({ data: { customerId: b.customerId, vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', status: 'ended', priceSnapshot: {}, depositId: randomUUID(), endedAt: new Date() } });
    await prisma.couponRedemption.create({ data: { couponId: coupon.id, customerId: b.customerId, rentalId: rental.id, cpfHash: ref.refereeCpfHash } });
    await http().delete('/lgpd/account').set(bearer(b.token)).expect(202);
    const deleted = await prisma.customer.findUniqueOrThrow({ where: { id: b.customerId } });
    expect(deleted.cpf).toBeNull();
    expect(deleted.cpfHash).toBe(ref.refereeCpfHash);
    // Nova conta com o mesmo CPF: indicação e cupom de uso único recusados.
    const d = await approvedCustomer(app, prisma, 'fraud-d');
    await prisma.customer.update({ where: { id: d.customerId }, data: { cpf: bCpf } });
    const again = await http().post('/me/referral/redeem').set(bearer(d.token)).send({ code }).expect(422);
    expect(again.body).toMatchObject({ code: 'referral-not-eligible', detail: 'Este CPF já usou um código de indicação.' });
    const v = await http().post('/me/coupons/validate').set(bearer(d.token)).send({ code: 'BEMVINDO10' }).expect(200);
    expect(v.body).toMatchObject({ valid: false, message: 'Você já usou este cupom.' });
  });

  it('estações de troca: lista por distância', async () => {
    const { token } = await approvedCustomer(app, prisma, 'stations');
    const res = await http().get('/swap-stations?lat=-23.5667&lng=-46.6935&radiusM=5000').set(bearer(token)).expect(200);
    expect(res.body.items[0].name).toBe('Estação Largo da Batata');
    const d = res.body.items.map((s: { distanceM: number }) => s.distanceM);
    expect([...d].sort((x, y) => x - y)).toEqual(d);
    expect(res).toSatisfyApiSpec();
    expect((await http().get('/swap-stations').set(bearer(campo)).expect(200)).body.items.length).toBeGreaterThanOrEqual(5);
  });

  it('manutenção pelo cliente do plano: exige plano e moto fixa, agenda, lota e cancela', async () => {
    const a = await customerWithCard('maint');
    expect((await http().get('/me/maintenance-slots').set(bearer(a.token)).expect(403)).body.code).toBe('subscription-required');
    const sub = await http().post('/payments/subscriptions').set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send({ planCode: 'weekly' }).expect(201);
    const slots = await http().get('/me/maintenance-slots?days=14').set(bearer(a.token)).expect(200);
    expect(slots).toSatisfyApiSpec();
    const slot = slots.body.items.filter((s: { available: boolean }) => s.available).at(-1);
    expect((await http().post('/me/maintenance-requests').set(bearer(a.token)).send({ slotStartsAt: slot.startsAt, description: 'Freio rangendo' }).expect(422)).body.code).toBe('subscription-vehicle-required');
    const v = await freeVehicleInReturnZone(prisma);
    await http().put(`/payments/subscriptions/${sub.body.id}/vehicle`).set(bearer(a.token)).send({ vehicleId: v.id }).expect(200);
    expect((await http().post('/me/maintenance-requests').set(bearer(a.token)).send({ slotStartsAt: '2026-10-25T13:30:00Z', description: 'x x x' }).expect(409)).body.code).toBe('maintenance-slot-unavailable');
    const created = await http().post('/me/maintenance-requests').set(bearer(a.token)).send({ slotStartsAt: slot.startsAt, description: 'Freio rangendo' }).expect(201);
    expect(created.body).toMatchObject({ vehicleId: v.id, status: 'scheduled', scheduledFor: slot.startsAt });
    expect(created).toSatisfyApiSpec();
    expect((await http().post('/me/maintenance-requests').set(bearer(a.token)).send({ slotStartsAt: slot.startsAt, description: 'outra' }).expect(409)).body.code).toBe('conflict');
    const staff = await http().get(`/maintenance/tasks?vehicleId=${v.id}`).set(bearer(admin)).expect(200);
    expect(staff.body.items[0]).toMatchObject({ source: 'customer', customerId: a.customerId, customerName: 'Cliente E2E' });
    expect(staff).toSatisfyApiSpec();
    const forCampo = await http().get(`/maintenance/tasks?vehicleId=${v.id}`).set(bearer(campo)).expect(200);
    expect(forCampo.body.items[0].customerName).toBe('Cliente');
    const list = await http().get('/me/maintenance-requests').set(bearer(a.token)).expect(200);
    expect(list).toSatisfyApiSpec();
    const canceled = await http().delete(`/me/maintenance-requests/${created.body.id}`).set(bearer(a.token)).expect(200);
    expect(canceled.body.status).toBe('canceled');
    await http().delete(`/payments/subscriptions/${sub.body.id}`).set(bearer(a.token)).expect(200);
    await prisma.subscription.update({ where: { id: sub.body.id }, data: { status: 'canceled' } });
  });

  it('chat: estados sent → delivered → read e unreadCount', async () => {
    const { token } = await approvedCustomer(app, prisma, 'chat');
    const conv = await http().post('/support/conversations').set(bearer(token)).send({ subject: 'Dúvida', message: 'Olá' }).expect(201);
    const id = conv.body.id;
    const mine = await http().get(`/support/conversations/${id}/messages`).set(bearer(token)).expect(200);
    expect(mine.body.items[0].status).toBe('sent'); // o próprio autor buscando não entrega
    const staffRead = await http().get(`/support/conversations/${id}/messages`).set(bearer(suporte)).expect(200);
    expect(staffRead.body.items[0].status).toBe('delivered');
    expect(staffRead).toSatisfyApiSpec();
    const reply = await http().post(`/support/conversations/${id}/messages`).set(bearer(suporte)).send({ body: 'Oi! Como posso ajudar?' }).expect(201);
    expect(reply.body.status).toBe('sent');
    const convs = await http().get('/support/conversations').set(bearer(token)).expect(200);
    expect(convs.body.items.find((c: { id: string }) => c.id === id).unreadCount).toBe(1);
    const read = await http().post(`/support/conversations/${id}/read`).set(bearer(token)).send({ upToMessageId: reply.body.id }).expect(200);
    expect(read.body.unreadCount).toBe(0);
    expect(read).toSatisfyApiSpec();
    const staffView = await http().get(`/support/conversations/${id}/messages`).set(bearer(suporte)).expect(200);
    expect(staffView.body.items.find((m: { id: string }) => m.id === reply.body.id)).toMatchObject({ status: 'read' });
    expect((await http().post(`/support/conversations/${id}/read`).set(bearer(token)).send({ upToMessageId: randomUUID() }).expect(404)).body.code).toBe('not-found');
  });

  it('moto (staff): modelo, endereço, revisão, bateria; tabela "Manutenção" e revisão concluída', async () => {
    const seeded = await prisma.vehicle.findFirstOrThrow({ where: { code: 'VLT-0003' } });
    const v = await http().get(`/vehicles/${seeded.id}`).set(bearer(admin)).expect(200);
    expect(v.body).toMatchObject({ model: 'Volti Cargo', categoryLabel: 'Com baú · entregas', pricePerMinuteCents: 99 });
    expect(v.body.address).toMatch(/São Paulo$/);
    expect(v.body.service.serviceIntervalKm).toBe(800);
    expect(v.body.battery.serial).toBe(seeded.batterySerial);
    expect(v).toSatisfyApiSpec();
    const customer = (await approvedCustomer(app, prisma, 'veh')).token;
    const pub = await http().get(`/vehicles/${seeded.id}`).set(bearer(customer)).expect(200);
    expect(pub.body.service).toBeUndefined();
    expect(pub.body.address).toBeTruthy();

    const table = await http().get('/maintenance/vehicles?limit=100').set(bearer(admin)).expect(200);
    expect(table).toSatisfyApiSpec();
    const order = { overdue: 0, due_soon: 1, ok: 2 } as Record<string, number>;
    const ranks = table.body.items.map((r: { service: { status: string } }) => order[r.service.status]);
    expect([...ranks].sort((x, y) => x - y)).toEqual(ranks);
    const overdue = await http().get('/maintenance/vehicles?status=overdue&limit=5').set(bearer(campo)).expect(200);
    expect(overdue.body.items.every((r: { service: { status: string } }) => r.service.status === 'overdue')).toBe(true);
    const page2 = await http().get(`/maintenance/vehicles?limit=5&cursor=${table.body.items.length > 5 ? Buffer.from('o:5').toString('base64url') : ''}`).set(bearer(admin)).expect(200);
    if (table.body.items.length > 5) expect(page2.body.items[0].vehicleId).toBe(table.body.items[5].vehicleId);

    // "Agendar" + concluir preventiva = revisão (zera km desde a revisão).
    const target = await freeVehicleInReturnZone(prisma);
    await prisma.vehicle.update({ where: { id: target.id }, data: { odometerKm: 1500, usageHours: 120 } });
    const m = await http().post('/maintenance/tasks').set(bearer(admin)).send({ vehicleId: target.id, kind: 'preventive', title: 'Revisão 1.000 km' }).expect(201);
    const row = (await http().get(`/maintenance/vehicles?q=${target.code}`).set(bearer(admin)).expect(200)).body.items[0];
    expect(row).toMatchObject({ openMaintenanceTaskId: m.body.id, service: { status: 'overdue', kmSinceService: 1500 } });
    await http().patch(`/maintenance/tasks/${m.body.id}`).set(bearer(admin)).send({ status: 'done' }).expect(200);
    const after = (await http().get(`/maintenance/vehicles?q=${target.code}`).set(bearer(admin)).expect(200)).body.items[0];
    expect(after.service).toMatchObject({ status: 'ok', kmSinceService: 0, hoursSinceService: 0, nextServiceAtKm: 2500 });
    expect(after.openMaintenanceTaskId).toBeUndefined();
  });

  it('baterias: estoque da van, carregar/descarregar e troca registrando a bateria retirada', async () => {
    const stock = await http().get('/batteries/van-stock').set(bearer(campo)).expect(200);
    expect(stock).toSatisfyApiSpec();
    const serial = `BT-E2E-${Date.now()}`;
    const loaded = await http().post('/batteries/van-stock/load').set(bearer(campo)).send({ serials: [serial] }).expect(200);
    expect(loaded.body.total).toBe(stock.body.total + 1);
    expect(loaded.body.chargedCount).toBe(stock.body.chargedCount + 1);

    const vehicle = await freeVehicleInReturnZone(prisma);
    const oldSerial = `BT-OLD-${Date.now()}`;
    await prisma.battery.create({ data: { serial: oldSerial, chargePct: 12, cycleCount: 412, status: 'in_vehicle', vehicleId: vehicle.id } });
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { batterySerial: oldSerial, batteryPct: 12 } });
    const campoStaff = await prisma.staffUser.findUniqueOrThrow({ where: { email: 'campo@volti.dev' } });
    const task = await http().post('/field-tasks').set(bearer(admin)).send({ type: 'battery_swap', vehicleId: vehicle.id, priority: 'high', assigneeId: campoStaff.id }).expect(201);
    expect(task.body).toMatchObject({ vehicleBatterySerial: oldSerial, vehicleBatteryCycleCount: 412, vehicleStatus: 'free' });
    expect(task.body.vehicleAddress).toMatch(/São Paulo$/);
    expect(task).toSatisfyApiSpec();
    await http().post(`/field-tasks/${task.body.id}/start`).set(bearer(campo)).expect(200);
    const swap = await http().post(`/field-tasks/${task.body.id}/battery-swap`).set(bearer(campo)).send({ removedBatterySerial: oldSerial, installedBatterySerial: serial, recordedAt: new Date().toISOString() }).expect(201);
    expect(swap.body).toMatchObject({ removedBatteryPct: 12, removedBatteryCycleCount: 412, installedBatteryCycleCount: 1 });
    expect(swap).toSatisfyApiSpec();
    const after = await http().get('/batteries/van-stock').set(bearer(campo)).expect(200);
    const serials = after.body.items.map((b: { serial: string }) => b.serial);
    expect(serials).toContain(oldSerial);
    expect(serials).not.toContain(serial);
    const installed = await http().get(`/batteries?q=${serial}`).set(bearer(admin)).expect(200);
    expect(installed.body.items[0]).toMatchObject({ status: 'in_vehicle', vehicleId: vehicle.id, cycleCount: 1 });
    expect(installed).toSatisfyApiSpec();
    expect((await http().post('/batteries/van-stock/load').set(bearer(campo)).send({ serials: [serial] }).expect(409)).body.code).toBe('conflict');
    const station = await prisma.swapStation.findFirstOrThrow({ where: { name: 'Estação Faria Lima' } });
    const unloaded = await http().post('/batteries/van-stock/unload').set(bearer(campo)).send({ serials: [oldSerial], stationId: station.id }).expect(200);
    expect(unloaded.body.items.map((b: { serial: string }) => b.serial)).not.toContain(oldSerial);
    expect((await http().post('/batteries/van-stock/unload').set(bearer(campo)).send({ serials: [oldSerial] }).expect(409)).body.code).toBe('conflict');
    expect((await http().get(`/batteries/van-stock?operatorId=${randomUUID()}`).set(bearer(campo)).expect(403)).body.code).toBe('forbidden');
    await http().get('/batteries?holderId=qualquer').set(bearer(admin)).expect(400);
    // Fix round 1 (M5): carregar da estação tira das disponíveis e mantém a carga conhecida.
    const st = await prisma.swapStation.findFirstOrThrow({ where: { name: 'Estação Largo da Batata' } });
    const stSerial = `BT-ST-${Date.now()}`;
    await prisma.battery.create({ data: { serial: stSerial, chargePct: 97, status: 'in_station', stationId: st.id } });
    const before = st.availableBatteries;
    const fromStation = await http().post('/batteries/van-stock/load').set(bearer(campo)).send({ serials: [stSerial] }).expect(200);
    expect(fromStation.body.items.find((b: { serial: string }) => b.serial === stSerial).chargePct).toBe(97);
    expect((await prisma.swapStation.findUniqueOrThrow({ where: { id: st.id } })).availableBatteries).toBe(before - 1);
  });

  it('catálogo: lista com foto e preço, admin cria/edita; cotação usa o preço do modelo', async () => {
    const { token } = await approvedCustomer(app, prisma, 'catalog');
    const list = await http().get('/vehicle-models').set(bearer(token)).expect(200);
    expect(list.body.items.map((m: { slug: string }) => m.slug).slice(0, 3)).toEqual(['flash', 'urban', 'cargo']);
    expect(list.body.items[0].photoObjectKey).toBeUndefined();
    expect(list).toSatisfyApiSpec();
    await http().post('/vehicle-models').set(bearer(token)).send({ name: 'X', slug: 'x', categoryLabel: 'X', pricePerMinuteCents: 1 }).expect(403);
    const slug = `e2e-${Date.now()}`;
    const created = await http().post('/vehicle-models').set(bearer(admin)).send({ name: `Volti ${slug}`, slug, categoryLabel: 'Teste', pricePerMinuteCents: 50, active: false }).expect(201);
    expect(created).toSatisfyApiSpec();
    await http().post('/vehicle-models').set(bearer(admin)).send({ name: `Volti ${slug}`, slug, categoryLabel: 'Teste', pricePerMinuteCents: 50 }).expect(409);
    const patched = await http().patch(`/vehicle-models/${created.body.id}`).set(bearer(admin)).send({ pricePerMinuteCents: 55 }).expect(200);
    expect(patched.body.pricePerMinuteCents).toBe(55);
    expect(await prisma.auditLog.count({ where: { entityId: created.body.id, action: 'vehicle_model.update' } })).toBeGreaterThanOrEqual(1);
    // Fix round 1 (M11): foto só do prefixo catalog/; desbloqueio próprio pode ser removido.
    await http().patch(`/vehicle-models/${created.body.id}`).set(bearer(admin)).send({ photoObjectKey: 'kyc/x/doc.png' }).expect(400);
    expect((await http().patch(`/vehicle-models/${created.body.id}`).set(bearer(admin)).send({ unlockFeeCents: 100 }).expect(200)).body.unlockFeeCents).toBe(100);
    expect((await http().patch(`/vehicle-models/${created.body.id}`).set(bearer(admin)).send({ unlockFeeCents: null }).expect(200)).body.unlockFeeCents).toBeUndefined();
    await http().patch(`/vehicle-models/${created.body.id}`).set(bearer(admin)).send({ unlockFeeCents: 50 }).expect(200);
    expect((await http().patch(`/vehicle-models/${created.body.id}`).set(bearer(admin)).send({ inheritPlanUnlockFee: true }).expect(200)).body.unlockFeeCents).toBeUndefined();
    const upload = await http().post('/vehicle-models/uploads').set(bearer(admin)).send({ contentType: 'image/png' }).expect(201);
    expect(upload.body.objectKey).toMatch(/^catalog\//);
    expect(upload).toSatisfyApiSpec();

    const cargo = await prisma.vehicle.findFirstOrThrow({ where: { code: 'VLT-0003' } });
    const quote = await http().post('/pricing/quote').set(bearer(token)).send({ planCode: 'minute', coverage: 'basic', estimatedMinutes: 10, vehicleId: cargo.id }).expect(200);
    expect(quote.body.breakdown.lines.find((l: { code: string }) => l.code === 'time')).toMatchObject({ unitCents: 99, amountCents: 990 });
  });
});
