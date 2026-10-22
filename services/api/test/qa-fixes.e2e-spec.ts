import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { IOT_GATEWAY, type IotGateway } from '../src/ports/iot-gateway.port';
import { approvedCustomer, bootE2eApp, devToken, freeVehicleInReturnZone } from './helpers/e2e-app';

/** Regressões dos achados do relatório de QA (docs/relatorio-qa.md) contra a API completa (Postgres/Redis do compose). */
describe('Correções do QA (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
  });
  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('QA-04: tirar o grupo de um usuário interno no painel revoga o acesso na requisição seguinte', async () => {
    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const email = `qa04-${tag}@volti.dev`;
    const created = await http().post('/staff').set('Authorization', `Bearer ${admin}`).send({ email, name: 'QA 04', groups: ['operacao'] }).expect(201);
    const token = await devToken(app, { sub: `qa04-${tag}`, email, groups: ['operacao'], pool: 'staff' });
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { code: 'VLT-0040' } });
    // operacao lê os comandos da moto
    await http().get(`/vehicles/${vehicle.id}/commands`).set('Authorization', `Bearer ${token}`).expect(200);

    await http().patch(`/staff/${created.body.id}`).set('Authorization', `Bearer ${admin}`).send({ groups: ['campo'] }).expect(200);
    // mesmo token (ainda com operacao): negado, e o banco não volta para operacao
    await http().get(`/vehicles/${vehicle.id}/commands`).set('Authorization', `Bearer ${token}`).expect(403);
    expect((await prisma.staffUser.findUniqueOrThrow({ where: { id: created.body.id } })).groups).toEqual(['campo']);
  });

  it('QA-21: moto offline → 409 vehicle-offline, sem aluguel nem caução retida', async () => {
    const { token, customerId } = await approvedCustomer(app, prisma, 'qa21');
    const v = await freeVehicleInReturnZone(prisma);
    await prisma.vehicle.update({ where: { id: v.id }, data: { online: false } });
    try {
      const res = await http().post('/rentals').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', `qa21-${Date.now()}`)
        .send({ vehicleId: v.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' });
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-offline');
      expect(await prisma.rental.count({ where: { customerId } })).toBe(0);
      expect(await prisma.deposit.count({ where: { customerId, status: 'held' } })).toBe(0);
      expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('free');
    } finally {
      await prisma.vehicle.update({ where: { id: v.id }, data: { online: true } });
    }
  });

  it('QA-21 (fix round 1): desbloqueio não confirmado → 409; repetir com a mesma chave não começa aluguel nem cobra', async () => {
    const { token, customerId } = await approvedCustomer(app, prisma, 'qa21-retry');
    const auth = { Authorization: `Bearer ${token}` };
    await http().post('/payments/cards').set(auth).set('Idempotency-Key', `card-${Date.now()}`).send({ cardToken: 'tok_visa_4242' }).expect(201);
    const v = await freeVehicleInReturnZone(prisma);
    const gateway = app.get<IotGateway>(IOT_GATEWAY);
    const spy = jest.spyOn(gateway, 'unlock').mockImplementation(async (req) => ({ commandId: req.commandId, status: 'pending', reason: 'offline' }));
    try {
      const key = `qa21-retry-${Date.now()}`;
      const body = { vehicleId: v.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' };
      const first = await http().post('/rentals').set(auth).set('Idempotency-Key', key).send(body);
      expect(first.status).toBe(409);
      expect(first.body.type).toBe('https://api.volti.com.br/problems/vehicle-offline');
      spy.mockRestore();
      const retry = await http().post('/rentals').set(auth).set('Idempotency-Key', key).send(body);
      expect(retry.status).toBe(402);
      expect(retry.body.type).toBe('https://api.volti.com.br/problems/deposit-not-held');
      expect(await prisma.rental.count({ where: { customerId } })).toBe(0);
      expect(await prisma.payment.count({ where: { customerId, kind: { in: ['rental', 'fee'] } } })).toBe(0);
      expect(await prisma.deposit.count({ where: { customerId, status: 'held' } })).toBe(0);
      expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).status).toBe('free');
    } finally {
      spy.mockRestore();
    }
  });

  it('QA-07: depois da exclusão LGPD o mesmo token é recusado e não recria a conta', async () => {
    const sub = `qa07-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const token = await devToken(app, { sub, email: `${sub}@example.com`, groups: [], pool: 'customer' });
    const me = await http().get('/me').set('Authorization', `Bearer ${token}`).expect(200);
    await http().delete('/lgpd/account').set('Authorization', `Bearer ${token}`).expect(202);
    await http().get('/me').set('Authorization', `Bearer ${token}`).expect(401);
    await http().patch('/me').set('Authorization', `Bearer ${token}`).send({ name: 'Regravado' }).expect(401);
    expect(await prisma.customer.count({ where: { cognitoSub: sub } })).toBe(0);
    const row = await prisma.customer.findUniqueOrThrow({ where: { id: me.body.id } });
    expect(row.cognitoSub).toMatch(/^deleted:[0-9a-f]{64}$/);
    expect(row.name).toBe('Cliente removido');
  });
});
