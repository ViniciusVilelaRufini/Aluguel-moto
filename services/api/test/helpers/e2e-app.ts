import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

/** Sobe a API completa (AppModule) contra o Postgres/Redis do compose. */
export async function bootE2eApp(): Promise<{ app: INestApplication; prisma: PrismaClient }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  const prisma = new PrismaClient();
  await prisma.$connect();
  return { app, prisma };
}

export async function devToken(app: INestApplication, body: { sub: string; email: string; groups: string[]; pool: 'customer' | 'staff' }): Promise<string> {
  const res = await request(app.getHttpServer()).post('/dev/token').send(body).expect(200);
  return res.body.accessToken as string;
}

/** Cliente novo (sub único), com KYC aprovado e consentimento de localização. */
export async function approvedCustomer(app: INestApplication, prisma: PrismaClient, tag: string): Promise<{ token: string; customerId: string }> {
  const sub = `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const token = await devToken(app, { sub, email: `${sub}@example.com`, groups: [], pool: 'customer' });
  const me = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`).expect(200);
  const now = new Date();
  await prisma.customer.update({
    where: { id: me.body.id },
    data: { kycStatus: 'approved', name: 'Cliente E2E', termsAccepted: true, termsVersion: '2026-10', termsAcceptedAt: now, locationConsent: true, locationConsentUpdatedAt: now },
  });
  return { token, customerId: me.body.id };
}

/** Moto livre posicionada numa zona de devolução (seed: VLT-0001…0006). */
export async function freeVehicleInReturnZone(prisma: PrismaClient): Promise<{ id: string; code: string }> {
  const codes = ['VLT-0001', 'VLT-0002', 'VLT-0003', 'VLT-0004', 'VLT-0005', 'VLT-0006'];
  const v = await prisma.vehicle.findFirst({ where: { code: { in: codes }, status: 'free' }, select: { id: true, code: true } });
  if (!v) throw new Error('Nenhuma moto livre em zona de devolução — rode o seed (pnpm --filter api prisma db seed).');
  return v;
}
