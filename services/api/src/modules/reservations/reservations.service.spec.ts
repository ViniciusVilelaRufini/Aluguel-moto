import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import { EV } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { ReservationsService } from './reservations.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const RES_ID = '55555555-5555-4555-8555-555555555555';

const approvedCustomer = { id: CUSTOMER_ID, kycStatus: 'approved', status: 'active', delinquent: false };
const vehicle = { id: VEHICLE_ID, code: 'VLT-0001', model: 'Volti S1', status: 'free', lat: -23.56, lng: -46.69, batteryPct: 80 };

function setup(ttlSeconds = 900) {
  const prisma: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const redis = new MemoryRedisStore();
  const billing = { isDelinquent: jest.fn().mockResolvedValue(false), holdDeposit: jest.fn(), settle: jest.fn() };
  const events = new EventEmitter2();
  const cfg = { ...loadConfig(), reservationTtlSeconds: ttlSeconds };
  const service = new ReservationsService(prisma as any, redis, billing, events, cfg);
  prisma.customer.findUnique.mockResolvedValue(approvedCustomer as any);
  prisma.reservation.findFirst.mockResolvedValue(null);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.vehicle.findUnique.mockResolvedValue(vehicle as any);
  prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
  prisma.reservation.create.mockImplementation((async (args: any) => ({
    id: RES_ID,
    status: 'active',
    createdAt: new Date(),
    depositId: null,
    endedAt: null,
    updatedAt: new Date(),
    ...args.data,
    vehicle,
  })) as any);
  return { prisma, redis, billing, events, service };
}

describe('ReservationsService', () => {
  it('cria reserva de 15 min, marca a moto como reservada e grava a chave com TTL no Redis', async () => {
    const { service, prisma, redis } = setup();
    const r = await service.create(CUSTOMER_ID, VEHICLE_ID);
    expect(r.status).toBe('active');
    const ttlMs = new Date(r.expiresAt).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(14 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(15 * 60 * 1000);
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'free' }, data: { status: 'reserved' } });
    expect(await redis.exists(`reservation:${RES_ID}`)).toBe(true);
  });

  it('segunda reserva do mesmo cliente → 409 reservation-already-active', async () => {
    const { service, prisma } = setup();
    prisma.reservation.findFirst.mockResolvedValue({ id: 'outra', status: 'active', expiresAt: new Date(Date.now() + 60000) } as any);
    await expect(service.create(CUSTOMER_ID, VEHICLE_ID)).rejects.toMatchObject({ slug: 'reservation-already-active', status: 409 });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('moto não livre → 409 vehicle-unavailable', async () => {
    const { service, prisma } = setup();
    prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.create(CUSTOMER_ID, VEHICLE_ID)).rejects.toMatchObject({ slug: 'vehicle-unavailable', status: 409 });
  });

  it('KYC não aprovado → 403 kyc-not-approved', async () => {
    const { service, prisma } = setup();
    prisma.customer.findUnique.mockResolvedValue({ ...approvedCustomer, kycStatus: 'pending' } as any);
    await expect(service.create(CUSTOMER_ID, VEHICLE_ID)).rejects.toMatchObject({ slug: 'kyc-not-approved', status: 403 });
  });

  it('cliente inadimplente → 403 customer-delinquent; bloqueado → 403 customer-blocked', async () => {
    const a = setup();
    a.billing.isDelinquent.mockResolvedValue(true);
    await expect(a.service.create(CUSTOMER_ID, VEHICLE_ID)).rejects.toMatchObject({ slug: 'customer-delinquent' });
    const b = setup();
    b.prisma.customer.findUnique.mockResolvedValue({ ...approvedCustomer, status: 'blocked' } as any);
    await expect(b.service.create(CUSTOMER_ID, VEHICLE_ID)).rejects.toMatchObject({ slug: 'customer-blocked' });
  });

  it('não exige consentimento de localização para reservar (decisão #8)', async () => {
    const { service, prisma } = setup();
    prisma.customer.findUnique.mockResolvedValue({ ...approvedCustomer, locationConsent: false } as any);
    await expect(service.create(CUSTOMER_ID, VEHICLE_ID)).resolves.toMatchObject({ status: 'active' });
  });

  it('expiração via TTL do Redis libera a moto (TTL curto)', async () => {
    const { service, prisma, events } = setup(0.05); // 50 ms
    service.onModuleInit();
    prisma.reservation.findUnique.mockResolvedValue({ id: RES_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, status: 'active', depositId: null } as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    const ended = jest.fn();
    events.on(EV.RESERVATION_ENDED, ended);

    await service.create(CUSTOMER_ID, VEHICLE_ID);
    prisma.vehicle.updateMany.mockClear();
    await new Promise((r) => setTimeout(r, 150));

    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({
      where: { id: RES_ID, status: 'active' },
      data: expect.objectContaining({ status: 'expired' }),
    });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'reserved' }, data: { status: 'free' } });
    expect(ended).toHaveBeenCalledWith(expect.objectContaining({ reservationId: RES_ID, reason: 'expired' }));
  });

  it('varredura expira reservas vencidas cuja chave sumiu do Redis (rede de segurança)', async () => {
    const { service, prisma } = setup();
    prisma.reservation.findMany.mockResolvedValue([{ id: RES_ID, expiresAt: new Date(Date.now() - 1000) }] as any);
    prisma.reservation.findUnique.mockResolvedValue({ id: RES_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, status: 'active', depositId: null } as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    await service.sweep();
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'reserved' }, data: { status: 'free' } });
  });

  it('cancelar reserva de outro cliente → 404; reserva não ativa → 409', async () => {
    const { service, prisma } = setup();
    prisma.reservation.findUnique.mockResolvedValue({ id: RES_ID, customerId: 'outro', vehicleId: VEHICLE_ID, status: 'active' } as any);
    await expect(service.cancel(CUSTOMER_ID, RES_ID)).rejects.toMatchObject({ status: 404 });
    prisma.reservation.findUnique.mockResolvedValue({ id: RES_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, status: 'expired' } as any);
    await expect(service.cancel(CUSTOMER_ID, RES_ID)).rejects.toMatchObject({ status: 409 });
  });
});
