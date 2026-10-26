import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { EV } from '../../common/events';
import { IDEMPOTENCY_STALE_MS } from '../../common/idempotency/idempotency.store';
import { createHarness, CUSTOMER_ID, customerToken, Harness } from '../../../test/helpers/http-harness';
import { INSURANCE } from '../../ports/insurance.port';
import { IOT_GATEWAY } from '../../ports/iot-gateway.port';
import { IOT_CONFIG } from '../iot/iot-config';
import { RENTAL_BILLING } from '../../ports/rental-billing.port';
import { CommandsService } from '../commands/commands.service';
import { PricingService } from '../pricing/pricing.service';
import { ReservationsService } from '../reservations/reservations.service';
import { RentalEndService } from './rental-end.service';
import { RentalStartService } from './rental-start.service';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';

const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const DEPOSIT_ID = '66666666-6666-4666-8666-666666666666';
const POLICY_ID = '77777777-7777-4777-8777-777777777777';

const customer = { id: CUSTOMER_ID, kycStatus: 'approved', status: 'active', delinquent: false, locationConsent: true, termsAccepted: true, termsVersion: '2026-10' };
const vehicle = { id: VEHICLE_ID, code: 'VLT-0001', model: 'Volti S1', thingName: 'moto-0001', status: 'free', lat: -23.560412, lng: -46.689871, batteryPct: 90, speedLimitKmh: 32 };
const plan = { id: 'p', code: 'minute', name: 'Por minuto', unit: 'minute', unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, recurring: false, active: true };
const body = { vehicleId: VEHICLE_ID, planCode: 'minute', coverage: 'basic', depositMethod: 'card' };

describe('Início do aluguel (POST /rentals)', () => {
  let h: Harness;
  const billing = { holdDeposit: jest.fn(), settle: jest.fn(), isDelinquent: jest.fn() };
  const insurance = { quote: jest.fn(), issueForRental: jest.fn(), cancel: jest.fn() };
  const reservations = { reserveForPix: jest.fn(), convert: jest.fn() };
  const commands = { dispatch: jest.fn(), isLockedByStaff: jest.fn() };
  const iot = { getLiveState: jest.fn() };

  beforeAll(async () => {
    h = await createHarness({
      controllers: [RentalsController],
      providers: [
        RentalStartService,
        PricingService,
        { provide: RentalsService, useValue: {} },
        { provide: RentalEndService, useValue: {} },
        { provide: ReservationsService, useValue: reservations },
        { provide: CommandsService, useValue: commands },
        { provide: RENTAL_BILLING, useValue: billing },
        { provide: INSURANCE, useValue: insurance },
        { provide: IOT_GATEWAY, useValue: iot },
        { provide: IOT_CONFIG, useValue: { commandTimeoutMs: 30_000 } },
      ],
    });
  });
  afterAll(() => h.app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    const p = h.prisma;
    p.customer.findUnique.mockResolvedValue(customer as any);
    p.rental.findFirst.mockResolvedValue(null);
    p.pricingPlan.findFirst.mockResolvedValue(plan as any);
    p.vehicle.findUnique.mockResolvedValue(vehicle as any);
    p.reservation.findFirst.mockResolvedValue(null);
    p.subscription.findFirst.mockResolvedValue(null);
    p.vehicle.updateMany.mockResolvedValue({ count: 1 });
    p.deposit.findUnique.mockResolvedValue({
      id: DEPOSIT_ID, customerId: CUSTOMER_ID, rentalId: null, method: 'card', status: 'held', amountCents: 5000, capturedCents: null, pix: null,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    p.rental.create.mockImplementation((async (args: any) => ({
      startedAt: new Date(), pausedAt: null, pausedSecondsAcc: 0, endRequestedAt: null, endedAt: null, costCents: 0, breakdown: null,
      insurancePolicyId: POLICY_ID, paymentId: null, endZoneId: null, returnPhotoObjectKey: null, forceEndReason: null, forcedEndById: null,
      rating: null, speedLimitKmh: null, createdAt: new Date(), updatedAt: new Date(), couponCode: null,
      ...args.data, status: 'active',
    })) as any);
    billing.isDelinquent.mockResolvedValue(false);
    billing.holdDeposit.mockResolvedValue({ depositId: DEPOSIT_ID, status: 'held' });
    insurance.issueForRental.mockResolvedValue({ policyId: POLICY_ID, premiumCents: 200 });
    commands.dispatch.mockResolvedValue({ id: 'cmd-1', status: 'confirmed' });
    commands.isLockedByStaff.mockResolvedValue(false);
    iot.getLiveState.mockResolvedValue(null);
    p.rentalStart.deleteMany.mockResolvedValue({ count: 1 });
    p.deposit.updateMany.mockResolvedValue({ count: 1 });
    p.depositRelease.findUnique.mockResolvedValue(null);
    p.paymentCard.findFirst.mockResolvedValue({ id: 'card-default', customerId: CUSTOMER_ID, isDefault: true, deletedAt: null } as any);
  });

  const post = async (key: string | null, b: object = body) => {
    const req = request(h.app.getHttpServer()).post('/rentals').set('Authorization', `Bearer ${await customerToken()}`);
    if (key) req.set('Idempotency-Key', key);
    return req.send(b);
  };

  it('Task 30: caução no cartão sem nenhum cartão ativo → 422 card-required, sem caução nem moto reivindicada', async () => {
    h.prisma.paymentCard.findFirst.mockResolvedValue(null);
    const res = await post('chave-sem-cartao-1');
    expect(res.status).toBe(422);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/card-required');
    expect(billing.holdDeposit).not.toHaveBeenCalled();
    expect(h.prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('KYC não aprovado → 403 kyc-not-approved', async () => {
    h.prisma.customer.findUnique.mockResolvedValue({ ...customer, kycStatus: 'pending' } as any);
    const res = await post('chave-kyc-0001');
    expect(res.status).toBe(403);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/kyc-not-approved');
    expect(billing.holdDeposit).not.toHaveBeenCalled();
  });

  it('cliente inadimplente → 403 customer-delinquent', async () => {
    billing.isDelinquent.mockResolvedValue(true);
    const res = await post('chave-inad-0001');
    expect(res.status).toBe(403);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/customer-delinquent');
    expect(h.prisma.rental.create).not.toHaveBeenCalled();
  });

  it('sem consentimento de localização → 403 location-consent-required', async () => {
    h.prisma.customer.findUnique.mockResolvedValue({ ...customer, locationConsent: false } as any);
    const res = await post('chave-cons-0001');
    expect(res.status).toBe(403);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/location-consent-required');
  });

  it('galpão: moto free com depotId → 409 vehicle-unavailable (só sai pela entrega), sem caução nem reivindicação', async () => {
    h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, depotId: '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c' } as any);
    const res = await post('chave-galpao-0001');
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
    expect(billing.holdDeposit).not.toHaveBeenCalled();
    expect(h.prisma.vehicle.updateMany).not.toHaveBeenCalled();
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('galpão: moto awaiting_pickup (devolvida em ponto verde) → 409 vehicle-unavailable', async () => {
    h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'awaiting_pickup' } as any);
    const res = await post('chave-galpao-0002');
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
    expect(billing.holdDeposit).not.toHaveBeenCalled();
  });

  it('galpão: moto reservada pelo próprio cliente numa reserva de galpão → 409 vehicle-unavailable', async () => {
    h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'reserved', depotId: '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c' } as any);
    h.prisma.reservation.findFirst.mockResolvedValue({ id: 'res-1', customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, status: 'active', expiresAt: new Date(Date.now() + 60_000) } as any);
    const res = await post('chave-galpao-0003');
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
  });

  it('moto não livre → 409 vehicle-unavailable', async () => {
    h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'rented' } as any);
    const res = await post('chave-occ-0001');
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
    expect(billing.holdDeposit).not.toHaveBeenCalled();
  });

  it('moto reservada por outro cliente → 409 vehicle-unavailable', async () => {
    h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'reserved' } as any);
    h.prisma.reservation.findFirst.mockResolvedValue({ id: 'r', customerId: 'outro-cliente', vehicleId: VEHICLE_ID, status: 'active' } as any);
    const res = await post('chave-res-0001');
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
  });

  it('moto livre e online com aluguel aberto de outro cliente → 409 vehicle-unavailable (item 7 da auditoria)', async () => {
    h.prisma.rental.findFirst.mockImplementation((async (args: any) => (args?.where?.vehicleId === VEHICLE_ID ? { id: 'r-outro' } : null)) as any);
    const res = await post('chave-open-0001');
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
    expect(billing.holdDeposit).not.toHaveBeenCalled();
    expect(h.prisma.vehicle.updateMany).not.toHaveBeenCalled();
  });

  it('moto reservada pelo próprio cliente → 201 e a reserva vira aluguel', async () => {
    h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'reserved' } as any);
    h.prisma.reservation.findFirst.mockResolvedValue({ id: 'r1', customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, status: 'active' } as any);
    const res = await post('chave-own-0001');
    expect(res.status).toBe(201);
    expect(reservations.convert).toHaveBeenCalledTimes(1);
    expect(reservations.convert.mock.calls[0][1]).toBe('r1');
  });

  it('sem Idempotency-Key → 400', async () => {
    const res = await post(null);
    expect(res.status).toBe(400);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/validation-error');
  });

  it('mesma Idempotency-Key duas vezes → um aluguel só e a mesma resposta', async () => {
    const first = await post('chave-idem-0001');
    const second = await post('chave-idem-0001');
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(h.prisma.rental.create).toHaveBeenCalledTimes(1);
    expect(billing.holdDeposit).toHaveBeenCalledTimes(1);
    expect(first.body).toMatchObject({ outcome: 'started', rental: { status: 'active', vehicleId: VEHICLE_ID }, deposit: { id: DEPOSIT_ID, status: 'held' } });
  });

  it('mesma Idempotency-Key com corpo diferente → 422 idempotency-key-reused', async () => {
    await post('chave-idem-0002');
    const res = await post('chave-idem-0002', { ...body, coverage: 'full' });
    expect(res.status).toBe(422);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/idempotency-key-reused');
  });

  it('sucesso: libera a moto pelo IoT, emite apólice e congela o preço com o seguro', async () => {
    const res = await post('chave-ok-0001');
    expect(res.status).toBe(201);
    expect(commands.dispatch).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: VEHICLE_ID, type: 'unlock' }));
    expect(insurance.issueForRental).toHaveBeenCalledWith(expect.objectContaining({ customerId: CUSTOMER_ID, coverage: 'basic' }));
    const data = h.prisma.rental.create.mock.calls[0][0].data as any;
    expect(data.priceSnapshot).toMatchObject({ unlockFeeCents: 300, unitPriceCents: 79, insurancePremiumCents: 200 });
    // QA-12: posição de início arredondada (3 casas ≈ 100 m), o suficiente para o mapa de calor.
    expect(data.startLat).toBe(-23.56);
    expect(data.startLng).toBe(-46.69);
    expect(h.prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: { in: ['free', 'reserved'] } }, data: { status: 'rented' } });
  });

  describe('cupom com limite de resgates', () => {
    const coupon = { id: 'cc', code: 'PROMO', active: true, validFrom: null, validUntil: null, planCodes: [], maxRedemptions: 1, maxRedemptionsPerCustomer: null, redemptions: 0 };
    beforeEach(() => {
      h.prisma.coupon.findUnique.mockResolvedValue(coupon as any);
      h.prisma.couponRedemption.create.mockResolvedValue({} as any);
    });

    it('incrementa de forma condicional ao limite e conclui quando reserva o resgate', async () => {
      h.prisma.coupon.updateMany.mockResolvedValue({ count: 1 });
      const res = await post('chave-cupom-0001', { ...body, couponCode: 'PROMO' });
      expect(res.status).toBe(201);
      expect(h.prisma.coupon.updateMany).toHaveBeenCalledWith({
        where: { id: 'cc', OR: [{ maxRedemptions: null }, { redemptions: { lt: 1 } }] },
        data: { redemptions: { increment: 1 } },
      });
    });

    it('corrida pelo último resgate (updateMany count 0) → recusa "Cupom esgotado." e compensa', async () => {
      h.prisma.coupon.updateMany.mockResolvedValue({ count: 0 });
      const res = await post('chave-cupom-0002', { ...body, couponCode: 'PROMO' });
      expect(res.status).toBe(422);
      expect(JSON.stringify(res.body)).toContain('Cupom esgotado.');
      expect(insurance.cancel).toHaveBeenCalledWith(POLICY_ID);
    });
  });

  it('caução Pix → 202 awaiting_deposit e reserva até o prazo do Pix', async () => {
    const pix = { chargeId: 'c1', qrCodeBase64: 'iVBOR', copyPaste: '000201', expiresAt: new Date(Date.now() + 600000).toISOString() };
    billing.holdDeposit.mockResolvedValue({ depositId: DEPOSIT_ID, status: 'awaiting_pix', pix });
    h.prisma.deposit.findUnique.mockResolvedValue({
      id: DEPOSIT_ID, customerId: CUSTOMER_ID, rentalId: 'x', method: 'pix', status: 'awaiting_pix', amountCents: 5000, pix, createdAt: new Date(), updatedAt: new Date(),
    } as any);
    const res = await post('chave-pix-0001', { ...body, depositMethod: 'pix' });
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ outcome: 'awaiting_deposit', deposit: { status: 'awaiting_pix', pix: { chargeId: 'c1' } } });
    expect(res.body.rental).toBeUndefined();
    expect(reservations.reserveForPix).toHaveBeenCalledWith(CUSTOMER_ID, VEHICLE_ID, DEPOSIT_ID, new Date(pix.expiresAt));
    expect(h.prisma.rental.create).not.toHaveBeenCalled();
  });

  it('caução recusada → 402 payment-failed', async () => {
    billing.holdDeposit.mockResolvedValue({ depositId: DEPOSIT_ID, status: 'failed' });
    const res = await post('chave-fail-0001');
    expect(res.status).toBe(402);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/payment-failed');
  });

  it('fix round 1: repetição com a mesma chave depois de 409 (caução já liberada) → 402 deposit-not-held, sem aluguel', async () => {
    billing.holdDeposit.mockResolvedValue({ depositId: DEPOSIT_ID, status: 'failed' });
    h.prisma.deposit.findUnique.mockResolvedValue({ id: DEPOSIT_ID, customerId: CUSTOMER_ID, rentalId: null, method: 'card', status: 'released', amountCents: 5000 } as any);
    const res = await post('chave-retry-0001');
    expect(res.status).toBe(402);
    expect(res.body.type).toBe('https://api.volti.com.br/problems/deposit-not-held');
    expect(h.prisma.rental.create).not.toHaveBeenCalled();
    expect(commands.dispatch).not.toHaveBeenCalled();
  });

  it('QA-24: termos não aceitos → 403 e nada é retido', async () => {
    h.prisma.customer.findUnique.mockResolvedValue({ ...customer, termsAccepted: false } as any);
    const res = await post('chave-terms-0001');
    expect(res.status).toBe(403);
    expect(billing.holdDeposit).not.toHaveBeenCalled();
  });

  describe('QA-21: não começa (nem cobra) com a moto offline ou sem desbloqueio confirmado', () => {
    let released: jest.Mock;
    beforeEach(() => {
      released = jest.fn();
      h.app.get(EventEmitter2).removeAllListeners(EV.DEPOSIT_RELEASE_REQUESTED);
      h.app.get(EventEmitter2).on(EV.DEPOSIT_RELEASE_REQUESTED, released);
    });

    it('moto marcada offline → 409 vehicle-offline antes de reter caução; depositId informado é liberado', async () => {
      h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'offline', online: false } as any);
      const res = await post('chave-off-0001', { ...body, depositMethod: 'pix', depositId: DEPOSIT_ID });
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-offline');
      expect(billing.holdDeposit).not.toHaveBeenCalled();
      expect(h.prisma.rental.create).not.toHaveBeenCalled();
      expect(released).toHaveBeenCalledWith(expect.objectContaining({ depositId: DEPOSIT_ID }));
    });

    it('auditoria item adiado 1: moto com hold/trava da equipe → 409 vehicle-unavailable antes de reter caução', async () => {
      commands.isLockedByStaff.mockResolvedValue(true);
      const res = await post('chave-lock-0001', { ...body, depositMethod: 'pix', depositId: DEPOSIT_ID });
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
      expect(res.body.detail).toBe('A moto está bloqueada pela equipe. Escolha outra.');
      expect(commands.isLockedByStaff).toHaveBeenCalledWith(expect.objectContaining({ id: VEHICLE_ID }));
      expect(billing.holdDeposit).not.toHaveBeenCalled();
      expect(insurance.issueForRental).not.toHaveBeenCalled();
      expect(commands.dispatch).not.toHaveBeenCalled();
      expect(released).toHaveBeenCalledWith(expect.objectContaining({ depositId: DEPOSIT_ID }));
    });

    it('auditoria item adiado 1: unlock recusado por trava da equipe (corrida) → 409 vehicle-unavailable, não "offline"', async () => {
      commands.dispatch.mockImplementation(async (i: any) => (i.type === 'unlock' ? { id: 'cmd-u', status: 'failed', statusReason: 'locked_by_staff' } : { id: 'cmd-l', status: 'confirmed' }));
      const res = await post('chave-lock-0002');
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
      expect(res.body.detail).toBe('A moto está bloqueada pela equipe. Escolha outra.');
      expect(h.prisma.rental.create).not.toHaveBeenCalled();
      expect(released).toHaveBeenCalled();
    });

    it('rastreador sem notícia (estado ao vivo offline) → 409 vehicle-offline sem caução nem apólice', async () => {
      iot.getLiveState.mockResolvedValue({ thingName: 'moto-0001', online: false });
      const res = await post('chave-off-0002');
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-offline');
      expect(billing.holdDeposit).not.toHaveBeenCalled();
      expect(insurance.issueForRental).not.toHaveBeenCalled();
    });

    it('desbloqueio pendente (moto caiu) → 409, nenhum aluguel criado, caução liberada, apólice cancelada, moto devolvida e bloqueio de sistema', async () => {
      commands.dispatch.mockImplementation(async (i: any) => (i.type === 'unlock' ? { id: 'cmd-u', status: 'pending', statusReason: 'offline' } : { id: 'cmd-l', status: 'pending' }));
      const res = await post('chave-off-0003');
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-offline');
      expect(h.prisma.rental.create).not.toHaveBeenCalled();
      expect(insurance.cancel).toHaveBeenCalledWith(POLICY_ID);
      expect(released).toHaveBeenCalledWith(expect.objectContaining({ depositId: DEPOSIT_ID, reason: 'rental_not_started' }));
      expect(h.prisma.vehicle.updateMany).toHaveBeenLastCalledWith({ where: { id: VEHICLE_ID, status: 'rented' }, data: { status: 'free' } });
      expect(commands.dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'lock', actor: expect.objectContaining({ system: true }) }));
    });

    it('desbloqueio em andamento → espera a confirmação; só então cria o aluguel (o relógio começa no desbloqueio)', async () => {
      const order: string[] = [];
      commands.dispatch.mockImplementation(async () => {
        order.push('unlock');
        setTimeout(() => h.app.get(EventEmitter2).emit(EV.COMMAND_CHANGED, { commandId: 'cmd-2', vehicleId: VEHICLE_ID, type: 'unlock', status: 'confirmed' }), 20);
        return { id: 'cmd-2', status: 'in_progress' };
      });
      h.prisma.vehicleCommand.findUnique.mockResolvedValue({ id: 'cmd-2', status: 'in_progress' } as any);
      h.prisma.rental.create.mockImplementationOnce((async (args: any) => {
        order.push('create');
        return { startedAt: new Date(), pausedSecondsAcc: 0, costCents: 0, createdAt: new Date(), updatedAt: new Date(), ...args.data, status: 'active' };
      }) as any);
      const res = await post('chave-prog-0001');
      expect(res.status).toBe(201);
      expect(order).toEqual(['unlock', 'create']);
    });

    it('desbloqueio em andamento que falha → 409 vehicle-offline e nada cobrado', async () => {
      commands.dispatch.mockImplementation(async (i: any) => {
        if (i.type === 'unlock') setTimeout(() => h.app.get(EventEmitter2).emit(EV.COMMAND_CHANGED, { commandId: 'cmd-3', vehicleId: VEHICLE_ID, type: 'unlock', status: 'failed', reason: 'timeout' }), 20);
        return { id: i.type === 'unlock' ? 'cmd-3' : 'cmd-x', status: i.type === 'unlock' ? 'in_progress' : 'confirmed' };
      });
      h.prisma.vehicleCommand.findUnique.mockResolvedValue({ id: 'cmd-3', status: 'in_progress' } as any);
      const res = await post('chave-prog-0002');
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-offline');
      expect(h.prisma.rental.create).not.toHaveBeenCalled();
      expect(released).toHaveBeenCalled();
    });
  });

  describe('QA-21 fix round 1: marcador RentalStart e varredura', () => {
    let released: jest.Mock;
    beforeEach(() => {
      released = jest.fn();
      h.app.get(EventEmitter2).removeAllListeners(EV.DEPOSIT_RELEASE_REQUESTED);
      h.app.get(EventEmitter2).on(EV.DEPOSIT_RELEASE_REQUESTED, released);
    });

    it('reivindicação grava o marcador junto; aluguel criado apaga o marcador na mesma transação', async () => {
      const res = await post('chave-mark-0001');
      expect(res.status).toBe(201);
      expect(h.prisma.rentalStart.create).toHaveBeenCalledWith({ data: expect.objectContaining({ vehicleId: VEHICLE_ID, customerId: CUSTOMER_ID, depositId: DEPOSIT_ID, policyId: POLICY_ID, previousStatus: 'free' }) });
      expect(h.prisma.rentalStart.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('marcador que sobrou (processo morreu) → a varredura compensa uma única vez', async () => {
      const svc = h.app.get(RentalStartService);
      const marker = { rentalId: 'r-orfao', vehicleId: VEHICLE_ID, customerId: CUSTOMER_ID, depositId: DEPOSIT_ID, policyId: POLICY_ID, previousStatus: 'reserved', createdAt: new Date(Date.now() - 10 * 60_000) };
      h.prisma.rentalStart.findMany.mockResolvedValue([marker] as any);
      h.prisma.rentalStart.deleteMany.mockReset();
      h.prisma.rentalStart.deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValue({ count: 0 });
      h.prisma.rental.findUnique.mockResolvedValue(null);
      h.prisma.rental.findFirst.mockResolvedValue(null);
      commands.dispatch.mockResolvedValue({ id: 'cmd-l', status: 'pending' });
      expect(await svc.sweepStaleStarts()).toBe(1);
      expect(await svc.sweepStaleStarts()).toBe(0);
      expect(h.prisma.vehicle.updateMany).toHaveBeenCalledTimes(1);
      expect(h.prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'rented' }, data: { status: 'reserved' } });
      expect(commands.dispatch).toHaveBeenCalledTimes(1);
      expect(commands.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'lock' }));
      expect(insurance.cancel).toHaveBeenCalledTimes(1);
      expect(released).toHaveBeenCalledTimes(1);
      const cutoff = (h.prisma.rentalStart.findMany.mock.calls[0][0] as any).where.createdAt.lt.getTime();
      expect(Date.now() - cutoff).toBeGreaterThanOrEqual(30_000 + 5_000 + 60_000 - 1000);
    });

    it('a varredura já compensou (marcador sumiu) → a requisição não cria aluguel nem compensa de novo', async () => {
      h.prisma.rentalStart.deleteMany.mockResolvedValue({ count: 0 });
      const res = await post('chave-mark-0002');
      expect(res.status).toBe(409);
      expect(h.prisma.rental.create).not.toHaveBeenCalled();
      expect(insurance.cancel).not.toHaveBeenCalled();
      expect(released).not.toHaveBeenCalled();
    });
  });

  describe('sem vazamento de caução/apólice quando o início falha (decisão #16)', () => {
    let released: jest.Mock;
    beforeEach(() => {
      released = jest.fn();
      h.app.get(EventEmitter2).removeAllListeners(EV.DEPOSIT_RELEASE_REQUESTED);
      h.app.get(EventEmitter2).on(EV.DEPOSIT_RELEASE_REQUESTED, released);
    });

    it('409 na reivindicação da moto (corrida) depois da caução e da apólice → libera caução e cancela apólice', async () => {
      h.prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
      const res = await post('chave-race-0001');
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
      expect(insurance.cancel).toHaveBeenCalledWith(POLICY_ID);
      expect(released).toHaveBeenCalledWith(expect.objectContaining({ depositId: DEPOSIT_ID, customerId: CUSTOMER_ID, reason: 'rental_not_started' }));
    });

    it('erro inesperado depois da apólice (falha ao gravar o aluguel) → libera caução e cancela apólice', async () => {
      h.prisma.rental.create.mockRejectedValueOnce(new Error('db down'));
      const res = await post('chave-boom-0001');
      expect(res.status).toBe(500);
      expect(insurance.cancel).toHaveBeenCalledWith(POLICY_ID);
      expect(released).toHaveBeenCalledWith(expect.objectContaining({ depositId: DEPOSIT_ID }));
    });

    it('409 rental-already-active com depositId informado → libera a caução paga', async () => {
      h.prisma.rental.findFirst.mockResolvedValue({ id: 'r', status: 'active' } as any);
      const res = await post('chave-dup-0001', { ...body, depositMethod: 'pix', depositId: DEPOSIT_ID });
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/rental-already-active');
      expect(released).toHaveBeenCalledWith(expect.objectContaining({ depositId: DEPOSIT_ID }));
    });

    it('sucesso não libera nada', async () => {
      const res = await post('chave-okok-0001');
      expect(res.status).toBe(201);
      expect(released).not.toHaveBeenCalled();
      expect(insurance.cancel).not.toHaveBeenCalled();
    });
  });
  describe('Task 6: aceite da entrega de galpão (fromHandover)', () => {
    const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
    const RES_ID = '44444444-4444-4444-8444-444444444444';
    const HO_ID = '55555555-5555-4555-8555-555555555555';
    const user = { pool: 'customer', sub: 's', email: 'e@example.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID } as any;
    const dto = { vehicleId: VEHICLE_ID, planCode: 'minute', coverage: 'basic', depositMethod: 'card', depositId: DEPOSIT_ID } as any;
    const opts = { fromHandover: { reservationId: RES_ID, handoverId: HO_ID } };
    const handoverRes = { id: RES_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, depotId: DEPOT_ID, status: 'handover', depositId: DEPOSIT_ID, expiresAt: new Date(Date.now() - 60_000) };
    let released: jest.Mock;
    const svc = () => h.app.get(RentalStartService);

    beforeEach(() => {
      released = jest.fn();
      h.app.get(EventEmitter2).removeAllListeners(EV.DEPOSIT_RELEASE_REQUESTED);
      h.app.get(EventEmitter2).on(EV.DEPOSIT_RELEASE_REQUESTED, released);
      h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'reserved', depotId: DEPOT_ID } as any);
      h.prisma.reservation.findUnique.mockResolvedValue(handoverRes as any);
      h.prisma.handover.updateMany.mockResolvedValue({ count: 1 });
    });

    it('moto do galpão reservada pela reserva do próprio cliente em handover → começa, converte a reserva e aceita a entrega na mesma transação', async () => {
      const r = await svc().start(user, dto, `handover:${HO_ID}`, opts);
      expect(r.status).toBe(201);
      expect(reservations.convert.mock.calls[0][1]).toBe(RES_ID);
      expect(h.prisma.handover.updateMany).toHaveBeenCalledWith({
        where: { id: HO_ID, status: 'pending_customer' },
        data: expect.objectContaining({ status: 'accepted', rentalId: expect.any(String), lastError: null }),
      });
      // A moto guarda o galpão de origem (rented + bypass fromHandover; o fim no ponto verde a reconhece pelo depotId).
      expect(h.prisma.vehicle.update).not.toHaveBeenCalled();
      expect(commands.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'unlock' }));
      expect(billing.holdDeposit).not.toHaveBeenCalled();
      expect(released).not.toHaveBeenCalled();
    });

    it.each([
      ['de outro cliente', { customerId: '99999999-9999-4999-8999-999999999999' }],
      ['ainda active (sem entrega)', { status: 'active' }],
      ['de outra moto', { vehicleId: '88888888-8888-4888-8888-888888888888' }],
    ])('reserva %s → 409 vehicle-unavailable, sem destravar', async (_n, over) => {
      h.prisma.reservation.findUnique.mockResolvedValue({ ...handoverRes, ...over } as any);
      await expect(svc().start(user, dto, `handover:${HO_ID}`, opts)).rejects.toMatchObject({ slug: 'vehicle-unavailable' });
      expect(commands.dispatch).not.toHaveBeenCalled();
      expect(h.prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });

    it('auditoria: moto com trava da equipe/sistema no aceite → 409 vehicle-unavailable, sem destravar e sem liberar a caução da reserva', async () => {
      commands.isLockedByStaff.mockResolvedValue(true);
      await expect(svc().start(user, dto, `handover:${HO_ID}`, opts)).rejects.toMatchObject({ slug: 'vehicle-unavailable' });
      expect(commands.dispatch).not.toHaveBeenCalled();
      expect(h.prisma.rental.create).not.toHaveBeenCalled();
      expect(released).not.toHaveBeenCalled();
    });

    it('moto que não está reserved → 409 vehicle-unavailable', async () => {
      h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'free', depotId: DEPOT_ID } as any);
      await expect(svc().start(user, dto, `handover:${HO_ID}`, opts)).rejects.toMatchObject({ slug: 'vehicle-unavailable' });
      expect(commands.dispatch).not.toHaveBeenCalled();
    });

    it('caução da reserva não retida → 402 deposit-not-held, sem destravar e sem liberar a caução da reserva', async () => {
      h.prisma.deposit.findUnique.mockResolvedValue({ id: DEPOSIT_ID, customerId: CUSTOMER_ID, rentalId: null, status: 'awaiting_pix' } as any);
      await expect(svc().start(user, dto, `handover:${HO_ID}`, opts)).rejects.toMatchObject({ slug: 'deposit-not-held' });
      expect(commands.dispatch).not.toHaveBeenCalled();
      expect(h.prisma.rental.create).not.toHaveBeenCalled();
      expect(released).not.toHaveBeenCalled();
    });

    it('desbloqueio não confirmado → 409, moto volta a reserved com bloqueio de sistema e a caução continua da reserva', async () => {
      commands.dispatch.mockImplementation(async (i: any) => (i.type === 'unlock' ? { id: 'cmd-u', status: 'pending' } : { id: 'cmd-l', status: 'pending' }));
      await expect(svc().start(user, dto, `handover:${HO_ID}`, opts)).rejects.toMatchObject({ slug: 'vehicle-offline' });
      expect(h.prisma.vehicle.updateMany).toHaveBeenLastCalledWith({ where: { id: VEHICLE_ID, status: 'rented' }, data: { status: 'reserved' } });
      expect(commands.dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'lock' }));
      expect(insurance.cancel).toHaveBeenCalledWith(POLICY_ID);
      expect(released).not.toHaveBeenCalled();
    });

    it('entrega disputada no meio do aceite → 422 handover-not-pending, nada criado e moto travada de novo', async () => {
      h.prisma.handover.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc().start(user, dto, `handover:${HO_ID}`, opts)).rejects.toMatchObject({ slug: 'handover-not-pending' });
      expect(commands.dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'lock' }));
      expect(h.prisma.vehicle.updateMany).toHaveBeenLastCalledWith({ where: { id: VEHICLE_ID, status: 'rented' }, data: { status: 'reserved' } });
      expect(released).not.toHaveBeenCalled();
    });

    it('fix 1: a espera máxima do desbloqueio fica abaixo do prazo de abandono da trava do aceite (60 s)', () => {
      expect(svc().maxUnlockWaitMs()).toBe(35_000);
      expect(svc().maxUnlockWaitMs()).toBeLessThan(IDEMPOTENCY_STALE_MS);
    });

    it('sem fromHandover a mesma moto continua bloqueada (POST /rentals)', async () => {
      h.prisma.reservation.findFirst.mockResolvedValue(null);
      const res = await post('chave-galpao-ho-01');
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');
    });

    it('varredura de um aceite que morreu no meio não libera a caução da reserva em handover', async () => {
      const marker = { rentalId: 'r-ho', vehicleId: VEHICLE_ID, customerId: CUSTOMER_ID, depositId: DEPOSIT_ID, policyId: POLICY_ID, previousStatus: 'reserved', createdAt: new Date(Date.now() - 10 * 60_000) };
      h.prisma.rentalStart.findMany.mockResolvedValue([marker] as any);
      h.prisma.rentalStart.deleteMany.mockResolvedValueOnce({ count: 1 });
      h.prisma.rental.findUnique.mockResolvedValue(null);
      h.prisma.reservation.findFirst.mockResolvedValue({ id: RES_ID } as any);
      expect(await svc().sweepStaleStarts()).toBe(1);
      expect(h.prisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { id: VEHICLE_ID, status: 'rented' }, data: { status: 'reserved' } });
      expect(released).not.toHaveBeenCalled();
    });
  });

  describe('Run-2: caução não é reaproveitada entre reserva e aluguel de rua', () => {
    const DEPOT_ID = '9b2d7c1e-4a3f-4e8b-8c55-1d2e3f4a5b6c';
    const RES_ID = '44444444-4444-4444-8444-444444444444';
    const HO_ID = '55555555-5555-4555-8555-555555555555';
    const OTHER_VEHICLE = '88888888-8888-4888-8888-888888888888';
    const user = { pool: 'customer', sub: 's', email: 'e@example.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID } as any;
    const depotRes = { id: RES_ID, customerId: CUSTOMER_ID, vehicleId: OTHER_VEHICLE, depotId: DEPOT_ID, status: 'active', depositId: DEPOSIT_ID, expiresAt: new Date(Date.now() + 60 * 60_000) };
    let released: jest.Mock;
    /** `reservation.findFirst` por `depositId` devolve `owner`; a busca pela reserva da moto devolve `byVehicle`. */
    const reservationsBy = (owner: object | null, byVehicle: object | null = null) =>
      h.prisma.reservation.findFirst.mockImplementation((async (args: any) => (args?.where?.depositId ? owner : byVehicle)) as any);

    beforeEach(() => {
      released = jest.fn();
      h.app.get(EventEmitter2).removeAllListeners(EV.DEPOSIT_RELEASE_REQUESTED);
      h.app.get(EventEmitter2).on(EV.DEPOSIT_RELEASE_REQUESTED, released);
    });

    it.each([['active'], ['handover']])(
      '(a) POST /rentals de rua com o depositId de uma reserva de galpão %s → 409 deposit-in-use, sem reivindicar a moto nem liberar a caução da reserva',
      async (status) => {
        reservationsBy({ ...depotRes, status });
        const res = await post(`chave-reuso-${status}`, { ...body, depositMethod: 'card', depositId: DEPOSIT_ID });
        expect(res.status).toBe(409);
        expect(res.body.type).toBe('https://api.volti.com.br/problems/deposit-in-use');
        expect(res.body.detail).toBe('Essa caução já está em uso em outra reserva.');
        expect(h.prisma.vehicle.updateMany).not.toHaveBeenCalled();
        expect(commands.dispatch).not.toHaveBeenCalled();
        expect(insurance.issueForRental).not.toHaveBeenCalled();
        expect(h.prisma.rental.create).not.toHaveBeenCalled();
        expect(released).not.toHaveBeenCalled();
      },
    );

    it('(a) recusa antes de qualquer liberação: moto offline com o depositId da reserva não libera a caução da reserva', async () => {
      reservationsBy(depotRes);
      h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'offline', online: false } as any);
      const res = await post('chave-reuso-off', { ...body, depositMethod: 'card', depositId: DEPOSIT_ID });
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/deposit-in-use');
      expect(released).not.toHaveBeenCalled();
    });

    it('fluxo Pix de rua: a segunda chamada com o depositId da própria reserva da mesma moto continua começando (201)', async () => {
      const pixRes = { id: 'res-pix', customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, depotId: null, status: 'active', depositId: DEPOSIT_ID, expiresAt: new Date(Date.now() + 60_000) };
      reservationsBy(pixRes, pixRes);
      h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'reserved' } as any);
      const res = await post('chave-pix-2a-0001', { ...body, depositMethod: 'pix', depositId: DEPOSIT_ID });
      expect(res.status).toBe(201);
      expect(reservations.convert.mock.calls[0][1]).toBe('res-pix');
    });

    it('fluxo Pix de rua com o depositId da reserva em OUTRA moto → 409 deposit-in-use', async () => {
      const pixRes = { id: 'res-pix', customerId: CUSTOMER_ID, vehicleId: OTHER_VEHICLE, depotId: null, status: 'active', depositId: DEPOSIT_ID, expiresAt: new Date(Date.now() + 60_000) };
      reservationsBy(pixRes);
      const res = await post('chave-pix-2a-0002', { ...body, depositMethod: 'pix', depositId: DEPOSIT_ID });
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/deposit-in-use');
      expect(released).not.toHaveBeenCalled();
    });

    it('aceite da entrega da reserva dona da caução continua começando (exceção da regra)', async () => {
      const handoverRes = { ...depotRes, vehicleId: VEHICLE_ID, status: 'handover' };
      reservationsBy(handoverRes);
      h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'reserved', depotId: DEPOT_ID } as any);
      h.prisma.reservation.findUnique.mockResolvedValue(handoverRes as any);
      h.prisma.handover.updateMany.mockResolvedValue({ count: 1 });
      const r = await h.app.get(RentalStartService).start(user, { ...body, depositId: DEPOSIT_ID } as any, `handover:${HO_ID}`, { fromHandover: { reservationId: RES_ID, handoverId: HO_ID } });
      expect(r.status).toBe(201);
    });

    it('aceite de entrega de OUTRA reserva com a caução de uma reserva ativa → 409 deposit-in-use', async () => {
      reservationsBy({ ...depotRes, id: 'outra-reserva' });
      const handoverRes = { ...depotRes, vehicleId: VEHICLE_ID, status: 'handover' };
      h.prisma.vehicle.findUnique.mockResolvedValue({ ...vehicle, status: 'reserved', depotId: DEPOT_ID } as any);
      h.prisma.reservation.findUnique.mockResolvedValue(handoverRes as any);
      await expect(
        h.app.get(RentalStartService).start(user, { ...body, depositId: DEPOSIT_ID } as any, `handover:${HO_ID}`, { fromHandover: { reservationId: RES_ID, handoverId: HO_ID } }),
      ).rejects.toMatchObject({ slug: 'deposit-in-use' });
      expect(commands.dispatch).not.toHaveBeenCalled();
    });

    it.each([
      ['caução já liberada (updateMany condicional count 0)', 'final-1', () => h.prisma.deposit.updateMany.mockResolvedValue({ count: 0 })],
      ['DepositRelease gravado durante o unlock', 'final-2', () => h.prisma.depositRelease.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ depositId: DEPOSIT_ID } as any)],
    ])('(c) %s antes da transação final → 409 deposit-in-use, nenhum aluguel e a moto volta (rollback do vehicle-offline)', async (_n, key, arrange) => {
      arrange();
      const res = await post(`chave-${key}`);
      expect(res.status).toBe(409);
      expect(res.body.type).toBe('https://api.volti.com.br/problems/deposit-in-use');
      expect(h.prisma.rental.create).not.toHaveBeenCalled();
      expect(h.prisma.deposit.updateMany).toHaveBeenCalledWith({ where: { id: DEPOSIT_ID, status: 'held' }, data: { rentalId: expect.any(String) } });
      expect(h.prisma.vehicle.updateMany).toHaveBeenLastCalledWith({ where: { id: VEHICLE_ID, status: 'rented' }, data: { status: 'free' } });
      expect(commands.dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'lock', actor: expect.objectContaining({ system: true }) }));
      expect(insurance.cancel).toHaveBeenCalledWith(POLICY_ID);
    });
  });
});
