import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { createHarness, customerToken, Harness, staffToken } from '../../../test/helpers/http-harness';
import { ProblemException, unprocessable } from '../../common/problem';
import type { Principal } from '../auth/principal';
import { PricingService } from '../pricing/pricing.service';
import { RentalEndService } from './rental-end.service';
import { RentalStartService } from './rental-start.service';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';
import { EV } from '../../common/events';
import { VehiclesService } from '../vehicles/vehicles.service';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const RENTAL_ID = '88888888-8888-4888-8888-888888888888';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const ZONE_ID = '99999999-9999-4999-8999-999999999999';
const PHOTO_KEY = `returns/${RENTAL_ID}/foto.jpg`;

const admin: Principal = { pool: 'staff', sub: 'a', email: 'a@volti.com.br', groups: ['admin'], userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', staffId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };
const support: Principal = { ...admin, groups: ['suporte'] };

/** Banco falso mínimo e com estado para o aluguel (findUnique/updateMany/update). */
function setup(opts: { photo?: boolean; inZone?: boolean; lock?: 'confirmed' | 'in_progress' | 'pending'; depotId?: string | null } = {}) {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const startedAt = new Date(Date.now() - 10 * 60 * 1000);
  const rental: any = {
    id: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, planCode: 'minute', coverage: 'basic', status: 'active',
    startedAt, pausedAt: null, pausedSecondsAcc: 0, endRequestedAt: null, endLastAttemptAt: null, endAttempts: 0, endedAt: null,
    priceSnapshot: { planCode: 'minute', unit: 'minute', unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, insurancePremiumCents: 200, coverage: 'basic' },
    costCents: 0, breakdown: null, couponCode: null, depositId: '66666666-6666-4666-8666-666666666666', insurancePolicyId: null, paymentId: null,
    endZoneId: null, returnPhotoUploadKey: opts.photo === false ? null : PHOTO_KEY, returnPhotoObjectKey: null, forceEndReason: null,
    forcedEndById: null, rating: null, speedLimitKmh: null, createdAt: startedAt, updatedAt: startedAt,
  };
  const vehicle = { id: VEHICLE_ID, code: 'VLT-0001', thingName: 'moto-0001', lat: -23.56, lng: -46.69, status: 'rented', depotId: opts.depotId ?? null };
  prisma.rental.findUnique.mockImplementation((async () => ({ ...rental, vehicle })) as any);
  prisma.rental.updateMany.mockImplementation((async (args: any) => {
    const allowed: string[] | undefined = args.where.status?.in;
    if (allowed && !allowed.includes(rental.status)) return { count: 0 };
    const data = { ...args.data };
    if (data.endAttempts?.increment) data.endAttempts = rental.endAttempts + data.endAttempts.increment;
    Object.assign(rental, data);
    return { count: 1 };
  }) as any);
  prisma.rental.update.mockImplementation((async (args: any) => Object.assign(rental, args.data)) as any);
  prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
  prisma.fee.findUnique.mockResolvedValue({ code: 'force_end_outside_return_zone', amountCents: 1500, active: true } as any);

  const billing = { holdDeposit: jest.fn(), isDelinquent: jest.fn(), settle: jest.fn().mockResolvedValue({ paymentId: 'pay-1', status: 'paid' }) };
  const commands = { dispatch: jest.fn().mockResolvedValue({ id: 'cmd', status: opts.lock ?? 'confirmed' }) };
  const zones = { findContaining: jest.fn().mockResolvedValue(opts.inZone === false ? null : { id: ZONE_ID, type: 'return' }) };
  const iot = { getLiveState: jest.fn().mockResolvedValue(null) };
  const audit = { record: jest.fn() };
  const alerts = { create: jest.fn().mockResolvedValue({ id: 'alert-1' }) };
  const events = new EventEmitter2();
  const service = new RentalEndService(prisma as any, new PricingService(prisma as any), billing, commands as any, zones as any, iot as any, events, audit as any, alerts as any);
  return { service, prisma, rental, billing, commands, zones, audit, alerts, events, vehicle: vehicle as Record<string, unknown> };
}

describe('Encerramento do aluguel', () => {
  // Relógio controlado: o valor (1290) não pode depender do tempo de execução do teste.
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-21T15:00:00.000Z') }));
  afterEach(() => jest.useRealTimers());

  it('retentativas têm limite: no 10º travamento sem confirmação abre alerta e para de reenviar comandos', async () => {
    const { service, rental, commands, prisma, alerts } = setup({ lock: 'in_progress' });
    rental.status = 'ending';
    rental.endAttempts = 9;
    rental.endLastAttemptAt = new Date(Date.now() - 60_000);
    prisma.rental.findMany.mockResolvedValue([{ ...rental }] as any);
    await service.retryEnding();
    expect(commands.dispatch).toHaveBeenCalledTimes(1);
    expect(alerts.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'command_failed', priority: 'high', rentalId: RENTAL_ID }), expect.anything());
    // A consulta do job só busca aluguéis abaixo do limite.
    expect((prisma.rental.findMany.mock.calls[0][0] as any).where.endAttempts).toEqual({ lt: 10 });
  });

  it('fora de zona return → 422 problem rental-outside-return-zone', async () => {
    const { service, commands } = setup({ inZone: false });
    const err = await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY }).catch((e) => e);
    expect(err).toBeInstanceOf(ProblemException);
    expect(err.getStatus()).toBe(422);
    expect(err.slug).toBe('rental-outside-return-zone');
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('sem foto → 422 return-photo-missing', async () => {
    const { service } = setup({ photo: false });
    await expect(service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY })).rejects.toMatchObject({ status: 422, slug: 'return-photo-missing' });
  });

  it('foto com chave diferente da emitida → 422 return-photo-missing', async () => {
    const { service } = setup();
    await expect(service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: 'outra/chave.jpg' })).rejects.toMatchObject({ slug: 'return-photo-missing' });
  });

  it('aluguel de outro cliente → 404', async () => {
    const { service } = setup();
    await expect(service.end('outro', RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY })).rejects.toMatchObject({ status: 404 });
  });

  it('rastreador não confirma "travada" → status ending (202) e retentativa até confirmar', async () => {
    const { service, rental, commands, billing, prisma } = setup({ lock: 'in_progress' });
    const r = await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    expect(r.status).toBe(202);
    expect(r.rental.status).toBe('ending');
    expect(rental.status).toBe('ending');
    expect(billing.settle).not.toHaveBeenCalled();
    expect(commands.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'lock', context: expect.objectContaining({ rentalId: RENTAL_ID, purpose: 'rental_end' }) }));

    // Retentativa: o job encontra o aluguel em `ending` e pede o travamento de novo.
    rental.endLastAttemptAt = new Date(Date.now() - 60_000);
    prisma.rental.findMany.mockResolvedValue([{ ...rental }] as any);
    commands.dispatch.mockResolvedValueOnce({ id: 'cmd2', status: 'in_progress' });
    await service.retryEnding();
    expect(commands.dispatch).toHaveBeenCalledTimes(2);
    expect(rental.status).toBe('ending');

    rental.endLastAttemptAt = new Date(Date.now() - 60_000);
    prisma.rental.findMany.mockResolvedValue([{ ...rental }] as any);
    commands.dispatch.mockResolvedValueOnce({ id: 'cmd3', status: 'confirmed' });
    await service.retryEnding();
    expect(rental.status).toBe('ended');
    expect(billing.settle).toHaveBeenCalledTimes(1);
  });

  it('confirmação tardia por evento command.changed encerra o aluguel', async () => {
    const { service, rental, billing } = setup({ lock: 'pending' });
    await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    await service.onCommandChanged({ commandId: 'c', vehicleId: VEHICLE_ID, type: 'lock', status: 'confirmed', payload: { rentalId: RENTAL_ID, purpose: 'rental_end' } });
    expect(rental.status).toBe('ended');
    expect(billing.settle).toHaveBeenCalledTimes(1);
  });

  it('corrida: evento de travada e HTTP finalizam juntos — a resposta só volta depois da liquidação, e liquida uma vez', async () => {
    const { service, rental, billing, commands } = setup();
    let settled = false;
    billing.settle.mockImplementation(async () => {
      for (let i = 0; i < 30; i++) await Promise.resolve(); // sem timers (jest usa relógio falso)
      settled = true;
      return { paymentId: 'pay-1', status: 'paid' };
    });
    let eventDone: Promise<void> = Promise.resolve();
    commands.dispatch.mockImplementation(async () => {
      // o evento command.changed chega antes do retorno do gateway para o HTTP
      eventDone = service.onCommandChanged({ commandId: 'c', vehicleId: VEHICLE_ID, type: 'lock', status: 'confirmed', payload: { rentalId: RENTAL_ID, purpose: 'rental_end' } });
      for (let i = 0; i < 3; i++) await Promise.resolve();
      return { id: 'cmd', status: 'confirmed' };
    });
    const r = await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    expect(settled).toBe(true);
    expect(r.status).toBe(200);
    expect(r.rental.status).toBe('ended');
    expect(rental.paymentId).toBe('pay-1');
    await eventDone;
    expect(billing.settle).toHaveBeenCalledTimes(1);
  });

  it('settle falha: aluguel fica encerrado (200, sem 500) e o payment.updated posterior vincula o pagamento', async () => {
    const { service, rental, billing, prisma } = setup();
    billing.settle.mockRejectedValue(new Error('gateway fora'));
    const r = await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    expect(r.status).toBe(200);
    expect(r.rental.status).toBe('ended');
    expect(rental.paymentId).toBeNull();
    const { RentalsListeners } = await import('./rentals.listeners');
    await new RentalsListeners(prisma as any).onPaymentUpdated({ paymentId: 'pay-9', rentalId: RENTAL_ID, status: 'paid' } as any);
    expect(rental.paymentId).toBe('pay-9');
  });

  it('confirmado → ended (200) e settle chamado uma vez com o valor calculado (plano + seguro)', async () => {
    const { service, billing, rental } = setup();
    const r = await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    expect(r.status).toBe(200);
    expect(r.rental.status).toBe('ended');
    expect(billing.settle).toHaveBeenCalledTimes(1);
    expect(billing.settle).toHaveBeenCalledWith({ rentalId: RENTAL_ID, amountCents: 1290, idempotencyKey: `rental-settlement:${RENTAL_ID}` });
    expect(r.rental.costCents).toBe(1290);
    expect(rental.paymentId).toBe('pay-1');
    expect(rental.endZoneId).toBe(ZONE_ID);

    // Repetir o encerramento não liquida de novo.
    await expect(service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY })).rejects.toMatchObject({ slug: 'rental-not-active' });
    await service.finalize(RENTAL_ID, 'ended');
    expect(billing.settle).toHaveBeenCalledTimes(1);
  });

  it('pausado: o tempo de pausa é fechado no encerramento', async () => {
    const { service, rental, billing } = setup();
    rental.status = 'paused';
    rental.pausedAt = new Date(Date.now() - 5 * 60 * 1000);
    rental.startedAt = new Date(Date.now() - 15 * 60 * 1000);
    await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    // 10 min rodando (1090) + 5 min pausa (100) + seguro (200)
    expect(billing.settle).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 1390 }));
  });

  it('force-end sem reason → 400', async () => {
    const { service } = setup();
    await expect(service.forceEnd(admin, RENTAL_ID, '')).rejects.toMatchObject({ status: 400 });
  });

  it('force-end fora da zona (admin) soma a taxa 1500, dispensa a foto e grava AuditLog', async () => {
    const { service, billing, audit } = setup({ inZone: false, photo: false });
    const r = await service.forceEnd(admin, RENTAL_ID, 'Cliente sem bateria no celular');
    expect(r.status).toBe('force_ended');
    expect(billing.settle).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 1290 + 1500 }));
    expect(r.breakdown?.feesCents).toBe(1500);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'rental.force_end', reason: 'Cliente sem bateria no celular' }));
  });

  it('force-end dentro da zona não cobra taxa', async () => {
    const { service, billing } = setup({ inZone: true });
    await service.forceEnd(support, RENTAL_ID, 'Aplicativo travou');
    expect(billing.settle).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 1290 }));
  });

  it('force-end fora da zona por suporte → 403 force-end-outside-zone-requires-admin', async () => {
    const { service, billing } = setup({ inZone: false });
    await expect(service.forceEnd(support, RENTAL_ID, 'Motivo qualquer')).rejects.toMatchObject({ status: 403, slug: 'force-end-outside-zone-requires-admin' });
    expect(billing.settle).not.toHaveBeenCalled();
  });
});

const DEPOT_ID = '77777777-7777-4777-8777-777777777777';

describe('Devolução em ponto verde (retirada em galpão)', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-21T15:00:00.000Z') }));
  afterEach(() => jest.useRealTimers());

  const statusSetTo = (prisma: ReturnType<typeof setup>['prisma']) =>
    prisma.vehicle.updateMany.mock.calls.map((c: any) => c[0].data.status).filter(Boolean);

  it('moto do galpão termina em awaiting_pickup e nasce uma tarefa collect na posição da moto', async () => {
    const { service, prisma } = setup({ depotId: DEPOT_ID });
    prisma.fieldTask.findFirst.mockResolvedValue(null);
    const r = await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    expect(r.status).toBe(200);
    expect(r.rental.status).toBe('ended');
    expect(statusSetTo(prisma)).toEqual(['awaiting_pickup']);
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: { in: ['rented', 'paused'] } }, data: { status: 'awaiting_pickup' } });
    expect(prisma.fieldTask.create).toHaveBeenCalledTimes(1);
    expect(prisma.fieldTask.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'collect', priority: 'medium', status: 'open', vehicleId: VEHICLE_ID, targetLat: -23.56, targetLng: -46.69 }),
    });
  });

  it('moto que saiu por entrega de galpão (handover pickup aceito) também vai para recolhimento, mesmo sem depotId', async () => {
    const { service, prisma } = setup({ depotId: null });
    prisma.handover.findFirst.mockResolvedValue({ id: 'h1' } as any);
    await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    expect((prisma.handover.findFirst.mock.calls[0][0] as any).where).toMatchObject({ rentalId: RENTAL_ID, type: 'pickup', status: 'accepted' });
    expect(statusSetTo(prisma)).toEqual(['awaiting_pickup']);
    expect(prisma.fieldTask.create).toHaveBeenCalledTimes(1);
  });

  it('moto de rua (sem depotId e sem entrega) continua voltando a free, sem tarefa', async () => {
    const { service, prisma } = setup();
    await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    expect(statusSetTo(prisma)).toEqual(['free']);
    expect(prisma.fieldTask.create).not.toHaveBeenCalled();
  });

  it('já existe collect aberta para a moto → não cria outra', async () => {
    const { service, prisma } = setup({ depotId: DEPOT_ID });
    prisma.fieldTask.findFirst.mockResolvedValue({ id: 'task-aberta' } as any);
    await service.end(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY });
    const where = (prisma.fieldTask.findFirst.mock.calls[0][0] as any).where;
    expect(where).toMatchObject({ vehicleId: VEHICLE_ID, type: 'collect', status: { notIn: ['done', 'canceled'] } });
    expect(prisma.fieldTask.create).not.toHaveBeenCalled();
  });

  it('duas finalizações concorrentes (HTTP x evento x job) criam uma tarefa só e liquidam uma vez', async () => {
    const { service, prisma, rental, billing } = setup({ depotId: DEPOT_ID });
    rental.status = 'ending';
    rental.endRequestedAt = new Date();
    let created = 0;
    prisma.fieldTask.findFirst.mockImplementation((async () => (created ? { id: 't' } : null)) as any);
    prisma.fieldTask.create.mockImplementation((async () => ({ id: `t${++created}` })) as any);
    await Promise.all([service.finalize(RENTAL_ID, 'ended'), service.finalize(RENTAL_ID, 'ended'), service.onCommandChanged({ commandId: 'c', vehicleId: VEHICLE_ID, type: 'lock', status: 'confirmed', payload: { rentalId: RENTAL_ID, purpose: 'rental_end' } })]);
    await service.finalize(RENTAL_ID, 'ended');
    expect(created).toBe(1);
    expect(billing.settle).toHaveBeenCalledTimes(1);
    // A checagem e a criação ficam sob um lock transacional por moto (finalizações em instâncias diferentes).
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('encerramento forçado de moto do galpão também deixa a moto esperando recolhimento', async () => {
    const { service, prisma } = setup({ depotId: DEPOT_ID, inZone: false, photo: false });
    prisma.fieldTask.findFirst.mockResolvedValue(null);
    await service.forceEnd(admin, RENTAL_ID, 'Cliente sem bateria no celular');
    expect(statusSetTo(prisma)).toEqual(['awaiting_pickup']);
    expect(prisma.fieldTask.create).toHaveBeenCalledTimes(1);
  });

  it('fix 1: moto do galpão offline + encerramento forçado → ao reconectar volta como awaiting_pickup (não free)', async () => {
    const { service, prisma, vehicle, events } = setup({ depotId: DEPOT_ID, inZone: false, photo: false });
    // Banco falso com estado para a moto: offline durante o aluguel.
    Object.assign(vehicle, { status: 'offline', online: false, statusBeforeOffline: 'rented' });
    const matches = (where: any) =>
      where.id === vehicle.id &&
      (where.status === undefined || (typeof where.status === 'string' ? where.status === vehicle.status : where.status.in.includes(vehicle.status))) &&
      (where.statusBeforeOffline === undefined || where.statusBeforeOffline.in.includes(vehicle.statusBeforeOffline));
    prisma.vehicle.updateMany.mockImplementation((async (a: any) => (matches(a.where) ? (Object.assign(vehicle, a.data), { count: 1 }) : { count: 0 })) as any);
    prisma.vehicle.findUnique.mockImplementation((async () => ({ ...vehicle })) as any);
    prisma.vehicle.update.mockImplementation((async (a: any) => Object.assign(vehicle, a.data)) as any);
    prisma.fieldTask.findFirst.mockResolvedValue(null);
    const emitted: string[] = [];
    events.on(EV.VEHICLE_STATUS_CHANGED, (e: { status: string }) => emitted.push(e.status));

    await service.forceEnd(admin, RENTAL_ID, 'Moto sem sinal');
    expect(vehicle).toMatchObject({ status: 'offline', statusBeforeOffline: 'awaiting_pickup' });
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
      where: { id: VEHICLE_ID, status: 'offline', statusBeforeOffline: { in: ['rented', 'paused'] } },
      data: { statusBeforeOffline: 'awaiting_pickup' },
    });
    expect(prisma.fieldTask.create).toHaveBeenCalledTimes(1);
    // Fix 4: o evento leva o status real.
    expect(emitted).toEqual(['offline']);

    // Rastreador volta: o aluguel já está encerrado; restoredStatus usa o status guardado.
    prisma.rental.findFirst.mockResolvedValue(null);
    prisma.reservation.findFirst.mockResolvedValue(null);
    const vehicles = new VehiclesService(prisma as any, {} as any, {} as any, new EventEmitter2(), {} as any, {} as any, {} as any, {} as any);
    await vehicles.onConnectivity({ vehicleId: VEHICLE_ID, online: true, ts: new Date().toISOString() } as any);
    expect(vehicle.status).toBe('awaiting_pickup');
  });

  it('finalize com returnTo: depot (devolução no galpão, Task 6) não cria recolhimento', async () => {
    const { service, prisma, rental } = setup({ depotId: DEPOT_ID });
    rental.status = 'ending';
    await service.finalize(RENTAL_ID, 'ended', { returnTo: 'depot' });
    expect(statusSetTo(prisma)).toEqual(['free']);
    expect(prisma.fieldTask.create).not.toHaveBeenCalled();
  });
});

describe('POST /rentals/{id}/force-end (validação)', () => {
  let h: Harness;
  const ender = { forceEnd: jest.fn(), end: jest.fn() };
  beforeAll(async () => {
    h = await createHarness({
      controllers: [RentalsController],
      providers: [
        { provide: RentalEndService, useValue: ender },
        { provide: RentalStartService, useValue: {} },
        { provide: RentalsService, useValue: {} },
      ],
    });
  });
  afterAll(() => h.app.close());

  it('encerrar fora da zona de devolução → 422 application/problem+json com type .../rental-outside-return-zone', async () => {
    ender.end.mockRejectedValueOnce(unprocessable('rental-outside-return-zone', 'Estacione numa zona de devolução para encerrar.'));
    const res = await request(h.app.getHttpServer())
      .post(`/rentals/${RENTAL_ID}/end`)
      .set('Authorization', `Bearer ${await customerToken()}`)
      .send({ returnPhotoObjectKey: PHOTO_KEY });
    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body.type).toMatch(/\/rental-outside-return-zone$/);
  });

  it('sem reason → 400 e o serviço não é chamado', async () => {
    const res = await request(h.app.getHttpServer())
      .post(`/rentals/${RENTAL_ID}/force-end`)
      .set('Authorization', `Bearer ${await staffToken(['admin'])}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/validation-error');
    expect(ender.forceEnd).not.toHaveBeenCalled();
  });
});
