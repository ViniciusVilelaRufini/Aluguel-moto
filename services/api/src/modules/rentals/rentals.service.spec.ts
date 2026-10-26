import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { RentalsService } from './rentals.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const RENTAL_ID = '88888888-8888-4888-8888-888888888888';
const OLD_ID = '33333333-3333-4333-8333-333333333333';
const NEW_ID = '44444444-4444-4444-8444-444444444444';
const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
const user = { pool: 'customer', sub: 's', email: 'e@example.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID } as any;
const here = { lat: -23.5614, lng: -46.6559 };

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const commands = { dispatch: jest.fn().mockResolvedValue({ id: 'c', status: 'confirmed' }), isLockedByStaff: jest.fn().mockResolvedValue(false) };
  const iot = { getLiveState: jest.fn().mockResolvedValue(null) };
  const svc = new RentalsService(prisma as any, commands as any, {} as any, { emit: jest.fn() } as any, {} as any, iot as any, {} as any);
  prisma.rental.findUnique.mockResolvedValue({
    id: RENTAL_ID, customerId: CUSTOMER_ID, status: 'active', vehicleId: OLD_ID, vehicle: { id: OLD_ID, thingName: 't', ...here },
    priceSnapshot: { planCode: 'minute', unit: 'minute', unlockFeeCents: 0, unitPriceCents: 79, pausePerMinuteCents: 0, insurancePremiumCents: 0 },
  } as any);
  // Auditoria: a moto nova precisa ter preço por minuto igual ou menor (aqui, o mesmo modelo).
  prisma.pricingPlan.findFirst.mockResolvedValue({ unitPriceCents: 79 } as any);
  return { prisma, commands, svc };
}

describe('RentalsService.current — troca na estação em andamento (fix 1, I1)', () => {
  const now = new Date('2026-10-22T15:00:00Z');
  const rentalRow = {
    id: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: OLD_ID, planCode: 'minute', coverage: 'basic', status: 'active', startedAt: now, pausedAt: null, pausedSecondsAcc: 0,
    endRequestedAt: null, endedAt: null, priceSnapshot: { planCode: 'minute', unit: 'minute', unlockFeeCents: 0, unitPriceCents: 79, pausePerMinuteCents: 0, insurancePremiumCents: 0 },
    costCents: 0, breakdown: null, createdAt: now, updatedAt: now, vehicle: { code: 'VLT-0001' },
  };

  it('traz currentStationSwap (visão do cliente) quando o aluguel tem troca aberta', async () => {
    const { prisma, svc } = setup();
    prisma.rental.findFirst.mockResolvedValue(rentalRow as any);
    prisma.stationSwap.findFirst.mockResolvedValue({
      id: 'sw1', stationId: 'st1', rentalId: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: OLD_ID, status: 'awaiting_return', endReason: null, slotNumber: 3, feeCents: 500,
      distanceM: 12, returnedSerial: null, returnedPct: null, releasedSerial: null, expiresAt: now, idempotencyKey: 'k', completedAt: null, createdAt: now, updatedAt: now,
    } as any);
    const out: any = await svc.current(CUSTOMER_ID);
    expect(out.rental.id).toBe(RENTAL_ID);
    expect(out.currentStationSwap).toMatchObject({ id: 'sw1', status: 'awaiting_return', slotNumber: 3 });
    expect(out.currentStationSwap).not.toHaveProperty('distanceM');
    expect((prisma.stationSwap.findFirst.mock.calls[0][0] as any).where).toEqual({ rentalId: RENTAL_ID, status: { in: ['opening_slot', 'awaiting_return', 'returned', 'releasing'] } });
  });

  it('batterySwapFeeCents: taxa ativa nos planos minuto/hora (mesma regra do feeAmount da criação); 0 em dia/semana/mês', async () => {
    const { prisma, svc } = setup();
    prisma.stationSwap.findFirst.mockResolvedValue(null);
    prisma.fee.findUnique.mockResolvedValue({ code: 'battery_swap_fee', amountCents: 650, active: true } as any);
    for (const [planCode, expected] of [['minute', 650], ['hour', 650], ['day', 0], ['weekly', 0], ['monthly', 0]] as const) {
      prisma.rental.findFirst.mockResolvedValue({ ...rentalRow, planCode } as any);
      expect(((await svc.current(CUSTOMER_ID)) as any).batterySwapFeeCents).toBe(expected);
    }
    expect((prisma.fee.findUnique.mock.calls[0][0] as any).where).toEqual({ code: 'battery_swap_fee' });
    // Taxa desativada → padrão (500), exatamente como o feeCents que o POST congela.
    prisma.fee.findUnique.mockResolvedValue({ code: 'battery_swap_fee', amountCents: 650, active: false } as any);
    prisma.rental.findFirst.mockResolvedValue({ ...rentalRow, planCode: 'minute' } as any);
    expect(((await svc.current(CUSTOMER_ID)) as any).batterySwapFeeCents).toBe(500);
  });

  it('sem troca aberta → sem o campo; sem aluguel → {}', async () => {
    const { prisma, svc } = setup();
    prisma.rental.findFirst.mockResolvedValue(rentalRow as any);
    prisma.stationSwap.findFirst.mockResolvedValue(null);
    expect(await svc.current(CUSTOMER_ID)).not.toHaveProperty('currentStationSwap');
    prisma.rental.findFirst.mockResolvedValue(null);
    expect(await svc.current(CUSTOMER_ID)).toEqual({});
  });
});

describe('RentalsService.swap — moto do galpão (Task 6)', () => {
  it.each([
    ['com depotId (no galpão)', { status: 'free', depotId: DEPOT_ID }],
    ['awaiting_pickup (esperando recolhimento)', { status: 'awaiting_pickup', depotId: null }],
  ])('moto alvo %s → 409 vehicle-unavailable, sem trocar nem destravar', async (_n, over) => {
    const { prisma, commands, svc } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ id: NEW_ID, speedLimitKmh: 20, ...here, ...over } as any);
    await expect(svc.swap(user, RENTAL_ID, { newVehicleId: NEW_ID, reason: 'Pneu furado' } as any)).rejects.toMatchObject({ slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('fix 1 (I7): troca de bateria na estação em andamento → 409 swap-open, sem trocar nem travar', async () => {
    const { prisma, commands, svc } = setup();
    prisma.stationSwap.findFirst.mockResolvedValue({ id: 'swap-1' } as any);
    prisma.vehicle.findUnique.mockResolvedValue({ id: NEW_ID, status: 'free', depotId: null, speedLimitKmh: 20, ...here } as any);
    await expect(svc.swap(user, RENTAL_ID, { newVehicleId: NEW_ID, reason: 'Pneu furado' } as any)).rejects.toMatchObject({ status: 409, slug: 'swap-open' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('rodada 3: a transação trava o aluguel (FOR UPDATE) antes das motos e reconfere a troca aberta → 409 swap-open sem tocar nas motos', async () => {
    const { prisma, commands, svc } = setup();
    const order: string[] = [];
    (prisma.$queryRaw as any).mockImplementation(async (sql: TemplateStringsArray) => {
      order.push(sql.join('?'));
      return [];
    });
    prisma.vehicle.findUnique.mockResolvedValue({ id: NEW_ID, status: 'free', depotId: null, speedLimitKmh: 20, ...here } as any);
    // Pré-checagem não vê troca; uma troca nova entrou antes do lock.
    prisma.stationSwap.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'swap-1' } as any);
    await expect(svc.swap(user, RENTAL_ID, { newVehicleId: NEW_ID, reason: 'Pneu furado' } as any)).rejects.toMatchObject({ status: 409, slug: 'swap-open' });
    expect(order.some((q) => /FROM "Rental" WHERE "id" = \?::uuid FOR UPDATE/.test(q))).toBe(true);
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('rodada 3: sem troca aberta, o lock do aluguel vem antes da reivindicação da moto (mesma ordem da liberação na estação)', async () => {
    const { prisma, svc } = setup();
    const order: string[] = [];
    (prisma.$queryRaw as any).mockImplementation(async (sql: TemplateStringsArray) => {
      order.push(sql.join('?').includes('"Rental"') ? 'lock-rental' : 'outro');
      return [];
    });
    prisma.vehicle.findUnique.mockResolvedValue({ id: NEW_ID, status: 'free', depotId: null, speedLimitKmh: 20, ...here } as any);
    prisma.vehicle.updateMany.mockImplementation((async () => {
      order.push('claim-vehicle');
      return { count: 1 };
    }) as any);
    await svc.swap(user, RENTAL_ID, { newVehicleId: NEW_ID, reason: 'Pneu furado' } as any).catch(() => undefined);
    expect(order.slice(0, 2)).toEqual(['lock-rental', 'claim-vehicle']);
  });

  it('a reivindicação da moto alvo exige depotId nulo (corrida com a volta ao galpão)', async () => {
    const { prisma, svc } = setup();
    prisma.vehicle.findUnique.mockResolvedValue({ id: NEW_ID, status: 'free', depotId: null, speedLimitKmh: 20, ...here } as any);
    prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.swap(user, RENTAL_ID, { newVehicleId: NEW_ID, reason: 'Pneu furado' } as any)).rejects.toMatchObject({ slug: 'vehicle-unavailable' });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: NEW_ID, status: 'free', depotId: null }, data: { status: 'rented' } });
  });
});
