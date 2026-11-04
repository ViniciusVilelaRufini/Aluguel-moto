import { MODULE_METADATA } from '@nestjs/common/constants';
import { verifyPickupCode } from '../reservations/pickup-code';
import { TestRentalEndController } from '../rentals/test-rental-end.controller';
import { TestHandoverController } from './test-handover.controller';
import { TestHandoverModule } from './test-handover.module';
import { TEST_HANDOVER_ACTOR_ID, TestHandoverService } from './test-handover.service';

const SECRET = 'segredo-de-teste-do-codigo';
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '99999999-9999-4999-8999-999999999999';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const RES_ID = '44444444-4444-4444-8444-444444444444';
const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';

const customer = { pool: 'customer', sub: 's', email: 'e@example.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID } as any;
const other = { ...customer, userId: OTHER_ID, customerId: OTHER_ID } as any;

const reservation = () => ({
  id: RES_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, depotId: DEPOT_ID, status: 'active',
  expiresAt: new Date(Date.now() + 3600_000), vehicle: { id: VEHICLE_ID, status: 'reserved', batteryPct: 87 },
});

function setup(row: any = reservation()) {
  const prisma = { reservation: { findUnique: jest.fn().mockResolvedValue(row) } };
  const handovers = {
    createPickup: jest.fn().mockResolvedValue({ status: 201, body: { id: 'ho-1', status: 'pending_customer' } }),
    get: jest.fn().mockResolvedValue({ id: 'ho-1', status: 'accepted', rentalId: 'rental-1' }),
  };
  const counter = {
    quote: jest.fn().mockResolvedValue({ planCode: 'day', quantity: 1, coverage: 'basic', totalCents: 7500 }),
    checkout: jest.fn().mockResolvedValue({ id: 'rental-1' }),
  };
  const svc = new TestHandoverService(prisma as any, handovers as any, counter as any, SECRET);
  return { prisma, handovers, counter, svc };
}

describe('TestHandoverModule — registro condicional (ALLOW_TEST_HANDOVER)', () => {
  const controllersOf = (m: any) => [...(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, m.module) ?? []), ...(m.controllers ?? [])];
  const prev = process.env.ALLOW_TEST_HANDOVER;
  afterEach(() => {
    if (prev === undefined) delete process.env.ALLOW_TEST_HANDOVER;
    else process.env.ALLOW_TEST_HANDOVER = prev;
  });

  it('flag desligada (ou ausente) → nenhum controller: a rota não existe (404 real)', () => {
    expect(controllersOf(TestHandoverModule.register(false))).toEqual([]);
    delete process.env.ALLOW_TEST_HANDOVER;
    expect(controllersOf(TestHandoverModule.register())).toEqual([]);
    process.env.ALLOW_TEST_HANDOVER = 'false';
    expect(controllersOf(TestHandoverModule.register())).toEqual([]);
    process.env.ALLOW_TEST_HANDOVER = '1';
    expect(controllersOf(TestHandoverModule.register())).toEqual([]);
  });

  it('flag ligada → registra os dois atalhos de teste (entrega simulada e encerramento fora do ponto verde)', () => {
    expect(controllersOf(TestHandoverModule.register(true))).toEqual([TestHandoverController, TestRentalEndController]);
    process.env.ALLOW_TEST_HANDOVER = 'true';
    expect(controllersOf(TestHandoverModule.register())).toEqual([TestHandoverController, TestRentalEndController]);
  });
});

describe('TestHandoverService', () => {
  it('reserva de outro cliente → 404 (sem vazar a existência) e não cria entrega', async () => {
    const { svc, handovers } = setup();
    await expect(svc.create(other, RES_ID)).rejects.toMatchObject({ status: 404, slug: 'not-found' });
    expect(handovers.createPickup).not.toHaveBeenCalled();
  });

  it('reserva inexistente ou sem galpão → 404', async () => {
    await expect(setup(null).svc.create(customer, RES_ID)).rejects.toMatchObject({ status: 404 });
    const noDepot = setup({ ...reservation(), depotId: null });
    await expect(noDepot.svc.create(customer, RES_ID)).rejects.toMatchObject({ status: 404 });
    expect(noDepot.handovers.createPickup).not.toHaveBeenCalled();
  });

  it('reserva fora de active → 409 conflict', async () => {
    const { svc, handovers } = setup({ ...reservation(), status: 'handover' });
    await expect(svc.create(customer, RES_ID)).rejects.toMatchObject({ status: 409, slug: 'conflict' });
    expect(handovers.createPickup).not.toHaveBeenCalled();
  });

  it('reserva active já vencida (expiresAt <= agora) → 409 antes de assinar o código', async () => {
    const { svc, handovers } = setup({ ...reservation(), expiresAt: new Date(Date.now() - 1000) });
    await expect(svc.create(customer, RES_ID)).rejects.toMatchObject({ status: 409, slug: 'conflict', detail: 'Esta reserva não está mais ativa.' });
    expect(handovers.createPickup).not.toHaveBeenCalled();
  });

  it('caminho feliz: chama createPickup com ator de sistema, código assinado válido, checklist de teste e a bateria da moto', async () => {
    const { svc, handovers, prisma } = setup();
    const out = await svc.create(customer, RES_ID);
    expect(out).toEqual({ id: 'ho-1', status: 'accepted', rentalId: 'rental-1' });
    expect(prisma.reservation.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: RES_ID } }));
    expect(handovers.createPickup).toHaveBeenCalledTimes(1);
    const [actor, dto] = handovers.createPickup.mock.calls[0];
    expect(actor).toMatchObject({ pool: 'staff', userId: TEST_HANDOVER_ACTOR_ID, staffId: TEST_HANDOVER_ACTOR_ID, groups: [] });
    expect(actor.userId).not.toBe(CUSTOMER_ID);
    expect(dto).toEqual({
      type: 'pickup',
      depotId: DEPOT_ID,
      pickupCode: expect.any(String),
      checklist: [{ code: 'teste', ok: true }],
      photoKeys: [],
      batteryPct: 87,
    });
    expect(verifyPickupCode(dto.pickupCode, new Date(), SECRET)).toEqual({ reservationId: RES_ID });
  });

  it('balcão simulado: cota a diária e faz o checkout em dinheiro (referência teste, sem fotos) e devolve a entrega aceita relida', async () => {
    const { svc, counter, handovers } = setup();
    const out = await svc.create(customer, RES_ID);
    expect(counter.quote).toHaveBeenCalledWith('ho-1', { planCode: 'day', coverage: 'basic', quantity: 1 });
    expect(counter.checkout).toHaveBeenCalledTimes(1);
    const [actor, id, dto, opts] = counter.checkout.mock.calls[0];
    expect(actor).toMatchObject({ pool: 'staff', userId: TEST_HANDOVER_ACTOR_ID });
    expect(id).toBe('ho-1');
    expect(dto).toEqual({ planCode: 'day', quantity: 1, coverage: 'basic', contractPhotoKeys: [], payment: { method: 'cash', amountCents: 7500, reference: 'teste' } });
    expect(opts).toEqual({ test: true });
    expect(handovers.get).toHaveBeenCalledWith(customer, 'ho-1');
    expect(out).toMatchObject({ status: 'accepted', rentalId: 'rental-1' });
  });

  it('checkout simulado falha (ex.: moto offline) → o erro propaga', async () => {
    const { svc, counter, handovers } = setup();
    counter.checkout.mockRejectedValue(Object.assign(new Error('x'), { status: 409, slug: 'vehicle-offline' }));
    await expect(svc.create(customer, RES_ID)).rejects.toMatchObject({ status: 409, slug: 'vehicle-offline' });
    expect(handovers.get).not.toHaveBeenCalled();
  });

  it('moto sem bateria conhecida → batteryPct 100', async () => {
    const { svc, handovers } = setup({ ...reservation(), vehicle: null });
    await svc.create(customer, RES_ID);
    expect(handovers.createPickup.mock.calls[0][1].batteryPct).toBe(100);
  });

  it('erro do createPickup (ex.: entrega já aberta) propaga sem ser engolido', async () => {
    const { svc, handovers } = setup();
    handovers.createPickup.mockRejectedValue(Object.assign(new Error('x'), { status: 409, slug: 'conflict' }));
    await expect(svc.create(customer, RES_ID)).rejects.toMatchObject({ status: 409 });
  });
});
