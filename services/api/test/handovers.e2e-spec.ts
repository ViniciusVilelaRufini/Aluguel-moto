import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { StubIotGateway } from '../src/modules/iot/stub-iot-gateway';
import { IOT_GATEWAY } from '../src/ports/iot-gateway.port';
import { loadSpecAs30 } from './contract/openapi-30';
import { approvedCustomer, bootE2eApp, devToken } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);

/**
 * Entrega no galpão (Task 6) contra Postgres + Redis do compose (`PAYMENT_PROVIDER=fake`, `IOT_MODE=stub`): saída com
 * código da reserva, aceite idempotente (um aluguel, uma caução), disputa com ticket e chegada no galpão.
 */
describe('Entrega no galpão (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let depotId: string;
  let campo: string;
  let suporte: string;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    const depot = await prisma.depot.create({
      data: {
        name: `Galpão Entrega E2E ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        address: 'Rua de Teste, 2',
        lat: -23.5654,
        lng: -46.6847,
        openingHours: Array.from({ length: 7 }, (_, weekday) => ({ weekday, opensAt: '00:00', closesAt: '23:59' })),
      },
    });
    depotId = depot.id;
    campo = await devToken(app, { sub: 'dev-campo-handover', email: 'campo-handover@volti.dev', groups: ['campo'], pool: 'staff' });
    suporte = await devToken(app, { sub: 'dev-suporte-handover', email: 'suporte-handover@volti.dev', groups: ['suporte'], pool: 'staff' });
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

  /** Cliente com cartão e reserva de galpão `active` (caução retida); devolve o código de retirada. */
  async function reserved(tag: string) {
    const c = await approvedCustomer(app, prisma, tag);
    await http().post('/payments/cards').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);
    const v = await depotVehicle();
    const res = await http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID())
      .send({ vehicleId: v.id, depotId, pickupMode: 'now', planCode: 'day', coverage: 'basic', depositMethod: 'card' }).expect(201);
    return { ...c, vehicleId: v.id, reservationId: res.body.id as string, pickupCode: res.body.pickupCode as string, depositId: res.body.deposit.id as string };
  }

  /** Run-2: o rastreador (stub) reporta a moto em `point` (padrão: o galpão), online e parada. */
  async function liveAt(vehicleId: string, point = { lat: -23.5654, lng: -46.6847 }) {
    const { thingName } = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { thingName: true } });
    app.get<StubIotGateway>(IOT_GATEWAY).setLiveState({
      thingName, ...point, speedKmh: 0, batteryPct: 50, locked: false, ignition: false, signal: 4, speedLimitKmh: 32,
      stolenMode: false, online: true, lastSeenAt: new Date().toISOString(),
    });
  }

  const checklist = [{ code: 'freios', ok: true }, { code: 'pneus', ok: true }];
  const pickup = (code: string) => http().post('/handovers').set(bearer(campo)).send({ type: 'pickup', depotId, pickupCode: code, checklist, photoKeys: ['handovers/e2e-1.jpg'], batteryPct: 97 });

  it('saída → aceite (duas vezes, chaves diferentes: um aluguel, uma caução) → chegada com item problemático → maintenance', async () => {
    const c = await reserved('ho-flow');
    const created = await pickup(c.pickupCode).expect(201);
    expect(created).toSatisfyApiSpec();
    expect(created.body).toMatchObject({ type: 'pickup', status: 'pending_customer', reservationId: c.reservationId, vehicleId: c.vehicleId, depotId, batteryPct: 97 });
    expect(created.body.photoUrls).toHaveLength(1);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: c.reservationId } })).status).toBe('handover');

    const cur = await http().get('/reservations/current').set(bearer(c.token)).expect(200);
    expect(cur.body.reservation).toMatchObject({ status: 'handover', handoverId: created.body.id });

    const seen = await http().get(`/handovers/${created.body.id}`).set(bearer(c.token)).expect(200);
    expect(seen).toSatisfyApiSpec();

    // Outro cliente: 404 no aceite, na disputa e na leitura.
    const other = await approvedCustomer(app, prisma, 'ho-other');
    expect((await http().post(`/handovers/${created.body.id}/accept`).set(bearer(other.token)).set('Idempotency-Key', randomUUID()).expect(404))).toSatisfyApiSpec();
    await http().post(`/handovers/${created.body.id}/dispute`).set(bearer(other.token)).send({ reason: 'Não é minha' }).expect(404);
    await http().get(`/handovers/${created.body.id}`).set(bearer(other.token)).expect(404);

    // Sem Idempotency-Key → 400.
    await http().post(`/handovers/${created.body.id}/accept`).set(bearer(c.token)).expect(400);

    const accepted = await http().post(`/handovers/${created.body.id}/accept`).set(bearer(c.token)).set('Idempotency-Key', randomUUID()).expect(201);
    expect(accepted).toSatisfyApiSpec();
    expect(accepted.body).toMatchObject({ vehicleId: c.vehicleId, status: 'active', planCode: 'day' });
    const again = await http().post(`/handovers/${created.body.id}/accept`).set(bearer(c.token)).set('Idempotency-Key', randomUUID()).expect(201);
    expect(again.body.id).toBe(accepted.body.id);
    expect(await prisma.rental.count({ where: { customerId: c.customerId } })).toBe(1);
    expect(await prisma.deposit.count({ where: { customerId: c.customerId } })).toBe(1);
    expect((await prisma.rental.findUniqueOrThrow({ where: { id: accepted.body.id } })).depositId).toBe(c.depositId);

    const ho = await prisma.handover.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(ho).toMatchObject({ status: 'accepted', rentalId: accepted.body.id, lastError: null });
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: c.reservationId } })).status).toBe('converted');
    const bike = await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } });
    // A moto guarda o galpão de origem durante o aluguel (rented + bypass da entrega).
    expect(bike).toMatchObject({ status: 'rented', depotId });
    expect(await prisma.vehicleCommand.count({ where: { vehicleId: c.vehicleId, type: 'unlock' } })).toBe(1);

    // Aceite fora de pending: a entrega já aceita converge (mesmo aluguel); disputa agora → 422.
    expect((await http().post(`/handovers/${created.body.id}/dispute`).set(bearer(c.token)).send({ reason: 'Tarde demais' }).expect(422)).body.code).toBe('handover-not-pending');

    // Chegada no galpão com freio ruim → aluguel encerrado, moto em manutenção no galpão, sem recolhimento.
    const ret = { type: 'return_depot', rentalId: accepted.body.id, depotId, checklist: [{ code: 'freios', ok: false, note: 'Freio traseiro fraco' }], photoKeys: [], batteryPct: 41 };
    // Run-2: moto a ~2 km do galpão (posição ao vivo) → 422 vehicle-not-at-depot; nada muda, sem trava pedida, sem auditoria.
    await liveAt(c.vehicleId, { lat: -23.5474, lng: -46.6847 });
    const locksBefore = await prisma.vehicleCommand.count({ where: { vehicleId: c.vehicleId, type: 'lock' } });
    const far = await http().post('/handovers').set(bearer(campo)).send(ret).expect(422);
    expect(far).toSatisfyApiSpec();
    expect(far.body.code).toBe('vehicle-not-at-depot');
    expect((await prisma.rental.findUniqueOrThrow({ where: { id: accepted.body.id } })).status).toBe('active');
    expect(await prisma.handover.count({ where: { rentalId: accepted.body.id, type: 'return_depot' } })).toBe(0);
    expect(await prisma.vehicleCommand.count({ where: { vehicleId: c.vehicleId, type: 'lock' } })).toBe(locksBefore);
    expect(await prisma.auditLog.count({ where: { action: 'rental.return_depot', entityId: accepted.body.id } })).toBe(0);
    await liveAt(c.vehicleId);
    const arrived = await http().post('/handovers').set(bearer(campo)).send(ret).expect(201);
    expect(arrived).toSatisfyApiSpec();
    expect(arrived.body).toMatchObject({ type: 'return_depot', status: 'accepted', rentalId: accepted.body.id });
    expect((await prisma.rental.findUniqueOrThrow({ where: { id: accepted.body.id } })).status).toBe('ended');
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).toMatchObject({ status: 'maintenance', depotId });
    expect(await prisma.fieldTask.count({ where: { vehicleId: c.vehicleId, type: 'collect' } })).toBe(0);
    expect(await prisma.vehicleCommand.count({ where: { vehicleId: c.vehicleId, type: 'lock' } })).toBeGreaterThanOrEqual(1);
    const audits = await prisma.auditLog.findMany({ where: { action: 'rental.return_depot', entityId: accepted.body.id } });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actorType: 'staff', entityType: 'Rental', metadata: { depotId, handoverId: arrived.body.id, distanceM: 0 } });

    // Repetição da fila offline → 200 com a mesma entrega.
    const retry = await http().post('/handovers').set(bearer(campo)).send(ret).expect(200);
    expect(retry.body.id).toBe(arrived.body.id);
    expect(await prisma.handover.count({ where: { rentalId: accepted.body.id, type: 'return_depot' } })).toBe(1);

    // O cliente vê a chegada do próprio aluguel.
    await http().get(`/handovers/${arrived.body.id}`).set(bearer(c.token)).expect(200);
    // return_depot sem depotId → 400.
    await http().post('/handovers').set(bearer(campo)).send({ ...ret, depotId: undefined }).expect(400);
  });

  it('aceites concorrentes com chaves diferentes → um aluguel só (os demais convergem ou recebem 409 para tentar de novo)', async () => {
    const c = await reserved('ho-race');
    const created = await pickup(c.pickupCode).expect(201);
    const results = await Promise.all([0, 1, 2].map(() => http().post(`/handovers/${created.body.id}/accept`).set(bearer(c.token)).set('Idempotency-Key', randomUUID())));
    expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(true);
    const ok = results.filter((r) => r.status === 201);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(new Set(ok.map((r) => r.body.id)).size).toBe(1);
    expect(await prisma.rental.count({ where: { customerId: c.customerId } })).toBe(1);
    expect(await prisma.vehicleCommand.count({ where: { vehicleId: c.vehicleId, type: 'unlock' } })).toBe(1);
    const retry = await http().post(`/handovers/${created.body.id}/accept`).set(bearer(c.token)).set('Idempotency-Key', randomUUID()).expect(201);
    expect(retry.body.id).toBe(ok[0].body.id);
    // Libera o cliente e a moto para os próximos testes.
    await liveAt(c.vehicleId);
    await http().post('/handovers').set(bearer(campo)).send({ type: 'return_depot', rentalId: retry.body.id, depotId, checklist, photoKeys: [], batteryPct: 80 }).expect(201);
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).toMatchObject({ status: 'free', depotId });
  });

  it('disputa: disputed, conversa de suporte aberta, moto reserved e reserva handover; aceite depois → 422; nova saída é possível', async () => {
    const c = await reserved('ho-dispute');
    const created = await pickup(c.pickupCode).expect(201);
    const disputed = await http().post(`/handovers/${created.body.id}/dispute`).set(bearer(c.token)).send({ reason: 'Retrovisor esquerdo quebrado.' }).expect(200);
    expect(disputed).toSatisfyApiSpec();
    expect(disputed.body).toMatchObject({ status: 'disputed', disputeReason: 'Retrovisor esquerdo quebrado.' });
    expect(await prisma.supportConversation.count({ where: { customerId: c.customerId } })).toBe(1);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).status).toBe('reserved');
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: c.reservationId } })).status).toBe('handover');

    const late = await http().post(`/handovers/${created.body.id}/accept`).set(bearer(c.token)).set('Idempotency-Key', randomUUID()).expect(422);
    expect(late.body.code).toBe('handover-not-pending');
    expect(late).toSatisfyApiSpec();
    expect(await prisma.rental.count({ where: { customerId: c.customerId } })).toBe(0);

    // A fila de disputas do suporte.
    const queue = await http().get(`/handovers?status=disputed&depotId=${depotId}`).set(bearer(suporte)).expect(200);
    expect(queue).toSatisfyApiSpec();
    expect(queue.body.items.map((h: { id: string }) => h.id)).toContain(created.body.id);

    // Outra saída para a mesma reserva (disputada libera o índice parcial); uma segunda aberta → 409.
    const redo = await pickup(c.pickupCode).expect(201);
    expect(redo.body.id).not.toBe(created.body.id);
    expect((await pickup(c.pickupCode).expect(409))).toSatisfyApiSpec();

    // Limpeza: não deixa a moto presa.
    await prisma.handover.update({ where: { id: redo.body.id }, data: { status: 'canceled' } });
    await prisma.reservation.update({ where: { id: c.reservationId }, data: { status: 'canceled' } });
  });

  it('fix 1: disputa → cancelamento pela operação → reserva active com pickupCode → nova saída → aceite', async () => {
    const c = await reserved('ho-cancel');
    const created = await pickup(c.pickupCode).expect(201);
    await http().post(`/handovers/${created.body.id}/dispute`).set(bearer(c.token)).send({ reason: 'Pneu dianteiro murcho.' }).expect(200);

    // Cliente não cancela; corpo sem motivo → 400.
    await http().post(`/handovers/${created.body.id}/cancel`).set(bearer(c.token)).send({ reason: 'Quero cancelar' }).expect(403);
    await http().post(`/handovers/${created.body.id}/cancel`).set(bearer(campo)).send({}).expect(400);

    const canceled = await http().post(`/handovers/${created.body.id}/cancel`).set(bearer(campo)).send({ reason: 'Pneu trocado; nova saída.' }).expect(200);
    expect(canceled).toSatisfyApiSpec();
    expect(canceled.body.status).toBe('canceled');
    expect(await prisma.auditLog.count({ where: { action: 'handover.cancel', entityId: created.body.id } })).toBe(1);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: c.reservationId } })).status).toBe('active');
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).status).toBe('reserved');
    expect((await prisma.deposit.findUniqueOrThrow({ where: { id: c.depositId } })).status).toBe('held');

    const cur = await http().get('/reservations/current').set(bearer(c.token)).expect(200);
    expect(cur.body.reservation).toMatchObject({ id: c.reservationId, status: 'active' });
    expect(cur.body.reservation.pickupCode).toBeTruthy();

    // Cancelar de novo → 422.
    expect((await http().post(`/handovers/${created.body.id}/cancel`).set(bearer(campo)).send({ reason: 'De novo' }).expect(422)).body.code).toBe('handover-not-pending');

    const redo = await pickup(cur.body.reservation.pickupCode).expect(201);
    const accepted = await http().post(`/handovers/${redo.body.id}/accept`).set(bearer(c.token)).set('Idempotency-Key', randomUUID()).expect(201);
    expect(accepted.body).toMatchObject({ vehicleId: c.vehicleId, status: 'active' });
    // Já aceita → cancelar responde 409.
    await http().post(`/handovers/${redo.body.id}/cancel`).set(bearer(campo)).send({ reason: 'Tarde demais' }).expect(409);
    await liveAt(c.vehicleId);
    await http().post('/handovers').set(bearer(campo)).send({ type: 'return_depot', rentalId: accepted.body.id, depotId, checklist, photoKeys: [], batteryPct: 70 }).expect(201);
  });

  it('fix 1: cancelamento depois do prazo → reserva expired, caução liberada e moto free no galpão', async () => {
    const c = await reserved('ho-cancel-late');
    const created = await pickup(c.pickupCode).expect(201);
    await prisma.reservation.update({ where: { id: c.reservationId }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    await http().post(`/handovers/${created.body.id}/cancel`).set(bearer(campo)).send({ reason: 'Cliente não respondeu.' }).expect(200);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: c.reservationId } })).status).toBe('expired');
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).toMatchObject({ status: 'free', depotId });
    let dep = await prisma.deposit.findUniqueOrThrow({ where: { id: c.depositId } });
    for (let i = 0; i < 100 && dep.status !== 'released'; i++) {
      await new Promise((r) => setTimeout(r, 50));
      dep = await prisma.deposit.findUniqueOrThrow({ where: { id: c.depositId } });
    }
    expect(dep.status).toBe('released');
    expect((await http().get('/reservations/current').set(bearer(c.token)).expect(200)).body).toEqual({});
  });

  it('caução da reserva não retida → 422 deposit-not-held, entrega pendente e moto não destrava', async () => {
    const c = await reserved('ho-deposit');
    const created = await pickup(c.pickupCode).expect(201);
    await prisma.deposit.update({ where: { id: c.depositId }, data: { status: 'released' } });
    const res = await http().post(`/handovers/${created.body.id}/accept`).set(bearer(c.token)).set('Idempotency-Key', randomUUID()).expect(422);
    expect(res.body.code).toBe('deposit-not-held');
    expect((await prisma.handover.findUniqueOrThrow({ where: { id: created.body.id } })).status).toBe('pending_customer');
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).status).toBe('reserved');
    expect(await prisma.vehicleCommand.count({ where: { vehicleId: c.vehicleId, type: 'unlock' } })).toBe(0);
    await prisma.handover.update({ where: { id: created.body.id }, data: { status: 'canceled' } });
    await prisma.reservation.update({ where: { id: c.reservationId }, data: { status: 'canceled' } });
  });

  it('código adulterado → 404; upload de foto com prefixo handovers/; cliente não cria entrega (403)', async () => {
    const c = await reserved('ho-tamper');
    const tampered = c.pickupCode.slice(0, -3) + (c.pickupCode.endsWith('AAA') ? 'BBB' : 'AAA');
    expect((await pickup(tampered).expect(404))).toSatisfyApiSpec();
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: c.reservationId } })).status).toBe('active');

    const up = await http().post('/handovers/uploads').set(bearer(campo)).send({ contentType: 'image/jpeg' }).expect(201);
    expect(up).toSatisfyApiSpec();
    expect(up.body.objectKey).toMatch(/^handovers\/[0-9a-f-]+\.jpg$/);

    await http().post('/handovers').set(bearer(c.token)).send({ type: 'pickup', pickupCode: c.pickupCode, checklist, photoKeys: [], batteryPct: 90 }).expect(403);
    await http().post('/handovers').set(bearer(campo)).send({ type: 'pickup', pickupCode: c.pickupCode, checklist, photoKeys: ['outro/x.jpg'], batteryPct: 90 }).expect(400);
    await http().delete(`/reservations/${c.reservationId}`).set(bearer(c.token)).expect(204);
  });
});
