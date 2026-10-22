import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Massa da agenda direto no banco da API (`E2E_DATABASE_URL`, o mesmo `DATABASE_URL` da API do e2e).
 *
 * TODO(galpão Task 5): trocar por `POST /reservations` com `depotId` quando a reserva de galpão entrar em
 * feat/galpao. Até lá não existe rota que crie reserva de galpão, então o teste grava a linha com o Prisma Client
 * gerado em services/api (só leitura do schema; nada de serviço da API é chamado).
 */
export const DB_URL = process.env.E2E_DATABASE_URL;

interface PrismaLike {
  customer: { create(a: unknown): Promise<{ id: string }>; delete(a: unknown): Promise<unknown> };
  reservation: { create(a: unknown): Promise<{ id: string }>; delete(a: unknown): Promise<unknown> };
  $disconnect(): Promise<void>;
}

function client(): PrismaLike {
  const req = createRequire(path.resolve(__dirname, '../../../services/api/package.json'));
  const { PrismaClient } = req('@prisma/client') as { PrismaClient: new (o: unknown) => PrismaLike };
  return new PrismaClient({ datasources: { db: { url: DB_URL } } });
}

/** Reserva "retirar agora" criada agora (entra na agenda de hoje) com um cliente de nome completo. */
export async function insertNowReservation(opts: { depotId: string; vehicleId: string; customerName: string }): Promise<{ id: string; cleanup: () => Promise<void> }> {
  const prisma = client();
  const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const customer = await prisma.customer.create({ data: { cognitoSub: `e2e-galpao-${tag}`, email: `e2e-galpao-${tag}@e2e.volti.dev`, name: opts.customerName } });
  const reservation = await prisma.reservation.create({
    data: {
      customerId: customer.id, vehicleId: opts.vehicleId, depotId: opts.depotId, status: 'active', pickupMode: 'now',
      planCode: 'day', coverage: 'basic', depositMethod: 'card', expiresAt: new Date(Date.now() + 120 * 60_000),
    },
  });
  return {
    id: reservation.id,
    cleanup: async () => {
      await prisma.reservation.delete({ where: { id: reservation.id } });
      await prisma.customer.delete({ where: { id: customer.id } });
      await prisma.$disconnect();
    },
  };
}
