import { INestApplication } from '@nestjs/common';
import { PrismaClient, type VehicleStatus } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import request from 'supertest';
import { loadSpecAs30 } from './contract/openapi-30';
import { approvedCustomer, bootE2eApp, devToken } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);

/** Longe das zonas e das motos do seed/simulador: as motos do teste não aparecem nos `nearby` dos outros e2e. */
const FAR = { lat: -9.6658, lng: -35.7353 };

const tag = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.toUpperCase();

/** Galpões: CRUD com grupos, motos do galpão (cliente × staff) e agenda do dia (só primeiro nome, nunca pickupCode). */
describe('Galpões (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: string;
  let operacao: string;
  let campo: string;
  let suporte: string;
  let financeiro: string;
  let customer: { token: string; customerId: string };
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  const depotBody = (over: Record<string, unknown> = {}) => ({
    name: `Galpão E2E ${tag()}`,
    address: 'R. Teste, 100 · Pinheiros, São Paulo',
    district: 'Pinheiros',
    lat: FAR.lat,
    lng: FAR.lng,
    openingHours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: '07:00', closesAt: '20:00' })),
    ...over,
  });

  async function vehicle(status: VehicleStatus, depotId: string | null) {
    const t = tag();
    return prisma.vehicle.create({
      data: { code: `E2E-${t}`, thingName: `e2e-thing-${t.toLowerCase()}`, model: 'Volti S1', lat: FAR.lat, lng: FAR.lng, batteryPct: 50 + Math.floor(Math.random() * 50), status, locked: true, depotId },
      select: { id: true },
    });
  }

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
    operacao = await devToken(app, { sub: 'dev-operacao', email: 'operacao@volti.dev', groups: ['operacao'], pool: 'staff' });
    campo = await devToken(app, { sub: 'dev-campo', email: 'campo@volti.dev', groups: ['campo'], pool: 'staff' });
    suporte = await devToken(app, { sub: 'dev-suporte', email: 'suporte@volti.dev', groups: ['suporte'], pool: 'staff' });
    financeiro = await devToken(app, { sub: 'dev-financeiro', email: 'financeiro@volti.dev', groups: ['financeiro'], pool: 'staff' });
    customer = await approvedCustomer(app, prisma, 'depots');
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('POST /depots: campo e cliente → 403; admin → 201 com auditoria; horário inválido → 400; nome repetido → 409', async () => {
    const forbidden = await http().post('/depots').set(bearer(campo)).send(depotBody()).expect(403);
    expect(forbidden).toSatisfyApiSpec();
    await http().post('/depots').set(bearer(customer.token)).send(depotBody()).expect(403);
    await http().post('/depots').set(bearer(financeiro)).send(depotBody()).expect(403);

    const body = depotBody();
    const created = await http().post('/depots').set(bearer(admin)).send(body).expect(201);
    expect(created).toSatisfyApiSpec();
    expect(created.body).toMatchObject({ name: body.name, active: true, pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30, availableVehicleCount: 0, timezone: 'America/Sao_Paulo' });
    expect(await prisma.auditLog.findFirst({ where: { entityId: created.body.id, action: 'depot.create' } })).toBeTruthy();

    for (const openingHours of [
      [{ weekday: 1, opensAt: '20:00', closesAt: '08:00' }],
      [{ weekday: 7, opensAt: '08:00', closesAt: '20:00' }],
      [{ weekday: 1, opensAt: '8h', closesAt: '20:00' }],
    ]) {
      const bad = await http().post('/depots').set(bearer(operacao)).send(depotBody({ openingHours })).expect(400);
      expect(bad.body.code).toBe('validation-error');
      expect(bad).toSatisfyApiSpec();
    }
    const dup = await http().post('/depots').set(bearer(operacao)).send(depotBody({ name: body.name })).expect(409);
    expect(dup).toSatisfyApiSpec();
  });

  it('GET /depots/{id}/vehicles: cliente vê só as livres deste galpão; staff vê todas e filtra por status', async () => {
    const depot = (await http().post('/depots').set(bearer(admin)).send(depotBody()).expect(201)).body;
    const other = (await http().post('/depots').set(bearer(admin)).send(depotBody()).expect(201)).body;
    const free = await vehicle('free', depot.id);
    const reserved = await vehicle('reserved', depot.id);
    const awaiting = await vehicle('awaiting_pickup', depot.id);
    await vehicle('free', other.id);
    await vehicle('free', null);

    const res = await http().get(`/depots/${depot.id}/vehicles`).query({ status: 'reserved' }).set(bearer(customer.token)).expect(200);
    expect(res).toSatisfyApiSpec();
    expect(res.body.items.map((v: { id: string }) => v.id)).toEqual([free.id]);
    expect(res.body.items[0]).toMatchObject({ status: 'free', depotId: depot.id });
    expect(res.body.items[0].thingName).toBeUndefined();

    const all = await http().get(`/depots/${depot.id}/vehicles`).set(bearer(campo)).expect(200);
    expect(all).toSatisfyApiSpec();
    expect(all.body.items.map((v: { id: string }) => v.id).sort()).toEqual([free.id, reserved.id, awaiting.id].sort());
    const onlyAwaiting = await http().get(`/depots/${depot.id}/vehicles`).query({ status: 'awaiting_pickup' }).set(bearer(operacao)).expect(200);
    expect(onlyAwaiting.body.items.map((v: { id: string }) => v.id)).toEqual([awaiting.id]);

    const list = await http().get('/depots').query({ lat: FAR.lat + 0.01, lng: FAR.lng }).set(bearer(customer.token)).expect(200);
    expect(list).toSatisfyApiSpec();
    const mine = list.body.items.find((d: { id: string }) => d.id === depot.id);
    expect(mine.availableVehicleCount).toBe(1);
    expect(typeof mine.distanceM).toBe('number');
    expect((await http().get('/depots').set(bearer(customer.token)).expect(200)).body.items[0].distanceM).toBeUndefined();
  });

  it('PATCH /depots/{id}: desativa (auditado); cliente não vê o inativo, staff vê com includeInactive', async () => {
    const depot = (await http().post('/depots').set(bearer(admin)).send(depotBody()).expect(201)).body;
    await http().patch(`/depots/${depot.id}`).set(bearer(campo)).send({ active: false }).expect(403);
    await http().patch(`/depots/${depot.id}`).set(bearer(customer.token)).send({ active: false }).expect(403);
    const patched = await http().patch(`/depots/${depot.id}`).set(bearer(operacao)).send({ active: false, maxScheduleDays: 3 }).expect(200);
    expect(patched).toSatisfyApiSpec();
    expect(patched.body).toMatchObject({ active: false, maxScheduleDays: 3 });
    expect(await prisma.auditLog.findFirst({ where: { entityId: depot.id, action: 'depot.update' } })).toBeTruthy();

    const notFound = await http().get(`/depots/${depot.id}`).set(bearer(customer.token)).expect(404);
    expect(notFound).toSatisfyApiSpec();
    await http().get(`/depots/${depot.id}/vehicles`).set(bearer(customer.token)).expect(404);
    expect((await http().get(`/depots/${depot.id}`).set(bearer(suporte)).expect(200)).body.active).toBe(false);
    const custList = await http().get('/depots').query({ includeInactive: true }).set(bearer(customer.token)).expect(200);
    expect(custList.body.items.some((d: { id: string }) => d.id === depot.id)).toBe(false);
    const staffList = await http().get('/depots').query({ includeInactive: true }).set(bearer(admin)).expect(200);
    expect(staffList.body.items.some((d: { id: string }) => d.id === depot.id)).toBe(true);
  });

  it('GET /depots/{id}/pickups: agenda do dia no fuso do galpão, só primeiro nome, nunca pickupCode', async () => {
    const depot = (await http().post('/depots').set(bearer(admin)).send(depotBody()).expect(201)).body;
    await prisma.customer.update({ where: { id: customer.customerId }, data: { name: 'Ana Paula Teste' } });
    const other = await approvedCustomer(app, prisma, 'depots-b');
    const third = await approvedCustomer(app, prisma, 'depots-c');
    const base = { depotId: depot.id, planCode: 'day' as const, coverage: 'basic' as const, depositMethod: 'card' as const };
    // 2026-11-05 em São Paulo (UTC-3) = [03:00Z de 05, 03:00Z de 06).
    const scheduled = await prisma.reservation.create({
      data: { ...base, customerId: customer.customerId, vehicleId: (await vehicle('reserved', depot.id)).id, status: 'active', pickupMode: 'scheduled', pickupAt: new Date('2026-11-05T17:00:00Z'), expiresAt: new Date('2026-11-05T17:30:00Z') },
    });
    const now = await prisma.reservation.create({
      data: { ...base, customerId: other.customerId, vehicleId: (await vehicle('rented', depot.id)).id, status: 'converted', pickupMode: 'now', createdAt: new Date('2026-11-05T13:00:00Z'), expiresAt: new Date('2026-11-05T15:00:00Z') },
    });
    const lateNight = await prisma.reservation.create({
      data: { ...base, customerId: third.customerId, vehicleId: (await vehicle('free', depot.id)).id, status: 'canceled', pickupMode: 'scheduled', pickupAt: new Date('2026-11-06T02:30:00Z'), expiresAt: new Date('2026-11-06T03:00:00Z') },
    });
    await prisma.reservation.create({
      data: { ...base, customerId: third.customerId, vehicleId: (await vehicle('free', depot.id)).id, status: 'expired', pickupMode: 'scheduled', pickupAt: new Date('2026-11-06T03:30:00Z'), expiresAt: new Date('2026-11-06T04:00:00Z') },
    });

    const res = await http().get(`/depots/${depot.id}/pickups`).query({ date: '2026-11-05' }).set(bearer(operacao)).expect(200);
    expect(res).toSatisfyApiSpec();
    expect(res.body.date).toBe('2026-11-05');
    expect(res.body.items.map((r: { id: string }) => r.id)).toEqual([now.id, scheduled.id, lateNight.id]);
    expect(res.body.items[1]).toMatchObject({ customerFirstName: 'Ana', pickupMode: 'scheduled', status: 'active', depotId: depot.id });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('pickupCode');
    expect(raw).not.toContain('Paula');
    expect(raw).not.toContain(customer.customerId);

    const filtered = await http().get(`/depots/${depot.id}/pickups`).query({ date: '2026-11-05', status: 'active' }).set(bearer(campo)).expect(200);
    expect(filtered.body.items.map((r: { id: string }) => r.id)).toEqual([scheduled.id]);

    await http().get(`/depots/${depot.id}/pickups`).query({ date: '2026-11-05' }).set(bearer(suporte)).expect(403);
    await http().get(`/depots/${depot.id}/pickups`).query({ date: '2026-11-05' }).set(bearer(financeiro)).expect(403);
    const impossible = await http().get(`/depots/${depot.id}/pickups`).query({ date: '2026-02-31' }).set(bearer(operacao)).expect(400);
    expect(impossible.body.code).toBe('validation-error');
    expect(impossible).toSatisfyApiSpec();
    await http().get(`/depots/${depot.id}/pickups`).query({ date: '2026-11-05' }).set(bearer(customer.token)).expect(403);
    const noDate = await http().get(`/depots/${depot.id}/pickups`).set(bearer(admin)).expect(400);
    expect(noDate).toSatisfyApiSpec();
    await http().get('/depots/00000000-0000-4000-8000-000000000000/pickups').query({ date: '2026-11-05' }).set(bearer(admin)).expect(404);
  });

  it('moto fixa: some da lista do cliente quando é de OUTRO assinante; a própria continua; a contagem exclui todas', async () => {
    const depot = (await http().post('/depots').set(bearer(admin)).send(depotBody()).expect(201)).body;
    const owner = await approvedCustomer(app, prisma, 'depots-fixed-owner');
    const viewer = await approvedCustomer(app, prisma, 'depots-fixed-viewer');
    const theirs = await vehicle('free', depot.id);
    const mine = await vehicle('free', depot.id);
    const loose = await vehicle('free', depot.id);
    const expiredFixed = await vehicle('free', depot.id);
    const day = 86_400_000;
    const sub = (customerId: string, vehicleId: string, end: Date) => ({
      customerId, planCode: 'weekly' as const, status: 'active' as const, priceCents: 24900, assignedVehicleId: vehicleId, assignedVehicleAt: new Date(),
      currentPeriodStart: new Date(Date.now() - day), currentPeriodEnd: end,
    });
    await prisma.subscription.create({ data: sub(owner.customerId, theirs.id, new Date(Date.now() + 6 * day)) });
    await prisma.subscription.create({ data: sub(viewer.customerId, mine.id, new Date(Date.now() + 6 * day)) });
    // Período já vencido: a moto deixa de ser fixa.
    const third = await approvedCustomer(app, prisma, 'depots-fixed-expired');
    await prisma.subscription.create({ data: sub(third.customerId, expiredFixed.id, new Date(Date.now() - 1000)) });

    const res = await http().get(`/depots/${depot.id}/vehicles`).set(bearer(viewer.token)).expect(200);
    expect(res).toSatisfyApiSpec();
    expect(res.body.items.map((v: { id: string }) => v.id).sort()).toEqual([mine.id, loose.id, expiredFixed.id].sort());
    const ownerView = await http().get(`/depots/${depot.id}/vehicles`).set(bearer(owner.token)).expect(200);
    expect(ownerView.body.items.map((v: { id: string }) => v.id)).toContain(theirs.id);
    expect(ownerView.body.items.map((v: { id: string }) => v.id)).not.toContain(mine.id);
    const staff = await http().get(`/depots/${depot.id}/vehicles`).set(bearer(operacao)).expect(200);
    expect(staff.body.items).toHaveLength(4);

    const got = await http().get(`/depots/${depot.id}`).set(bearer(viewer.token)).expect(200);
    expect(got.body.availableVehicleCount).toBe(2);
  });
});
