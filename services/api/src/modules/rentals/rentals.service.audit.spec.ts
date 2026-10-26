import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../../config/env';
import type { Principal } from '../auth/principal';
import { RentalsService } from './rentals.service';

const RENTAL_ID = '55555555-5555-4555-8555-555555555555';
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CUSTOMER_ID = '22222222-2222-4222-8222-222222222222';
const V1 = '33333333-3333-4333-8333-333333333333';
const V2 = '44444444-4444-4444-8444-444444444444';
const MODEL_CHEAP = 'aaaaaaaa-1111-4111-8111-000000000001';
const MODEL_PRICEY = 'aaaaaaaa-1111-4111-8111-000000000002';
const customer: Principal = { pool: 'customer', sub: 'cust', email: 'c@x.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID } as Principal;

const minuteSnapshot = { planCode: 'minute', unit: 'minute', unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, insurancePremiumCents: 200 };
const v1 = { id: V1, code: 'VLT-0001', thingName: 'moto-0001', status: 'rented', online: true, lat: -23.560412, lng: -46.689871, speedLimitKmh: 32, vehicleModelId: MODEL_CHEAP };
// ~50 m de V1.
const v2 = { id: V2, code: 'VLT-0002', thingName: 'moto-0002', status: 'free', online: true, lat: -23.560862, lng: -46.689871, speedLimitKmh: 32, vehicleModelId: MODEL_CHEAP, vehicleModel: { pricePerMinuteCents: 79 } };
const rental = {
  id: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: V1, status: 'active', planCode: 'minute', priceSnapshot: minuteSnapshot, vehicle: v1,
  startedAt: new Date(), pausedAt: null, pausedSecondsAcc: 0, createdAt: new Date(), updatedAt: new Date(), costCents: 0,
};

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  prisma.rental.findUnique.mockResolvedValue(rental as any);
  prisma.vehicle.findUnique.mockResolvedValue(v2 as any);
  prisma.vehicleModel.findUnique.mockResolvedValue({ pricePerMinuteCents: 79 } as any);
  prisma.pricingPlan.findFirst.mockResolvedValue({ code: 'minute', unit: 'minute', unitPriceCents: 79 } as any);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.reservation.findFirst.mockResolvedValue(null);
  prisma.subscription.findFirst.mockResolvedValue(null);
  prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
  prisma.rental.updateMany.mockResolvedValue({ count: 1 });
  const commands = { dispatch: jest.fn().mockResolvedValue({ id: 'cmd', status: 'confirmed' }), isLockedByStaff: jest.fn().mockResolvedValue(false) };
  const iot = { getLiveState: jest.fn().mockRejectedValue(new Error('sem estado')) };
  const service = new RentalsService(prisma as any, commands as any, {} as any, new EventEmitter2(), {} as any, iot as any, loadConfig());
  return { prisma, commands, iot, service };
}

const expectNoWrites = (prisma: ReturnType<typeof setup>['prisma'], commands: ReturnType<typeof setup>['commands']) => {
  expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  expect(prisma.rental.update).not.toHaveBeenCalled();
  expect(prisma.rental.updateMany).not.toHaveBeenCalled();
  expect(commands.dispatch).not.toHaveBeenCalled();
};

describe('Troca de moto (POST /rentals/:id/swap)', () => {
  it('troca por moto livre, online, de mesmo preço, a ~50 m → move o aluguel com update condicional', async () => {
    const { service, prisma, commands } = setup();
    await service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'pneu furado' });
    expect(prisma.rental.updateMany).toHaveBeenCalledWith({
      where: { id: RENTAL_ID, status: 'active', vehicleId: V1 },
      data: { vehicleId: V2, speedLimitKmh: 32 },
    });
    expect(commands.dispatch).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: V2, type: 'unlock' }));
  });

  it('auditoria item adiado 1: moto alvo com trava da equipe/sistema ou hold → 409 vehicle-unavailable, nada movido', async () => {
    const { service, prisma, commands } = setup();
    commands.isLockedByStaff.mockImplementation(async (v: { id: string }) => v.id === V2);
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'pneu furado' })).rejects.toMatchObject({
      status: 409,
      slug: 'vehicle-unavailable',
      detail: 'A moto escolhida está bloqueada pela equipe.',
    });
    expect(commands.isLockedByStaff).toHaveBeenCalledWith(expect.objectContaining({ id: V2, thingName: v2.thingName }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
    expectNoWrites(prisma, commands);
  });

  it('revisão final item 2: moto ATUAL com trava da equipe/sistema → 409 vehicle-locked-by-staff, nada movido', async () => {
    const { service, prisma, commands } = setup();
    commands.isLockedByStaff.mockImplementation(async (v: { id: string }) => v.id === V1);
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'pneu furado', incidentId: 'inc-1' } as any)).rejects.toMatchObject({
      status: 409,
      slug: 'vehicle-locked-by-staff',
      detail: 'A moto foi bloqueada pela equipe. Fale com o suporte.',
    });
    expect(commands.isLockedByStaff).toHaveBeenCalledWith(expect.objectContaining({ id: V1, thingName: v1.thingName }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
    expectNoWrites(prisma, commands);
  });

  it('revisão final item 1: pausa concorrente entre a leitura e a escrita → 409, moto nova não é destravada', async () => {
    const { service, prisma, commands } = setup();
    // Lido como active; no banco o aluguel já foi pausado por outra requisição.
    const dbStatus = 'paused';
    prisma.rental.updateMany.mockImplementation((async ({ where }: any) => {
      const st = where.status;
      const matches = typeof st === 'string' ? st === dbStatus : Array.isArray(st?.in) ? st.in.includes(dbStatus) : true;
      return { count: matches ? 1 : 0 };
    }) as any);
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' })).rejects.toMatchObject({ status: 409, slug: 'rental-not-active' });
    expect(prisma.rental.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: RENTAL_ID, status: 'active', vehicleId: V1 } }));
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('item 11: moto fixa da assinatura de outro cliente → 409 vehicle-unavailable, sem escrita', async () => {
    const { service, prisma, commands } = setup();
    prisma.subscription.findFirst.mockResolvedValue({ id: 's2', customerId: OTHER_CUSTOMER_ID } as any);
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' })).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expectNoWrites(prisma, commands);
  });

  it('item 11: moto alvo offline (flag) → 409 vehicle-offline, sem escrita', async () => {
    const { service, prisma, commands } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ ...v2, online: false } as any);
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' })).rejects.toMatchObject({ status: 409, slug: 'vehicle-offline' });
    expectNoWrites(prisma, commands);
  });

  it('item 11: moto alvo offline no estado ao vivo → 409 vehicle-offline, sem escrita', async () => {
    const { service, prisma, commands, iot } = setup();
    iot.getLiveState.mockImplementation(async (thing: string) => (thing === v2.thingName ? { online: false, lat: v2.lat, lng: v2.lng } : Promise.reject(new Error('x'))));
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' })).rejects.toMatchObject({ status: 409, slug: 'vehicle-offline' });
    expectNoWrites(prisma, commands);
  });

  it('moto alvo livre mas com aluguel aberto → 409 vehicle-unavailable, sem escrita', async () => {
    const { service, prisma, commands } = setup();
    prisma.rental.findFirst.mockResolvedValue({ id: 'r-outro' } as any);
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' })).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expectNoWrites(prisma, commands);
  });

  it('item 15: plano por minuto, modelo alvo mais caro que o snapshot → 409, sem escrita', async () => {
    const { service, prisma, commands } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ ...v2, vehicleModelId: MODEL_PRICEY, vehicleModel: { pricePerMinuteCents: 99 } } as any);
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' })).rejects.toMatchObject({
      status: 409, detail: 'Só é possível trocar por uma moto de mesmo preço ou mais barata.',
    });
    expectNoWrites(prisma, commands);
  });

  it('item 15: plano por minuto, modelo alvo mais barato → troca', async () => {
    const { service, prisma } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ ...v2, vehicleModel: { pricePerMinuteCents: 69 } } as any);
    await service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' });
    expect(prisma.rental.updateMany).toHaveBeenCalled();
  });

  it('item 15: plano por minuto, alvo sem modelo cobraria o preço do plano (maior) → 409', async () => {
    const { service, prisma, commands } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ ...v2, vehicleModelId: null, vehicleModel: null } as any);
    prisma.pricingPlan.findFirst.mockResolvedValue({ code: 'minute', unit: 'minute', unitPriceCents: 89 } as any);
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' })).rejects.toMatchObject({ status: 409 });
    expectNoWrites(prisma, commands);
  });

  it('item 15: plano diário compara pelo modelo da moto atual → modelo mais caro recusado', async () => {
    const { service, prisma, commands } = setup();
    prisma.rental.findUnique.mockResolvedValue({ ...rental, planCode: 'daily', priceSnapshot: { ...minuteSnapshot, planCode: 'daily', unit: 'day', unitPriceCents: 5000 } } as any);
    prisma.vehicleModel.findUnique.mockResolvedValue({ pricePerMinuteCents: 79 } as any);
    prisma.vehicle.findUnique.mockResolvedValue({ ...v2, vehicleModelId: MODEL_PRICEY, vehicleModel: { pricePerMinuteCents: 99 } } as any);
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' })).rejects.toMatchObject({ status: 409 });
    expectNoWrites(prisma, commands);
  });

  it('hardening: aluguel encerrado/trocado entre a leitura e a escrita → 409 e nenhum comando', async () => {
    const { service, prisma, commands } = setup();
    prisma.rental.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.swap(customer, RENTAL_ID, { newVehicleId: V2, reason: 'teste' })).rejects.toMatchObject({ status: 409, slug: 'rental-not-active' });
    expect(commands.dispatch).not.toHaveBeenCalled();
  });
});
