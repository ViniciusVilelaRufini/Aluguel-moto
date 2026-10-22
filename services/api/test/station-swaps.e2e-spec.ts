import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import jestOpenAPI from 'jest-openapi';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { EV, type StationSwapUpdatedEvent } from '../src/common/events';
import { StubIotGateway } from '../src/modules/iot/stub-iot-gateway';
import { signStationCode } from '../src/modules/station-swaps/station-code';
import { StubStationGateway } from '../src/modules/station-swaps/station-gateways';
import { StationSwapsService } from '../src/modules/station-swaps/station-swaps.service';
import { IOT_GATEWAY } from '../src/ports/iot-gateway.port';
import { STATION_GATEWAY, stationThingName } from '../src/ports/station-gateway.port';
import { loadSpecAs30 } from './contract/openapi-30';
import { approvedCustomer, bootE2eApp, devToken, freeVehicleInReturnZone } from './helpers/e2e-app';

jestOpenAPI(loadSpecAs30() as any);
// Estação stub rápida (o padrão é 1,5 s por passo).
process.env.STATION_STUB_STEP_MS = '80';

/**
 * Troca de bateria na estação via QR (spec 2026-10-22) em IOT_MODE=stub: a estação imaginária avança sozinha.
 * Estações e motos próprias do teste (não mexe nas do seed).
 */
describe('Troca de bateria na estação via QR (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let iot: StubIotGateway;
  let station: StubStationGateway;
  let service: StationSwapsService;
  let admin: string;
  const updates: StationSwapUpdatedEvent[] = [];
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const tag = Date.now().toString(36).toUpperCase();
  const st = { id: randomUUID(), lat: -23.5601, lng: -46.6561 };
  const empty = { id: randomUUID(), lat: -23.5605, lng: -46.6565 };
  const stationSerials = [`E2E-ST-${tag}-1`, `E2E-ST-${tag}-2`];
  let code: string;

  /**
   * Este arquivo inicia ~7 aluguéis; o limite de `POST /rentals` (20/min) é contado no Redis e vale para os outros arquivos
   * da mesma rodada. Zera os contadores do limitador antes e depois para não deixar a janela esgotada para quem vem depois.
   */
  async function resetThrottle(): Promise<void> {
    const redis = new Redis(process.env.REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 1 });
    try {
      await redis.connect();
      const keys = await redis.keys('throttle:*');
      if (keys.length) await redis.del(...keys);
    } finally {
      redis.disconnect();
    }
  }

  beforeAll(async () => {
    await resetThrottle();
    ({ app, prisma } = await bootE2eApp());
    iot = app.get(IOT_GATEWAY);
    station = app.get(STATION_GATEWAY);
    service = app.get(StationSwapsService);
    app.get(EventEmitter2).on(EV.STATION_SWAP_UPDATED, (e: StationSwapUpdatedEvent) => updates.push(e));
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
    code = signStationCode(st.id);
    await prisma.swapStation.create({
      data: { id: st.id, name: `Estação e2e ${tag}`, address: 'R. Teste, 1', lat: st.lat, lng: st.lng, availableBatteries: 5, totalSlots: 10, openingHours: 'Todos os dias, 24 h', open24h: true, stationCode: code },
    });
    await prisma.swapStation.create({
      data: { id: empty.id, name: `Estação vazia e2e ${tag}`, address: 'R. Teste, 2', lat: empty.lat, lng: empty.lng, availableBatteries: 0, totalSlots: 10, openingHours: '24 h', open24h: true, stationCode: signStationCode(empty.id) },
    });
    for (const serial of stationSerials) {
      await prisma.battery.create({ data: { serial, chargePct: 100, cycleCount: 40, status: 'in_station', stationId: st.id } });
    }
  });

  afterAll(async () => {
    station?.setAuto(true);
    await prisma?.stationSwap.deleteMany({ where: { stationId: { in: [st.id, empty.id] } } });
    await prisma?.battery.deleteMany({ where: { serial: { contains: tag } } });
    await prisma?.swapStation.deleteMany({ where: { id: { in: [st.id, empty.id] } } });
    await prisma?.$disconnect();
    await app?.close();
    await resetThrottle();
  });

  /** Cliente com cartão, moto livre (com bateria registrada) e aluguel iniciado no plano pedido; moto parada (velocidade 0). */
  async function rideOn(planCode: 'minute' | 'day', opts: { stopped?: boolean } = {}) {
    const { token, customerId } = await approvedCustomer(app, prisma, `swap-${planCode}`);
    await http().post('/payments/cards').set(bearer(token)).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);
    const v = await freeVehicleInReturnZone(prisma);
    const batterySerial = `E2E-VB-${tag}-${v.code}`;
    await prisma.battery.create({ data: { serial: batterySerial, chargePct: 14, cycleCount: 7, status: 'in_vehicle', vehicleId: v.id } });
    const vehicle = await prisma.vehicle.update({ where: { id: v.id }, data: { batterySerial, batteryPct: 14 } });
    const started = await http().post('/rentals').set(bearer(token)).set('Idempotency-Key', randomUUID()).send({ vehicleId: v.id, planCode, coverage: 'basic', depositMethod: 'card' }).expect(201);
    if (opts.stopped !== false) {
      iot.setLiveState({
        thingName: vehicle.thingName, lat: vehicle.lat, lng: vehicle.lng, speedKmh: 0, batteryPct: 14, locked: false, ignition: true, signal: 4, speedLimitKmh: 32,
        stolenMode: false, online: true, lastSeenAt: new Date().toISOString(),
      });
    }
    return { token, customerId, rentalId: started.body.rental.id as string, vehicle, batterySerial };
  }

  const swapBody = (rentalId: string, o: Record<string, unknown> = {}) => ({ stationCode: code, rentalId, lat: st.lat, lng: st.lng, ...o });

  async function waitStatus(token: string, swapId: string, status: string, timeoutMs = 15_000) {
    const until = Date.now() + timeoutMs;
    for (;;) {
      const res = await http().get(`/swap-stations/${st.id}/swaps/${swapId}`).set(bearer(token)).expect(200);
      if (res.body.status === status) return res;
      if (Date.now() > until) throw new Error(`troca ${swapId} parou em ${res.body.status} (esperado ${status})`);
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  const feeLines = async (rentalId: string) => {
    const r = await http().post(`/rentals/${rentalId}/force-end`).set(bearer(admin)).send({ reason: 'Fim do teste de troca' }).expect(200);
    return (r.body.breakdown?.lines ?? []).filter((l: { code: string }) => l.code === 'battery_swap_fee');
  };

  it('caminho feliz (plano por minuto): opening_slot → awaiting_return → returned → releasing → completed, com estoque, moto e taxa no fechamento', async () => {
    station.setAuto(true);
    const { token, rentalId, vehicle, batterySerial } = await rideOn('minute');
    const key = randomUUID();
    const created = await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(token)).set('Idempotency-Key', key).send(swapBody(rentalId)).expect(201);
    expect(created).toSatisfyApiSpec();
    expect(created.body).toMatchObject({ stationId: st.id, rentalId, status: 'opening_slot', feeCents: 500 });
    expect(created.body).not.toHaveProperty('distanceM');
    const replay = await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(token)).set('Idempotency-Key', key).send(swapBody(rentalId)).expect(201);
    expect(replay.body).toEqual(created.body);
    const swapId: string = created.body.id;

    const done = await waitStatus(token, swapId, 'completed');
    expect(done).toSatisfyApiSpec();
    expect(done.body).toMatchObject({ returnedSerial: batterySerial, returnedPct: 15, releasedSerial: stationSerials[0], slotNumber: expect.any(Number) });
    expect(updates.filter((u) => u.swapId === swapId).map((u) => u.status)).toEqual(['opening_slot', 'awaiting_return', 'returned', 'releasing', 'completed']);
    expect(station.sent.filter((s) => s.command.swapId === swapId).map((s) => [s.thing, s.command.action])).toEqual([
      [stationThingName(st.id), 'open_slot'],
      [stationThingName(st.id), 'release_battery'],
    ]);

    // Estoque: estação perdeu uma carregada; a devolvida está carregando na estação; a liberada está na moto (+1 ciclo).
    expect((await prisma.swapStation.findUnique({ where: { id: st.id } }))!.availableBatteries).toBe(4);
    expect(await prisma.battery.findUnique({ where: { serial: batterySerial } })).toMatchObject({ status: 'charging', stationId: st.id, vehicleId: null, chargePct: 15 });
    expect(await prisma.battery.findUnique({ where: { serial: stationSerials[0] } })).toMatchObject({ status: 'in_vehicle', vehicleId: vehicle.id, stationId: null, cycleCount: 41 });
    expect(await prisma.vehicle.findUnique({ where: { id: vehicle.id } })).toMatchObject({ batterySerial: stationSerials[0], batteryPct: 100 });
    // LGPD: a troca não guarda a posição do celular.
    const row = await prisma.stationSwap.findUnique({ where: { id: swapId } });
    expect(row).not.toHaveProperty('lat');
    expect(row!.distanceM).toBe(0);

    // Painel: lista com as séries; cliente não lista.
    const list = await http().get(`/swap-stations/${st.id}/swaps?limit=5`).set(bearer(admin)).expect(200);
    expect(list).toSatisfyApiSpec();
    expect(list.body.items.find((s: { id: string }) => s.id === swapId)).toMatchObject({ returnedSerial: batterySerial, releasedSerial: stationSerials[0], customerId: expect.any(String) });
    await http().get(`/swap-stations/${st.id}/swaps`).set(bearer(token)).expect(403);

    // Taxa só no fechamento, como linha da liquidação.
    expect(await feeLines(rentalId)).toEqual([expect.objectContaining({ code: 'battery_swap_fee', amountCents: 500 })]);
  });

  it('plano diário: troca grátis e nenhuma linha battery_swap_fee no fechamento', async () => {
    station.setAuto(true);
    const { token, rentalId } = await rideOn('day');
    const created = await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(token)).set('Idempotency-Key', randomUUID()).send(swapBody(rentalId)).expect(201);
    expect(created.body.feeCents).toBe(0);
    await waitStatus(token, created.body.id, 'completed');
    expect(await feeLines(rentalId)).toEqual([]);
  });

  it('recusas: QR inválido (404), longe (422 too-far), moto andando ou sem velocidade conhecida (422 vehicle-moving), sem bateria (422 station-unavailable)', async () => {
    station.setAuto(false);
    const { token, rentalId, vehicle } = await rideOn('minute');
    const post = (stationId: string, b: Record<string, unknown>) => http().post(`/swap-stations/${stationId}/swaps`).set(bearer(token)).set('Idempotency-Key', randomUUID()).send(b);

    const badQr = await post(st.id, swapBody(rentalId, { stationCode: 'qualquer-coisa' })).expect(404);
    expect(badQr).toSatisfyApiSpec();
    expect(badQr.body.type).toBe('https://api.volti.com.br/problems/station-not-found');
    // QR de outra estação no caminho desta.
    expect((await post(st.id, swapBody(rentalId, { stationCode: signStationCode(empty.id) })).expect(404)).body.code).toBe('station-not-found');

    const far = await post(st.id, swapBody(rentalId, { lat: st.lat + 0.001 })).expect(422);
    expect(far).toSatisfyApiSpec();
    expect(far.body.code).toBe('too-far');

    iot.setLiveState({ ...(await iot.getLiveState(vehicle.thingName))!, speedKmh: 12 });
    expect((await post(st.id, swapBody(rentalId)).expect(422)).body.code).toBe('vehicle-moving');

    const unknown = await rideOn('minute', { stopped: false });
    const res = await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(unknown.token)).set('Idempotency-Key', randomUUID()).send(swapBody(unknown.rentalId)).expect(422);
    expect(res.body.code).toBe('vehicle-moving');

    const none = await post(empty.id, { stationCode: signStationCode(empty.id), rentalId, lat: empty.lat, lng: empty.lng }).expect(422);
    expect(none.body.code).toBe('station-unavailable');

    // Idempotency-Key obrigatória.
    await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(token)).send(swapBody(rentalId)).expect(400);
    expect(await prisma.stationSwap.count({ where: { rentalId: { in: [rentalId, unknown.rentalId] } } })).toBe(0);
  });

  it('prazo de 3 min: sem resposta da estação → failed; sem devolução → canceled; nenhuma bateria liberada', async () => {
    station.setAuto(false);
    const before = (await prisma.swapStation.findUnique({ where: { id: st.id } }))!.availableBatteries;
    const a = await rideOn('minute');
    const s1 = (await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send(swapBody(a.rentalId)).expect(201)).body;
    const b = await rideOn('minute');
    const s2 = (await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(b.token)).set('Idempotency-Key', randomUUID()).send(swapBody(b.rentalId)).expect(201)).body;
    await station.emit(stationThingName(st.id), { type: 'slot_opened', swapId: s2.id, slotNumber: 2, ts: new Date().toISOString() });
    await waitStatus(b.token, s2.id, 'awaiting_return');

    // Uma troca aberta por aluguel.
    const dup = await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send(swapBody(a.rentalId)).expect(409);
    expect(dup.body.code).toBe('swap-open');

    // Ainda dentro do prazo: nada muda.
    await service.expireOverdue();
    expect((await prisma.stationSwap.findUnique({ where: { id: s1.id } }))!.status).toBe('opening_slot');
    // 3 min depois.
    await service.expireOverdue(new Date(Date.now() + 3 * 60 * 1000 + 1000));
    expect((await waitStatus(a.token, s1.id, 'failed')).body.endReason).toBe('station_timeout');
    expect((await waitStatus(b.token, s2.id, 'canceled')).body.endReason).toBe('return_timeout');
    expect(station.sent.filter((s) => [s1.id, s2.id].includes(s.command.swapId) && s.command.action === 'release_battery')).toEqual([]);
    expect((await prisma.swapStation.findUnique({ where: { id: st.id } }))!.availableBatteries).toBe(before);
    // Liberação atrasada para uma troca cancelada é ignorada.
    await station.emit(stationThingName(st.id), { type: 'battery_released', swapId: s2.id, serial: stationSerials[1], ts: new Date().toISOString() });
    expect((await prisma.stationSwap.findUnique({ where: { id: s2.id } }))!.status).toBe('canceled');
  });

  it('cancelar: dono antes da devolução (200); outro cliente → 404; depois da devolução → 422 swap-not-cancelable', async () => {
    station.setAuto(false);
    const a = await rideOn('minute');
    const s1 = (await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send(swapBody(a.rentalId)).expect(201)).body;
    const stranger = await approvedCustomer(app, prisma, 'swap-stranger');
    await http().post(`/swap-stations/${st.id}/swaps/${s1.id}/cancel`).set(bearer(stranger.token)).expect(404);
    await http().get(`/swap-stations/${st.id}/swaps/${s1.id}`).set(bearer(stranger.token)).expect(404);
    const canceled = await http().post(`/swap-stations/${st.id}/swaps/${s1.id}/cancel`).set(bearer(a.token)).expect(200);
    expect(canceled).toSatisfyApiSpec();
    expect(canceled.body).toMatchObject({ status: 'canceled', endReason: 'canceled_by_customer' });
    expect(updates.filter((u) => u.swapId === s1.id).map((u) => u.status)).toEqual(['opening_slot', 'canceled']);

    // Nova troca no mesmo aluguel (a anterior foi encerrada); devolvida → não cancela mais.
    const s2 = (await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send(swapBody(a.rentalId)).expect(201)).body;
    const thing = stationThingName(st.id);
    await station.emit(thing, { type: 'slot_opened', swapId: s2.id, slotNumber: 1, ts: new Date().toISOString() });
    await station.emit(thing, { type: 'battery_returned', swapId: s2.id, serial: a.batterySerial, pct: 20, ts: new Date().toISOString() });
    const refused = await http().post(`/swap-stations/${st.id}/swaps/${s2.id}/cancel`).set(bearer(a.token)).expect(422);
    expect(refused).toSatisfyApiSpec();
    expect(refused.body.code).toBe('swap-not-cancelable');
    // Staff consulta (suporte), sem poder cancelar.
    const sup = await devToken(app, { sub: 'dev-suporte', email: 'suporte@volti.dev', groups: ['suporte'], pool: 'staff' });
    expect((await http().get(`/swap-stations/${st.id}/swaps/${s2.id}`).set(bearer(sup)).expect(200)).body.status).toBe('returned');
    await http().post(`/swap-stations/${st.id}/swaps/${s2.id}/cancel`).set(bearer(sup)).expect(403);
  });
});
