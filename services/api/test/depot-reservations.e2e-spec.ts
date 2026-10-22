import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { FakePaymentProvider } from '../src/modules/payments/provider/fake-payment-provider';
import { PAYMENT_PROVIDER } from '../src/modules/payments/provider/payment-provider';
import { RentalBillingService } from '../src/modules/payments/rental-billing.service';
import { verifyPickupCode } from '../src/modules/reservations/pickup-code';
import { ReservationsService } from '../src/modules/reservations/reservations.service';
import { loadSpecAs30 } from './contract/openapi-30';
import { approvedCustomer, bootE2eApp } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);

/**
 * Reserva de retirada no galpão (Task 5) contra Postgres + Redis do compose, com `PAYMENT_PROVIDER=fake`: caução,
 * código de retirada, corrida pela mesma moto, cancelamento e a regra "moto do galpão não sai pela rua".
 */
describe('Reserva de galpão (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let depotId: string;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function until<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 5000): Promise<T> {
    const end = Date.now() + ms;
    let v = await fn();
    while (!ok(v) && Date.now() < end) {
      await new Promise((r) => setTimeout(r, 50));
      v = await fn();
    }
    return v;
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    // Galpão próprio do teste, aberto o dia todo (o resultado não depende da hora em que o teste roda).
    const depot = await prisma.depot.create({
      data: {
        name: `Galpão E2E ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        address: 'Rua de Teste, 1',
        lat: -23.5654,
        lng: -46.6847,
        openingHours: Array.from({ length: 7 }, (_, weekday) => ({ weekday, opensAt: '00:00', closesAt: '23:59' })),
      },
    });
    depotId = depot.id;
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  async function depotVehicle(): Promise<{ id: string }> {
    const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.toUpperCase();
    return prisma.vehicle.create({
      data: { code: `E2E-${tag}`, thingName: `e2e-thing-${tag.toLowerCase()}`, model: 'Volti S1', lat: -23.5654, lng: -46.6847, batteryPct: 95, status: 'free', locked: true, depotId },
      select: { id: true },
    });
  }

  async function customerWithCard(tag: string) {
    const c = await approvedCustomer(app, prisma, tag);
    await http().post('/payments/cards').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);
    return c;
  }

  const body = (vehicleId: string, over: Record<string, unknown> = {}) => ({
    vehicleId, depotId, pickupMode: 'now', planCode: 'day', coverage: 'basic', depositMethod: 'card', ...over,
  });

  it('sem Idempotency-Key ou sem os campos do galpão → 400', async () => {
    const c = await customerWithCard('dr-400');
    const v = await depotVehicle();
    const noKey = await http().post('/reservations').set(bearer(c.token)).send(body(v.id)).expect(400);
    expect(noKey.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'Idempotency-Key' })]));
    expect(noKey).toSatisfyApiSpec();
    const missing = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ vehicleId: v.id, depotId }).expect(400);
    expect(missing.body.errors.map((e: { field: string }) => e.field)).toEqual(expect.arrayContaining(['pickupMode', 'planCode', 'coverage', 'depositMethod']));
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('free');
  });

  it('agendada no cartão: 201 com pickupCode e caução; current traz o código; repetição devolve a mesma resposta; cancelar libera tudo', async () => {
    const c = await customerWithCard('dr-card');
    const v = await depotVehicle();
    const key = randomUUID();
    const pickupAt = new Date(Math.ceil((Date.now() + 2 * 3600_000) / 60_000) * 60_000).toISOString();
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', key).send(body(v.id, { pickupMode: 'scheduled', pickupAt })).expect(201);
    expect(res).toSatisfyApiSpec();
    expect(res.body).toMatchObject({ status: 'active', depotId, pickupMode: 'scheduled', pickupAt, planCode: 'day', coverage: 'basic', depositMethod: 'card' });
    expect(res.body.expiresAt).toBe(new Date(new Date(pickupAt).getTime() + 30 * 60_000).toISOString());
    expect(res.body.deposit).toMatchObject({ status: 'held', method: 'card' });
    expect(verifyPickupCode(res.body.pickupCode, new Date())).toEqual({ reservationId: res.body.id });
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('reserved');

    const replay = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', key).send(body(v.id, { pickupMode: 'scheduled', pickupAt })).expect(201);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body.id).toBe(res.body.id);
    expect(await prisma.reservation.count({ where: { customerId: c.customerId } })).toBe(1);

    const cur = await http().get('/reservations/current').set(bearer(c.token)).expect(200);
    expect(cur).toSatisfyApiSpec();
    expect(cur.body.reservation).toMatchObject({ id: res.body.id, status: 'active', pickupCode: res.body.pickupCode });

    // Segunda reserva do mesmo cliente → 409 reservation-open.
    const other = await depotVehicle();
    const open = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(other.id)).expect(409);
    expect(open.body.code).toBe('reservation-open');

    await http().delete(`/reservations/${res.body.id}`).set(bearer(c.token)).expect(204);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: res.body.id } })).status).toBe('canceled');
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('free');
    const dep = await until(() => prisma.deposit.findUniqueOrThrow({ where: { id: res.body.deposit.id } }), (d) => d.status === 'released');
    expect(dep.status).toBe('released');
    expect((await http().get('/reservations/current').set(bearer(c.token)).expect(200)).body).toEqual({});
  });

  it('reserva em handover: current traz a reserva sem pickupCode e cancelar → 409 reservation-in-handover', async () => {
    const c = await customerWithCard('dr-handover');
    const v = await depotVehicle();
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id)).expect(201);
    await prisma.reservation.update({ where: { id: res.body.id }, data: { status: 'handover' } });
    const cur = await http().get('/reservations/current').set(bearer(c.token)).expect(200);
    expect(cur.body.reservation).toMatchObject({ id: res.body.id, status: 'handover' });
    expect(cur.body.reservation.pickupCode).toBeUndefined();
    const del = await http().delete(`/reservations/${res.body.id}`).set(bearer(c.token)).expect(409);
    expect(del.body.code).toBe('reservation-in-handover');
    expect(del).toSatisfyApiSpec();
    // Limpa para não deixar a moto presa.
    await prisma.reservation.update({ where: { id: res.body.id }, data: { status: 'canceled' } });
  });

  it('Pix: 201 com o QR da caução e reserva active', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-pix');
    const v = await depotVehicle();
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id, { depositMethod: 'pix' })).expect(201);
    expect(res).toSatisfyApiSpec();
    expect(res.body.status).toBe('active');
    expect(res.body.deposit).toMatchObject({ method: 'pix', status: 'awaiting_pix' });
    expect(res.body.deposit.pix.copyPaste).toBeTruthy();
    expect(res.body.deposit.pix.qrCodeBase64).toBeTruthy();
  });

  it('fix 1: Pix não pago (vencido no gateway) → reserva expired, moto free e current vazio', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-pix-exp');
    const v = await depotVehicle();
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id, { depositMethod: 'pix' })).expect(201);
    const dp = await prisma.payment.findFirstOrThrow({ where: { depositId: res.body.deposit.id, kind: 'deposit' } });
    const fake = app.get<FakePaymentProvider>(PAYMENT_PROVIDER);
    fake.simulatePixExpired(dp.providerPaymentId!);
    await app.get(RentalBillingService).applyProviderPayment(await fake.getPayment(dp.providerPaymentId!));
    expect((await prisma.deposit.findUniqueOrThrow({ where: { id: res.body.deposit.id } })).status).toBe('failed');
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: res.body.id } })).status).toBe('expired');
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('free');
    expect((await http().get('/reservations/current').set(bearer(c.token)).expect(200)).body).toEqual({});
  });

  it('fix 1: varredura expira reserva de galpão com Pix vencido sem webhook', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-pix-sweep');
    const v = await depotVehicle();
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id, { depositMethod: 'pix' })).expect(201);
    const d = await prisma.deposit.findUniqueOrThrow({ where: { id: res.body.deposit.id } });
    await prisma.deposit.update({ where: { id: d.id }, data: { pix: { ...(d.pix as object), expiresAt: new Date(Date.now() - 60_000).toISOString() } } });
    await app.get(ReservationsService).sweep();
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: res.body.id } })).status).toBe('expired');
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('free');
    expect((await http().get('/reservations/current').set(bearer(c.token)).expect(200)).body).toEqual({});
  });

  it('corrida: dois clientes pela mesma moto → um 201 e um 409, e a caução do perdedor é liberada', async () => {
    const [a, b] = await Promise.all([customerWithCard('dr-race-a'), customerWithCard('dr-race-b')]);
    const v = await depotVehicle();
    const results = await Promise.all(
      [a, b].map((c) => http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id))),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(loser.body.code).toBe('vehicle-unavailable');
    const loserId = results[0].status === 409 ? a.customerId : b.customerId;
    expect(await prisma.reservation.count({ where: { vehicleId: v.id, status: 'active' } })).toBe(1);
    // A perdedora pode ter perdido antes da caução (moto já reservada) ou depois (transição condicional): nunca fica retida.
    const deposits = await until(
      () => prisma.deposit.findMany({ where: { customerId: loserId } }),
      (ds) => ds.every((d) => d.status === 'released' || d.status === 'failed'),
    );
    for (const d of deposits) expect(['released', 'failed']).toContain(d.status);
  });

  it('moto fixa de outro plano vigente → 409 vehicle-unavailable', async () => {
    const owner = await approvedCustomer(app, prisma, 'dr-fixed-owner');
    const c = await customerWithCard('dr-fixed');
    const v = await depotVehicle();
    await prisma.subscription.create({
      data: {
        customerId: owner.customerId, planCode: 'weekly', status: 'active', priceCents: 24900, assignedVehicleId: v.id,
        currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 7 * 24 * 3600_000),
      },
    });
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id)).expect(409);
    expect(res.body.code).toBe('vehicle-unavailable');
    expect(await prisma.deposit.count({ where: { customerId: c.customerId } })).toBe(0);
  });

  it('fluxo de rua (sem depotId): moto do galpão livre ou separada por reserva de galpão → 409 vehicle-unavailable', async () => {
    const c = await customerWithCard('dr-street');
    const v = await depotVehicle();
    const free = await http().post('/reservations').set(bearer(c.token)).send({ vehicleId: v.id }).expect(409);
    expect(free.body.code).toBe('vehicle-unavailable');
    expect(free).toSatisfyApiSpec();

    const holder = await customerWithCard('dr-street-holder');
    const reserved = await depotVehicle();
    await http().post('/reservations').set(bearer(holder.token)).set('Idempotency-Key', randomUUID()).send(body(reserved.id)).expect(201);
    const taken = await http().post('/reservations').set(bearer(c.token)).send({ vehicleId: reserved.id }).expect(409);
    expect(taken.body.code).toBe('vehicle-unavailable');
    expect(await prisma.reservation.count({ where: { customerId: c.customerId } })).toBe(0);
  });
});
