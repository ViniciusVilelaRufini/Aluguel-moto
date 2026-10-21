import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { approvedCustomer, bootE2eApp, devToken } from './helpers/e2e-app';

/**
 * Relatórios contra o Postgres real. Colunas são `timestamp(3)` em UTC; o agrupamento é no fuso America/Sao_Paulo (UTC−3).
 * Usa uma janela em 2020 para não colidir com os demais testes.
 */
describe('Relatórios (e2e, fuso America/Sao_Paulo)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: string;
  let vehicleId: string;
  const http = () => request(app.getHttpServer());
  const from = '2020-03-13T00:00:00.000Z';
  const to = '2020-03-17T00:00:00.000Z';

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
    const { customerId } = await approvedCustomer(app, prisma, 'reports');
    const v = await prisma.vehicle.findFirstOrThrow({ where: { code: 'VLT-0060' } });
    vehicleId = v.id;
    // Limpa execuções anteriores na janela.
    const old = await prisma.rental.findMany({ where: { endedAt: { gte: new Date(from), lt: new Date(to) } }, select: { id: true } });
    await prisma.rentalEvent.deleteMany({ where: { rentalId: { in: old.map((r) => r.id) } } });
    await prisma.rental.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });
    const deposit = await prisma.deposit.create({ data: { customerId, method: 'card', status: 'captured', amountCents: 5000 } });
    const snapshot = { planCode: 'minute', unit: 'minute', unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, insurancePremiumCents: 200 };
    const breakdown = { lines: [], subtotalCents: 1090, discountCents: 0, insuranceCents: 200, feesCents: 0, totalCents: 1290 };
    // 01:30 UTC de 15/03 = 22:30 de 14/03 em São Paulo.
    await prisma.rental.create({
      data: {
        customerId, vehicleId, planCode: 'minute', coverage: 'basic', status: 'ended', depositId: deposit.id, priceSnapshot: snapshot, breakdown, costCents: 1290,
        startedAt: new Date('2020-03-15T01:20:00.000Z'), endRequestedAt: new Date('2020-03-15T01:30:00.000Z'), endedAt: new Date('2020-03-15T01:30:00.000Z'),
        startLat: -23.5614, startLng: -46.6559,
      },
    });
    // 12:00 UTC de 15/03 = 09:00 de 15/03 em São Paulo.
    await prisma.rental.create({
      data: {
        customerId, vehicleId, planCode: 'minute', coverage: 'basic', status: 'ended', depositId: deposit.id, priceSnapshot: snapshot, breakdown, costCents: 1290,
        startedAt: new Date('2020-03-15T11:50:00.000Z'), endRequestedAt: new Date('2020-03-15T12:00:00.000Z'), endedAt: new Date('2020-03-15T12:00:00.000Z'),
        startLat: -23.5614, startLng: -46.6559,
      },
    });
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('receita por dia: aluguel que termina 01:30 UTC cai no dia anterior de São Paulo', async () => {
    const res = await http().get(`/reports/revenue?from=${from}&to=${to}&groupBy=day`).set('Authorization', `Bearer ${admin}`).expect(200);
    const byDay = Object.fromEntries(res.body.rows.map((r: { periodStart: string; rentals: number }) => [r.periodStart, r.rentals]));
    // Meia-noite de São Paulo = 03:00 UTC.
    expect(byDay).toEqual({ '2020-03-14T03:00:00.000Z': 1, '2020-03-15T03:00:00.000Z': 1 });
    expect(res.body.totalNetCents).toBe(2580);
  });

  it('receita por moto por dia usa a data local', async () => {
    const res = await http().get(`/reports/revenue-per-vehicle?from=${from}&to=${to}&vehicleId=${vehicleId}`).set('Authorization', `Bearer ${admin}`).expect(200);
    expect(res.body.rows.map((r: { date: string }) => r.date)).toEqual(['2020-03-14', '2020-03-15']);
    expect(res.body.rows[0].rentedSeconds).toBe(600);
  });

  it('ocupação por dia: períodos alinhados à meia-noite de São Paulo', async () => {
    const res = await http().get(`/reports/occupancy?from=${from}&to=${to}&groupBy=day`).set('Authorization', `Bearer ${admin}`).expect(200);
    const rows = res.body.rows as Array<{ periodStart: string; vehiclesRented: number }>;
    expect(rows.every((r) => r.periodStart.endsWith('T03:00:00.000Z'))).toBe(true);
    const day14 = rows.find((r) => r.periodStart === '2020-03-14T03:00:00.000Z')!;
    const day15 = rows.find((r) => r.periodStart === '2020-03-15T03:00:00.000Z')!;
    expect(day14.vehiclesRented).toBeGreaterThanOrEqual(1);
    expect(day15.vehiclesRented).toBeGreaterThanOrEqual(1);
  });

  it('mapa de calor, financeiro e CSV respondem', async () => {
    const heat = await http().get(`/reports/demand-heatmap?from=${from}&to=${to}`).set('Authorization', `Bearer ${admin}`).expect(200);
    expect(heat.body.points).toContainEqual({ lat: -23.561, lng: -46.656, weight: 2 });
    const fin = await http().get(`/reports/finance?from=${from}&to=${to}`).set('Authorization', `Bearer ${admin}`).expect(200);
    expect(fin.body.totalRevenueCents).toBe(2580);
    const csv = await http().get(`/reports/revenue?from=${from}&to=${to}&format=csv`).set('Authorization', `Bearer ${admin}`).expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text.split('\n')[0]).toContain('periodStart;planCode');
  });
});
