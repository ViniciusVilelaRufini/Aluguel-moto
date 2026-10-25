import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { loadStationQrSecret, verifyStationCode } from '../src/modules/station-swaps/station-code';
import { issueStationCodes } from '../src/modules/station-swaps/station-qr';
import { loadSpecAs30 } from './contract/openapi-30';
import { approvedCustomer, bootE2eApp, devToken } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);

/**
 * Cadastro de estações de troca pelo painel (Task 12 das lacunas, 2026-10-24): criar, listar o cadastro, editar/desativar,
 * QR para impressão e ligação com o galpão. IOT_MODE=stub (sem broker MQTT). Estações, galpão e trocas próprios do teste.
 */
describe('Cadastro de estações de troca (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: string;
  let operacao: string;
  let suporte: string;
  let customer: string;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const tag = Date.now().toString(36).toUpperCase();
  const created: string[] = [];
  const depotIds: string[] = [];
  const body = (o: Record<string, unknown> = {}) => ({
    name: `Estação cadastro e2e ${tag}`, address: 'R. do Cadastro, 12 · Pinheiros', lat: -23.5631, lng: -46.6912, totalSlots: 6, openingHours: 'Seg a sáb, 7h às 22h', ...o,
  });

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
    operacao = await devToken(app, { sub: 'dev-operacao', email: 'operacao@volti.dev', groups: ['operacao'], pool: 'staff' });
    suporte = await devToken(app, { sub: 'dev-suporte', email: 'suporte@volti.dev', groups: ['suporte'], pool: 'staff' });
    customer = (await approvedCustomer(app, prisma, 'st-cadastro')).token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.depot.deleteMany({ where: { id: { in: depotIds } } });
      await prisma.stationSwap.deleteMany({ where: { stationId: { in: created } } });
      await prisma.battery.deleteMany({ where: { stationId: { in: created } } });
      await prisma.swapStation.deleteMany({ where: { id: { in: created } } });
      await prisma.$disconnect();
    }
    await app?.close();
  });

  async function createStation(token: string, o: Record<string, unknown> = {}) {
    const res = await http().post('/swap-stations').set(bearer(token)).send(body(o));
    if (res.status === 201) created.push(res.body.id);
    return res;
  }
  function expect201(res: request.Response): request.Response {
    expect({ status: res.status, body: res.status === 201 ? undefined : res.body }).toEqual({ status: 201, body: undefined });
    return res;
  }

  it('operação cria (201): QR fixo já emitido, igual ao do script stations:qr, sem baterias e com thing padrão', async () => {
    const res = await createStation(operacao).then(expect201);
    expect(res).toSatisfyApiSpec();
    const id = res.body.id as string;
    expect(res.body).toMatchObject({ active: true, availableBatteries: 0, totalSlots: 6, thingName: `station-${id}`, batteriesInStation: 0, openSwaps: 0, depotIds: [] });
    expect(res.body).not.toHaveProperty('stationCode');

    const qr = await http().get(`/swap-stations/${id}/qr`).set(bearer(operacao)).expect(200);
    expect(qr).toSatisfyApiSpec();
    expect(verifyStationCode(qr.body.stationCode, loadStationQrSecret())).toEqual({ stationId: id });
    // O mesmo código que o script de operação imprime (sem regravar).
    const [script] = await issueStationCodes(prisma, { secret: loadStationQrSecret(), stationIds: [id] });
    expect(script).toMatchObject({ id, stationCode: qr.body.stationCode, issued: false });

    const audit = await prisma.auditLog.findFirst({ where: { action: 'swap_station.create', entityId: id } });
    expect(audit).not.toBeNull();
    expect(JSON.stringify(audit)).not.toContain(qr.body.stationCode);
  });

  it('validações: lat/lng fora da faixa, totalSlots < 1, thing fora do padrão e sem horário → 400; thing de outra estação → 409', async () => {
    for (const o of [{ lat: 91 }, { lng: -181 }, { totalSlots: 0 }, { thingName: 'moto-0001' }, { openingHours: undefined }, { name: '   ' }]) {
      const res = await createStation(admin, o);
      expect(res.status).toBe(400);
      expect(res).toSatisfyApiSpec();
    }
    // 24 h sem texto vale.
    const h24 = await createStation(admin, { openingHours: undefined, open24h: true }).then(expect201);
    expect(h24.body.openingHours).toBe('Todos os dias, 24 h');

    const thing = `station-${randomUUID()}`;
    await createStation(admin, { thingName: thing }).then(expect201);
    const dup = await createStation(admin, { thingName: thing });
    expect(dup.status).toBe(409);
    expect(dup.body.type).toMatch(/thing-name-taken$/);
    // A convenção station-{id} de uma estação sem thing gravada também é dela.
    const taken = await createStation(admin, { thingName: `station-${h24.body.id}` });
    expect(taken.status).toBe(409);
  });

  it('permissões: suporte e cliente não cadastram, não listam o cadastro e não leem o QR (403)', async () => {
    const id = created[0];
    for (const token of [suporte, customer]) {
      await http().post('/swap-stations').set(bearer(token)).send(body()).expect(403);
      await http().get('/swap-stations/registry').set(bearer(token)).expect(403);
      await http().patch(`/swap-stations/${id}`).set(bearer(token)).send({ name: 'x' }).expect(403);
      await http().get(`/swap-stations/${id}/qr`).set(bearer(token)).expect(403);
    }
  });

  it('cadastro lista ativas e inativas com os campos internos (sem QR); o mapa público só as ativas', async () => {
    const id = created[0];
    await prisma.swapStation.update({ where: { id: created[1] }, data: { active: false } });
    const res = await http().get('/swap-stations/registry').set(bearer(admin)).expect(200);
    expect(res).toSatisfyApiSpec();
    const mine = res.body.items.filter((s: { id: string }) => created.includes(s.id));
    expect(mine.map((s: { id: string }) => s.id).sort()).toEqual([...created].sort());
    expect(mine.find((s: { id: string }) => s.id === created[1]).active).toBe(false);
    for (const s of res.body.items) expect(s).not.toHaveProperty('stationCode');

    const pub = await http().get('/swap-stations').set(bearer(customer)).expect(200);
    const ids = pub.body.items.map((s: { id: string }) => s.id);
    expect(ids).toContain(id);
    expect(ids).not.toContain(created[1]);
  });

  it('PATCH: edita campos, totalSlots abaixo das baterias na estação → 422, não existe → 404', async () => {
    const id = created[0];
    const res = await http().patch(`/swap-stations/${id}`).set(bearer(operacao)).send({ name: `Estação editada e2e ${tag}`, open24h: true }).expect(200);
    expect(res).toSatisfyApiSpec();
    expect(res.body).toMatchObject({ name: `Estação editada e2e ${tag}`, open24h: true, openingHours: 'Seg a sáb, 7h às 22h' });

    for (let i = 0; i < 3; i++) await prisma.battery.create({ data: { serial: `E2E-CAD-${tag}-${i}`, chargePct: 100, status: 'in_station', stationId: id } });
    const below = await http().patch(`/swap-stations/${id}`).set(bearer(operacao)).send({ totalSlots: 2 }).expect(422);
    expect(below).toSatisfyApiSpec();
    expect(below.body.type).toMatch(/slots-below-stock$/);
    const ok = await http().patch(`/swap-stations/${id}`).set(bearer(operacao)).send({ totalSlots: 3 }).expect(200);
    expect(ok.body).toMatchObject({ totalSlots: 3, batteriesInStation: 3 });

    await http().patch(`/swap-stations/${randomUUID()}`).set(bearer(admin)).send({ name: 'x' }).expect(404);
    await http().patch(`/swap-stations/${id}`).set(bearer(admin)).send({ lat: 100 }).expect(400);
  });

  it('desativar (ou trocar a thing) com troca em andamento → 409; depois de terminar → desativa e some do mapa', async () => {
    const id = created[0];
    const swap = await prisma.stationSwap.create({
      data: { stationId: id, rentalId: randomUUID(), customerId: randomUUID(), vehicleId: randomUUID(), status: 'awaiting_return', distanceM: 5, expiresAt: new Date(Date.now() + 180_000) },
    });
    const busy = await http().patch(`/swap-stations/${id}`).set(bearer(admin)).send({ active: false }).expect(409);
    expect(busy).toSatisfyApiSpec();
    expect(busy.body.type).toMatch(/station-swap-in-progress$/);
    await http().patch(`/swap-stations/${id}`).set(bearer(admin)).send({ thingName: `station-${randomUUID()}` }).expect(409);
    const reg = await http().get('/swap-stations/registry').set(bearer(admin)).expect(200);
    expect(reg.body.items.find((s: { id: string }) => s.id === id).openSwaps).toBe(1);

    await prisma.stationSwap.update({ where: { id: swap.id }, data: { status: 'completed', completedAt: new Date() } });
    const off = await http().patch(`/swap-stations/${id}`).set(bearer(admin)).send({ active: false }).expect(200);
    expect(off.body.active).toBe(false);
    const pub = await http().get('/swap-stations').set(bearer(customer)).expect(200);
    expect(pub.body.items.map((s: { id: string }) => s.id)).not.toContain(id);
    const audit = await prisma.auditLog.findFirst({ where: { action: 'swap_station.update', entityId: id }, orderBy: { createdAt: 'desc' } });
    expect(audit?.metadata).toMatchObject({ fields: ['active'], active: false });
  });

  it('galpão: PATCH /depots liga à estação (aparece em depotIds) e clearSwapStation desliga', async () => {
    const stationId = created[0];
    const depot = await http().post('/depots').set(bearer(admin)).send({
      name: `Galpão estação e2e ${tag}`, address: 'R. Galpão, 1', lat: -23.56, lng: -46.69, openingHours: [{ weekday: 1, opensAt: '08:00', closesAt: '18:00' }],
    }).expect(201);
    depotIds.push(depot.body.id);
    const linked = await http().patch(`/depots/${depot.body.id}`).set(bearer(operacao)).send({ swapStationId: stationId }).expect(200);
    expect(linked).toSatisfyApiSpec();
    expect(linked.body.swapStationId).toBe(stationId);
    let reg = await http().get('/swap-stations/registry').set(bearer(admin)).expect(200);
    expect(reg.body.items.find((s: { id: string }) => s.id === stationId).depotIds).toEqual([depot.body.id]);

    await http().patch(`/depots/${depot.body.id}`).set(bearer(operacao)).send({ swapStationId: stationId, clearSwapStation: true }).expect(400);
    const cleared = await http().patch(`/depots/${depot.body.id}`).set(bearer(operacao)).send({ clearSwapStation: true }).expect(200);
    expect(cleared).toSatisfyApiSpec();
    expect(cleared.body).not.toHaveProperty('swapStationId');
    reg = await http().get('/swap-stations/registry').set(bearer(admin)).expect(200);
    expect(reg.body.items.find((s: { id: string }) => s.id === stationId).depotIds).toEqual([]);
  });
});
