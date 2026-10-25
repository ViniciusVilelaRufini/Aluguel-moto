import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import request from 'supertest';
import { loadSpecAs30 } from './contract/openapi-30';
import { bootE2eApp, devToken } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);

/**
 * Ciclo de vida das baterias no galpão (docs/decisoes.md, 2026-10-24): cadastrar → van → descarregar no galpão →
 * mark-charged → carregar a van → defeito → baixa, com movimentações e o alerta de estoque mínimo (um aberto por galpão).
 * Galpão e baterias próprios do teste (não mexe nos do seed).
 */
describe('Baterias no galpão (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: string;
  let campo: string;
  let suporte: string;
  let financeiro: string;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const tag = Date.now().toString(36).toUpperCase();
  const serialA = `E2E-GB-${tag}-A`;
  const serialB = `E2E-GB-${tag}-B`;
  let depotId: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
    campo = await devToken(app, { sub: `e2e-campo-${tag}`, email: `campo-${tag}@volti.dev`, groups: ['campo'], pool: 'staff' });
    suporte = await devToken(app, { sub: `e2e-suporte-${tag}`, email: `suporte-${tag}@volti.dev`, groups: ['suporte'], pool: 'staff' });
    financeiro = await devToken(app, { sub: `e2e-fin-${tag}`, email: `fin-${tag}@volti.dev`, groups: ['financeiro'], pool: 'staff' });
    const depot = await prisma.depot.create({
      data: { name: `Galpão e2e baterias ${tag}`, address: 'R. Teste, 10', lat: -23.56, lng: -46.69, openingHours: [{ weekday: 1, opensAt: '08:00', closesAt: '20:00' }] },
    });
    depotId = depot.id;
  });

  afterAll(async () => {
    const bats = await prisma.battery.findMany({ where: { serial: { startsWith: `E2E-GB-${tag}` } }, select: { id: true } });
    await prisma.batteryMovement.deleteMany({ where: { batteryId: { in: bats.map((b) => b.id) } } });
    await prisma.battery.deleteMany({ where: { id: { in: bats.map((b) => b.id) } } });
    await prisma.alert.deleteMany({ where: { depotId } });
    await prisma.depot.delete({ where: { id: depotId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('ciclo completo com movimentações, contagem por status e alerta de estoque (deduplicado)', async () => {
    // Estoque mínimo do galpão (só staff vê).
    const patched = await http().patch(`/depots/${depotId}`).set(bearer(admin)).send({ minChargedBatteries: 2 }).expect(200);
    expect(patched.body).toMatchObject({ minChargedBatteries: 2 });
    expect(patched).toSatisfyApiSpec();

    // Cadastro: A carregando, B carregada. Série duplicada → 409; `campo` não cadastra.
    const a = await http().post('/batteries').set(bearer(admin)).send({ serial: serialA, status: 'charging', depotId, chargePct: 35 }).expect(201);
    expect(a.body).toMatchObject({ serial: serialA, status: 'charging', depotId, chargePct: 35 });
    expect(a).toSatisfyApiSpec();
    const b = await http().post('/batteries').set(bearer(admin)).send({ serial: serialB, status: 'charged', depotId }).expect(201);
    expect(b.body).toMatchObject({ status: 'charged', chargePct: 100 });
    await http().post('/batteries').set(bearer(admin)).send({ serial: serialA, status: 'charged', depotId }).expect(409);
    await http().post('/batteries').set(bearer(campo)).send({ serial: `${serialA}-X`, status: 'charged', depotId }).expect(403);

    // Lista por galpão com contagem por status.
    const list = await http().get('/batteries').query({ depotId }).set(bearer(campo)).expect(200);
    expect(list.body.items.map((x: { serial: string }) => x.serial).sort()).toEqual([serialA, serialB]);
    expect(list.body.statusCounts).toMatchObject({ charging: 1, charged: 1, defective: 0 });
    expect(list).toSatisfyApiSpec();

    // A vai para a van (ainda carregando: volta em loadedChargingSerials com a carga conhecida).
    const loaded = await http().post('/batteries/van-stock/load').set(bearer(campo)).send({ serials: [serialA] }).expect(200);
    expect(loaded.body.loadedChargingSerials).toEqual([serialA]);
    expect(loaded.body.items.find((x: { serial: string }) => x.serial === serialA)).toMatchObject({ status: 'in_van', chargePct: 35 });
    expect(loaded).toSatisfyApiSpec();

    // Descarrega no galpão (depotId explícito): charging com depotId.
    const unloaded = await http().post('/batteries/van-stock/unload').set(bearer(campo)).send({ serials: [serialA], depotId }).expect(200);
    expect(unloaded).toSatisfyApiSpec();
    expect(await prisma.battery.findUnique({ where: { serial: serialA } })).toMatchObject({ status: 'charging', depotId, holderId: null });

    // mark-charged: charging → charged (100). De novo → 409.
    const charged = await http().post(`/batteries/${a.body.id}/mark-charged`).set(bearer(campo)).expect(200);
    expect(charged.body).toMatchObject({ status: 'charged', chargePct: 100, depotId });
    expect(charged).toSatisfyApiSpec();
    await http().post(`/batteries/${a.body.id}/mark-charged`).set(bearer(campo)).expect(409);

    // Carrega A na van: galpão fica com 1 charged (< 2) → alerta battery_stock_low.
    const loaded2 = await http().post('/batteries/van-stock/load').set(bearer(campo)).send({ serials: [serialA] }).expect(200);
    expect(loaded2.body).not.toHaveProperty('loadedChargingSerials');
    let alerts = await prisma.alert.findMany({ where: { depotId, type: 'battery_stock_low' } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ status: 'open', priority: 'medium' });
    const alertView = await http().get(`/alerts/${alerts[0].id}`).set(bearer(admin)).expect(200);
    expect(alertView.body).toMatchObject({ type: 'battery_stock_low', depotId });
    expect(alertView).toSatisfyApiSpec();

    // Defeito: na van → defective (motivo); em moto seria 409. Saída de B (charged → defective) não duplica o alerta.
    const defA = await http().post(`/batteries/${a.body.id}/report-defect`).set(bearer(campo)).send({ reason: 'Carcaça trincada' }).expect(200);
    expect(defA.body).toMatchObject({ status: 'defective' });
    expect(defA).toSatisfyApiSpec();
    await http().post(`/batteries/${b.body.id}/report-defect`).set(bearer(campo)).send({ reason: 'Inchada' }).expect(200);
    alerts = await prisma.alert.findMany({ where: { depotId, type: 'battery_stock_low' } });
    expect(alerts).toHaveLength(1);
    await http().post(`/batteries/${a.body.id}/report-defect`).set(bearer(campo)).send({ reason: 'De novo' }).expect(409);

    // Bateria com defeito não volta para a van.
    await http().post('/batteries/van-stock/load').set(bearer(campo)).send({ serials: [serialB] }).expect(409);

    // Baixa: só admin/operacao. Depois de baixada, nova baixa → 409.
    await http().post(`/batteries/${a.body.id}/retire`).set(bearer(campo)).send({}).expect(403);
    const retired = await http().post(`/batteries/${a.body.id}/retire`).set(bearer(admin)).send({ reason: 'Sem conserto' }).expect(200);
    expect(retired.body).toMatchObject({ status: 'retired' });
    expect(retired.body).not.toHaveProperty('depotId');
    expect(retired.body).not.toHaveProperty('holderId');
    expect(retired).toSatisfyApiSpec();
    await http().post(`/batteries/${a.body.id}/retire`).set(bearer(admin)).expect(409);

    // Histórico de A: mais recente primeiro, cobrindo o ciclo todo; suporte lê, financeiro não.
    const mv = await http().get(`/batteries/${a.body.id}/movements`).set(bearer(suporte)).expect(200);
    expect(mv).toSatisfyApiSpec();
    expect(mv.body.items.map((m: { fromStatus?: string; toStatus: string }) => `${m.fromStatus ?? '-'}>${m.toStatus}`)).toEqual([
      'defective>retired',
      'in_van>defective',
      'charged>in_van',
      'charging>charged',
      'in_van>charging',
      'charging>in_van',
      '->charging',
    ]);
    expect(mv.body.items[0]).toMatchObject({ reason: 'Sem conserto' });
    expect(mv.body.items[1]).toMatchObject({ reason: 'Carcaça trincada' });
    expect(mv.body.items[2]).toMatchObject({ depotId });
    const page = await http().get(`/batteries/${a.body.id}/movements`).query({ limit: 3 }).set(bearer(admin)).expect(200);
    expect(page.body.items).toHaveLength(3);
    const next = await http().get(`/batteries/${a.body.id}/movements`).query({ limit: 3, cursor: page.body.nextCursor }).set(bearer(admin)).expect(200);
    expect(next.body.items[0].toStatus).toBe('charged');
    await http().get(`/batteries/${a.body.id}/movements`).set(bearer(financeiro)).expect(403);
    await http().get('/batteries/00000000-0000-4000-8000-000000000000/movements').set(bearer(admin)).expect(404);
  });
});
