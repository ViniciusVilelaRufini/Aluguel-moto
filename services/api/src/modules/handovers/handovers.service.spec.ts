import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { EV } from '../../common/events';
import { MemoryIdempotencyStore } from '../../common/idempotency/idempotency.store';
import { conflict, ProblemException } from '../../common/problem';
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
  const ender = { endAtDepot: jest.fn().mockResolvedValue({}), depotArrivalStatus: jest.fn(async (_vehicleId: string, target: string) => target) };
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

describe('HandoversService — aceite', () => {
  it('sucesso: delega ao start() com os dados da reserva, a caução retida e a chave derivada da entrega; emite handover.updated', async () => {
    const { starter, events, svc } = setup();
    const out = await svc.accept(customer, HO_ID);
    expect(out).toMatchObject({ id: RENTAL_ID });
    expect(starter.start).toHaveBeenCalledWith(
      customer,
      { vehicleId: VEHICLE_ID, planCode: 'day', coverage: 'basic', depositMethod: 'card', cardId: undefined, couponCode: 'BEMVINDO', depositId: DEPOSIT_ID },
      `handover:${HO_ID}`,
      { fromHandover: { reservationId: RES_ID, handoverId: HO_ID } },
    );
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_UPDATED, { handoverId: HO_ID, status: 'accepted', customerId: CUSTOMER_ID, depotId: DEPOT_ID });
  });

  it('aceite duplicado: a segunda chamada (entrega já aceita) devolve o mesmo aluguel sem chamar start() de novo', async () => {
    const { prisma, starter, svc } = setup();
    await svc.accept(customer, HO_ID);
    prisma.handover.findUnique.mockResolvedValue({ ...handover, status: 'accepted', rentalId: RENTAL_ID, reservation } as any);
    const again = await svc.accept(customer, HO_ID);
    expect(again).toMatchObject({ id: RENTAL_ID });
    expect(starter.start).toHaveBeenCalledTimes(1);
  });

  it('aceites concorrentes: o segundo enquanto o primeiro está em andamento → 409, start() uma vez só', async () => {
    const { starter, svc } = setup();
    let finish!: () => void;
    starter.start.mockImplementation(() => new Promise((resolve) => {
      finish = () => resolve({ status: 201, body: { outcome: 'started', rental: { id: RENTAL_ID }, deposit: {} } });
    }));
    const first = svc.accept(customer, HO_ID);
    await new Promise((r) => setImmediate(r));
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ status: 409 });
    finish();
    await expect(first).resolves.toMatchObject({ id: RENTAL_ID });
    expect(starter.start).toHaveBeenCalledTimes(1);
  });

  it('corrida perdida dentro do start() mas a entrega já foi aceita → converge no aluguel existente', async () => {
    const { prisma, starter, svc } = setup();
    starter.start.mockRejectedValue(conflict('vehicle-unavailable', 'x'));
    prisma.handover.findUnique
      .mockResolvedValueOnce({ ...handover, reservation } as any)
      .mockResolvedValueOnce({ ...handover, status: 'accepted', rentalId: RENTAL_ID } as any);
    await expect(svc.accept(customer, HO_ID)).resolves.toMatchObject({ id: RENTAL_ID });
    expect(prisma.handover.updateMany).not.toHaveBeenCalled();
  });

  it('pagamento recusado → 422 payment-declined; entrega pendente com lastError; reserva intocada; handover.updated com o motivo', async () => {
    const { prisma, starter, events, svc } = setup();
    starter.start.mockRejectedValue(new ProblemException(402, 'payment-failed', 'recusado'));
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'payment-declined', status: 422 });
    expect(prisma.handover.updateMany).toHaveBeenCalledWith({ where: { id: HO_ID, status: 'pending_customer' }, data: { lastError: 'payment-declined' } });
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith(EV.HANDOVER_UPDATED, { handoverId: HO_ID, status: 'pending_customer', lastError: 'payment-declined', customerId: CUSTOMER_ID, depotId: DEPOT_ID });
    // A trava foi solta: um novo aceite tenta de novo.
    starter.start.mockResolvedValue({ status: 201, body: { outcome: 'started', rental: { id: RENTAL_ID }, deposit: {} } });
    await expect(svc.accept(customer, HO_ID)).resolves.toMatchObject({ id: RENTAL_ID });
  });

  it('Task 30: moto sem conexão no aceite → 409 vehicle-offline com mensagem verdadeira (sem prometer a liberação da caução)', async () => {
    const { prisma, starter, svc } = setup();
    starter.start.mockRejectedValue(conflict('vehicle-offline', 'A moto não respondeu ao desbloqueio. Nada foi cobrado e a caução foi liberada.'));
    const err = await svc.accept(customer, HO_ID).catch((e) => e);
    expect(err).toMatchObject({ status: 409, slug: 'vehicle-offline', detail: 'Não conseguimos falar com a moto agora. Tente de novo em instantes ou fale com o operador. Nada foi cobrado.' });
    expect(err.detail).not.toContain('liberada');
    expect(prisma.handover.updateMany).toHaveBeenCalledWith({ where: { id: HO_ID, status: 'pending_customer' }, data: { lastError: 'vehicle-offline' } });
  });

  it('fix 1/2: 402 que não é recusa de pagamento (deposit-not-held) mantém o slug e vira 422 (o aceite não tem 402 no contrato)', async () => {
    const { prisma, starter, svc } = setup();
    starter.start.mockRejectedValue(new ProblemException(402, 'deposit-not-held', 'em liberação'));
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'deposit-not-held', status: 422 });
    expect(prisma.handover.updateMany).toHaveBeenCalledWith({ where: { id: HO_ID, status: 'pending_customer' }, data: { lastError: 'deposit-not-held' } });
  });

  it('fix 2: 402 com start() em andamento desta entrega também sai como 422 (sem lastError)', async () => {
    const { prisma, starter, svc } = setup();
    starter.start.mockRejectedValue(new ProblemException(402, 'deposit-not-held', 'em liberação'));
    prisma.vehicle.findUnique.mockResolvedValue({ status: 'rented' } as any);
    prisma.rentalStart.findFirst.mockResolvedValue({ rentalId: 'r-em-andamento' } as any);
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'deposit-not-held', status: 422 });
    expect(prisma.handover.updateMany).not.toHaveBeenCalled();
  });

  it.each(['disputed', 'canceled'])('fix 2: aceite perde a corrida para %s → 422 handover-not-pending, sem lastError e sem handover.updated obsoleto', async (status) => {
    const { prisma, starter, events, svc } = setup();
    starter.start.mockRejectedValue(new ProblemException(422, 'handover-not-pending', 'x'));
    prisma.handover.findUnique
      .mockResolvedValueOnce({ ...handover, reservation } as any)
      .mockResolvedValueOnce({ ...handover, status } as any);
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'handover-not-pending', status: 422 });
    expect(prisma.handover.updateMany).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalledWith(EV.HANDOVER_UPDATED, expect.anything());
  });

  it('fix 2: erro de domínio do start() com a entrega já cancelada (ex.: vehicle-unavailable) → sem lastError nem evento', async () => {
    const { prisma, starter, events, svc } = setup();
    starter.start.mockRejectedValue(conflict('vehicle-unavailable', 'x'));
    prisma.handover.findUnique
      .mockResolvedValueOnce({ ...handover, reservation } as any)
      .mockResolvedValueOnce({ ...handover, status: 'canceled' } as any);
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'handover-not-pending' });
    expect(prisma.handover.updateMany).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalledWith(EV.HANDOVER_UPDATED, expect.anything());
  });

  it('fix 2: a entrega sai de pending_customer entre a releitura e a marcação (updateMany sem linha) → sem evento', async () => {
    const { prisma, starter, events, svc } = setup();
    starter.start.mockRejectedValue(conflict('vehicle-offline', 'x'));
    prisma.handover.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'handover-not-pending' });
    expect(events.emit).not.toHaveBeenCalledWith(EV.HANDOVER_UPDATED, expect.anything());
  });

  it('fix 1: moto já rented por um start() em andamento desta mesma entrega → sem lastError e sem evento', async () => {
    const { prisma, starter, events, svc } = setup();
    starter.start.mockRejectedValue(conflict('vehicle-unavailable', 'x'));
    prisma.vehicle.findUnique.mockResolvedValue({ status: 'rented' } as any);
    prisma.rentalStart.findFirst.mockResolvedValue({ rentalId: 'r-em-andamento' } as any);
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'vehicle-unavailable' });
    expect(prisma.rentalStart.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { vehicleId: VEHICLE_ID, depositId: DEPOSIT_ID } }));
    expect(prisma.handover.updateMany).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalledWith(EV.HANDOVER_UPDATED, expect.anything());
  });

  it('fix 1: aceite enquanto o operador cancela (trava da entrega) → 409', async () => {
    const { starter, locks, svc } = setup();
    await locks.begin('handover-accept', HO_ID, 'accept');
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ status: 409 });
    expect(starter.start).not.toHaveBeenCalled();
  });

  it('moto offline no aceite → mesmo erro do start() (409) e lastError vehicle-offline', async () => {
    const { prisma, starter, svc } = setup();
    starter.start.mockRejectedValue(conflict('vehicle-offline', 'offline'));
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'vehicle-offline' });
    expect(prisma.handover.updateMany).toHaveBeenCalledWith({ where: { id: HO_ID, status: 'pending_customer' }, data: { lastError: 'vehicle-offline' } });
  });

  it('outro cliente → 404 (não revela a entrega)', async () => {
    const { starter, svc } = setup();
    await expect(svc.accept(other, HO_ID)).rejects.toMatchObject({ status: 404 });
    await expect(svc.dispute(other, HO_ID, 'Retrovisor quebrado')).rejects.toMatchObject({ status: 404 });
    await expect(svc.get(other, HO_ID)).rejects.toMatchObject({ status: 404 });
    expect(starter.start).not.toHaveBeenCalled();
  });

  it('fora de pending_customer → 422 handover-not-pending', async () => {
    const { prisma, starter, svc } = setup();
    for (const status of ['disputed', 'canceled']) {
      prisma.handover.findUnique.mockResolvedValue({ ...handover, status, reservation } as any);
      await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'handover-not-pending', status: 422 });
    }
    expect(starter.start).not.toHaveBeenCalled();
  });

  it('caução da reserva não retida (ou em liberação) → 422 deposit-not-held, sem start()', async () => {
    const { prisma, starter, svc } = setup();
    prisma.deposit.findUnique.mockResolvedValue({ id: DEPOSIT_ID, status: 'awaiting_pix' } as any);
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'deposit-not-held', status: 422 });
    prisma.deposit.findUnique.mockResolvedValue({ id: DEPOSIT_ID, status: 'held' } as any);
    prisma.depositRelease.findUnique.mockResolvedValue({ depositId: DEPOSIT_ID } as any);
    await expect(svc.accept(customer, HO_ID)).rejects.toMatchObject({ slug: 'deposit-not-held' });
    expect(starter.start).not.toHaveBeenCalled();
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
    s.prisma.depot.findUnique.mockResolvedValue({ id: DEPOT_ID, ...DEPOT_POS } as any);
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
