import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { EV } from '../../common/events';
import { ProblemException } from '../../common/problem';
import type { Principal } from '../auth/principal';
import { PricingService } from '../pricing/pricing.service';
import { signStationCode } from './station-code';
import { StationSwapsService } from './station-swaps.service';

const SECRET = 'segredo-teste';
const STATION_ID = 'd0000000-0000-4000-8000-000000000001';
const THING = `station-${STATION_ID}`;
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CUSTOMER = '22222222-2222-4222-8222-222222222222';
const RENTAL_ID = '88888888-8888-4888-8888-888888888888';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const SWAP_ID = '5b0e7c1a-1111-4111-8111-111111111111';
const CODE = signStationCode(STATION_ID, SECRET);
const STATION = { lat: -23.5672, lng: -46.693 };

const customer: Principal = { pool: 'customer', sub: 'c', email: 'c@x.com', groups: [], userId: CUSTOMER_ID, customerId: CUSTOMER_ID } as Principal;
const other: Principal = { ...customer, userId: OTHER_CUSTOMER, customerId: OTHER_CUSTOMER } as Principal;
const staff: Principal = { pool: 'staff', sub: 's', email: 's@volti.com.br', groups: ['suporte'], userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', staffId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } as Principal;

const body = (o: Partial<{ stationCode: string; rentalId: string; lat: number; lng: number }> = {}) => ({ stationCode: CODE, rentalId: RENTAL_ID, lat: STATION.lat, lng: STATION.lng, ...o });

async function problem(p: Promise<unknown>): Promise<{ status: number; slug: string }> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ProblemException) return { status: e.getStatus(), slug: e.slug };
    throw e;
  }
  throw new Error('esperava erro');
}

function setup(opts: { planCode?: string; rentalStatus?: string; known?: number | null; live?: Record<string, unknown> | null; station?: Record<string, unknown>; feeCents?: number } = {}) {
  const prisma = mockDeep<PrismaClient>();
  (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));
  const station: any = {
    id: STATION_ID, name: 'Estação', address: 'R. X', ...STATION, availableBatteries: 5, totalSlots: 10, openingHours: 'Todos os dias, 24 h', open24h: true,
    active: true, stationCode: CODE, thingName: null, createdAt: new Date(), updatedAt: new Date(), ...opts.station,
  };
  const rental: any = {
    id: RENTAL_ID, customerId: CUSTOMER_ID, vehicleId: VEHICLE_ID, planCode: opts.planCode ?? 'minute', status: opts.rentalStatus ?? 'active',
    vehicle: { id: VEHICLE_ID, thingName: 'moto-0001', batterySerial: 'BAT-00001' },
  };
  const swaps = new Map<string, any>();
  prisma.swapStation.findUnique.mockImplementation((async (a: any) => (a.where.id === STATION_ID ? station : null)) as any);
  // Estação de um evento pela thing (Task 12 das lacunas): `thingName` do cadastro ou `station-{id}` sem `thingName`.
  prisma.swapStation.findFirst.mockImplementation((async (a: any) =>
    (a.where.OR ?? []).some((c: any) => (c.thingName && c.thingName === station.thingName) || (c.id === station.id && c.thingName === null && !station.thingName)) ? station : null) as any);
  prisma.rental.findUnique.mockImplementation((async (a: any) => (a.where.id === RENTAL_ID ? rental : null)) as any);
  prisma.stationSwap.findFirst.mockResolvedValue(null);
  prisma.stationSwap.count.mockResolvedValue(0);
  // Locks: linha da estação (estoque) e linha do aluguel (status relido sob lock, fix 2 / M-3 e I-1).
  (prisma.$queryRaw as any).mockImplementation(async (sql: TemplateStringsArray) =>
    sql.join('?').includes('"Rental"') ? [{ status: rental.lockedStatus ?? rental.status }] : [{ availableBatteries: station.availableBatteries, active: station.lockedActive ?? station.active }],
  );
  prisma.fee.findUnique.mockResolvedValue({ code: 'battery_swap_fee', amountCents: opts.feeCents ?? 500, active: true } as any);
  prisma.stationSwap.create.mockImplementation((async (a: any) => {
    const s = { id: SWAP_ID, endReason: null, slotNumber: null, returnedSerial: null, returnedPct: null, releasedSerial: null, completedAt: null, createdAt: new Date(), updatedAt: new Date(), ...a.data };
    swaps.set(s.id, s);
    return s;
  }) as any);
  prisma.stationSwap.findUnique.mockImplementation((async (a: any) => {
    if (a.where.id) return swaps.get(a.where.id) ?? null;
    const k = a.where.customerId_idempotencyKey;
    return [...swaps.values()].find((s) => s.customerId === k.customerId && s.idempotencyKey === k.idempotencyKey) ?? null;
  }) as any);
  prisma.stationSwap.updateMany.mockImplementation((async (a: any) => {
    const s = swaps.get(a.where.id);
    if (!s) return { count: 0 };
    const st = a.where.status;
    if (typeof st === 'string' && s.status !== st) return { count: 0 };
    if (st?.in && !st.in.includes(s.status)) return { count: 0 };
    if ('returnedSerial' in a.where && s.returnedSerial !== a.where.returnedSerial) return { count: 0 };
    if ('releasedSerial' in a.where && s.releasedSerial !== a.where.releasedSerial) return { count: 0 };
    if (a.where.expiresAt?.lt && !(s.expiresAt < a.where.expiresAt.lt)) return { count: 0 };
    Object.assign(s, a.data);
    return { count: 1 };
  }) as any);
  prisma.battery.upsert.mockImplementation((async (a: any) => ({ id: 'bat-id', chargePct: 100, ...a.create })) as any);
  prisma.battery.findFirst.mockResolvedValue({ serial: 'BT-S1001' } as any);
  prisma.swapStation.updateMany.mockResolvedValue({ count: 1 });
  prisma.battery.updateMany.mockResolvedValue({ count: 0 });
  prisma.vehicle.update.mockResolvedValue({} as any);
  prisma.battery.findMany.mockResolvedValue([]);

  const liveState = opts.live === null ? null : { thingName: 'moto-0001', lat: 0, lng: 0, speedKmh: 0, batteryPct: 10, locked: false, ignition: true, signal: 4, speedLimitKmh: 32, stolenMode: false, online: true, lastSeenAt: new Date().toISOString(), ...opts.live };
  const iot = { getLiveState: jest.fn().mockResolvedValue(liveState), knownSpeedKmh: jest.fn().mockResolvedValue(opts.known === undefined ? 0 : opts.known) };
  const gateway = { send: jest.fn().mockResolvedValue(undefined), start: jest.fn(), stop: jest.fn() };
  const alerts = { create: jest.fn().mockResolvedValue({ id: 'alert' }) };
  const events = new EventEmitter2();
  const emitted: any[] = [];
  events.on(EV.STATION_SWAP_UPDATED, (e) => emitted.push(e));
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  prisma.swapStation.update.mockImplementation((async (a: any) => Object.assign(station, a.data)) as any);
  const service = new StationSwapsService(prisma as any, new PricingService(prisma as any), iot as any, gateway as any, events, alerts as any, { stepTimeoutMs: 180_000, qrSecret: SECRET }, audit as any);
  return { service, prisma, station, rental, swaps, iot, gateway, alerts, emitted, audit };
}

const admin: Principal = { pool: 'staff', sub: 'a', email: 'a@volti.com.br', groups: ['admin'], userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', staffId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } as Principal;

describe('StationSwapsService.qr — QR da estação para o admin (fix 1, I6)', () => {
  it('devolve o código emitido e grava AuditLog (sem o código no registro)', async () => {
    const { service, audit } = setup();
    expect(await service.qr(admin, STATION_ID)).toEqual({ stationId: STATION_ID, stationCode: CODE });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'swap_station.qr_read', entityType: 'SwapStation', entityId: STATION_ID }));
    expect(JSON.stringify(audit.record.mock.calls[0][0])).not.toContain(CODE);
  });

  it('estação sem código: emite na hora com o segredo atual', async () => {
    const { service, station, prisma } = setup({ station: { stationCode: null } });
    const out = await service.qr(admin, STATION_ID);
    expect(out.stationCode).toBe(signStationCode(STATION_ID, SECRET));
    expect(station.stationCode).toBe(out.stationCode);
    expect(prisma.swapStation.update).toHaveBeenCalledTimes(1);
  });

  it('estação inexistente → 404 station-not-found', async () => {
    const { service } = setup();
    expect(await problem(service.qr(admin, 'd0000000-0000-4000-8000-00000000000f'))).toEqual({ status: 404, slug: 'station-not-found' });
  });
});

describe('StationSwapsService.create (regras)', () => {
  it('QR inválido, de outra estação ou revogado → 404 station-not-found', async () => {
    const { service, station } = setup();
    expect(await problem(service.create(customer, STATION_ID, body({ stationCode: 'lixo' }), 'k1234567'))).toEqual({ status: 404, slug: 'station-not-found' });
    const otherId = 'd0000000-0000-4000-8000-000000000002';
    expect(await problem(service.create(customer, STATION_ID, body({ stationCode: signStationCode(otherId, SECRET) }), 'k1234567'))).toEqual({ status: 404, slug: 'station-not-found' });
    expect(await problem(service.create(customer, STATION_ID, body({ stationCode: signStationCode(STATION_ID, 'outro') }), 'k1234567'))).toEqual({ status: 404, slug: 'station-not-found' });
    station.stationCode = null; // ainda não emitido / revogado
    expect(await problem(service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 404, slug: 'station-not-found' });
  });

  it('aluguel de outro cliente → 404; aluguel encerrado → 409 rental-not-active', async () => {
    expect(await problem(setup().service.create(other, STATION_ID, body(), 'k1234567'))).toEqual({ status: 404, slug: 'not-found' });
    expect(await problem(setup({ rentalStatus: 'ended' }).service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 409, slug: 'rental-not-active' });
    expect(await problem(setup({ rentalStatus: 'ending' }).service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 409, slug: 'rental-not-active' });
  });

  it('troca já aberta no aluguel → 409 swap-open (também pela corrida no índice único)', async () => {
    const a = setup();
    a.prisma.stationSwap.findFirst.mockResolvedValue({ id: 'x' } as any);
    expect(await problem(a.service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 409, slug: 'swap-open' });
    const b = setup();
    b.prisma.stationSwap.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }));
    expect(await problem(b.service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 409, slug: 'swap-open' });
  });

  it('estação inativa, fechada ou sem bateria livre → 422 station-unavailable', async () => {
    const cases = [
      { active: false },
      { open24h: false, openingHours: 'Todos os dias, 1h às 2h' },
      { availableBatteries: 0 },
    ];
    for (const station of cases) {
      const { service } = setup({ station });
      expect(await problem(service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 422, slug: 'station-unavailable' });
    }
    // Task 12 das lacunas: desativada pelo painel entre a pré-checagem e o lock → 422, nada inserido.
    const raced = setup({ station: { lockedActive: false } });
    expect(await problem(raced.service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 422, slug: 'station-unavailable' });
    expect(raced.prisma.stationSwap.create).not.toHaveBeenCalled();
    // Uma carregada e uma troca em andamento na estação: a carregada já está prometida.
    const busy = setup({ station: { availableBatteries: 1 } });
    busy.prisma.stationSwap.count.mockResolvedValue(1);
    expect(await problem(busy.service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 422, slug: 'station-unavailable' });
  });

  it('fix 1 (C1): a decisão final usa a estação travada (FOR UPDATE) na mesma transação da inserção, contando também liberações atrasadas', async () => {
    const { service, prisma } = setup({ station: { availableBatteries: 1 } });
    // Pré-checagem vê 0 prometidas; dentro da transação (depois do lock) já há 1 → 422 e nada é inserido.
    prisma.stationSwap.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    expect(await problem(service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 422, slug: 'station-unavailable' });
    expect(prisma.stationSwap.create).not.toHaveBeenCalled();
    const sql = ((prisma.$queryRaw as any).mock.calls[0][0] as string[]).join('?');
    expect(sql).toMatch(/FROM "SwapStation" WHERE "id" = \?::uuid FOR UPDATE/);
    const where = (prisma.stationSwap.count.mock.calls[1][0] as any).where;
    expect(where.OR).toEqual(expect.arrayContaining([expect.objectContaining({ status: 'failed', endReason: 'release_timeout' })]));
  });

  it('fix 2 (M-3): status do aluguel relido sob lock (FOR UPDATE no Rental) na transação da estação; encerrou no meio → 409, nada inserido', async () => {
    const a = setup();
    a.rental.lockedStatus = 'ending';
    expect(await problem(a.service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 409, slug: 'rental-not-active' });
    expect(a.prisma.stationSwap.create).not.toHaveBeenCalled();
    const sqls = (a.prisma.$queryRaw as any).mock.calls.map((c: any[]) => (c[0] as string[]).join('?'));
    // Ordem dos locks: estação e depois aluguel (a mesma da devolução atrasada).
    expect(sqls.findIndex((q: string) => q.includes('"SwapStation"'))).toBeLessThan(sqls.findIndex((q: string) => /FROM "Rental" WHERE "id" = \?::uuid FOR UPDATE/.test(q)));
    // Troca aberta aparecendo depois da pré-checagem também é barrada sob o lock.
    const b = setup();
    b.prisma.stationSwap.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'outra' } as any);
    expect(await problem(b.service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 409, slug: 'swap-open' });
    expect(b.prisma.stationSwap.create).not.toHaveBeenCalled();
  });

  it('celular a mais de 50 m → 422 too-far', async () => {
    const { service } = setup();
    expect(await problem(service.create(customer, STATION_ID, body({ lat: STATION.lat + 0.0006 }), 'k1234567'))).toEqual({ status: 422, slug: 'too-far' });
  });

  it('moto em movimento ou com velocidade desconhecida → 422 vehicle-moving', async () => {
    expect(await problem(setup({ known: null }).service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 422, slug: 'vehicle-moving' });
    expect(await problem(setup({ known: 7 }).service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 422, slug: 'vehicle-moving' });
    expect(await problem(setup({ known: null, live: null }).service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 422, slug: 'vehicle-moving' });
  });

  it('travado e online com velocidade desconhecida → aceita; pausado com velocidade desconhecida (sem trava confirmada) → 422 (fix 1, I3)', async () => {
    expect(await problem(setup({ known: null, live: null, rentalStatus: 'paused' }).service.create(customer, STATION_ID, body(), 'k1234567'))).toEqual({ status: 422, slug: 'vehicle-moving' });
    await expect(setup({ known: null, rentalStatus: 'paused', live: { locked: true } }).service.create(customer, STATION_ID, body(), 'k1234567')).resolves.toEqual(expect.objectContaining({ status: 'opening_slot' }));
    await expect(setup({ known: null, live: { locked: true } }).service.create(customer, STATION_ID, body(), 'k1234567')).resolves.toEqual(expect.objectContaining({ status: 'opening_slot' }));
  });

  it('cria em opening_slot, prazo de 3 min, taxa do plano por minuto, pede open_slot e não guarda a posição', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-22T15:00:00Z') });
    try {
      const { service, prisma, gateway, emitted } = setup({ feeCents: 650 });
      const res = await service.create(customer, STATION_ID, body({ lat: STATION.lat + 0.0001 }), 'k1234567');
      expect(res).toEqual(expect.objectContaining({ id: SWAP_ID, stationId: STATION_ID, rentalId: RENTAL_ID, status: 'opening_slot', feeCents: 650, expiresAt: '2026-10-22T15:03:00.000Z' }));
      expect(res).not.toHaveProperty('distanceM');
      const data = (prisma.stationSwap.create.mock.calls[0][0] as any).data;
      expect(data).not.toHaveProperty('lat');
      expect(data).not.toHaveProperty('lng');
      expect(data.distanceM).toBe(11);
      expect(gateway.send).toHaveBeenCalledWith(`station-${STATION_ID}`, expect.objectContaining({ action: 'open_slot', swapId: SWAP_ID, expectedSerial: 'BAT-00001' }));
      expect(emitted).toEqual([{ swapId: SWAP_ID, customerId: CUSTOMER_ID, status: 'opening_slot' }]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('taxa: hora cobra; diário, semanal e mensal não', async () => {
    expect((await setup({ planCode: 'hour' }).service.create(customer, STATION_ID, body(), 'k1234567')).feeCents).toBe(500);
    for (const planCode of ['day', 'weekly', 'monthly']) {
      expect((await setup({ planCode }).service.create(customer, STATION_ID, body(), 'k1234567')).feeCents).toBe(0);
    }
  });

  it('mesma Idempotency-Key devolve a mesma troca sem novo comando', async () => {
    const { service, gateway, prisma } = setup();
    const a = await service.create(customer, STATION_ID, body(), 'k1234567');
    prisma.stationSwap.findFirst.mockResolvedValue({ id: SWAP_ID } as any); // já existe aberta
    const b = await service.create(customer, STATION_ID, body(), 'k1234567');
    expect(b).toEqual(a);
    expect(gateway.send).toHaveBeenCalledTimes(1);
    expect(prisma.stationSwap.create).toHaveBeenCalledTimes(1);
  });
});

describe('StationSwapsService: eventos da estação e estoque', () => {
  async function created(o: Parameters<typeof setup>[0] = {}) {
    const ctx = setup(o);
    await ctx.service.create(customer, STATION_ID, body(), 'k1234567');
    ctx.gateway.send.mockClear();
    ctx.emitted.length = 0;
    return ctx;
  }
  const ts = () => new Date().toISOString();

  it('caminho feliz: vaga aberta → devolvida (vira charging na estação) → fechada (pede liberação) → liberada (instala na moto)', async () => {
    const { service, swaps, prisma, gateway, emitted } = await created();
    await service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 4, ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'awaiting_return', slotNumber: 4 }));

    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 12, ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'returned', returnedSerial: 'BAT-00001', returnedPct: 12 }));
    expect(prisma.battery.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { serial: 'BAT-00001' },
      update: expect.objectContaining({ status: 'charging', stationId: STATION_ID, vehicleId: null, chargePct: 12 }),
    }));
    expect(gateway.send).not.toHaveBeenCalled(); // nada liberado antes da vaga fechar

    await service.onStationEvent(THING, { type: 'slot_closed', swapId: SWAP_ID, ts: ts() });
    expect(swaps.get(SWAP_ID).status).toBe('releasing');
    expect(gateway.send).toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'release_battery', swapId: SWAP_ID, serialHint: 'BT-S1001' }));

    await service.onStationEvent(THING, { type: 'battery_released', swapId: SWAP_ID, serial: 'BT-S1001', ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'completed', releasedSerial: 'BT-S1001' }));
    expect(prisma.swapStation.updateMany).toHaveBeenCalledWith({ where: { id: STATION_ID, availableBatteries: { gt: 0 } }, data: { availableBatteries: { decrement: 1 } } });
    expect(prisma.battery.upsert).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { serial: 'BT-S1001' },
      update: expect.objectContaining({ status: 'in_vehicle', vehicleId: VEHICLE_ID, stationId: null, cycleCount: { increment: 1 } }),
      create: expect.objectContaining({ cycleCount: 1 }),
    }));
    expect(prisma.vehicle.update).toHaveBeenCalledWith({ where: { id: VEHICLE_ID }, data: { batterySerial: 'BT-S1001', batteryPct: 100 } });
    expect(emitted.map((e) => e.status)).toEqual(['awaiting_return', 'returned', 'releasing', 'completed']);
  });

  it('movimentações (2026-10-24): devolvida → `charging` na estação e liberada → moto, com o cliente como ator', async () => {
    const { service, prisma } = await created();
    const inVehicle = { id: 'b-old', serial: 'BAT-00001', status: 'in_vehicle', vehicleId: VEHICLE_ID, stationId: null, depotId: null };
    const inStation = { id: 'b-st', serial: 'BT-S1001', status: 'in_station', vehicleId: null, stationId: STATION_ID, depotId: null };
    prisma.battery.findUnique.mockImplementation((async (a: any) => (a.where.serial === 'BAT-00001' ? inVehicle : a.where.serial === 'BT-S1001' ? inStation : null)) as any);
    prisma.battery.upsert.mockImplementation((async (a: any) => ({ id: a.where.serial === 'BAT-00001' ? 'b-old' : 'b-st', chargePct: 100, ...a.create })) as any);
    const stray = { id: 'b-stray', serial: 'BAT-X', status: 'in_vehicle', vehicleId: VEHICLE_ID, stationId: null, depotId: null };
    prisma.battery.findMany.mockResolvedValue([stray] as any);
    await service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 4, ts: ts() });
    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 12, ts: ts() });
    await service.onStationEvent(THING, { type: 'slot_closed', swapId: SWAP_ID, ts: ts() });
    await service.onStationEvent(THING, { type: 'battery_released', swapId: SWAP_ID, serial: 'BT-S1001', ts: ts() });
    const data = prisma.batteryMovement.createMany.mock.calls.flatMap((c: any) => c[0].data);
    expect(data).toEqual([
      expect.objectContaining({ batteryId: 'b-old', fromStatus: 'in_vehicle', toStatus: 'charging', stationId: STATION_ID, vehicleId: VEHICLE_ID, actorId: CUSTOMER_ID }),
      expect.objectContaining({ batteryId: 'b-st', fromStatus: 'in_station', toStatus: 'in_vehicle', stationId: STATION_ID, vehicleId: VEHICLE_ID, actorId: CUSTOMER_ID }),
      expect.objectContaining({ batteryId: 'b-stray', fromStatus: 'in_vehicle', toStatus: 'charging', actorId: CUSTOMER_ID }),
    ]);
    expect(prisma.battery.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['b-stray'] }, status: 'in_vehicle' }, data: { vehicleId: null, status: 'charging' } });
  });

  it('eventos que chegam juntos são processados em ordem por troca (devolvida + vaga fechada → releasing, sem perder o fechamento)', async () => {
    const { service, swaps, gateway, prisma } = await created();
    await service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 4, ts: ts() });
    // Transação da devolução demora: o fechamento chega antes de ela terminar.
    const slowUpsert = prisma.battery.upsert.getMockImplementation()!;
    prisma.battery.upsert.mockImplementationOnce((async (a: any) => {
      await new Promise((r) => setTimeout(r, 30));
      return slowUpsert(a);
    }) as any);
    await Promise.all([
      service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 12, ts: ts() }),
      service.onStationEvent(THING, { type: 'slot_closed', swapId: SWAP_ID, ts: ts() }),
    ]);
    expect(swaps.get(SWAP_ID).status).toBe('releasing');
    expect(gateway.send).toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'release_battery' }));
  });

  it('eventos repetidos não aplicam o estoque duas vezes', async () => {
    const { service, prisma } = await created();
    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 12, ts: ts() });
    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 12, ts: ts() });
    expect(prisma.battery.upsert).toHaveBeenCalledTimes(1);
  });

  it('liberação sem devolução registrada é ignorada (segurança: nenhuma bateria sai sem a devolvida)', async () => {
    const { service, swaps, prisma } = await created();
    await service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 1, ts: ts() });
    await service.onStationEvent(THING, { type: 'battery_released', swapId: SWAP_ID, serial: 'BT-S1001', ts: ts() });
    expect(swaps.get(SWAP_ID).status).toBe('awaiting_return');
    expect(prisma.swapStation.updateMany).not.toHaveBeenCalled();
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
  });

  it('vaga fechada sem devolução cancela e não pede liberação', async () => {
    const { service, swaps, gateway } = await created();
    await service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 1, ts: ts() });
    await service.onStationEvent(THING, { type: 'slot_closed', swapId: SWAP_ID, ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'canceled', endReason: 'slot_closed_without_return' }));
    expect(gateway.send).not.toHaveBeenCalled();
  });

  it('Task 12 das lacunas: estação com thingName do cadastro recebe os comandos nessa thing e só aceita eventos dela', async () => {
    const CUSTOM = 'station-aaaaaaaa-0000-4000-8000-000000000009';
    const ctx = setup({ station: { thingName: CUSTOM } });
    await ctx.service.create(customer, STATION_ID, body(), 'k1234567');
    expect(ctx.gateway.send).toHaveBeenCalledWith(CUSTOM, expect.objectContaining({ action: 'open_slot', swapId: SWAP_ID }));
    // A convenção station-{id} não vale mais para esta estação.
    await ctx.service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 2, ts: ts() });
    expect(ctx.swaps.get(SWAP_ID).status).toBe('opening_slot');
    await ctx.service.onStationEvent(CUSTOM, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 2, ts: ts() });
    await ctx.service.onStationEvent(CUSTOM, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 12, ts: ts() });
    await ctx.service.onStationEvent(CUSTOM, { type: 'slot_closed', swapId: SWAP_ID, ts: ts() });
    expect(ctx.swaps.get(SWAP_ID).status).toBe('releasing');
    expect(ctx.gateway.send).toHaveBeenLastCalledWith(CUSTOM, expect.objectContaining({ action: 'release_battery', swapId: SWAP_ID }));
  });

  it('evento de outra estação (ou thing estranha) é ignorado', async () => {
    const { service, swaps } = await created();
    await service.onStationEvent('station-d0000000-0000-4000-8000-000000000009', { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 1, ts: ts() });
    await service.onStationEvent('moto-0001', { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 1, ts: ts() });
    expect(swaps.get(SWAP_ID).status).toBe('opening_slot');
  });

  it('fix 1 (I2): devolução atrasada numa troca cancelada pelo cliente ou vencida vale: entra no estoque e a estação libera uma carregada', async () => {
    for (const [status, endReason] of [['canceled', 'canceled_by_customer'], ['canceled', 'return_timeout'], ['failed', 'station_timeout']] as const) {
      const { service, swaps, prisma, gateway, emitted } = await created();
      Object.assign(swaps.get(SWAP_ID), { status, endReason, slotNumber: 3 });
      await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 30, ts: ts() });
      expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'releasing', endReason: null, returnedSerial: 'BAT-00001' }));
      expect(prisma.battery.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { serial: 'BAT-00001' }, update: expect.objectContaining({ status: 'charging', stationId: STATION_ID }) }));
      expect(gateway.send).toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'release_battery', swapId: SWAP_ID }));
      expect(emitted.map((e) => e.status)).toEqual(['releasing']);
      // Vaga fechada depois (confirmação do abort) não muda nada; a liberação completa a troca.
      await service.onStationEvent(THING, { type: 'slot_closed', swapId: SWAP_ID, ts: ts() });
      await service.onStationEvent(THING, { type: 'battery_released', swapId: SWAP_ID, serial: 'BT-S1001', ts: ts() });
      expect(swaps.get(SWAP_ID).status).toBe('completed');
    }
  });

  it('Task 12 (fix I1): estação desativada depois do cancelamento — devolução atrasada é registrada, sem exceção, e a carregada é liberada', async () => {
    const { service, swaps, prisma, gateway, station } = await created();
    Object.assign(swaps.get(SWAP_ID), { status: 'canceled', endReason: 'canceled_by_customer', slotNumber: 3 });
    // Painel desativou a estação (a troca cancelada não conta como aberta).
    station.active = false;
    station.lockedActive = false;
    await expect(service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 30, ts: ts() })).resolves.toBeUndefined();
    expect(prisma.battery.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { serial: 'BAT-00001' }, update: expect.objectContaining({ status: 'charging', stationId: STATION_ID }) }));
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'releasing', returnedSerial: 'BAT-00001' }));
    expect(gateway.send).toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'release_battery', swapId: SWAP_ID }));
    // Eventos seguintes da mesma troca também seguem numa estação inativa.
    await service.onStationEvent(THING, { type: 'battery_released', swapId: SWAP_ID, serial: 'BT-S1001', ts: ts() });
    expect(swaps.get(SWAP_ID).status).toBe('completed');
  });

  it('Task 12 (fix M1): falha ao ler a thing não manda o comando para a convenção (armário errado); só loga', async () => {
    const CUSTOM = 'station-aaaaaaaa-0000-4000-8000-000000000009';
    const ctx = await created({ station: { thingName: CUSTOM } });
    await ctx.service.onStationEvent(CUSTOM, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 2, ts: ts() });
    await ctx.service.onStationEvent(CUSTOM, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 12, ts: ts() });
    ctx.gateway.send.mockClear();
    ctx.prisma.swapStation.findUnique.mockRejectedValueOnce(new Error('db down'));
    await expect(ctx.service.onStationEvent(CUSTOM, { type: 'slot_closed', swapId: SWAP_ID, ts: ts() })).resolves.toBeUndefined();
    expect(ctx.swaps.get(SWAP_ID).status).toBe('releasing');
    expect(ctx.gateway.send).not.toHaveBeenCalled();
  });

  it('fix 1 (I2): devolução atrasada sem carregada disponível → failed/no_battery_after_return + alerta só com ids, sem liberar', async () => {
    const { service, swaps, prisma, gateway, alerts } = await created({ station: { availableBatteries: 1 } });
    Object.assign(swaps.get(SWAP_ID), { status: 'canceled', endReason: 'canceled_by_customer' });
    prisma.stationSwap.count.mockResolvedValue(1); // a única carregada já está prometida a outra troca
    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 30, ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'failed', endReason: 'no_battery_after_return' }));
    expect(gateway.send).not.toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'release_battery' }));
    expect(alerts.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'command_failed', vehicleId: VEHICLE_ID, rentalId: RENTAL_ID }), expect.anything());
    expect(JSON.stringify(alerts.create.mock.calls[0][0])).not.toMatch(/BAT-00001/);
  });

  it('fix 2 (M-2): encerramento pelo staff cancela troca sem devolução (rental_force_ended) e manda abort_swap', async () => {
    const { service, swaps, prisma, gateway, emitted } = await created();
    await service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 6, ts: ts() });
    emitted.length = 0;
    prisma.stationSwap.findMany.mockResolvedValue([{ id: SWAP_ID }] as any);
    await service.closeForRentalEnd(RENTAL_ID);
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'canceled', endReason: 'rental_force_ended' }));
    expect(gateway.send).toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'abort_swap', swapId: SWAP_ID, slotNumber: 6 }));
    expect(emitted.map((e) => e.status)).toEqual(['canceled']);
    expect((prisma.stationSwap.findMany.mock.calls.at(-1)![0] as any).where).toEqual({ rentalId: RENTAL_ID, status: { in: ['opening_slot', 'awaiting_return', 'returned', 'releasing'] } });
  });

  it('fix 2 (M-2): com a devolução já registrada, o encerramento deixa a liberação terminar; a bateria da moto não muda e há alerta', async () => {
    const { service, swaps, prisma, gateway, alerts, rental } = await created();
    Object.assign(swaps.get(SWAP_ID), { status: 'releasing', returnedSerial: 'BAT-00001' });
    prisma.stationSwap.findMany.mockResolvedValue([{ id: SWAP_ID }] as any);
    await service.closeForRentalEnd(RENTAL_ID);
    expect(swaps.get(SWAP_ID).status).toBe('releasing');
    expect(gateway.send).not.toHaveBeenCalled();
    // Aluguel já encerrado quando a estação libera.
    rental.lockedStatus = 'force_ended';
    prisma.rental.findUnique.mockResolvedValue({ ...rental, status: 'force_ended' } as any);
    prisma.battery.findUnique.mockResolvedValue({ id: 'b1', serial: 'BT-S1001', status: 'in_station', stationId: STATION_ID } as any);
    await service.onStationEvent(THING, { type: 'battery_released', swapId: SWAP_ID, serial: 'BT-S1001', ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'completed', releasedSerial: 'BT-S1001' }));
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
    expect(prisma.battery.upsert).not.toHaveBeenCalled();
    expect(prisma.swapStation.updateMany).toHaveBeenCalledWith({ where: { id: STATION_ID, availableBatteries: { gt: 0 } }, data: { availableBatteries: { decrement: 1 } } });
    expect(alerts.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(alerts.create.mock.calls[0][0])).not.toMatch(/BT-S1001/);
  });

  it('fix 2 (M-4): devolução numa troca encerrada por outro motivo (vaga fechada vazia) entra no estoque e gera alerta só com ids', async () => {
    const { service, swaps, prisma, gateway, alerts } = await created();
    Object.assign(swaps.get(SWAP_ID), { status: 'canceled', endReason: 'slot_closed_without_return' });
    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 30, ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'canceled', returnedSerial: 'BAT-00001' }));
    expect(prisma.battery.upsert).toHaveBeenCalledTimes(1);
    expect(gateway.send).not.toHaveBeenCalled();
    expect(alerts.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'command_failed', vehicleId: VEHICLE_ID, rentalId: RENTAL_ID }), expect.anything());
    expect(JSON.stringify(alerts.create.mock.calls[0][0])).not.toMatch(/BAT-00001/);
  });

  it('fix 2 (I-1): devolução atrasada com o aluguel já encerrado → registra a devolução, failed/return_after_close + alerta, sem liberar', async () => {
    const { service, swaps, prisma, gateway, alerts, rental } = await created();
    Object.assign(swaps.get(SWAP_ID), { status: 'canceled', endReason: 'canceled_by_customer' });
    rental.lockedStatus = 'ended';
    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 30, ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'failed', endReason: 'return_after_close', returnedSerial: 'BAT-00001' }));
    expect(prisma.battery.upsert).toHaveBeenCalledTimes(1);
    expect(gateway.send).not.toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'release_battery' }));
    expect(alerts.create).toHaveBeenCalledTimes(1);
    const sqls = (prisma.$queryRaw as any).mock.calls.map((c: any[]) => (c[0] as string[]).join('?'));
    expect(sqls.some((q: string) => /FROM "Rental" WHERE "id" = \?::uuid FOR UPDATE/.test(q))).toBe(true);
  });

  it('fix 2 (I-1): devolução atrasada com outra troca aberta no aluguel → failed/return_after_close (nunca P2002)', async () => {
    const { service, swaps, prisma, gateway } = await created();
    Object.assign(swaps.get(SWAP_ID), { status: 'canceled', endReason: 'return_timeout' });
    prisma.stationSwap.findFirst.mockResolvedValue({ id: 'outra-troca' } as any);
    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 30, ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'failed', endReason: 'return_after_close', returnedSerial: 'BAT-00001' }));
    expect(gateway.send).not.toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'release_battery' }));
    const where = (prisma.stationSwap.findFirst.mock.calls.at(-1)![0] as any).where;
    expect(where).toEqual(expect.objectContaining({ rentalId: RENTAL_ID, id: { not: SWAP_ID } }));
  });

  it('fix 2 (I-1): se ainda assim o índice único recusar (P2002), a devolução é registrada como return_after_close e o evento não falha', async () => {
    const { service, swaps, prisma, gateway } = await created();
    Object.assign(swaps.get(SWAP_ID), { status: 'canceled', endReason: 'canceled_by_customer' });
    const base = prisma.stationSwap.updateMany.getMockImplementation()!;
    prisma.stationSwap.updateMany.mockImplementation((async (a: any) => {
      if (a.data?.status === 'releasing') throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' });
      return base(a);
    }) as any);
    await expect(service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 30, ts: ts() })).resolves.toBeUndefined();
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'failed', endReason: 'return_after_close', returnedSerial: 'BAT-00001' }));
    expect(gateway.send).not.toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'release_battery' }));
  });

  it('fix 1 (M1): bateria devolvida registrada em outra moto → não é desvinculada; troca failed/serial_mismatch + alerta', async () => {
    const { service, swaps, prisma, gateway, alerts } = await created();
    await service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 2, ts: ts() });
    prisma.battery.findUnique.mockResolvedValue({ id: 'b9', serial: 'BAT-OUTRA', status: 'in_vehicle', vehicleId: '99999999-9999-4999-8999-999999999999' } as any);
    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-OUTRA', pct: 30, ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'failed', endReason: 'serial_mismatch' }));
    expect(prisma.battery.upsert).not.toHaveBeenCalled();
    expect(gateway.send).not.toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'release_battery' }));
    expect(alerts.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(alerts.create.mock.calls[0][0])).not.toMatch(/BAT-OUTRA/);
  });

  it('fix 1 (M1): série devolvida diferente da registrada na moto (sem conflito) → alerta, mas a troca segue', async () => {
    const { service, swaps, prisma, alerts } = await created();
    prisma.vehicle.findUnique.mockResolvedValue({ id: VEHICLE_ID, batterySerial: 'BAT-00001' } as any);
    await service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 2, ts: ts() });
    await service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-77777', pct: 30, ts: ts() });
    expect(swaps.get(SWAP_ID).status).toBe('returned');
    expect(alerts.create).toHaveBeenCalledTimes(1);
  });

  it('fix 1 (M1): bateria liberada registrada em outra moto → failed/serial_mismatch, moto e estoque intocados', async () => {
    const { service, swaps, prisma, alerts } = await created();
    Object.assign(swaps.get(SWAP_ID), { status: 'releasing', returnedSerial: 'BAT-00001' });
    prisma.battery.findUnique.mockResolvedValue({ id: 'b9', serial: 'BT-X', status: 'in_vehicle', vehicleId: '99999999-9999-4999-8999-999999999999', stationId: null } as any);
    await service.onStationEvent(THING, { type: 'battery_released', swapId: SWAP_ID, serial: 'BT-X', ts: ts() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'failed', endReason: 'serial_mismatch' }));
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
    expect(prisma.swapStation.updateMany).not.toHaveBeenCalled();
    expect(alerts.create).toHaveBeenCalledTimes(1);
  });

  it('fix 1 (M1): bateria liberada que não estava nesta estação → alerta, troca concluída', async () => {
    const { service, swaps, prisma, alerts } = await created();
    Object.assign(swaps.get(SWAP_ID), { status: 'releasing', returnedSerial: 'BAT-00001' });
    prisma.battery.findUnique.mockResolvedValue(null);
    await service.onStationEvent(THING, { type: 'battery_released', swapId: SWAP_ID, serial: 'BT-DESCONHECIDA', ts: ts() });
    expect(swaps.get(SWAP_ID).status).toBe('completed');
    expect(alerts.create).toHaveBeenCalledTimes(1);
  });
});

describe('StationSwapsService: cancelar, consultar e prazos', () => {
  async function created(o: Parameters<typeof setup>[0] = {}) {
    const ctx = setup(o);
    await ctx.service.create(customer, STATION_ID, body(), 'k1234567');
    ctx.gateway.send.mockClear();
    return ctx;
  }

  it('dono cancela antes da devolução; depois → 422 swap-not-cancelable; outro cliente → 404', async () => {
    const a = await created();
    expect(await problem(a.service.cancel(other, STATION_ID, SWAP_ID))).toEqual({ status: 404, slug: 'not-found' });
    expect((await a.service.cancel(customer, STATION_ID, SWAP_ID)).status).toBe('canceled');
    expect(a.swaps.get(SWAP_ID).endReason).toBe('canceled_by_customer');
    // Fix 1 (I2): a estação é avisada para fechar a vaga.
    expect(a.gateway.send).toHaveBeenCalledWith(THING, expect.objectContaining({ action: 'abort_swap', swapId: SWAP_ID }));
    // repetido: devolve como está
    expect((await a.service.cancel(customer, STATION_ID, SWAP_ID)).status).toBe('canceled');

    const b = await created();
    b.swaps.get(SWAP_ID).status = 'returned';
    expect(await problem(b.service.cancel(customer, STATION_ID, SWAP_ID))).toEqual({ status: 422, slug: 'swap-not-cancelable' });
  });

  it('consulta: dono e staff; outro cliente ou outra estação → 404; staff vê a distância', async () => {
    const { service } = await created();
    expect((await service.get(customer, STATION_ID, SWAP_ID)).id).toBe(SWAP_ID);
    expect(await service.get(staff, STATION_ID, SWAP_ID)).toEqual(expect.objectContaining({ distanceM: 0, customerId: CUSTOMER_ID }));
    expect(await problem(service.get(other, STATION_ID, SWAP_ID))).toEqual({ status: 404, slug: 'not-found' });
    expect(await problem(service.get(customer, 'd0000000-0000-4000-8000-000000000002', SWAP_ID))).toEqual({ status: 404, slug: 'not-found' });
  });

  it('prazo vencido: abrindo → failed; esperando devolução → canceled; devolvida sem liberar → failed + alerta; nunca libera', async () => {
    const cases: Array<[string, string, string]> = [
      ['opening_slot', 'failed', 'station_timeout'],
      ['awaiting_return', 'canceled', 'return_timeout'],
      ['returned', 'failed', 'release_timeout'],
      ['releasing', 'failed', 'release_timeout'],
    ];
    for (const [from, to, reason] of cases) {
      const { service, swaps, prisma, gateway, alerts } = await created();
      const s = swaps.get(SWAP_ID);
      s.status = from;
      s.expiresAt = new Date(Date.now() - 1000);
      prisma.stationSwap.findMany.mockResolvedValue([{ ...s }] as any);
      expect(await service.expireOverdue()).toBe(1);
      expect(s).toEqual(expect.objectContaining({ status: to, endReason: reason }));
      // Fix 1 (I2): todo prazo vencido avisa a estação (abort_swap) e nunca pede liberação.
      expect(gateway.send.mock.calls.map((c: any[]) => c[1].action)).toEqual(['abort_swap']);
      expect(alerts.create).toHaveBeenCalledTimes(reason === 'release_timeout' ? 1 : 0);
    }
  });

  const ts = () => new Date().toISOString();

  it('fix 1 (I2): o job de prazos entra na fila da troca — devolução em andamento vence a corrida com o prazo (CAS no status)', async () => {
    const { service, swaps, prisma } = await created();
    await service.onStationEvent(THING, { type: 'slot_opened', swapId: SWAP_ID, slotNumber: 1, ts: ts() });
    const s = swaps.get(SWAP_ID);
    s.expiresAt = new Date(Date.now() - 1000);
    prisma.stationSwap.findMany.mockResolvedValue([{ ...s }] as any);
    const slowUpsert = prisma.battery.upsert.getMockImplementation()!;
    prisma.battery.upsert.mockImplementationOnce((async (a: any) => {
      await new Promise((r) => setTimeout(r, 30));
      return slowUpsert(a);
    }) as any);
    const returned = service.onStationEvent(THING, { type: 'battery_returned', swapId: SWAP_ID, serial: 'BAT-00001', pct: 12, ts: ts() });
    const expired = await service.expireOverdue();
    await returned;
    expect(expired).toBe(0);
    expect(swaps.get(SWAP_ID).status).toBe('returned');
  });

  it('prazo ainda não vencido não muda nada', async () => {
    const { service, swaps, prisma } = await created();
    prisma.stationSwap.findMany.mockResolvedValue([{ ...swaps.get(SWAP_ID) }] as any);
    expect(await service.expireOverdue(new Date())).toBe(0);
    expect(swaps.get(SWAP_ID).status).toBe('opening_slot');
  });

  it('liberação tardia depois do prazo (release_timeout) completa a troca: o cliente recebeu a bateria', async () => {
    const { service, swaps } = await created();
    Object.assign(swaps.get(SWAP_ID), { status: 'failed', endReason: 'release_timeout', returnedSerial: 'BAT-00001' });
    await service.onStationEvent(THING, { type: 'battery_released', swapId: SWAP_ID, serial: 'BT-S1001', ts: new Date().toISOString() });
    expect(swaps.get(SWAP_ID)).toEqual(expect.objectContaining({ status: 'completed', endReason: null }));
  });
});
