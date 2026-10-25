import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { approvedCustomer, bootE2eApp, devToken, freeVehicleInReturnZone } from './helpers/e2e-app';

/**
 * Lacunas T5 — SOS: link público de localização compartilhada. Sem autenticação; só a última posição e o horário, enquanto o
 * link estiver na validade, o aluguel aberto e o consentimento de localização mantido; nenhum dado pessoal; rate limit.
 */
describe('Localização compartilhada (link público do SOS)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: string;
  const http = () => request(app.getHttpServer());
  // IP próprio desta execução (TRUST_PROXY=1): o contador do rate limit no Redis não depende de execuções anteriores.
  const runIp = `203.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
  const pub = (path: string) => request(app.getHttpServer()).get(path).set('X-Forwarded-For', runIp);
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  const savedTrustProxy = process.env.TRUST_PROXY;
  beforeAll(async () => {
    // Um salto de proxy confiável (como o ALB): o teste de rate limit usa um IP próprio e não esgota o limite de 127.0.0.1
    // para as outras suítes (o contador fica no Redis compartilhado por um minuto).
    process.env.TRUST_PROXY = '1';
    ({ app, prisma } = await bootE2eApp());
    admin = await devToken(app, { sub: 'dev-admin-share-e2e', email: 'admin-share-e2e@volti.dev', groups: ['admin'], pool: 'staff' });
  });
  afterAll(async () => {
    if (savedTrustProxy === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = savedTrustProxy;
    await prisma?.$disconnect();
    await app?.close();
  });

  async function rentalWithShare(tag: string) {
    const c = await approvedCustomer(app, prisma, tag);
    await http().post('/payments/cards').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);
    const vehicle = await freeVehicleInReturnZone(prisma);
    const start = await http().post('/rentals').set(bearer(c.token)).set('Idempotency-Key', randomUUID()).send({ vehicleId: vehicle.id, planCode: 'hour', coverage: 'full', depositMethod: 'card' });
    expect(start.status).toBe(201);
    const rentalId = start.body.rental.id as string;
    const seenAt = new Date(Date.now() - 20_000);
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { lat: -23.5614, lng: -46.6559, lastSeenAt: seenAt } });
    const share = await http().post(`/rentals/${rentalId}/location-share`).set(bearer(c.token)).send({ durationMinutes: 30 }).expect(201);
    const token = String(share.body.url).split('/').pop()!;
    return { ...c, rentalId, vehicleId: vehicle.id, token, url: share.body.url as string, seenAt };
  }

  it('link criado aponta para a página pública; a rota JSON devolve só posição, horário e validade (sem dado pessoal)', async () => {
    const s = await rentalWithShare('share-ok');
    expect(s.url.startsWith(`${(process.env.PUBLIC_SHARE_BASE_URL ?? 'http://localhost:3000/share').replace(/\/$/, '')}/`)).toBe(true);
    const res = await pub(`/public/location-shares/${s.token}`).expect(200);
    expect(Object.keys(res.body).sort()).toEqual(['expiresAt', 'lat', 'lng', 'recordedAt']);
    expect(res.body).toMatchObject({ lat: -23.5614, lng: -46.6559, recordedAt: s.seenAt.toISOString() });
    expect(JSON.stringify(res.body)).not.toMatch(/Cliente E2E|@example\.com|E2E-|e2e-thing/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-robots-tag']).toMatch(/noindex/);
  });

  it('página HTML: pt-BR, script só com nonce (CSP), sem cache, lê a rota JSON relativa', async () => {
    const s = await rentalWithShare('share-page');
    const res = await pub(`/share/${s.token}`).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    const csp = res.headers['content-security-policy'] as string;
    const nonce = /script-src 'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce).toBeTruthy();
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.text).toContain('<html lang="pt-BR">');
    expect(res.text).toContain(`<script nonce="${nonce}">`);
    expect(res.text).toContain('Localização compartilhada');
    expect(res.text).toContain("'../public/location-shares/'");
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('aluguel encerrado, consentimento revogado, link expirado ou desconhecido → o mesmo 404', async () => {
    const ended = await rentalWithShare('share-ended');
    await http().post(`/rentals/${ended.rentalId}/force-end`).set(bearer(admin)).send({ reason: 'Teste do link público' }).expect(200);
    const r1 = await pub(`/public/location-shares/${ended.token}`).expect(404);

    const revoked = await rentalWithShare('share-revoked');
    await prisma.customer.update({ where: { id: revoked.customerId }, data: { locationConsent: false } });
    const r2 = await pub(`/public/location-shares/${revoked.token}`).expect(404);

    const expired = await rentalWithShare('share-expired');
    await prisma.locationShare.update({ where: { token: expired.token }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const r3 = await pub(`/public/location-shares/${expired.token}`).expect(404);

    const r4 = await pub(`/public/location-shares/${'x'.repeat(32)}`).expect(404);
    const r5 = await pub('/public/location-shares/curto').expect(404);
    for (const r of [r2, r3, r4, r5]) expect(r.body.detail).toBe(r1.body.detail);
  });

  it('rate limit por IP: depois de 30 consultas por minuto → 429', async () => {
    const s = await rentalWithShare('share-rate');
    const ip = `198.51.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await pub(`/public/location-shares/${s.token}`).set('X-Forwarded-For', ip)).status;
    expect(last).toBe(429);
  });
});
