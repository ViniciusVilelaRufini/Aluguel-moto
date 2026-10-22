import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import jestOpenAPI from 'jest-openapi';
import request from 'supertest';
import { loadSpecAs30 } from './contract/openapi-30';
import { approvedCustomer, bootE2eApp, devToken } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);

/** Campos públicos de `SwapStation` (docs/decisoes.md, 2026-10-22: "Troca de bateria" na home do cliente). */
const PUBLIC_FIELDS = ['id', 'name', 'address', 'lat', 'lng', 'availableBatteries', 'totalSlots', 'openingHours', 'open24h', 'distanceM'];

describe('GET /swap-stations para o cliente (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const inactiveName = `Estação inativa e2e ${Date.now()}`;

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    await prisma.swapStation.create({
      data: { name: inactiveName, address: 'R. Interna, 1', lat: -23.5667, lng: -46.6935, availableBatteries: 9, totalSlots: 10, openingHours: '24h', active: false },
    });
  });
  afterAll(async () => {
    await prisma?.swapStation.deleteMany({ where: { name: inactiveName } });
    await prisma?.$disconnect();
    await app?.close();
  });

  it('cliente sem grupo lê as estações (200) só com campos públicos e sem as inativas', async () => {
    const { token } = await approvedCustomer(app, prisma, 'swap-public');
    for (const url of ['/swap-stations', '/swap-stations?lat=-23.5667&lng=-46.6935&radiusM=5000']) {
      const res = await http().get(url).set(bearer(token)).expect(200);
      expect(res).toSatisfyApiSpec();
      expect(res.body.items.length).toBeGreaterThan(0);
      for (const s of res.body.items) {
        expect(PUBLIC_FIELDS).toEqual(expect.arrayContaining(Object.keys(s)));
        expect(s).not.toHaveProperty('active');
        expect(s).not.toHaveProperty('createdAt');
        expect(s).not.toHaveProperty('updatedAt');
        expect(s.name).not.toBe(inactiveName);
      }
    }
  });

  it('cliente ainda sem KYC aprovado também lê (só leitura do mapa); sem token → 401', async () => {
    const token = await devToken(app, { sub: `swap-novo-${Date.now()}`, email: `swap-novo-${Date.now()}@volti.dev`, groups: [], pool: 'customer' });
    await http().get('/swap-stations').set(bearer(token)).expect(200);
    await http().get('/swap-stations').expect(401);
  });

  it('cliente não escreve em estações: a rota só tem GET', async () => {
    const { token } = await approvedCustomer(app, prisma, 'swap-write');
    const res = await http().post('/swap-stations').set(bearer(token)).send({ name: 'x' });
    expect([403, 404, 405]).toContain(res.status);
  });

  it('staff sem grupo permitido (financeiro) continua 403', async () => {
    const fin = await devToken(app, { sub: 'dev-financeiro', email: 'financeiro@volti.dev', groups: ['financeiro'], pool: 'staff' });
    await http().get('/swap-stations').set(bearer(fin)).expect(403);
  });
});
