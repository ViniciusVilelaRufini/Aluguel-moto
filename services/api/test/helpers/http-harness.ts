import { INestApplication, ModuleMetadata, Provider } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { DevAuthVerifier } from '../../src/adapters/auth/dev-auth-verifier';
import { configureApp } from '../../src/bootstrap';
import { IdempotencyInterceptor } from '../../src/common/idempotency/idempotency.interceptor';
import { IDEMPOTENCY_STORE, MemoryIdempotencyStore } from '../../src/common/idempotency/idempotency.store';
import { APP_CONFIG, loadConfig } from '../../src/config/env';
import { AuditService } from '../../src/modules/audit/audit.service';
import { AuthGuard } from '../../src/modules/auth/auth.guard';
import type { Principal } from '../../src/modules/auth/principal';
import { PrincipalResolver } from '../../src/modules/auth/principal-resolver.service';
import { AUTH_VERIFIER, VerifiedToken } from '../../src/ports/auth-verifier.port';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MemoryRedisStore, REDIS_STORE } from '../../src/redis/redis-store';
import type { StaffGroup } from '../../src/common/enums';

export const TEST_SECRET = process.env.DEV_JWT_SECRET ?? 'segredo-de-teste-com-32-caracteres!!';
const verifier = new DevAuthVerifier(TEST_SECRET);

export const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
export const STAFF_ID = '22222222-2222-4222-8222-222222222222';

export async function customerToken(sub = 'cliente-teste'): Promise<string> {
  return verifier.issue({ sub, email: `${sub}@example.com`, groups: [], pool: 'customer' });
}
export async function staffToken(groups: StaffGroup[], sub = 'staff-teste'): Promise<string> {
  return verifier.issue({ sub, email: `${sub}@volti.com.br`, groups, pool: 'staff' });
}

/** Resolve o principal sem banco: clientes → CUSTOMER_ID, staff → STAFF_ID. */
class FakeResolver {
  async resolve(t: VerifiedToken): Promise<Principal> {
    return t.pool === 'customer'
      ? { pool: 'customer', sub: t.sub, email: t.email, groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID }
      : { pool: 'staff', sub: t.sub, email: t.email, groups: t.groups, userId: STAFF_ID, staffId: STAFF_ID };
  }
}

export interface Harness {
  app: INestApplication;
  prisma: DeepMockProxy<PrismaClient>;
}

/** App HTTP real (guard, validação, filtro RFC 7807, idempotência) com Prisma mockado. */
export async function createHarness(meta: { controllers: ModuleMetadata['controllers']; providers?: Provider[] }): Promise<Harness> {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  const moduleRef = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot()],
    controllers: meta.controllers,
    providers: [
      { provide: APP_CONFIG, useFactory: loadConfig },
      { provide: PrismaService, useValue: prisma },
      { provide: AUTH_VERIFIER, useValue: verifier },
      { provide: PrincipalResolver, useClass: FakeResolver },
      { provide: IDEMPOTENCY_STORE, useValue: new MemoryIdempotencyStore() },
      { provide: REDIS_STORE, useValue: new MemoryRedisStore() },
      AuditService,
      { provide: APP_GUARD, useClass: AuthGuard },
      { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
      ...(meta.providers ?? []),
    ],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return { app, prisma };
}
