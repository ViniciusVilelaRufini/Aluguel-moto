import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { EV } from '../../common/events';
import { MemoryIdempotencyStore } from '../../common/idempotency/idempotency.store';
import { ProblemException } from '../../common/problem';
import { signPickupCode } from '../reservations/pickup-code';
import { HandoversService } from './handovers.service';

const SECRET = 'segredo-de-teste-do-codigo';
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '99999999-9999-4999-8999-999999999999';
const STAFF_ID = '22222222-2222-4222-8222-222222222222';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const RES_ID = '44444444-4444-4444-8444-444444444444';
const HO_ID = '55555555-5555-4555-8555-555555555555';
const DEPOSIT_ID = '66666666-6666-4666-8666-666666666666';
const RENTAL_ID = '77777777-7777-4777-8777-777777777777';
const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';

const customer = { pool: 'customer', sub: 's', email: 'e@example.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID } as any;
const other = { ...customer, userId: OTHER_ID, customerId: OTHER_ID } as any;
const operator = { pool: 'staff', sub: 'o', email: 'o@volti.com.br', groups: ['campo'], userId: STAFF_ID, staffId: STAFF_ID } as any;
const now = new Date();

const reservation = {
  id: RES_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, depotId: DEPOT_ID, status: 'handover', depositId: DEPOSIT_ID,
  planCode: 'day', coverage: 'basic', depositMethod: 'card', cardId: null, couponCode: 'BEMVINDO', expiresAt: new Date(Date.now() + 3600_000),
};
const handover = {
  id: HO_ID, type: 'pickup', status: 'pending_customer', depotId: DEPOT_ID, reservationId: RES_ID, rentalId: null, vehicleId: VEHICLE_ID, operatorId: STAFF_ID,
  checklist: [{ code: 'freios', ok: true }], photoKeys: ['handovers/a.jpg'], batteryPct: 98, batterySerial: null, disputeReason: null, lastError: null,
  respondedAt: null, createdAt: now, updatedAt: now, vehicle: { code: 'VLT-0011' },
};
const rentalRow = {
  id: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, status: 'active', planCode: 'day', coverage: 'basic', startedAt: now, pausedAt: null, pausedSecondsAcc: 0,
  endRequestedAt: null, endedAt: null, costCents: 0, breakdown: null, createdAt: now, updatedAt: now, vehicle: { code: 'VLT-0011' },
  priceSnapshot: { planCode: 'day', unit: 'day', unlockFeeCents: 0, unitPriceCents: 5000, pausePerMinuteCents: 0, insurancePremiumCents: 0 },
};

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const starter = { start: jest.fn() };
  const ender = {
    endAtDepot: jest.fn().mockResolvedValue({}),
    depotArrivalStatus: jest.fn(async (_vehicleId: string, target: string) => target),
    livePosition: jest.fn().mockResolvedValue(null),
  };
  const support = { createConversation: jest.fn().mockResolvedValue({ id: 'conv' }) };
  const events = { emit: jest.fn() };
  const storage = { presignGet: jest.fn(async ({ key }: any) => ({ url: `https://s3/${key}?sig`, expiresAt: '' })), presignPut: jest.fn() };
  const cfg = { buckets: { returnPhotos: 'fotos-devolucao' } };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const reservations = { trackExpiry: jest.fn().mockResolvedValue(undefined) };
  const locks = new MemoryIdempotencyStore();
  const svc = new HandoversService(prisma as any, starter as any, ender as any, support as any, events as any, storage as any, cfg as any, SECRET, locks, audit as any, reservations as any);
  prisma.staffUser.findMany.mockResolvedValue([{ id: STAFF_ID, name: 'Rafael Souza Lima' }] as any);
  prisma.handover.findUnique.mockResolvedValue({ ...handover, reservation } as any);
  prisma.deposit.findUnique.mockResolvedValue({ id: DEPOSIT_ID, customerId: CUSTOMER_ID, method: 'card', status: 'held' } as any);
  prisma.depositRelease.findUnique.mockResolvedValue(null);
  prisma.handover.updateMany.mockResolvedValue({ count: 1 });
  prisma.rental.findUnique.mockResolvedValue(rentalRow as any);
  starter.start.mockResolvedValue({ status: 201, body: { outcome: 'started', rental: { id: RENTAL_ID, status: 'active' }, deposit: {} } });
  return { prisma, starter, ender, support, events, storage, svc, audit, reservations, locks };
}

const pickupBody = (code: string, over: Record<string, unknown> = {}) =>
  ({ type: 'pickup', pickupCode: code, checklist: [{ code: 'freios', ok: true }], photoKeys: ['handovers/a.jpg'], batteryPct: 98, ...over }) as any;

describe('HandoversService — upload', () => {
  it('upload de contrato usa o prefixo contracts/', async () => {
    const { svc, storage } = setup();
    storage.presignPut.mockResolvedValue({ key: 'contracts/x.jpg', url: 'https://s3/put', expiresAt: '' });
    await svc.uploadUrl('image/jpeg', 'contract');
    expect(storage.presignPut).toHaveBeenCalledWith(expect.objectContaining({ bucket: 'fotos-devolucao', key: expect.stringMatching(/^contracts\//) }));
  });

  it('upload padrão continua em handovers/', async () => {
    const { svc, storage } = setup();
    storage.presignPut.mockResolvedValue({ key: 'handovers/x.jpg', url: 'https://s3/put', expiresAt: '' });
    await svc.uploadUrl('image/jpeg');
    expect(storage.presignPut).toHaveBeenCalledWith(expect.objectContaining({ key: expect.stringMatching(/^handovers\//) }));
  });
});

describe('HandoversService — saída (pickup)', () => {
  const validCode = () => signPickupCode(RES_ID, new Date(Date.now() + 3600_000), SECRET);

  it('código adulterado → 404, nada criado', async () => {
    const { prisma, svc } = setup();
    const code = validCode();
    const tampered = code.slice(0, -2) + (code.endsWith('AA') ? 'BB' : 'AA');
    await expect(svc.createPickup(operator, pickupBody(tampered))).rejects.toMatchObject({ slug: 'not-found' });
    await expect(svc.createPickup(operator, pickupBody(signPickupCode(RES_ID, new Date(Date.now() + 3600_000), 'outro-segredo')))).rejects.toMatchObject({ slug: 'not-found' });
    expect(prisma.handover.create).not.toHaveBeenCalled();
  });

  it('código válido → entrega pending_customer, reserva handover e handover.pending para o cliente e o galpão', async () => {
    const { prisma, events, svc } = setup();
    prisma.reservation.findUnique.mockResolvedValue({ ...reservation, status: 'active', vehicle: { id: VEHICLE_ID, status: 'reserved' } } as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    prisma.handover.create.mockResolvedValue(handover as any);
    const out = await svc.createPickup(operator, pickupBody(validCode(), { batterySerial: 'BT-1' }));
    expect(out.status).toBe(201);
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({ where: { id: RES_ID, status: 'active' }, data: { status: 'handover' } });
    expect(prisma.handover.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'pickup', status: 'pending_customer', depotId: DEPOT_ID, reservationId: RES_ID, vehicleId: VEHICLE_ID, operatorId: STAFF_ID, batterySerial: 'BT-1' }),
    }));
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_PENDING, { handoverId: HO_ID, reservationId: RES_ID, customerId: CUSTOMER_ID, depotId: DEPOT_ID });
    expect(out.body).toMatchObject({ id: HO_ID, operatorFirstName: 'Rafael', vehicleCode: 'VLT-0011', photoUrls: ['https://s3/handovers/a.jpg?sig'] });
  });

  it('Task 30: operador sem nome cadastrado (ou cadastro ausente) → "Equipe Volti", nunca o e-mail', async () => {
    const { prisma, svc } = setup();
    prisma.reservation.findUnique.mockResolvedValue({ ...reservation, status: 'active', vehicle: { id: VEHICLE_ID, status: 'reserved' } } as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    prisma.handover.create.mockResolvedValue(handover as any);
    prisma.staffUser.findMany.mockResolvedValue([{ id: STAFF_ID, name: '' }] as any);
    expect((await svc.createPickup(operator, pickupBody(validCode()))).body).toMatchObject({ operatorFirstName: 'Equipe Volti' });
    prisma.staffUser.findMany.mockResolvedValue([] as any);
    expect((await svc.createPickup(operator, pickupBody(validCode()))).body).toMatchObject({ operatorFirstName: 'Equipe Volti' });
  });

  it('depotId diferente do da reserva → 422; moto que não está reserved → 409; reserva encerrada → 409', async () => {
    const { prisma, svc } = setup();
    prisma.reservation.findUnique.mockResolvedValue({ ...reservation, status: 'active', vehicle: { status: 'reserved' } } as any);
    await expect(svc.createPickup(operator, pickupBody(validCode(), { depotId: OTHER_ID }))).rejects.toMatchObject({ slug: 'validation-error' });
    prisma.reservation.findUnique.mockResolvedValue({ ...reservation, status: 'active', vehicle: { status: 'free' } } as any);
    await expect(svc.createPickup(operator, pickupBody(validCode()))).rejects.toMatchObject({ slug: 'vehicle-unavailable' });
    prisma.reservation.findUnique.mockResolvedValue({ ...reservation, status: 'canceled', vehicle: { status: 'reserved' } } as any);
    await expect(svc.createPickup(operator, pickupBody(validCode()))).rejects.toMatchObject({ status: 409 });
    expect(prisma.handover.create).not.toHaveBeenCalled();
  });
});

describe('HandoversService — aceite (app antigo)', () => {
  it('accept antigo → 409 handover-counter-checkout, nada iniciado', async () => {
    const { svc, starter, prisma, events, locks } = setup();
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({
      status: 409,
      slug: 'handover-counter-checkout',
      detail: 'O aluguel é iniciado pelo atendente no galpão.',
      title: 'Aluguel iniciado no balcão',
    });
    expect(starter.start).not.toHaveBeenCalled();
    // Antes de qualquer leitura de caução ou trava.
    expect(prisma.deposit.findUnique).not.toHaveBeenCalled();
    expect(prisma.depositRelease.findUnique).not.toHaveBeenCalled();
    expect(prisma.handover.updateMany).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
    // A trava do aceite (usada pelo cancelamento) continua livre.
    expect((await locks.begin('handover-accept', HO_ID, 'accept')).state).not.toBe('in_progress');
  });

  it('accept de outro cliente continua 404', async () => {
    const { svc, starter } = setup();
    await expect(svc.accept(other, HO_ID)).rejects.toMatchObject({ status: 404, slug: 'not-found' });
    await expect(svc.dispute(other, HO_ID, 'Retrovisor quebrado')).rejects.toMatchObject({ status: 404 });
    await expect(svc.get(other, HO_ID)).rejects.toMatchObject({ status: 404 });
    expect(starter.start).not.toHaveBeenCalled();
  });

  it('entrega de retorno ou inexistente → 404', async () => {
    const { svc, prisma } = setup();
    prisma.handover.findUnique.mockResolvedValue({ ...handover, type: 'return_depot', reservation: null } as any);
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ status: 404 });
    prisma.handover.findUnique.mockResolvedValue(null);
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ status: 404 });
  });
});

describe('HandoversService — disputa', () => {
  it('disputed + conversa de suporte; moto e reserva intocadas; handover.updated', async () => {
    const { prisma, support, events, svc } = setup();
    prisma.handover.updateMany.mockResolvedValue({ count: 1 });
    prisma.handover.findUniqueOrThrow.mockResolvedValue({ ...handover, status: 'disputed', disputeReason: 'Retrovisor quebrado' } as any);
    const out = await svc.dispute(customer, HO_ID, '  Retrovisor quebrado ');
    expect(prisma.handover.updateMany).toHaveBeenCalledWith({
      where: { id: HO_ID, status: 'pending_customer' },
      data: expect.objectContaining({ status: 'disputed', disputeReason: 'Retrovisor quebrado' }),
    });
    expect(support.createConversation).toHaveBeenCalledWith(customer, { subject: 'Problema na entrega da moto VLT-0011', message: 'Retrovisor quebrado' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_UPDATED, { handoverId: HO_ID, status: 'disputed', customerId: CUSTOMER_ID, depotId: DEPOT_ID });
    expect(out).toMatchObject({ status: 'disputed', disputeReason: 'Retrovisor quebrado' });
  });

  it('fix 1: conversa de suporte falha uma vez → tenta de novo e abre; sem marca de auditoria', async () => {
    const { prisma, support, audit, svc } = setup();
    prisma.handover.updateMany.mockResolvedValue({ count: 1 });
    prisma.handover.findUniqueOrThrow.mockResolvedValue({ ...handover, status: 'disputed' } as any);
    support.createConversation.mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce({ id: 'conv' });
    await svc.dispute(customer, HO_ID, 'Retrovisor quebrado');
    expect(support.createConversation).toHaveBeenCalledTimes(2);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('fix 1: conversa de suporte falha duas vezes → disputa registrada, auditoria marca a falha e o log não leva a mensagem do erro', async () => {
    const { Logger } = await import('@nestjs/common');
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { prisma, support, audit, events, svc } = setup();
    prisma.handover.updateMany.mockResolvedValue({ count: 1 });
    prisma.handover.findUniqueOrThrow.mockResolvedValue({ ...handover, status: 'disputed' } as any);
    const boom = Object.assign(new Error('cliente Fulano CPF 123 sem conversa'), { code: 'P2003' });
    support.createConversation.mockRejectedValue(boom);
    const out = await svc.dispute(customer, HO_ID, 'Retrovisor quebrado');
    expect(out.status).toBe('disputed');
    expect(support.createConversation).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'handover.dispute_ticket_failed', entityType: 'Handover', entityId: HO_ID }));
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_UPDATED, expect.objectContaining({ status: 'disputed' }));
    const text = JSON.stringify(logged.mock.calls);
    expect(text).toContain('P2003');
    expect(text).not.toContain('Fulano');
    logged.mockRestore();
  });

  it('fora de pending_customer → 422 handover-not-pending', async () => {
    const { prisma, support, svc } = setup();
    prisma.handover.findUnique.mockResolvedValue({ ...handover, status: 'accepted', reservation } as any);
    await expect(svc.dispute(customer, HO_ID, 'Pneu murcho')).rejects.toMatchObject({ slug: 'handover-not-pending' });
    expect(support.createConversation).not.toHaveBeenCalled();
  });
});

describe('HandoversService — chegada (return_depot)', () => {
  /** Galpão de Catanduva: a moto que chega passa a ter esta posição. */
  const DEPOT_POS = { lat: -21.1378, lng: -48.9729 };
  const returnBody = (over: Record<string, unknown> = {}) =>
    ({ type: 'return_depot', rentalId: RENTAL_ID, depotId: DEPOT_ID, checklist: [{ code: 'freios', ok: true }], photoKeys: [], batteryPct: 40, ...over }) as any;

  function forReturn(checklist: Array<{ code: string; ok: boolean }>) {
    const s = setup();
    s.prisma.depot.findUnique.mockResolvedValue({ id: DEPOT_ID, active: true, ...DEPOT_POS } as any);
    // Posição viva no próprio galpão (0 m); os testes de proximidade trocam.
    s.ender.livePosition.mockResolvedValue({ ...DEPOT_POS });
    s.prisma.handover.findFirst.mockResolvedValue(null);
    s.prisma.rental.findUnique.mockResolvedValue({ id: RENTAL_ID, status: 'active', vehicleId: VEHICLE_ID, customerId: CUSTOMER_ID } as any);
    s.prisma.rental.findFirst.mockResolvedValue(null);
    s.prisma.vehicle.findUnique.mockResolvedValue({ depotId: null } as any);
    s.prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    s.prisma.handover.create.mockResolvedValue({ ...handover, type: 'return_depot', status: 'accepted', reservationId: null, rentalId: RENTAL_ID, checklist } as any);
    return s;
  }

  it('item com ok:false → endAtDepot com depotId e maintenance (transição única no fechamento); sem colocação extra', async () => {
    const { prisma, ender, svc } = forReturn([{ code: 'freios', ok: false }]);
    prisma.vehicle.findUnique.mockResolvedValue({ status: 'maintenance', depotId: DEPOT_ID } as any);
    const out = await svc.createReturn(operator, returnBody({ checklist: [{ code: 'freios', ok: false, note: 'Freio traseiro fraco' }] }));
    expect(out.status).toBe(201);
    expect(prisma.handover.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'return_depot', status: 'accepted', rentalId: RENTAL_ID, depotId: DEPOT_ID }) }));
    expect(ender.endAtDepot).toHaveBeenCalledWith(operator, RENTAL_ID, { depotId: DEPOT_ID, targetStatus: 'maintenance', ...DEPOT_POS });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(prisma.fieldTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ vehicleId: VEHICLE_ID, type: 'collect' }), data: { status: 'canceled' } }));
  });

  it('checklist ok → endAtDepot com free', async () => {
    const { prisma, ender, svc } = forReturn([{ code: 'freios', ok: true }]);
    prisma.vehicle.findUnique.mockResolvedValue({ status: 'free', depotId: DEPOT_ID } as any);
    await svc.createReturn(operator, returnBody());
    expect(ender.endAtDepot).toHaveBeenCalledWith(operator, RENTAL_ID, { depotId: DEPOT_ID, targetStatus: 'free', ...DEPOT_POS });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('moto offline na chegada → a colocação grava depotId e statusBeforeOffline', async () => {
    const { prisma, svc } = forReturn([{ code: 'freios', ok: false }]);
    prisma.vehicle.findUnique.mockResolvedValue({ status: 'offline', depotId: null } as any);
    prisma.vehicle.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    await svc.createReturn(operator, returnBody());
    expect(prisma.vehicle.updateMany).toHaveBeenLastCalledWith({ where: { id: VEHICLE_ID, status: 'offline' }, data: { depotId: DEPOT_ID, statusBeforeOffline: 'maintenance', ...DEPOT_POS } });
  });

  it('auditoria: moto offline com trava da equipe/sistema na chegada → statusBeforeOffline maintenance (nunca free ao reconectar)', async () => {
    const { prisma, ender, svc } = forReturn([{ code: 'freios', ok: true }]);
    ender.depotArrivalStatus.mockResolvedValue('maintenance');
    prisma.vehicle.findUnique.mockResolvedValue({ status: 'offline', depotId: null } as any);
    prisma.vehicle.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    await svc.createReturn(operator, returnBody());
    expect(ender.depotArrivalStatus).toHaveBeenCalledWith(VEHICLE_ID, 'free');
    expect(prisma.vehicle.updateMany).toHaveBeenLastCalledWith({ where: { id: VEHICLE_ID, status: 'offline' }, data: { depotId: DEPOT_ID, statusBeforeOffline: 'maintenance', ...DEPOT_POS } });
  });

  it('repetição com a moto ainda fora do galpão → a colocação grava status, depotId e a posição do galpão', async () => {
    const { prisma, svc } = forReturn([{ code: 'freios', ok: true }]);
    prisma.handover.findFirst.mockResolvedValue({ ...handover, type: 'return_depot', status: 'accepted', rentalId: RENTAL_ID } as any);
    prisma.rental.findUnique.mockResolvedValue({ status: 'ended', customerId: CUSTOMER_ID } as any);
    prisma.vehicle.findUnique.mockResolvedValue({ status: 'free', depotId: null } as any);
    await svc.createReturn(operator, returnBody());
    expect(prisma.depot.findUnique).toHaveBeenCalledWith({ where: { id: DEPOT_ID }, select: { lat: true, lng: true } });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
      where: { id: VEHICLE_ID, status: { in: ['free', 'awaiting_pickup', 'maintenance'] } },
      data: { status: 'free', depotId: DEPOT_ID, ...DEPOT_POS },
    });
  });

  it('repetição (fila offline): chegada não cancelada já existe → 200 com a mesma entrega, sem criar outra', async () => {
    const { prisma, ender, svc } = forReturn([{ code: 'freios', ok: true }]);
    prisma.handover.findFirst.mockResolvedValue({ ...handover, type: 'return_depot', status: 'accepted', rentalId: RENTAL_ID } as any);
    prisma.rental.findUnique.mockResolvedValue({ status: 'ended' } as any);
    prisma.vehicle.findUnique.mockResolvedValue({ depotId: DEPOT_ID } as any);
    const out = await svc.createReturn(operator, returnBody());
    expect(out.status).toBe(200);
    expect(out.body.id).toBe(HO_ID);
    expect(prisma.handover.create).not.toHaveBeenCalled();
    expect(ender.endAtDepot).not.toHaveBeenCalled();
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('fix 2: chegada concluída → handover.updated accepted para o cliente e o galpão', async () => {
    const { prisma, events, svc } = forReturn([{ code: 'freios', ok: true }]);
    prisma.vehicle.findUnique.mockResolvedValue({ status: 'free', depotId: DEPOT_ID } as any);
    await svc.createReturn(operator, returnBody());
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_UPDATED, { handoverId: HO_ID, status: 'accepted', customerId: CUSTOMER_ID, depotId: DEPOT_ID });
  });

  it('fix 2: repetição que ainda encerra o aluguel emite handover.updated; repetição sem trabalho não reemite', async () => {
    const { prisma, events, ender, svc } = forReturn([{ code: 'freios', ok: true }]);
    prisma.handover.findFirst.mockResolvedValue({ ...handover, type: 'return_depot', status: 'accepted', rentalId: RENTAL_ID } as any);
    prisma.vehicle.findUnique.mockResolvedValue({ status: 'free', depotId: DEPOT_ID } as any);
    expect((await svc.createReturn(operator, returnBody())).status).toBe(200);
    expect(ender.endAtDepot).toHaveBeenCalledTimes(1);
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_UPDATED, { handoverId: HO_ID, status: 'accepted', customerId: CUSTOMER_ID, depotId: DEPOT_ID });
    events.emit.mockClear();
    prisma.rental.findUnique.mockResolvedValue({ status: 'ended', customerId: CUSTOMER_ID } as any);
    expect((await svc.createReturn(operator, returnBody())).status).toBe(200);
    expect(events.emit).not.toHaveBeenCalledWith(EV.HANDOVER_UPDATED, expect.anything());
  });

  describe('Run-2: a chegada só encerra com a moto no galpão (posição viva até 150 m)', () => {
    /** ~2 km ao norte do galpão. */
    const FAR = { lat: DEPOT_POS.lat + 0.018, lng: DEPOT_POS.lng };
    /** ~80 m ao norte do galpão. */
    const NEAR = { lat: DEPOT_POS.lat + 0.00072, lng: DEPOT_POS.lng };

    it('(a) moto a 2 km do galpão → 422 vehicle-not-at-depot; nada gravado, aluguel intocado, nenhum bloqueio pedido', async () => {
      const { prisma, ender, audit, events, svc } = forReturn([{ code: 'freios', ok: true }]);
      ender.livePosition.mockResolvedValue(FAR);
      const err = await svc.createReturn(operator, returnBody()).catch((e) => e);
      expect(err).toBeInstanceOf(ProblemException);
      expect(err).toMatchObject({ status: 422, slug: 'vehicle-not-at-depot' });
      expect(ender.livePosition).toHaveBeenCalledWith(VEHICLE_ID);
      expect(prisma.handover.create).not.toHaveBeenCalled();
      expect(ender.endAtDepot).not.toHaveBeenCalled();
      expect(prisma.rental.update).not.toHaveBeenCalled();
      expect(prisma.rental.updateMany).not.toHaveBeenCalled();
      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
      expect(prisma.fieldTask.updateMany).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('(b) moto a 80 m → encerra pelo galpão e grava AuditLog rental.return_depot (operador, aluguel, galpão, distância)', async () => {
      const { prisma, ender, audit, svc } = forReturn([{ code: 'freios', ok: true }]);
      ender.livePosition.mockResolvedValue(NEAR);
      prisma.vehicle.findUnique.mockResolvedValue({ status: 'free', depotId: DEPOT_ID } as any);
      const out = await svc.createReturn(operator, returnBody());
      expect(out.status).toBe(201);
      expect(ender.endAtDepot).toHaveBeenCalledWith(operator, RENTAL_ID, { depotId: DEPOT_ID, targetStatus: 'free', ...DEPOT_POS });
      expect(audit.record).toHaveBeenCalledTimes(1);
      const [entry] = audit.record.mock.calls[0];
      expect(entry).toEqual({
        actor: operator,
        action: 'rental.return_depot',
        entityType: 'Rental',
        entityId: RENTAL_ID,
        metadata: { depotId: DEPOT_ID, handoverId: HO_ID, distanceM: expect.any(Number) },
      });
      expect(entry.metadata.distanceM).toBeGreaterThanOrEqual(75);
      expect(entry.metadata.distanceM).toBeLessThanOrEqual(85);
      // Sem dados pessoais na auditoria (nem posição da moto).
      expect(JSON.stringify(entry.metadata)).not.toMatch(/lat|lng|email|cpf/i);
    });

    it('(c) sem posição viva (rastreador mudo/offline) → 422 vehicle-not-at-depot, nada gravado', async () => {
      const { prisma, ender, audit, svc } = forReturn([{ code: 'freios', ok: true }]);
      ender.livePosition.mockResolvedValue(null);
      await expect(svc.createReturn(operator, returnBody())).rejects.toMatchObject({ status: 422, slug: 'vehicle-not-at-depot' });
      expect(prisma.handover.create).not.toHaveBeenCalled();
      expect(ender.endAtDepot).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('(d) galpão inexistente ou inativo → 404, sem consultar a moto nem gravar nada', async () => {
      const { prisma, ender, svc } = forReturn([{ code: 'freios', ok: true }]);
      prisma.depot.findUnique.mockResolvedValue(null);
      await expect(svc.createReturn(operator, returnBody())).rejects.toMatchObject({ status: 404 });
      prisma.depot.findUnique.mockResolvedValue({ id: DEPOT_ID, active: false, ...DEPOT_POS } as any);
      await expect(svc.createReturn(operator, returnBody())).rejects.toMatchObject({ status: 404 });
      expect(ender.livePosition).not.toHaveBeenCalled();
      expect(prisma.handover.create).not.toHaveBeenCalled();
      expect(ender.endAtDepot).not.toHaveBeenCalled();
    });

    it('repetição de uma chegada já registrada não reconfere a posição (a conferência valeu na criação)', async () => {
      const { prisma, ender, audit, svc } = forReturn([{ code: 'freios', ok: true }]);
      prisma.handover.findFirst.mockResolvedValue({ ...handover, type: 'return_depot', status: 'accepted', rentalId: RENTAL_ID } as any);
      prisma.rental.findUnique.mockResolvedValue({ status: 'ended', customerId: CUSTOMER_ID } as any);
      prisma.vehicle.findUnique.mockResolvedValue({ status: 'free', depotId: DEPOT_ID } as any);
      ender.livePosition.mockResolvedValue(null);
      expect((await svc.createReturn(operator, returnBody())).status).toBe(200);
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  it('aluguel encerrado → 409 rental-not-active; galpão inexistente → 404', async () => {
    const { prisma, svc } = forReturn([{ code: 'freios', ok: true }]);
    prisma.rental.findUnique.mockResolvedValue({ id: RENTAL_ID, status: 'ended', vehicleId: VEHICLE_ID } as any);
    await expect(svc.createReturn(operator, returnBody())).rejects.toMatchObject({ slug: 'rental-not-active' });
    prisma.depot.findUnique.mockResolvedValue(null);
    await expect(svc.createReturn(operator, returnBody())).rejects.toMatchObject({ status: 404 });
  });
});

describe('HandoversService — cancelamento (operação)', () => {
  const ago = new Date(Date.now() - 60_000);
  const ahead = new Date(Date.now() + 3600_000);
  function forCancel(over: Record<string, unknown> = {}, resOver: Record<string, unknown> = {}) {
    const s = setup();
    s.prisma.handover.findUnique.mockResolvedValue({ ...handover, status: 'disputed', reservation: { ...reservation, ...resOver }, ...over } as any);
    s.prisma.handover.updateMany.mockResolvedValue({ count: 1 });
    s.prisma.handover.findFirst.mockResolvedValue(null);
    s.prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    s.prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    s.prisma.handover.findUniqueOrThrow.mockResolvedValue({ ...handover, status: 'canceled' } as any);
    // QA-23 (Task 14): o motivo do cancelamento volta na resposta, lido do AuditLog.
    s.prisma.auditLog.findMany.mockResolvedValue([{ entityId: HO_ID, reason: 'Moto trocada', actorId: STAFF_ID, actorName: null, createdAt: now }] as any);
    return s;
  }

  it('disputada e reserva no prazo → canceled, reserva volta a active (TTL regravado), auditoria e handover.updated', async () => {
    const { prisma, audit, reservations, events, svc } = forCancel({}, { expiresAt: ahead });
    const out = await svc.cancel(operator, HO_ID, 'Moto trocada');
    expect(out.status).toBe('canceled');
    expect(out).toMatchObject({ cancelReason: 'Moto trocada', canceledAt: now.toISOString(), canceledByName: 'Rafael Souza Lima' });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { action: 'handover.cancel', entityType: 'Handover', entityId: { in: [HO_ID] } } }));
    expect(prisma.handover.updateMany).toHaveBeenCalledWith({ where: { id: HO_ID, status: { in: ['pending_customer', 'disputed'] } }, data: { status: 'canceled' } });
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({ where: { id: RES_ID, status: 'handover' }, data: { status: 'active' } });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(reservations.trackExpiry).toHaveBeenCalledWith(RES_ID, CUSTOMER_ID, ahead);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'handover.cancel', entityId: HO_ID, reason: 'Moto trocada', metadata: { reservationId: RES_ID, reservation: 'active' } }), prisma);
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_UPDATED, { handoverId: HO_ID, status: 'canceled', customerId: CUSTOMER_ID, depotId: DEPOT_ID });
    expect(events.emit).not.toHaveBeenCalledWith(EV.DEPOSIT_RELEASE_REQUESTED, expect.anything());
  });

  it('reserva vencida → expired, caução liberada e moto reserved → free no galpão', async () => {
    const { prisma, reservations, events, svc } = forCancel({ status: 'pending_customer' }, { expiresAt: ago });
    await svc.cancel(operator, HO_ID, 'Cliente desistiu');
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({ where: { id: RES_ID, status: 'handover' }, data: { status: 'expired', endedAt: expect.any(Date) } });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'reserved' }, data: { status: 'free' } });
    expect(reservations.trackExpiry).not.toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith(EV.DEPOSIT_RELEASE_REQUESTED, { depositId: DEPOSIT_ID, customerId: CUSTOMER_ID, reason: 'reservation_expired' });
    expect(events.emit).toHaveBeenCalledWith(EV.VEHICLE_STATUS_CHANGED, expect.objectContaining({ vehicleId: VEHICLE_ID, status: 'free' }));
  });

  it('disputada com outra saída já aberta para a reserva → só a entrega é cancelada', async () => {
    const { prisma, svc } = forCancel({}, { expiresAt: ahead });
    prisma.handover.findFirst.mockResolvedValue({ id: 'outra' } as any);
    await svc.cancel(operator, HO_ID, 'Duplicada');
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
  });

  it('já aceita → 409; aceite em andamento → 409; return_depot ou cancelada → 422 handover-not-pending', async () => {
    const accepted = forCancel({ status: 'accepted', rentalId: RENTAL_ID });
    await expect(accepted.svc.cancel(operator, HO_ID, 'motivo')).rejects.toMatchObject({ status: 409 });
    const busy = forCancel();
    await busy.locks.begin('handover-accept', HO_ID, 'accept');
    await expect(busy.svc.cancel(operator, HO_ID, 'motivo')).rejects.toMatchObject({ status: 409 });
    expect(busy.prisma.handover.updateMany).not.toHaveBeenCalled();
    for (const over of [{ type: 'return_depot' }, { status: 'canceled' }]) {
      const c = forCancel(over);
      await expect(c.svc.cancel(operator, HO_ID, 'motivo')).rejects.toMatchObject({ slug: 'handover-not-pending' });
    }
  });

  it('corrida: aceita entre a leitura e a transição → 409, reserva intocada', async () => {
    const { prisma, svc } = forCancel({ status: 'pending_customer' });
    prisma.handover.updateMany.mockResolvedValue({ count: 0 });
    prisma.handover.findUnique
      .mockResolvedValueOnce({ ...handover, status: 'pending_customer', reservation } as any)
      .mockResolvedValueOnce({ ...handover, status: 'accepted' } as any);
    await expect(svc.cancel(operator, HO_ID, 'motivo')).rejects.toMatchObject({ status: 409 });
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
  });
});
