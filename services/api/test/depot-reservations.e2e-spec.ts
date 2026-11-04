import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { verifyPickupCode } from '../src/modules/reservations/pickup-code';
import { ReservationsService } from '../src/modules/reservations/reservations.service';
import { loadSpecAs30 } from './contract/openapi-30';
import { approvedCustomer, bootE2eApp } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);

/**
 * Pré-reserva de retirada no galpão contra Postgres + Redis do compose, com `PAYMENT_PROVIDER=fake`: sem caução e sem
 * plano (tudo é acertado no balcão; os campos antigos dos apps beta12 são aceitos e ignorados), código de retirada,
 * corrida pela mesma moto, cancelamento, expiração e a regra "moto do galpão não sai pela rua".
 */
describe('Pré-reserva de galpão (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let depotId: string;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

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

  /** Corpo novo: só `vehicleId`, `depotId` e `pickupMode` (e `pickupAt` no agendamento). */
  const body = (vehicleId: string, over: Record<string, unknown> = {}) => ({ vehicleId, depotId, pickupMode: 'now', ...over });
  /** Corpo dos apps beta12: plano, seguro, caução, cartão e cupom — validados e ignorados. */
  const legacyBody = (vehicleId: string, over: Record<string, unknown> = {}) =>
    body(vehicleId, { planCode: 'day', coverage: 'basic', depositMethod: 'card', couponCode: 'NAOEXISTE', ...over });

  it('sem Idempotency-Key ou sem pickupMode → 400; campo antigo inválido → 400', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-400');
    const v = await depotVehicle();
    const noKey = await http().post('/reservations').set(bearer(c.token)).send(body(v.id)).expect(400);
    expect(noKey.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'Idempotency-Key' })]));
    expect(noKey).toSatisfyApiSpec();
    const missing = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ vehicleId: v.id, depotId }).expect(400);
    expect(missing.body.errors.map((e: { field: string }) => e.field)).toEqual(['pickupMode']);
    // Os campos antigos continuam validados (formato), mesmo ignorados.
    await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(legacyBody(v.id, { depositMethod: 'boleto' })).expect(400);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('free');
    expect(await prisma.reservation.count({ where: { customerId: c.customerId } })).toBe(0);
  });

  it('agendada sem cartão: 201 com pickupCode e sem caução; current traz o código; repetição devolve a mesma resposta; cancelar libera a moto', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-sched');
    const v = await depotVehicle();
    const key = randomUUID();
    const pickupAt = new Date(Math.ceil((Date.now() + 2 * 3600_000) / 60_000) * 60_000).toISOString();
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', key).send(body(v.id, { pickupMode: 'scheduled', pickupAt })).expect(201);
    expect(res).toSatisfyApiSpec();
    expect(res.body).toMatchObject({ status: 'active', depotId, pickupMode: 'scheduled', pickupAt });
    expect(res.body.expiresAt).toBe(new Date(new Date(pickupAt).getTime() + 30 * 60_000).toISOString());
    for (const f of ['deposit', 'planCode', 'coverage', 'depositMethod']) expect(res.body).not.toHaveProperty(f);
    expect(verifyPickupCode(res.body.pickupCode, new Date())).toEqual({ reservationId: res.body.id });
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('reserved');
    expect(await prisma.reservation.findUniqueOrThrow({ where: { id: res.body.id } })).toMatchObject({ depositId: null, planCode: null, coverage: null, depositMethod: null });
    expect(await prisma.deposit.count({ where: { customerId: c.customerId } })).toBe(0);
    expect(await prisma.payment.count({ where: { customerId: c.customerId } })).toBe(0);

    const replay = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', key).send(body(v.id, { pickupMode: 'scheduled', pickupAt })).expect(201);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body.id).toBe(res.body.id);
    expect(await prisma.reservation.count({ where: { customerId: c.customerId } })).toBe(1);

    const cur = await http().get('/reservations/current').set(bearer(c.token)).expect(200);
    expect(cur).toSatisfyApiSpec();
    expect(cur.body.reservation).toMatchObject({ id: res.body.id, status: 'active', pickupCode: res.body.pickupCode });
    expect(cur.body.reservation).not.toHaveProperty('deposit');

    // Segunda reserva do mesmo cliente → 409 reservation-open.
    const other = await depotVehicle();
    const open = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(other.id)).expect(409);
    expect(open.body.code).toBe('reservation-open');

    await http().delete(`/reservations/${res.body.id}`).set(bearer(c.token)).expect(204);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: res.body.id } })).status).toBe('canceled');
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('free');
    expect((await http().get('/reservations/current').set(bearer(c.token)).expect(200)).body).toEqual({});
  });

  it('campos antigos (plano, seguro, caução Pix, cupom) aceitos e ignorados: 201 sem caução e nada cobrado', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-legacy');
    const v = await depotVehicle();
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(legacyBody(v.id, { depositMethod: 'pix' })).expect(201);
    expect(res).toSatisfyApiSpec();
    expect(res.body).toMatchObject({ status: 'active', depotId, pickupMode: 'now' });
    for (const f of ['deposit', 'planCode', 'coverage', 'depositMethod']) expect(res.body).not.toHaveProperty(f);
    expect(res.body.pickupCode).toBeTruthy();
    expect(await prisma.reservation.findUniqueOrThrow({ where: { id: res.body.id } })).toMatchObject({ depositId: null, planCode: null, coverage: null, depositMethod: null, cardId: null, couponCode: null });
    expect(await prisma.deposit.count({ where: { customerId: c.customerId } })).toBe(0);
    expect(await prisma.payment.count({ where: { customerId: c.customerId } })).toBe(0);
    await http().delete(`/reservations/${res.body.id}`).set(bearer(c.token)).expect(204);
  });

  it('sem consentimento de localização → 403 location-consent-required; débito do balcão em aberto → 409 payment-pending com o texto do galpão', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-gates');
    const v = await depotVehicle();
    await prisma.customer.update({ where: { id: c.customerId }, data: { locationConsent: false } });
    const noConsent = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id)).expect(403);
    expect(noConsent).toSatisfyApiSpec();
    expect(noConsent.body.code).toBe('location-consent-required');
    await prisma.customer.update({ where: { id: c.customerId }, data: { locationConsent: true } });

    // Débito de balcão `pending` (excedente a acertar no galpão) → nova pré-reserva recusada.
    const debt = await prisma.payment.create({
      data: { kind: 'rental', status: 'pending', method: 'cash', amountCents: 6000, customerId: c.customerId, idempotencyKey: `e2e-counter-debt:${randomUUID()}` },
    });
    const pending = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id)).expect(409);
    expect(pending).toSatisfyApiSpec();
    expect(pending.body).toMatchObject({ code: 'payment-pending', detail: 'Há um valor a acertar no galpão. Acerte no balcão para pré-reservar de novo.' });
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('free');
    // Quitado (debtSettledAt) → pode pré-reservar de novo.
    await prisma.payment.update({ where: { id: debt.id }, data: { status: 'paid', debtSettledAt: new Date() } });
    const ok = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id)).expect(201);
    await http().delete(`/reservations/${ok.body.id}`).set(bearer(c.token)).expect(204);
  });

  it('reserva em handover: current traz a reserva sem pickupCode e cancelar → 409 reservation-in-handover', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-handover');
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

  it('varredura expira a pré-reserva vencida: expired, moto free e current vazio', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-sweep');
    const v = await depotVehicle();
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id)).expect(201);
    await prisma.reservation.update({ where: { id: res.body.id }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    await app.get(ReservationsService).sweep();
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: res.body.id } })).status).toBe('expired');
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).toMatchObject({ status: 'free', depotId });
    expect((await http().get('/reservations/current').set(bearer(c.token)).expect(200)).body).toEqual({});
  });

  it('corrida: dois clientes pela mesma moto → um 201 e um 409, sem caução para ninguém', async () => {
    const [a, b] = await Promise.all([approvedCustomer(app, prisma, 'dr-race-a'), approvedCustomer(app, prisma, 'dr-race-b')]);
    const v = await depotVehicle();
    const results = await Promise.all([a, b].map((c) => http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id))));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(loser.body.code).toBe('vehicle-unavailable');
    expect(loser).toSatisfyApiSpec();
    expect(await prisma.reservation.count({ where: { vehicleId: v.id, status: 'active' } })).toBe(1);
    expect(await prisma.deposit.count({ where: { customerId: { in: [a.customerId, b.customerId] } } })).toBe(0);
  });

  it('moto fixa de outro plano vigente → 409 vehicle-unavailable', async () => {
    const owner = await approvedCustomer(app, prisma, 'dr-fixed-owner');
    const c = await approvedCustomer(app, prisma, 'dr-fixed');
    const v = await depotVehicle();
    await prisma.subscription.create({
      data: {
        customerId: owner.customerId, planCode: 'weekly', status: 'active', priceCents: 24900, assignedVehicleId: v.id,
        currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 7 * 24 * 3600_000),
      },
    });
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send(body(v.id)).expect(409);
    expect(res.body.code).toBe('vehicle-unavailable');
    expect(await prisma.reservation.count({ where: { customerId: c.customerId } })).toBe(0);
  });

  it('fluxo de rua (sem depotId): moto do galpão livre ou separada por pré-reserva → 409 vehicle-unavailable', async () => {
    const c = await approvedCustomer(app, prisma, 'dr-street');
    const v = await depotVehicle();
    const free = await http().post('/reservations').set(bearer(c.token)).send({ vehicleId: v.id }).expect(409);
    expect(free.body.code).toBe('vehicle-unavailable');
    expect(free).toSatisfyApiSpec();

    const holder = await approvedCustomer(app, prisma, 'dr-street-holder');
    const reserved = await depotVehicle();
    await http().post('/reservations').set(bearer(holder.token)).set('Idempotency-Key', randomUUID()).send(body(reserved.id)).expect(201);
    const taken = await http().post('/reservations').set(bearer(c.token)).send({ vehicleId: reserved.id }).expect(409);
    expect(taken.body.code).toBe('vehicle-unavailable');
    expect(await prisma.reservation.count({ where: { customerId: c.customerId } })).toBe(0);
  });
});
