import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { ProblemException } from '../src/common/problem';
import { StubIotGateway } from '../src/modules/iot/stub-iot-gateway';
import { RentalStartService } from '../src/modules/rentals/rental-start.service';
import { ReservationsService } from '../src/modules/reservations/reservations.service';
import { IOT_GATEWAY } from '../src/ports/iot-gateway.port';
import { loadSpecAs30 } from './contract/openapi-30';
import { approvedCustomer, bootE2eApp, devToken } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);

/** Centro da zona de devolução "MASP (Av. Paulista)" do seed (mesmo ponto de `freeVehicleInReturnZone`). */
const GREEN_POINT = { lat: -23.5614, lng: -46.6559 };
const ALL_DAY = Array.from({ length: 7 }, (_, weekday) => ({ weekday, opensAt: '00:00', closesAt: '23:59' }));
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const COUNTER_DEBT_DETAIL = 'Há um valor a acertar no galpão. Acerte no balcão para pré-reservar de novo.';

type WsEvent = { name: string; payload: any };
interface WsClient {
  socket: Socket;
  events: WsEvent[];
}

/**
 * Ciclo completo do galpão (pré-reserva/balcão) pelos endpoints HTTP e eventos WS (`/realtime`), contra Postgres + Redis
 * do compose (`PAYMENT_PROVIDER=fake`, `IOT_MODE=stub` forçados no setup). Cada cenário cria os próprios cliente, moto e
 * reserva. Nada passa pelo gateway: a pré-reserva não tem caução; o aluguel começa no balcão (`counter-checkout`, plano
 * pré-pago + caução de balcão); o excedente vira débito a acertar no galpão (`counter-balance` → `counter-settle`) e a
 * caução volta pelo `counter-refund`.
 */
describe('Galpão: ciclo completo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let baseUrl: string;
  let depotId: string;
  let depotPoint: { lat: number; lng: number };
  let admin: string;
  let campo: string;
  let operacao: string;
  const sockets: Socket[] = [];
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

  async function connect(token: string): Promise<WsClient> {
    const socket = io(`${baseUrl}/realtime`, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(socket);
    const events: WsEvent[] = [];
    socket.onAny((name: string, payload: unknown) => events.push({ name, payload }));
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', (err) => reject(err));
    });
    // A entrada nas salas acontece no middleware de autenticação, antes do `connect`.
    return { socket, events };
  }

  async function waitEvent(ws: WsClient, name: string, match: (p: any) => boolean, ms = 5000): Promise<any> {
    const found = await until(async () => ws.events.find((e) => e.name === name && match(e.payload)), (e) => !!e, ms);
    if (!found) throw new Error(`Evento ${name} não recebido. Recebidos: ${JSON.stringify(ws.events.map((e) => e.name))}`);
    return found.payload;
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    admin = await devToken(app, { sub: 'dev-admin-galpao-e2e', email: 'admin-galpao-e2e@volti.dev', groups: ['admin'], pool: 'staff' });
    campo = await devToken(app, { sub: 'dev-campo-galpao-e2e', email: 'campo-galpao-e2e@volti.dev', groups: ['campo'], pool: 'staff' });
    operacao = await devToken(app, { sub: 'dev-operacao-galpao-e2e', email: 'operacao-galpao-e2e@volti.dev', groups: ['operacao'], pool: 'staff' });
    // Galpão do teste criado pela API, aberto o dia todo (o resultado não depende da hora em que o teste roda).
    depotPoint = { lat: -23.5654 + Math.random() / 1000, lng: -46.6847 + Math.random() / 1000 };
    const depot = await http().post('/depots').set(bearer(admin))
      .send({ name: `Galpão Ciclo E2E ${Date.now()}-${Math.floor(Math.random() * 1e6)}`, address: 'Rua do Ciclo, 8 · Pinheiros, São Paulo', district: 'Pinheiros', ...depotPoint, openingHours: ALL_DAY })
      .expect(201);
    depotId = depot.body.id;
  });
  afterAll(async () => {
    for (const s of sockets) s.disconnect();
    await prisma?.$disconnect();
    await app?.close();
  });

  async function depotVehicle(): Promise<{ id: string; code: string }> {
    const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.toUpperCase();
    return prisma.vehicle.create({
      data: { code: `E2E-${tag}`, thingName: `e2e-thing-${tag.toLowerCase()}`, model: 'Volti S1', ...depotPoint, batteryPct: 95, status: 'free', locked: true, depotId },
      select: { id: true, code: true },
    });
  }

  const reservationBody = (vehicleId: string, over: Record<string, unknown> = {}) => ({ vehicleId, depotId, pickupMode: 'now', ...over });
  const preReserve = (token: string, vehicleId: string, over: Record<string, unknown> = {}) =>
    http().post('/reservations').set(bearer(token)).set('Idempotency-Key', randomUUID()).send(reservationBody(vehicleId, over));

  /** Cliente (sem cartão) com pré-reserva "retirar agora" (sem caução). */
  async function reserved(tag: string) {
    const c = await approvedCustomer(app, prisma, tag);
    const v = await depotVehicle();
    const res = await preReserve(c.token, v.id).expect(201);
    return { ...c, vehicleId: v.id, reservationId: res.body.id as string, pickupCode: res.body.pickupCode as string };
  }

  type ChecklistItem = { code: string; ok: boolean; note?: string };
  const okChecklist: ChecklistItem[] = [{ code: 'freios', ok: true }, { code: 'pneus', ok: true }, { code: 'luzes', ok: true }];
  const pickup = (code: string) =>
    http().post('/handovers').set(bearer(campo)).send({ type: 'pickup', depotId, pickupCode: code, checklist: okChecklist, photoKeys: ['handovers/e2e-ciclo.jpg'], batteryPct: 96 });
  const accept = (token: string, handoverId: string) => http().post(`/handovers/${handoverId}/accept`).set(bearer(token)).set('Idempotency-Key', randomUUID());

  /** Contrato e pagamento no balcão: cotação → foto do contrato → checkout com o valor cotado. */
  async function counterBody(handoverId: string, opts: { planCode?: string; quantity?: number; deposit?: { method: string; amountCents: number } } = {}) {
    const planCode = opts.planCode ?? 'day';
    const quantity = opts.quantity ?? 1;
    const q = await http().get(`/handovers/${handoverId}/counter-quote`).query({ planCode, coverage: 'basic', quantity }).set(bearer(campo)).expect(200);
    const up = await http().post('/handovers/uploads').set(bearer(campo)).send({ contentType: 'image/jpeg', purpose: 'contract' }).expect(201);
    return {
      quote: q.body as { totalCents: number; excessDayCents: number; periodDays: number },
      body: {
        planCode, quantity, coverage: 'basic', contractPhotoKeys: [up.body.objectKey as string],
        payment: { method: 'counter_pix', amountCents: q.body.totalCents as number, reference: 'E2E-PIX-1' },
        ...(opts.deposit ? { deposit: opts.deposit } : {}),
      },
    };
  }
  const checkout = (handoverId: string, body: object, key = randomUUID()) =>
    http().post(`/handovers/${handoverId}/counter-checkout`).set(bearer(campo)).set('Idempotency-Key', key).send(body);

  /** Run-2: a chegada só encerra com a posição ao vivo da moto no galpão — o rastreador (stub) reporta o galpão. */
  async function atDepot(rentalId: string) {
    const { vehicle } = await prisma.rental.findUniqueOrThrow({ where: { id: rentalId }, select: { vehicle: { select: { thingName: true } } } });
    app.get<StubIotGateway>(IOT_GATEWAY).setLiveState({
      thingName: vehicle.thingName, ...depotPoint, speedKmh: 0, batteryPct: 55, locked: false, ignition: false, signal: 4, speedLimitKmh: 32,
      stolenMode: false, online: true, lastSeenAt: new Date().toISOString(),
    });
  }
  const returnDepot = async (rentalId: string, checklist: ChecklistItem[] = okChecklist, status: 200 | 201 = 201) => {
    await atDepot(rentalId);
    return http().post('/handovers').set(bearer(campo)).send({ type: 'return_depot', rentalId, depotId, checklist, photoKeys: [], batteryPct: 55 }).expect(status);
  };

  /** Pré-reserva → saída → checkout no balcão: devolve o aluguel ativo. */
  async function rentedFromDepot(tag: string) {
    const c = await reserved(tag);
    const ho = await pickup(c.pickupCode).expect(201);
    const { body } = await counterBody(ho.body.id);
    const rental = await checkout(ho.body.id, body).expect(201);
    return { ...c, handoverId: ho.body.id as string, rentalId: rental.body.id as string };
  }

  const rentalPayments = (rentalId: string) => prisma.payment.findMany({ where: { rentalId, kind: 'rental' }, orderBy: { createdAt: 'asc' } });

  it('1. pré-reserva → saída → handover.pending → checkout → handover.updated/rental.updated → fim com excedente → counter-balance → counter-settle → counter-refund', async () => {
    const c = await approvedCustomer(app, prisma, 'ciclo-1');
    const v = await depotVehicle();

    const depots = await http().get('/depots').query(depotPoint).set(bearer(c.token)).expect(200);
    expect(depots).toSatisfyApiSpec();
    const mine = depots.body.items.find((d: { id: string }) => d.id === depotId);
    expect(mine).toMatchObject({ id: depotId, active: true });
    expect(mine.availableVehicleCount).toBeGreaterThanOrEqual(1);
    expect(depots.body.items[0].id).toBe(depotId);

    const vehicles = await http().get(`/depots/${depotId}/vehicles`).set(bearer(c.token)).expect(200);
    expect(vehicles).toSatisfyApiSpec();
    expect(vehicles.body.items.map((x: { id: string }) => x.id)).toContain(v.id);

    // Pré-reserva sem caução, sem cartão e sem plano.
    const res = await preReserve(c.token, v.id).expect(201);
    expect(res).toSatisfyApiSpec();
    expect(res.body).toMatchObject({ status: 'active', depotId, pickupMode: 'now' });
    expect(res.body).not.toHaveProperty('deposit');
    expect(res.body.pickupCode).toBeTruthy();
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('reserved');

    const customerWs = await connect(c.token);
    const depotWs = await connect(campo);

    const ho = await pickup(res.body.pickupCode).expect(201);
    expect(ho).toSatisfyApiSpec();
    expect(ho.body).toMatchObject({ type: 'pickup', status: 'pending_customer', reservationId: res.body.id, vehicleId: v.id, depotId });
    expect(await waitEvent(customerWs, 'handover.pending', (p) => p.handoverId === ho.body.id)).toEqual({ handoverId: ho.body.id, reservationId: res.body.id });
    await waitEvent(depotWs, 'handover.pending', (p) => p.handoverId === ho.body.id);
    const cur = await http().get('/reservations/current').set(bearer(c.token)).expect(200);
    expect(cur.body.reservation).toMatchObject({ id: res.body.id, status: 'handover', handoverId: ho.body.id });

    // O app não aceita nada: dono → 409 handover-counter-checkout; outro cliente → 404 (não revela a entrega).
    expect((await accept(c.token, ho.body.id).expect(409)).body.code).toBe('handover-counter-checkout');
    const other = await approvedCustomer(app, prisma, 'ciclo-1-outro');
    await accept(other.token, ho.body.id).expect(404);
    await http().post(`/handovers/${ho.body.id}/dispute`).set(bearer(other.token)).send({ reason: 'Não é minha' }).expect(404);

    // Balcão: diária + seguro no Pix do galpão, caução de R$ 200,00 em dinheiro.
    const { quote, body } = await counterBody(ho.body.id, { deposit: { method: 'cash', amountCents: 20000 } });
    expect(quote.periodDays).toBe(1);
    const rental = await checkout(ho.body.id, body).expect(201);
    expect(rental).toSatisfyApiSpec();
    expect(rental.body).toMatchObject({ vehicleId: v.id, status: 'active', planCode: 'day' });
    expect(await waitEvent(customerWs, 'handover.updated', (p) => p.handoverId === ho.body.id && p.status === 'accepted')).toEqual({ handoverId: ho.body.id, status: 'accepted' });
    await waitEvent(depotWs, 'handover.updated', (p) => p.handoverId === ho.body.id && p.status === 'accepted');
    await waitEvent(customerWs, 'rental.updated', (p) => p.rentalId === rental.body.id && p.status === 'active');

    // Um aluguel; pré-pago e caução registrados no balcão; moto rented guardando o galpão; um destravamento.
    expect(await prisma.rental.count({ where: { customerId: c.customerId } })).toBe(1);
    const prepaid = await rentalPayments(rental.body.id);
    expect(prepaid.map((p) => [p.status, p.method, p.amountCents])).toEqual([['paid', 'counter_pix', quote.totalCents]]);
    const depositId = rental.body.depositId as string;
    expect(await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } })).toMatchObject({ status: 'held', method: 'cash', amountCents: 20000, rentalId: rental.body.id });
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).toMatchObject({ status: 'rented', depotId });
    expect(await prisma.vehicleCommand.count({ where: { vehicleId: v.id, type: 'unlock' } })).toBe(1);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: res.body.id } })).status).toBe('converted');

    // Aluguel aberto: a caução não volta ainda.
    const early = await http().post(`/payments/deposits/${depositId}/counter-refund`).set(bearer(campo)).set('Idempotency-Key', randomUUID()).send({ amountCents: 100 }).expect(409);
    expect(early).toSatisfyApiSpec();

    // O cliente ficou 25 h com a diária (pré-pago de 24 h): 1 dia iniciado de excedente.
    await prisma.rental.update({ where: { id: rental.body.id }, data: { startedAt: new Date(Date.now() - 25 * HOUR) } });
    await returnDepot(rental.body.id);
    expect((await prisma.rental.findUniqueOrThrow({ where: { id: rental.body.id } })).status).toBe('ended');
    await waitEvent(customerWs, 'rental.updated', (p) => p.rentalId === rental.body.id && p.status === 'ended');
    // Excedente = débito de balcão `pending` (método do pré-pago), sem gateway; repetição da chegada não cria outro.
    const afterEnd = await rentalPayments(rental.body.id);
    expect(afterEnd).toHaveLength(2);
    const debt = afterEnd[1];
    expect(debt).toMatchObject({ status: 'pending', method: 'counter_pix', amountCents: quote.excessDayCents, providerPaymentId: null, depositId: null });
    expect((await prisma.rental.findUniqueOrThrow({ where: { id: rental.body.id } })).paymentId).toBe(debt.id);
    await returnDepot(rental.body.id, okChecklist, 200);
    expect(await prisma.payment.count({ where: { rentalId: rental.body.id, kind: 'rental' } })).toBe(2);

    // Com débito em aberto: nova pré-reserva → 409 com o texto do galpão; o app não paga o débito do balcão.
    const blocked = await preReserve(c.token, (await depotVehicle()).id).expect(409);
    expect(blocked.body).toMatchObject({ code: 'payment-pending', detail: COUNTER_DEBT_DETAIL });
    const appPay = await http().post(`/payments/${debt.id}/retry`).set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ method: 'pix' }).expect(409);
    expect(appPay.body.code).toBe('debt-not-payable');

    // Saldo do balcão: o débito e a caução disponível.
    const balance = await http().get(`/rentals/${rental.body.id}/counter-balance`).set(bearer(campo)).expect(200);
    expect(balance).toSatisfyApiSpec();
    expect(balance.body).toMatchObject({ rentalId: rental.body.id, customerId: c.customerId, rentalStatus: 'ended', debtTotalCents: quote.excessDayCents });
    expect(balance.body.debts).toEqual([expect.objectContaining({ paymentId: debt.id, rentalId: rental.body.id, status: 'pending', method: 'counter_pix', outstandingCents: quote.excessDayCents })]);
    expect(balance.body.deposits).toEqual([expect.objectContaining({ depositId, method: 'cash', amountCents: 20000, capturedCents: 0, refundedCents: 0, availableCents: 20000 })]);
    await http().get(`/rentals/${rental.body.id}/counter-balance`).set(bearer(c.token)).expect(403);

    // Quitação: método e caução juntos → 400; acima do saldo → 422; parte em dinheiro, o resto abatido da caução.
    const settle = (b: object) => http().post(`/payments/${debt.id}/counter-settle`).set(bearer(campo)).set('Idempotency-Key', randomUUID()).send(b);
    await settle({ amountCents: 100, method: 'cash', fromDepositId: depositId }).expect(400);
    expect((await settle({ amountCents: quote.excessDayCents + 1, method: 'cash' }).expect(422)).body.code).toBe('counter-amount-mismatch');
    const part = Math.floor(quote.excessDayCents / 2);
    const rest = quote.excessDayCents - part;
    const partial = await settle({ amountCents: part, method: 'cash', reference: 'caixa-2' }).expect(200);
    expect(partial).toSatisfyApiSpec();
    expect(partial.body).toMatchObject({ id: debt.id, outstandingCents: rest });
    expect(partial.body.debtSettledAt).toBeUndefined();
    const fromDeposit = await settle({ amountCents: rest, fromDepositId: depositId }).expect(200);
    expect(fromDeposit).toSatisfyApiSpec();
    expect(fromDeposit.body).toMatchObject({ id: debt.id, status: 'paid', outstandingCents: 0 });
    expect(fromDeposit.body.debtSettledAt).toBeTruthy();
    const settlements = await prisma.payment.findMany({ where: { settlesPaymentId: debt.id }, orderBy: { createdAt: 'asc' } });
    expect(settlements.map((p) => [p.kind, p.status, p.amountCents, p.depositId])).toEqual([
      ['debt_settlement', 'paid', part, null],
      ['debt_settlement', 'paid', rest, depositId],
    ]);
    expect(await prisma.auditLog.count({ where: { action: 'payment.counter_settle', entityId: debt.id } })).toBe(2);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: c.customerId } })).delinquent).toBe(false);
    // Já quitado → 409 debt-not-payable.
    expect((await settle({ amountCents: 1, method: 'cash' }).expect(409)).body.code).toBe('debt-not-payable');

    // Devolução da caução: acima do disponível → 422; o disponível inteiro → captured (houve abatimento).
    const left = 20000 - rest;
    const refund = (amountCents: number) =>
      http().post(`/payments/deposits/${depositId}/counter-refund`).set(bearer(campo)).set('Idempotency-Key', randomUUID()).send({ amountCents, reference: 'devolvido-em-maos' });
    expect((await refund(left + 1).expect(422)).body.code).toBe('counter-amount-mismatch');
    const refunded = await refund(left).expect(200);
    expect(refunded).toSatisfyApiSpec();
    expect(refunded.body).toMatchObject({ id: depositId, status: 'captured', capturedCents: rest, refundedCents: left });
    expect(await prisma.auditLog.count({ where: { action: 'deposit.counter_refund', entityId: depositId } })).toBe(1);
    const clean = await http().get(`/rentals/${rental.body.id}/counter-balance`).set(bearer(campo)).expect(200);
    expect(clean.body).toMatchObject({ debtTotalCents: 0, debts: [], deposits: [] });

    // Tudo acertado: pré-reservar volta a ser possível.
    const again = await preReserve(c.token, (await depotVehicle()).id).expect(201);
    await http().delete(`/reservations/${again.body.id}`).set(bearer(c.token)).expect(204);
  });

  it('2. agendada para amanhã 10:00 (São Paulo) sem pagamento → active com expiresAt = pickupAt + 30 min; a varredura não derruba', async () => {
    const c = await approvedCustomer(app, prisma, 'ciclo-2');
    const v = await depotVehicle();
    // Amanhã no calendário de São Paulo, 10:00 local (UTC−3, sem horário de verão) = 13:00Z.
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).split('-').map(Number);
    const pickupAt = new Date(Date.UTC(y, m - 1, d + 1, 13, 0)).toISOString();
    expect(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(pickupAt))).toBe('10:00');
    const expectedExpiry = new Date(new Date(pickupAt).getTime() + 30 * MINUTE).toISOString();

    // Corpo dos apps beta12 (plano, seguro e caução Pix): aceito e ignorado.
    const res = await preReserve(c.token, v.id, { pickupMode: 'scheduled', pickupAt, planCode: 'day', coverage: 'basic', depositMethod: 'pix' }).expect(201);
    expect(res).toSatisfyApiSpec();
    expect(res.body).toMatchObject({ status: 'active', pickupMode: 'scheduled', pickupAt, expiresAt: expectedExpiry });
    for (const f of ['deposit', 'depositMethod', 'planCode']) expect(res.body).not.toHaveProperty(f);
    expect(await prisma.deposit.count({ where: { customerId: c.customerId } })).toBe(0);

    const cur = await http().get('/reservations/current').set(bearer(c.token)).expect(200);
    expect(cur).toSatisfyApiSpec();
    expect(cur.body.reservation).toMatchObject({ id: res.body.id, status: 'active', pickupAt, expiresAt: expectedExpiry });
    expect(cur.body.reservation.pickupCode).toBeTruthy();
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('reserved');
    await app.get(ReservationsService).sweep();
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: res.body.id } })).status).toBe('active');

    await http().delete(`/reservations/${res.body.id}`).set(bearer(c.token)).expect(204);
  });

  it('3. corrida: duas pré-reservas simultâneas para a mesma moto → 201 + 409', async () => {
    const [a, b] = await Promise.all([approvedCustomer(app, prisma, 'ciclo-3a'), approvedCustomer(app, prisma, 'ciclo-3b')]);
    const v = await depotVehicle();
    const results = await Promise.all([a, b].map((c) => preReserve(c.token, v.id)));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(loser.body.code).toBe('vehicle-unavailable');
    expect(loser).toSatisfyApiSpec();
    expect(await prisma.reservation.count({ where: { vehicleId: v.id, status: 'active' } })).toBe(1);
    const winner = results.find((r) => r.status === 201)!;
    await http().delete(`/reservations/${winner.body.id}`).set(bearer(results[0].status === 201 ? a.token : b.token)).expect(204);
  });

  it('4. plano semanal × 2 no balcão: prepaidUntil = início + 14 dias e devolução dentro do período sem débito', async () => {
    const c = await reserved('ciclo-4');
    const ho = await pickup(c.pickupCode).expect(201);
    const { quote, body } = await counterBody(ho.body.id, { planCode: 'weekly', quantity: 2 });
    expect(quote.periodDays).toBe(14);
    const rental = await checkout(ho.body.id, body).expect(201);
    expect(rental.body.planCode).toBe('weekly');
    expect(new Date(rental.body.prepaidUntil).getTime() - new Date(rental.body.startedAt).getTime()).toBe(14 * 24 * HOUR);
    // 13 dias depois do início: ainda no pré-pago.
    await prisma.rental.update({ where: { id: rental.body.id }, data: { startedAt: new Date(Date.now() - 13 * 24 * HOUR) } });
    await returnDepot(rental.body.id);
    const payments = await rentalPayments(rental.body.id);
    expect(payments.map((p) => [p.status, p.amountCents])).toEqual([['paid', quote.totalCents]]);
    expect((await prisma.rental.findUniqueOrThrow({ where: { id: rental.body.id } })).paymentId).toBe(payments[0].id);
    // Caução de balcão de valor 0 → liberada no fechamento; saldo limpo.
    expect((await prisma.deposit.findUniqueOrThrow({ where: { id: rental.body.depositId } })).status).toBe('released');
    expect((await http().get(`/rentals/${rental.body.id}/counter-balance`).set(bearer(operacao)).expect(200)).body).toMatchObject({ debtTotalCents: 0, debts: [], deposits: [] });
  });

  it('5a. moto sem conexão no checkout → 409 vehicle-offline, entrega pending_customer com lastError, nada registrado; nova tentativa com a mesma chave inicia', async () => {
    const c = await reserved('ciclo-5a');
    const customerWs = await connect(c.token);
    const ho = await pickup(c.pickupCode).expect(201);
    const { body } = await counterBody(ho.body.id);
    const starter = app.get(RentalStartService);
    const spy = jest.spyOn(starter, 'start').mockRejectedValueOnce(new ProblemException(409, 'vehicle-offline', 'Moto sem conexão.'));
    const key = randomUUID();
    try {
      const refused = await checkout(ho.body.id, body, key).expect(409);
      expect(refused).toSatisfyApiSpec();
      expect(refused.body.code).toBe('vehicle-offline');
    } finally {
      spy.mockRestore();
    }
    expect(await waitEvent(customerWs, 'handover.updated', (p) => p.handoverId === ho.body.id))
      .toEqual({ handoverId: ho.body.id, status: 'pending_customer', lastError: 'vehicle-offline' });
    const seen = await http().get(`/handovers/${ho.body.id}`).set(bearer(c.token)).expect(200);
    expect(seen.body).toMatchObject({ status: 'pending_customer', lastError: 'vehicle-offline' });
    expect(await prisma.vehicleCommand.count({ where: { vehicleId: c.vehicleId, type: 'unlock' } })).toBe(0);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).status).toBe('reserved');
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: c.reservationId } })).status).toBe('handover');
    expect(await prisma.rental.count({ where: { customerId: c.customerId } })).toBe(0);
    expect(await prisma.payment.count({ where: { customerId: c.customerId } })).toBe(0);

    // Mesma Idempotency-Key com a moto de volta → o erro não foi memorizado: inicia, lastError some.
    const rental = await checkout(ho.body.id, body, key).expect(201);
    expect(rental.headers['idempotent-replayed']).toBeUndefined();
    expect(await prisma.rental.count({ where: { customerId: c.customerId } })).toBe(1);
    expect((await prisma.handover.findUniqueOrThrow({ where: { id: ho.body.id } })).lastError).toBeNull();
    // Agora sim a mesma chave repete o sucesso (201 memorizado).
    const replay = await checkout(ho.body.id, body, key).expect(201);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body.id).toBe(rental.body.id);
    await returnDepot(rental.body.id);
  });

  it('5b. cliente inadimplente no checkout, caminho real → 403, entrega pending_customer com lastError, nenhum destravamento', async () => {
    const c = await reserved('ciclo-5b');
    const ho = await pickup(c.pickupCode).expect(201);
    const { body } = await counterBody(ho.body.id);
    await prisma.customer.update({ where: { id: c.customerId }, data: { delinquent: true } });
    const key = randomUUID();
    const refused = await checkout(ho.body.id, body, key).expect(403);
    expect(refused).toSatisfyApiSpec();
    expect(refused.body.code).toBe('customer-delinquent');
    expect(await prisma.handover.findUniqueOrThrow({ where: { id: ho.body.id } })).toMatchObject({ status: 'pending_customer', lastError: 'customer-delinquent' });
    expect(await prisma.vehicleCommand.count({ where: { vehicleId: c.vehicleId, type: 'unlock' } })).toBe(0);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).status).toBe('reserved');
    await prisma.customer.update({ where: { id: c.customerId }, data: { delinquent: false } });
    // Mesma chave depois de regularizar → tenta de novo (o 403 não foi memorizado).
    const rental = await checkout(ho.body.id, body, key).expect(201);
    expect(await prisma.rental.count({ where: { customerId: c.customerId } })).toBe(1);
    await returnDepot(rental.body.id);
  });

  it('6. chegada no galpão → ended e moto direto em free no galpão; com item problemático → direto em maintenance', async () => {
    const fleet = await connect(operacao);
    const depotWs = await connect(campo);
    for (const [tag, checklist, target] of [
      ['ciclo-6-ok', okChecklist, 'free'],
      ['ciclo-6-ruim', [{ code: 'freios', ok: false, note: 'Freio traseiro fraco' }, { code: 'pneus', ok: true }], 'maintenance'],
    ] as const) {
      const c = await rentedFromDepot(tag);
      const customerWs = await connect(c.token);
      // depotId fica na moto durante o aluguel.
      expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).toMatchObject({ status: 'rented', depotId });
      const mark = fleet.events.length;
      const arrived = await returnDepot(c.rentalId, [...checklist]);
      expect(arrived).toSatisfyApiSpec();
      expect(arrived.body).toMatchObject({ type: 'return_depot', status: 'accepted', rentalId: c.rentalId, depotId });
      // handover.updated da chegada para o cliente e para o galpão.
      expect(await waitEvent(customerWs, 'handover.updated', (p) => p.handoverId === arrived.body.id)).toEqual({ handoverId: arrived.body.id, status: 'accepted' });
      await waitEvent(depotWs, 'handover.updated', (p) => p.handoverId === arrived.body.id && p.status === 'accepted');
      expect((await prisma.rental.findUniqueOrThrow({ where: { id: c.rentalId } })).status).toBe('ended');
      expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).toMatchObject({ status: target, depotId });
      expect(await prisma.fieldTask.count({ where: { vehicleId: c.vehicleId, type: 'collect' } })).toBe(0);
      // Dentro do pré-pago: só o pagamento do balcão.
      expect((await rentalPayments(c.rentalId)).map((p) => p.status)).toEqual(['paid']);
      // Sem estado intermediário: a frota só vê a moto passar para o status final.
      await waitEvent(fleet, 'vehicle.status', (p) => p.vehicleId === c.vehicleId && p.status === target);
      await new Promise((r) => setTimeout(r, 200));
      const statuses = fleet.events.slice(mark).filter((e) => e.name === 'vehicle.status' && e.payload.vehicleId === c.vehicleId).map((e) => e.payload.status);
      expect(statuses).toEqual([target]);

      // Repetição (fila offline do operador) → 200 com a mesma entrega, sem mexer na moto.
      const before = customerWs.events.filter((e) => e.name === 'handover.updated').length;
      const retry = await returnDepot(c.rentalId, [...checklist], 200);
      expect(retry.body.id).toBe(arrived.body.id);
      await new Promise((r) => setTimeout(r, 200));
      // Repetição sem trabalho não reemite.
      expect(customerWs.events.filter((e) => e.name === 'handover.updated').length).toBe(before);
      expect(await prisma.handover.count({ where: { rentalId: c.rentalId, type: 'return_depot' } })).toBe(1);
      expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).toMatchObject({ status: target, depotId });
    }
  });

  it('7. devolução em ponto verde de moto do galpão → awaiting_pickup + collect → conclusão no galpão → free', async () => {
    const c = await rentedFromDepot('ciclo-7');
    // O cliente pilota até o ponto verde.
    await prisma.vehicle.update({ where: { id: c.vehicleId }, data: GREEN_POINT });
    const photo = await http().post(`/rentals/${c.rentalId}/return-photo`).set(bearer(c.token)).send({ contentType: 'image/jpeg' }).expect(201);
    await http().post(`/rentals/${c.rentalId}/end`).set(bearer(c.token)).send({ returnPhotoObjectKey: photo.body.objectKey }).expect(200);
    // A finalização também pode chegar pelo evento de travada: espera o fechamento.
    expect((await until(() => prisma.rental.findUniqueOrThrow({ where: { id: c.rentalId } }), (r) => r.status === 'ended')).status).toBe('ended');
    // Fechamento do balcão sem gateway: só o pré-pago, nada pendente.
    expect((await rentalPayments(c.rentalId)).map((p) => p.status)).toEqual(['paid']);
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).toMatchObject({ status: 'awaiting_pickup', depotId });

    const tasks = await prisma.fieldTask.findMany({ where: { vehicleId: c.vehicleId, type: 'collect' } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ status: 'open', targetLat: GREEN_POINT.lat, targetLng: GREEN_POINT.lng });

    // Ninguém aluga pela rua enquanto espera o recolhimento.
    const other = await approvedCustomer(app, prisma, 'ciclo-7-outro');
    await http().post('/payments/cards').set(bearer(other.token)).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);
    const blocked = await http().post('/rentals').set(bearer(other.token)).set('Idempotency-Key', randomUUID())
      .send({ vehicleId: c.vehicleId, planCode: 'minute', coverage: 'basic', depositMethod: 'card' }).expect(409);
    expect(blocked.body.code).toBe('vehicle-unavailable');

    await http().post(`/field-tasks/${tasks[0].id}/start`).set(bearer(campo)).expect(200);
    const done = await http().post(`/field-tasks/${tasks[0].id}/complete`).set(bearer(campo)).send({ depotId }).expect(200);
    expect(done.body).toMatchObject({ status: 'done', vehicleStatus: 'free' });
    const atDepotRow = await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } });
    expect(atDepotRow).toMatchObject({ status: 'free', depotId });
    expect(atDepotRow.lat).toBeCloseTo(depotPoint.lat, 6);
    expect(atDepotRow.lng).toBeCloseTo(depotPoint.lng, 6);
    // De volta ao estoque do galpão.
    const list = await http().get(`/depots/${depotId}/vehicles`).set(bearer(other.token)).expect(200);
    expect(list.body.items.map((x: { id: string }) => x.id)).toContain(c.vehicleId);
  });

  it('7b. moto de rua (sem depotId) devolvida em ponto verde continua free, sem recolhimento', async () => {
    const c = await approvedCustomer(app, prisma, 'ciclo-7b');
    await http().post('/payments/cards').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);
    const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.toUpperCase();
    const v = await prisma.vehicle.create({
      data: { code: `E2E-${tag}`, thingName: `e2e-thing-${tag.toLowerCase()}`, model: 'Volti S1', ...GREEN_POINT, batteryPct: 95, status: 'free', locked: true },
      select: { id: true },
    });
    const started = await http().post('/rentals').set(bearer(c.token)).set('Idempotency-Key', randomUUID())
      .send({ vehicleId: v.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' }).expect(201);
    const rentalId: string = started.body.rental.id;
    const photo = await http().post(`/rentals/${rentalId}/return-photo`).set(bearer(c.token)).send({ contentType: 'image/jpeg' }).expect(201);
    await http().post(`/rentals/${rentalId}/end`).set(bearer(c.token)).send({ returnPhotoObjectKey: photo.body.objectKey }).expect(200);
    await until(() => rentalPayments(rentalId), (ps) => ps.length > 0 && ps.every((p) => p.status !== 'pending'));
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).toMatchObject({ status: 'free', depotId: null });
    expect(await prisma.fieldTask.count({ where: { vehicleId: v.id, type: 'collect' } })).toBe(0);
  });

  it('8. expiração: pré-reserva vencida pela varredura → expired, moto free no galpão; o código não serve mais', async () => {
    const c = await reserved('ciclo-8');
    await prisma.reservation.update({ where: { id: c.reservationId }, data: { expiresAt: new Date(Date.now() - MINUTE) } });
    await app.get(ReservationsService).sweep();
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: c.reservationId } })).status).toBe('expired');
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).toMatchObject({ status: 'free', depotId });
    expect((await http().get('/reservations/current').set(bearer(c.token)).expect(200)).body).toEqual({});
    // O código da reserva vencida não serve mais para uma saída (reserva fora de active/handover → 409).
    expect(await pickup(c.pickupCode).expect(409)).toSatisfyApiSpec();
    expect(await prisma.handover.count({ where: { reservationId: c.reservationId } })).toBe(0);
  });

  it('9. horário inválido → 422 com o code certo, sem separar a moto', async () => {
    // Galpão das 08:00 às 18:00 todos os dias e outro sem horário (sempre fechado).
    const mk = async (openingHours: { weekday: number; opensAt: string; closesAt: string }[]) =>
      prisma.depot.create({ data: { name: `Galpão Horário E2E ${Date.now()}-${Math.floor(Math.random() * 1e6)}`, address: 'Rua do Horário, 9', ...depotPoint, openingHours } });
    const business = await mk(Array.from({ length: 7 }, (_, weekday) => ({ weekday, opensAt: '08:00', closesAt: '18:00' })));
    const closed = await mk([]);
    const c = await approvedCustomer(app, prisma, 'ciclo-9');
    const vehicleAt = async (id: string) => {
      const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.toUpperCase();
      return prisma.vehicle.create({ data: { code: `E2E-${tag}`, thingName: `e2e-thing-${tag.toLowerCase()}`, model: 'Volti S1', ...depotPoint, batteryPct: 90, status: 'free', locked: true, depotId: id }, select: { id: true } });
    };
    const vb = await vehicleAt(business.id);
    const vc = await vehicleAt(closed.id);
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).split('-').map(Number);
    const tomorrowLocal = (hh: number) => new Date(Date.UTC(y, m - 1, d + 1, hh + 3, 0)).toISOString();
    const post = (vehicleId: string, dId: string, over: Record<string, unknown>) =>
      http().post('/reservations').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ ...reservationBody(vehicleId), depotId: dId, ...over });

    const cases: Array<[string, string, Record<string, unknown>, string]> = [
      ['03:00 com o galpão fechado', vb.id, { pickupMode: 'scheduled', pickupAt: tomorrowLocal(3) }, 'pickup-outside-hours'],
      ['18:00 (fecha às 18:00)', vb.id, { pickupMode: 'scheduled', pickupAt: tomorrowLocal(18) }, 'pickup-outside-hours'],
      ['além dos 7 dias', vb.id, { pickupMode: 'scheduled', pickupAt: new Date(Date.UTC(y, m - 1, d + 10, 13, 0)).toISOString() }, 'pickup-too-far-ahead'],
    ];
    for (const [label, vehicleId, over, code] of cases) {
      const res = await post(vehicleId, business.id, over);
      expect({ label, status: res.status, code: res.body.code }).toEqual({ label, status: 422, code });
      expect(res).toSatisfyApiSpec();
    }
    const now = await post(vc.id, closed.id, { pickupMode: 'now' }).expect(422);
    expect(now.body.code).toBe('pickup-outside-hours');
    expect(now).toSatisfyApiSpec();
    // Passado e sem pickupAt são validação (400), não regra de horário.
    expect((await post(vb.id, business.id, { pickupMode: 'scheduled', pickupAt: new Date(Date.now() - 3600_000).toISOString() }).expect(400)).body.code).toBe('validation-error');
    expect((await post(vb.id, business.id, { pickupMode: 'scheduled' }).expect(400)).body.code).toBe('validation-error');

    expect(await prisma.reservation.count({ where: { customerId: c.customerId } })).toBe(0);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: vb.id } })).status).toBe('free');
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: vc.id } })).status).toBe('free');
    await prisma.depot.updateMany({ where: { id: { in: [business.id, closed.id] } }, data: { active: false } });
  });

  it('10. disputa → cancelamento pela operação → reserva active com pickupCode de novo → nova saída → checkout', async () => {
    const c = await reserved('ciclo-10');
    const customerWs = await connect(c.token);
    const first = await pickup(c.pickupCode).expect(201);
    const disputed = await http().post(`/handovers/${first.body.id}/dispute`).set(bearer(c.token)).send({ reason: 'Retrovisor esquerdo solto.' }).expect(200);
    expect(disputed.body.status).toBe('disputed');
    await waitEvent(customerWs, 'handover.updated', (p) => p.handoverId === first.body.id && p.status === 'disputed');
    // Em handover, o código não aparece para o cliente.
    expect((await http().get('/reservations/current').set(bearer(c.token)).expect(200)).body.reservation.pickupCode).toBeUndefined();

    const canceled = await http().post(`/handovers/${first.body.id}/cancel`).set(bearer(campo)).send({ reason: 'Retrovisor apertado; nova saída.' }).expect(200);
    expect(canceled).toSatisfyApiSpec();
    expect(canceled.body.status).toBe('canceled');
    await waitEvent(customerWs, 'handover.updated', (p) => p.handoverId === first.body.id && p.status === 'canceled');
    const cur = await http().get('/reservations/current').set(bearer(c.token)).expect(200);
    expect(cur.body.reservation).toMatchObject({ id: c.reservationId, status: 'active' });
    expect(cur.body.reservation.pickupCode).toBeTruthy();

    const second = await pickup(cur.body.reservation.pickupCode).expect(201);
    expect(second.body.id).not.toBe(first.body.id);
    await waitEvent(customerWs, 'handover.pending', (p) => p.handoverId === second.body.id);
    const { body } = await counterBody(second.body.id);
    // A entrega cancelada não faz checkout.
    expect((await checkout(first.body.id, body).expect(422)).body.code).toBe('handover-not-pending');
    const rental = await checkout(second.body.id, body).expect(201);
    expect(rental.body).toMatchObject({ vehicleId: c.vehicleId, status: 'active' });
    expect(await prisma.rental.count({ where: { customerId: c.customerId } })).toBe(1);
    await returnDepot(rental.body.id);
  });

  it('11. cancelamento depois do prazo da reserva → expired, moto free no galpão', async () => {
    const c = await reserved('ciclo-11');
    const ho = await pickup(c.pickupCode).expect(201);
    await prisma.reservation.update({ where: { id: c.reservationId }, data: { expiresAt: new Date(Date.now() - MINUTE) } });
    await http().post(`/handovers/${ho.body.id}/cancel`).set(bearer(campo)).send({ reason: 'Cliente não apareceu no balcão.' }).expect(200);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: c.reservationId } })).status).toBe('expired');
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: c.vehicleId } })).toMatchObject({ status: 'free', depotId });
    expect((await http().get('/reservations/current').set(bearer(c.token)).expect(200)).body).toEqual({});
    expect(await prisma.rental.count({ where: { customerId: c.customerId } })).toBe(0);
  });
});
