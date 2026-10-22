import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

/**
 * Índices e restrições escritos à mão na migração (o Prisma não modela os parciais/expressões nem os CHECK;
 * um `migrate dev` descuidado poderia removê-los). O setup de e2e/contrato falha se algum sumir.
 */
export const HAND_WRITTEN_INDEXES = [
  'Zone_geom_gist',
  'Vehicle_position_gist',
  'Reservation_one_active_per_customer',
  'Reservation_one_active_per_vehicle',
  'Rental_one_open_per_customer',
  'Rental_one_open_per_vehicle',
  'PricingPlan_one_active_per_code',
  'Subscription_one_active_per_customer',
  // Contrato v2: uma assinatura aberta (ativa ou pausada) por cliente e uma por moto fixa.
  'Subscription_one_open_per_customer',
  'Subscription_one_open_per_vehicle',
  'Dispute_one_open_per_rental',
  // Retirada em galpão: uma chegada não cancelada por aluguel; uma saída pendente ou aceita por reserva.
  'Handover_one_open_return_per_rental',
  'Handover_one_open_pickup_per_reservation',
];
export const HAND_WRITTEN_CHECKS = ['Vehicle_speed_limit_range', 'Zone_speed_limit_range', 'Rental_speed_limit_range', 'Handover_battery_pct_range', 'Depot_windows_range', 'Handover_type_reference'];

export async function assertHandWrittenSchema(prisma: PrismaClient): Promise<void> {
  const idx = await prisma.$queryRaw<Array<{ indexname: string }>>`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`;
  const checks = await prisma.$queryRaw<Array<{ conname: string }>>`SELECT conname FROM pg_constraint WHERE contype = 'c'`;
  const missing = [
    ...HAND_WRITTEN_INDEXES.filter((n) => !idx.some((r) => r.indexname === n)),
    ...HAND_WRITTEN_CHECKS.filter((n) => !checks.some((r) => r.conname === n)),
  ];
  if (missing.length) {
    throw new Error(`Índices/restrições da migração ausentes: ${missing.join(', ')}. Rode "prisma migrate deploy" e não aceite migrações que os removam.`);
  }
}

/** Sobe a API completa (AppModule) contra o Postgres/Redis do compose. */
export async function bootE2eApp(): Promise<{ app: INestApplication; prisma: PrismaClient }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  const prisma = new PrismaClient();
  await prisma.$connect();
  await assertHandWrittenSchema(prisma);
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

/**
 * QA-22: moto livre numa zona de devolução, criada pelo próprio teste (código e thing únicos). Não depende das motos do
 * seed, que o simulador de rastreadores (`moto-0001…`) aluga, destrava e move; e o simulador ignora a thing `e2e-*`.
 * Posição fixa no centro da zona de devolução "MASP (Av. Paulista)" do seed (`RETURN_ZONES`).
 */
export async function freeVehicleInReturnZone(prisma: PrismaClient): Promise<{ id: string; code: string }> {
  const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.toUpperCase();
  return prisma.vehicle.create({
    data: { code: `E2E-${tag}`, thingName: `e2e-thing-${tag.toLowerCase()}`, model: 'Volti S1', lat: -23.5614, lng: -46.6559, batteryPct: 95, status: 'free', locked: true },
    select: { id: true, code: true },
  });
}
