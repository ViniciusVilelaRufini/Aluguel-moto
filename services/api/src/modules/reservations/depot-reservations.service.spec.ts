import { DepotsService } from '../depots/depots.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { EV } from '../../common/events';
import { loadConfig } from '../../config/env';
import { MemoryRedisStore } from '../../redis/redis-store';
import { DepotReservationsService, type DepotReservationInput } from './depot-reservations.service';
import { verifyPickupCode } from './pickup-code';
import { ReservationsService } from './reservations.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const DEPOT_ID = '44444444-4444-4444-8444-444444444444';
const RES_ID = '55555555-5555-4555-8555-555555555555';
const DEPOSIT_ID = '66666666-6666-4666-8666-666666666666';
const SECRET = 'segredo-de-teste';

const ALL_WEEK = Array.from({ length: 7 }, (_, weekday) => ({ weekday, opensAt: '00:00', closesAt: '23:59' }));
const depot = {
  id: DEPOT_ID, name: 'Galpão Teste', timezone: 'America/Sao_Paulo', openingHours: ALL_WEEK, active: true,
  pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30,
};
const customer = { id: CUSTOMER_ID, kycStatus: 'approved', status: 'active', delinquent: false, termsAccepted: true, termsVersion: '2026-10', name: 'Maria Silva', cpf: '52998224725' };
const vehicle = { id: VEHICLE_ID, code: 'VLT-0011', model: 'Volti S1', status: 'free', depotId: DEPOT_ID, lat: -23.56, lng: -46.68, batteryPct: 90 };
const deposit = (over: Record<string, unknown> = {}) => ({
  id: DEPOSIT_ID, rentalId: 'r-1', customerId: CUSTOMER_ID, method: 'card', status: 'held', amountCents: 5000, capturedCents: null, pix: null,
  createdAt: new Date(), updatedAt: new Date(), ...over,
});

const input = (over: Partial<DepotReservationInput> = {}): DepotReservationInput => ({
  vehicleId: VEHICLE_ID, depotId: DEPOT_ID, pickupMode: 'now', planCode: 'day', coverage: 'basic', depositMethod: 'card', ...over,
});

function setup() {
  const prisma: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const redis = new MemoryRedisStore();
  const billing = {
    isDelinquent: jest.fn().mockResolvedValue(false),
    holdDeposit: jest.fn().mockResolvedValue({ depositId: DEPOSIT_ID, status: 'held' }),
    settle: jest.fn(),
  };
  const events = new EventEmitter2();
  const released: any[] = [];
  events.on(EV.DEPOSIT_RELEASE_REQUESTED, (ev) => released.push(ev));
  const push = { sendToOwner: jest.fn().mockResolvedValue(undefined) };
  const cfg = loadConfig();
  const reservations = new ReservationsService(prisma as any, redis, billing, events, cfg);
  const service = new DepotReservationsService(prisma as any, reservations, billing, events, push, SECRET, cfg, new DepotsService(prisma as any, { record: jest.fn() } as any));

  prisma.depot.findUnique.mockResolvedValue(depot as any);
  prisma.customer.findUnique.mockResolvedValue(customer as any);
  prisma.rental.findFirst.mockResolvedValue(null);
  prisma.reservation.findFirst.mockResolvedValue(null);
  prisma.vehicle.findUnique.mockResolvedValue(vehicle as any);
  prisma.subscription.findFirst.mockResolvedValue(null);
  prisma.deposit.findUnique.mockResolvedValue(deposit() as any);
  prisma.depositRelease.findUnique.mockResolvedValue(null);
  prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
  prisma.reservation.create.mockImplementation((async (args: any) => ({
    id: RES_ID, status: 'active', createdAt: new Date(), updatedAt: new Date(), endedAt: null, reminderSentAt: null,
    pickupAt: null, cardId: null, couponCode: null, ...args.data, vehicle,
  })) as any);
  return { prisma, redis, billing, events, released, push, reservations, service };
}

describe('DepotReservationsService.create', () => {
  it('retirar agora: bloqueia a caução no cartão, separa a moto do galpão e devolve o código só ao dono', async () => {
    const { service, prisma, billing, redis } = setup();
    const before = Date.now();
    const r = await service.create(CUSTOMER_ID, input(), 'chave-idem-1');

    expect(billing.holdDeposit).toHaveBeenCalledWith(expect.objectContaining({ customerId: CUSTOMER_ID, method: 'card', idempotencyKey: expect.stringContaining('chave-idem-1') }));
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'free', depotId: DEPOT_ID }, data: { status: 'reserved' } });
    const data = (prisma.reservation.create.mock.calls[0][0] as any).data;
    expect(data).toMatchObject({ customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, depotId: DEPOT_ID, depositId: DEPOSIT_ID, pickupMode: 'now', planCode: 'day', coverage: 'basic', depositMethod: 'card' });
    // `now`: criação + 120 min (o galpão de teste fecha só às 23:59 — pode ser antes).
    expect(data.expiresAt.getTime()).toBeLessThanOrEqual(before + 120 * 60_000 + 1000);
    expect(data.expiresAt.getTime()).toBeGreaterThan(before);

    expect(r).toMatchObject({ id: RES_ID, status: 'active', depotId: DEPOT_ID, pickupMode: 'now', planCode: 'day', coverage: 'basic', depositMethod: 'card' });
    expect(r.deposit).toMatchObject({ id: DEPOSIT_ID, status: 'held' });
    expect(verifyPickupCode(r.pickupCode!, new Date(), SECRET)).toEqual({ reservationId: RES_ID });
    expect(r.pickupCode).not.toContain(customer.cpf);
    expect(await redis.exists(`reservation:${RES_ID}`)).toBe(true);
  });

  it('agendado fora do horário → 422 pickup-outside-hours sem caução criada', async () => {
    const { service, prisma, billing } = setup();
    prisma.depot.findUnique.mockResolvedValue({ ...depot, openingHours: [] } as any);
    const pickupAt = new Date(Date.now() + 24 * 3600_000).toISOString();
    await expect(service.create(CUSTOMER_ID, input({ pickupMode: 'scheduled', pickupAt }), 'k-outside')).rejects.toMatchObject({ status: 422, slug: 'pickup-outside-hours' });
    expect(billing.holdDeposit).not.toHaveBeenCalled();
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('agendado: expiresAt = pickupAt + scheduledGraceMinutes; além de maxScheduleDays → 422 pickup-too-far-ahead; sem pickupAt → 400', async () => {
    const { service, prisma, billing } = setup();
    const pickupAt = new Date(Math.ceil((Date.now() + 3 * 3600_000) / 60_000) * 60_000);
    await service.create(CUSTOMER_ID, input({ pickupMode: 'scheduled', pickupAt: pickupAt.toISOString() }), 'k-sched');
    const data = (prisma.reservation.create.mock.calls[0][0] as any).data;
    expect(data.pickupAt).toEqual(pickupAt);
    expect(data.expiresAt).toEqual(new Date(pickupAt.getTime() + 30 * 60_000));

    billing.holdDeposit.mockClear();
    const far = new Date(Date.now() + 8 * 24 * 3600_000).toISOString();
    await expect(service.create(CUSTOMER_ID, input({ pickupMode: 'scheduled', pickupAt: far }), 'k-far')).rejects.toMatchObject({ status: 422, slug: 'pickup-too-far-ahead' });
    await expect(service.create(CUSTOMER_ID, input({ pickupMode: 'scheduled' }), 'k-none')).rejects.toMatchObject({ status: 400 });
    expect(billing.holdDeposit).not.toHaveBeenCalled();
  });

  it('Task 16 (R2-01): dívida em aberto → 409 payment-pending ("Pague o valor pendente para alugar de novo."), sem caução nem moto separada', async () => {
    const { service, billing, prisma } = setup();
    billing.isDelinquent.mockResolvedValue(true);
    await expect(service.create(CUSTOMER_ID, input(), 'k-debt')).rejects.toMatchObject({ status: 409, slug: 'payment-pending', detail: 'Pague o valor pendente para alugar de novo.' });
    expect(billing.holdDeposit).not.toHaveBeenCalled();
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('galpão inativo → 422 depot-inactive; inexistente → 404', async () => {
    const { service, prisma, billing } = setup();
    prisma.depot.findUnique.mockResolvedValue({ ...depot, active: false } as any);
    await expect(service.create(CUSTOMER_ID, input(), 'k-inactive')).rejects.toMatchObject({ status: 422, slug: 'depot-inactive' });
    prisma.depot.findUnique.mockResolvedValue(null);
    await expect(service.create(CUSTOMER_ID, input(), 'k-missing')).rejects.toMatchObject({ status: 404 });
    expect(billing.holdDeposit).not.toHaveBeenCalled();
  });

  it('KYC pendente → 403; termos não aceitos → 403', async () => {
    const a = setup();
    a.prisma.customer.findUnique.mockResolvedValue({ ...customer, kycStatus: 'pending' } as any);
    await expect(a.service.create(CUSTOMER_ID, input(), 'k-kyc')).rejects.toMatchObject({ status: 403, slug: 'kyc-not-approved' });
    const b = setup();
    b.prisma.customer.findUnique.mockResolvedValue({ ...customer, termsAccepted: false } as any);
    await expect(b.service.create(CUSTOMER_ID, input(), 'k-terms')).rejects.toMatchObject({ status: 403 });
    expect(b.billing.holdDeposit).not.toHaveBeenCalled();
  });

  it('aluguel aberto → 409 rental-already-active; reserva aberta (active ou handover) → 409 reservation-open', async () => {
    const a = setup();
    a.prisma.rental.findFirst.mockResolvedValue({ id: 'rent-1' } as any);
    await expect(a.service.create(CUSTOMER_ID, input(), 'k-rent')).rejects.toMatchObject({ status: 409, slug: 'rental-already-active' });
    const b = setup();
    b.prisma.reservation.findFirst.mockResolvedValue({ id: 'res-x', status: 'handover' } as any);
    await expect(b.service.create(CUSTOMER_ID, input(), 'k-open')).rejects.toMatchObject({ status: 409, slug: 'reservation-open' });
    const where = (b.prisma.reservation.findFirst.mock.calls[0][0] as any).where;
    expect(JSON.stringify(where)).toContain('handover');
    expect(b.billing.holdDeposit).not.toHaveBeenCalled();
  });

  it('moto de outro galpão, da rua ou não livre → 409 vehicle-unavailable sem caução', async () => {
    for (const v of [{ ...vehicle, depotId: 'outro' }, { ...vehicle, depotId: null }, { ...vehicle, status: 'reserved' }]) {
      const s = setup();
      s.prisma.vehicle.findUnique.mockResolvedValue(v as any);
      await expect(s.service.create(CUSTOMER_ID, input(), 'k-v')).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
      expect(s.billing.holdDeposit).not.toHaveBeenCalled();
    }
  });

  it('moto fixa de outro plano vigente (contrato v2) → 409 vehicle-unavailable sem caução; a própria moto fixa reserva', async () => {
    const s = setup();
    s.prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-x', customerId: OTHER_ID } as any);
    await expect(s.service.create(CUSTOMER_ID, input(), 'k-fixed')).rejects.toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(s.billing.holdDeposit).not.toHaveBeenCalled();
    expect((s.prisma.subscription.findFirst.mock.calls[0][0] as any).where).toMatchObject({ assignedVehicleId: VEHICLE_ID });
    s.prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-meu', customerId: CUSTOMER_ID } as any);
    await expect(s.service.create(CUSTOMER_ID, input(), 'k-fixed-own')).resolves.toMatchObject({ status: 'active' });
  });

  it('cartão recusado → 422 payment-declined e a moto não é separada', async () => {
    const { service, prisma, billing } = setup();
    billing.holdDeposit.mockResolvedValue({ depositId: DEPOSIT_ID, status: 'failed' });
    prisma.deposit.findUnique.mockResolvedValue(deposit({ status: 'failed' }) as any);
    await expect(service.create(CUSTOMER_ID, input(), 'k-declined')).rejects.toMatchObject({ status: 422, slug: 'payment-declined' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('corrida: duas create simultâneas para a mesma moto → uma 201 e uma 409, e a caução da perdedora é liberada', async () => {
    const { service, prisma, billing, released } = setup();
    let claimed = false;
    prisma.vehicle.updateMany.mockImplementation((async () => {
      await new Promise((r) => setTimeout(r, 5));
      if (claimed) return { count: 0 };
      claimed = true;
      return { count: 1 };
    }) as any);
    billing.holdDeposit
      .mockResolvedValueOnce({ depositId: DEPOSIT_ID, status: 'held' })
      .mockResolvedValueOnce({ depositId: 'dep-perdedora', status: 'held' });
    prisma.deposit.findUnique.mockImplementation((async (args: any) => deposit({ id: args.where.id, customerId: args.where.id === DEPOSIT_ID ? CUSTOMER_ID : OTHER_ID })) as any);

    const results = await Promise.allSettled([
      service.create(CUSTOMER_ID, input(), 'k-race-a'),
      service.create(OTHER_ID, input(), 'k-race-b'),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toMatchObject({ status: 409, slug: 'vehicle-unavailable' });
    expect(released).toEqual([expect.objectContaining({ depositId: 'dep-perdedora', customerId: OTHER_ID })]);
    expect(prisma.reservation.create).toHaveBeenCalledTimes(1);
  });

  it('violação do índice único (reserva aberta concorrente do mesmo cliente) → 409 reservation-open e caução liberada', async () => {
    const { service, prisma, released } = setup();
    prisma.reservation.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '5.22.0', meta: { target: ['customerId'] } }),
    );
    await expect(service.create(CUSTOMER_ID, input(), 'k-unique')).rejects.toMatchObject({ status: 409, slug: 'reservation-open' });
    expect(released).toEqual([expect.objectContaining({ depositId: DEPOSIT_ID })]);
  });

  it('Pix → resposta com o QR e reserva active', async () => {
    const { service, prisma, billing } = setup();
    const pix = { chargeId: 'ch-1', qrCodeBase64: 'iVBORw0KGgo=', copyPaste: '00020126...', expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() };
    billing.holdDeposit.mockResolvedValue({ depositId: DEPOSIT_ID, status: 'awaiting_pix', pix });
    prisma.deposit.findUnique.mockResolvedValue(deposit({ method: 'pix', status: 'awaiting_pix', pix }) as any);
    const r = await service.create(CUSTOMER_ID, input({ depositMethod: 'pix' }), 'k-pix');
    expect(r.status).toBe('active');
    expect(r.deposit).toMatchObject({ method: 'pix', status: 'awaiting_pix', pix: { copyPaste: '00020126...', qrCodeBase64: 'iVBORw0KGgo=' } });
    expect(billing.holdDeposit).toHaveBeenCalledWith(expect.objectContaining({ method: 'pix' }));
  });
});

describe('DepotReservationsService — cancelamento, expiração e lembrete', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: RES_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, depotId: DEPOT_ID, status: 'active', depositId: DEPOSIT_ID,
    expiresAt: new Date(Date.now() + 60 * 60_000), reminderSentAt: null, createdAt: new Date(0), ...over,
  });

  it('cancel libera a caução e a moto volta a free', async () => {
    const { service, prisma, released } = setup();
    prisma.reservation.findUnique.mockResolvedValue(row() as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    await service.cancel(CUSTOMER_ID, RES_ID);
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({ where: { id: RES_ID, status: 'active' }, data: expect.objectContaining({ status: 'canceled' }) });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'reserved' }, data: { status: 'free' } });
    expect(released).toEqual([expect.objectContaining({ depositId: DEPOSIT_ID, reason: 'reservation_canceled' })]);
  });

  it('cancel com entrega aberta (handover) → 409 reservation-in-handover, nada muda', async () => {
    const { service, prisma, released } = setup();
    prisma.reservation.findUnique.mockResolvedValue(row({ status: 'handover' }) as any);
    await expect(service.cancel(CUSTOMER_ID, RES_ID)).rejects.toMatchObject({ status: 409, slug: 'reservation-in-handover' });
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
    expect(released).toEqual([]);
  });

  it('sweep expira reservas de galpão vencidas, libera a caução e a moto', async () => {
    const { reservations, prisma, released } = setup();
    prisma.reservation.findMany.mockResolvedValue([{ id: RES_ID, expiresAt: new Date(Date.now() - 1000) }] as any);
    prisma.reservation.findUnique.mockResolvedValue(row({ expiresAt: new Date(Date.now() - 1000) }) as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    await reservations.sweep();
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({ where: { id: RES_ID, status: 'active' }, data: expect.objectContaining({ status: 'expired' }) });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'reserved' }, data: { status: 'free' } });
    expect(released).toEqual([expect.objectContaining({ depositId: DEPOSIT_ID, reason: 'reservation_expired' })]);
    // Só reservas `active` são varridas: `handover` (entrega aberta) não expira pelo prazo.
    expect((prisma.reservation.findMany.mock.calls[0][0] as any).where).toMatchObject({ status: 'active' });
  });

  it('remindJob envia uma vez só, com o horário no fuso do galpão', async () => {
    const { service, prisma, push } = setup();
    const expiresAt = new Date('2026-10-22T17:30:00Z'); // 14:30 em São Paulo
    const now = new Date('2026-10-22T17:05:00Z');
    let sent: Date | null = null;
    prisma.reservation.findMany.mockImplementation((async () => (sent ? [] : [{ ...row({ expiresAt }), depot }])) as any);
    prisma.reservation.updateMany.mockImplementation((async (args: any) => {
      if (sent || args.where.reminderSentAt !== null) return { count: 0 };
      sent = args.data.reminderSentAt;
      return { count: 1 };
    }) as any);

    await service.remind(now);
    await service.remind(now);

    expect(push.sendToOwner).toHaveBeenCalledTimes(1);
    expect(push.sendToOwner).toHaveBeenCalledWith(CUSTOMER_ID, expect.objectContaining({ body: 'Sua retirada vence às 14:30' }));
    const where = (prisma.reservation.findMany.mock.calls[0][0] as any).where;
    expect(where).toMatchObject({ status: 'active', reminderSentAt: null, depotId: { not: null }, expiresAt: { gt: now, lte: new Date(now.getTime() + 30 * 60_000) } });
    expect(sent).toEqual(now);
  });

  it('remindJob: duas instâncias ao mesmo tempo → um push só (claim condicional)', async () => {
    const { service, prisma, push } = setup();
    const now = new Date();
    prisma.reservation.findMany.mockResolvedValue([{ ...row({ expiresAt: new Date(now.getTime() + 10 * 60_000) }), depot }] as any);
    let claims = 0;
    prisma.reservation.updateMany.mockImplementation((async () => ({ count: claims++ === 0 ? 1 : 0 })) as any);
    await Promise.all([service.remind(now), service.remind(now)]);
    expect(push.sendToOwner).toHaveBeenCalledTimes(1);
  });

  // ───────────── fix round 1 ─────────────

  it('fix 1: caução Pix falhou (deposit.failed) → reserva ativa daquela caução expira e a moto volta a free', async () => {
    const { reservations, prisma, released } = setup();
    prisma.reservation.findFirst.mockResolvedValue(row({ depositMethod: 'pix' }) as any);
    prisma.reservation.findUnique.mockResolvedValue(row({ depositMethod: 'pix' }) as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    await reservations.onDepositFailed({ depositId: DEPOSIT_ID, customerId: CUSTOMER_ID });
    expect((prisma.reservation.findFirst.mock.calls[0][0] as any).where).toMatchObject({ depositId: DEPOSIT_ID, status: 'active' });
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({ where: { id: RES_ID, status: 'active' }, data: expect.objectContaining({ status: 'expired' }) });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'reserved' }, data: { status: 'free' } });
    expect(released).toEqual([expect.objectContaining({ depositId: DEPOSIT_ID, reason: 'reservation_expired' })]);
  });

  it('fix 1: deposit.failed sem reserva ativa → nada muda', async () => {
    const { reservations, prisma } = setup();
    prisma.reservation.findFirst.mockResolvedValue(null);
    await reservations.onDepositFailed({ depositId: DEPOSIT_ID, customerId: CUSTOMER_ID });
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
  });

  it('fix 1: varredura expira reserva de galpão com caução failed ou Pix vencido (consulta com o Deposit)', async () => {
    const { reservations, prisma } = setup();
    prisma.reservation.findMany.mockResolvedValue([]);
    (prisma.$queryRaw as any).mockResolvedValue([{ id: RES_ID }]);
    prisma.reservation.findUnique.mockResolvedValue(row() as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    await reservations.sweep();
    const sql = ((prisma.$queryRaw as any).mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toContain(`'failed'`);
    expect(sql).toContain(`'awaiting_pix'`);
    expect(sql).toContain('expiresAt');
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({ where: { id: RES_ID, status: 'active' }, data: expect.objectContaining({ status: 'expired' }) });
  });

  it('fix 2: cancel que perde a corrida → relê: handover → 409 reservation-in-handover; outro → 409 conflict; nunca 204 sem cancelar', async () => {
    const { service, prisma, released } = setup();
    prisma.reservation.updateMany.mockResolvedValue({ count: 0 });
    prisma.reservation.findUnique
      .mockResolvedValueOnce(row() as any) // cancel
      .mockResolvedValueOnce(row() as any) // end
      .mockResolvedValueOnce(row({ status: 'handover' }) as any); // releitura
    await expect(service.cancel(CUSTOMER_ID, RES_ID)).rejects.toMatchObject({ status: 409, slug: 'reservation-in-handover' });
    prisma.reservation.findUnique
      .mockResolvedValueOnce(row() as any)
      .mockResolvedValueOnce(row() as any)
      .mockResolvedValueOnce(row({ status: 'expired' }) as any);
    await expect(service.cancel(CUSTOMER_ID, RES_ID)).rejects.toMatchObject({ status: 409, slug: 'conflict' });
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(released).toEqual([]);
  });

  it('fix 3: passe de expiração busca só as vencidas (expiresAt <= agora, mais antigas primeiro, 500) — acha mesmo com mais de 500 ativas', async () => {
    const { reservations, prisma } = setup();
    const overdue = { id: RES_ID, expiresAt: new Date(Date.now() - 60_000) };
    const future = Array.from({ length: 600 }, (_, i) => ({ id: `fut-${i}`, expiresAt: new Date(Date.now() + 3600_000) }));
    prisma.reservation.count.mockResolvedValue(601);
    prisma.reservation.findMany.mockImplementation((async (args: any) => (args.where.expiresAt?.lte ? [overdue] : future.slice(0, args.take))) as any);
    prisma.reservation.findUnique.mockResolvedValue(row({ expiresAt: overdue.expiresAt }) as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    await reservations.sweep();
    const expiryCall = prisma.reservation.findMany.mock.calls.map((c) => c[0] as any).find((a) => a.where.expiresAt?.lte);
    expect(expiryCall).toMatchObject({ where: { status: 'active', expiresAt: { lte: expect.any(Date) } }, orderBy: { expiresAt: 'asc' }, take: 500 });
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith({ where: { id: RES_ID, status: 'active' }, data: expect.objectContaining({ status: 'expired' }) });
    expect(prisma.reservation.updateMany).toHaveBeenCalledTimes(1);
  });

  it('fix 3: passe separado regrava a chave do Redis das ativas no prazo sem chave', async () => {
    const { reservations, prisma, redis } = setup();
    prisma.reservation.findMany.mockImplementation((async (args: any) =>
      (args.where.expiresAt?.gt ? [{ id: RES_ID, expiresAt: new Date(Date.now() + 3600_000) }] : [])) as any);
    await reservations.sweep();
    expect(await redis.exists(`reservation:${RES_ID}`)).toBe(true);
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
  });

  it('fix 4: compensador libera caução de reserva órfã (held/awaiting_pix, chave de reserva, sem reserva nem aluguel, > 10 min)', async () => {
    const { service, prisma, released } = setup();
    const now = new Date('2026-10-22T15:00:00Z');
    prisma.deposit.findMany.mockResolvedValue([
      { id: 'orfa', customerId: CUSTOMER_ID },
      { id: 'com-reserva', customerId: CUSTOMER_ID },
      { id: 'com-aluguel', customerId: CUSTOMER_ID },
    ] as any);
    prisma.reservation.findFirst.mockImplementation((async (a: any) => (a.where.depositId === 'com-reserva' ? { id: 'r' } : null)) as any);
    prisma.rental.findFirst.mockImplementation((async (a: any) => (a.where.depositId === 'com-aluguel' ? { id: 'x' } : null)) as any);
    prisma.deposit.findMany.mockResolvedValue([
      { id: 'orfa', customerId: CUSTOMER_ID },
      { id: 'com-reserva', customerId: CUSTOMER_ID },
      { id: 'com-aluguel', customerId: CUSTOMER_ID },
      { id: 'ja-liberando', customerId: CUSTOMER_ID },
    ] as any);
    prisma.depositRelease.findUnique.mockImplementation((async (a: any) => (a.where.depositId === 'ja-liberando' ? { depositId: 'ja-liberando' } : null)) as any);
    expect(await service.releaseOrphanDeposits(now)).toBe(1);
    expect(released).toEqual([expect.objectContaining({ depositId: 'orfa', customerId: CUSTOMER_ID })]);
    const where = (prisma.deposit.findMany.mock.calls[0][0] as any).where;
    expect(where).toMatchObject({
      status: { in: ['held', 'awaiting_pix'] },
      createdAt: { lt: new Date(now.getTime() - 10 * 60_000) },
    });
    expect(JSON.stringify(where)).toContain(':reservation:');
  });

  it('fix 4: compensador respeita JOBS_ENABLED', async () => {
    const { service, prisma } = setup();
    (service as any).cfg = { ...(service as any).cfg, jobsEnabled: false };
    await service.orphanDepositsJob();
    expect(prisma.deposit.findMany).not.toHaveBeenCalled();
  });

  it('fix 5: cardId só é gravado (e usado na caução) com depositMethod card', async () => {
    const CARD = '77777777-7777-4777-8777-777777777777';
    const a = setup();
    a.billing.holdDeposit.mockResolvedValue({ depositId: DEPOSIT_ID, status: 'awaiting_pix', pix: {} });
    a.prisma.deposit.findUnique.mockResolvedValue(deposit({ method: 'pix', status: 'awaiting_pix' }) as any);
    await a.service.create(CUSTOMER_ID, input({ depositMethod: 'pix', cardId: CARD }), 'k-pix-card');
    expect((a.prisma.reservation.create.mock.calls[0][0] as any).data.cardId).toBeNull();
    expect(a.billing.holdDeposit.mock.calls[0][0]).not.toHaveProperty('cardId');
    const b = setup();
    await b.service.create(CUSTOMER_ID, input({ cardId: CARD }), 'k-card');
    expect((b.prisma.reservation.create.mock.calls[0][0] as any).data.cardId).toBe(CARD);
    expect(b.billing.holdDeposit.mock.calls[0][0]).toMatchObject({ cardId: CARD });
  });

  it('fix 6: sem lembrete quando a reserva inteira dura 30 min ou menos', async () => {
    const { service, prisma, push } = setup();
    const now = new Date('2026-10-22T17:05:00Z');
    const expiresAt = new Date('2026-10-22T17:30:00Z');
    prisma.reservation.findMany.mockResolvedValue([
      { ...row({ id: 'curta', expiresAt, createdAt: new Date(expiresAt.getTime() - 30 * 60_000) }), depot },
    ] as any);
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    expect(await service.remind(now)).toBe(0);
    expect(push.sendToOwner).not.toHaveBeenCalled();
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
  });
});
