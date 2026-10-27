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

  // Cada teste inicia vários aluguéis/trocas (limites de 20/min por rota no Redis): começa com a janela zerada.
  beforeEach(resetThrottle);

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
    // Taxa mostrada na confirmação antes do POST = a que o POST congela.
    const before = await http().get('/rentals/current').set(bearer(token)).expect(200);
    expect(before).toSatisfyApiSpec();
    expect(before.body.batterySwapFeeCents).toBe(500);
    const key = randomUUID();
    const created = await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(token)).set('Idempotency-Key', key).send(swapBody(rentalId)).expect(201);
    expect(created).toSatisfyApiSpec();
    expect(created.body).toMatchObject({ stationId: st.id, rentalId, status: 'opening_slot', feeCents: 500 });
    expect(created.body.feeCents).toBe(before.body.batterySwapFeeCents);
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
    expect((await http().get('/rentals/current').set(bearer(token)).expect(200)).body.batterySwapFeeCents).toBe(0);
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

  it('fix 1 (C1): última bateria — dois POST simultâneos numa estação com 1 carregada → um 201 e um 422 station-unavailable', async () => {
    station.setAuto(false);
    const one = { id: randomUUID(), lat: -23.5609, lng: -46.6569 };
    const oneCode = signStationCode(one.id);
    await prisma.swapStation.create({
      data: { id: one.id, name: `Estação 1 bateria e2e ${tag}`, address: 'R. Teste, 3', lat: one.lat, lng: one.lng, availableBatteries: 1, totalSlots: 4, openingHours: '24 h', open24h: true, stationCode: oneCode },
    });
    try {
      const a = await rideOn('minute');
      const b = await rideOn('minute');
      const post = (r: { token: string; rentalId: string }) =>
        http().post(`/swap-stations/${one.id}/swaps`).set(bearer(r.token)).set('Idempotency-Key', randomUUID()).send({ stationCode: oneCode, rentalId: r.rentalId, lat: one.lat, lng: one.lng });
      for (let round = 0; round < 3; round++) {
        await prisma.stationSwap.deleteMany({ where: { stationId: one.id } });
        const res = await Promise.all([post(a), post(b)]);
        expect(res.map((r) => r.status).sort()).toEqual([201, 422]);
        expect(res.find((r) => r.status === 422)!.body.code).toBe('station-unavailable');
        expect(await prisma.stationSwap.count({ where: { stationId: one.id } })).toBe(1);
      }
    } finally {
      await prisma.stationSwap.deleteMany({ where: { stationId: one.id } });
      await prisma.swapStation.delete({ where: { id: one.id } });
    }
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
    // Fix 1 (I2): a estação é avisada (abort_swap) em todo prazo vencido.
    expect(station.sent.filter((s) => s.command.action === 'abort_swap').map((s) => s.command.swapId)).toEqual(expect.arrayContaining([s1.id, s2.id]));
    expect((await prisma.swapStation.findUnique({ where: { id: st.id } }))!.availableBatteries).toBe(before);
    // Liberação atrasada para uma troca cancelada é ignorada.
    await station.emit(stationThingName(st.id), { type: 'battery_released', swapId: s2.id, serial: stationSerials[1], ts: new Date().toISOString() });
    expect((await prisma.stationSwap.findUnique({ where: { id: s2.id } }))!.status).toBe('canceled');
  });

  it('fix 1 (I2): cancelou e devolveu mesmo assim → a estação recebe abort_swap, a devolução vale e a carregada é liberada', async () => {
    station.setAuto(false);
    const a = await rideOn('minute');
    const thing = stationThingName(st.id);
    const s1 = (await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send(swapBody(a.rentalId)).expect(201)).body;
    await station.emit(thing, { type: 'slot_opened', swapId: s1.id, slotNumber: 5, ts: new Date().toISOString() });
    await http().post(`/swap-stations/${st.id}/swaps/${s1.id}/cancel`).set(bearer(a.token)).expect(200);
    expect(station.sent.find((x) => x.command.swapId === s1.id && x.command.action === 'abort_swap')?.command).toMatchObject({ slotNumber: 5 });
    await station.emit(thing, { type: 'battery_returned', swapId: s1.id, serial: a.batterySerial, pct: 18, ts: new Date().toISOString() });
    const releasing = await waitStatus(a.token, s1.id, 'releasing');
    expect(releasing.body).toMatchObject({ returnedSerial: a.batterySerial });
    expect(releasing.body).not.toHaveProperty('endReason');
    const rel = station.sent.find((x) => x.command.swapId === s1.id && x.command.action === 'release_battery');
    expect(rel).toBeDefined();
    await station.emit(thing, { type: 'slot_closed', swapId: s1.id, ts: new Date().toISOString() });
    // As carregadas cadastradas da estação já saíram nos testes anteriores: a estação libera uma do próprio estoque.
    // 2026-10-26 (custódia): só sai bateria cadastrada `in_station` nesta estação — cadastra a do estoque antes.
    const released = rel!.command.serialHint ?? `E2E-REL-${tag}`;
    if (!rel!.command.serialHint) await prisma.battery.create({ data: { serial: released, chargePct: 100, status: 'in_station', stationId: st.id } });
    await station.emit(thing, { type: 'battery_released', swapId: s1.id, serial: released, ts: new Date().toISOString() });
    await waitStatus(a.token, s1.id, 'completed');
    expect(await prisma.vehicle.findUnique({ where: { id: a.vehicle.id } })).toMatchObject({ batterySerial: released });
  });

  it('Task 12 (fix I1): cancelou, o painel desativou a estação e a bateria chegou depois → devolução registrada, evento sem erro', async () => {
    station.setAuto(false);
    const a = await rideOn('minute');
    const thing = stationThingName(st.id);
    const s1 = (await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send(swapBody(a.rentalId)).expect(201)).body;
    await station.emit(thing, { type: 'slot_opened', swapId: s1.id, slotNumber: 6, ts: new Date().toISOString() });
    await http().post(`/swap-stations/${st.id}/swaps/${s1.id}/cancel`).set(bearer(a.token)).expect(200);
    // Troca cancelada não conta como aberta: a desativação passa.
    await http().patch(`/swap-stations/${st.id}`).set(bearer(admin)).send({ active: false }).expect(200);
    try {
      // O handler do evento termina sem exceção (no modo aws a mensagem é apagada da fila, sem envenenar o grupo FIFO).
      await expect(station.emit(thing, { type: 'battery_returned', swapId: s1.id, serial: a.batterySerial, pct: 17, ts: new Date().toISOString() })).resolves.toBeUndefined();
      const swap = await prisma.stationSwap.findUnique({ where: { id: s1.id } });
      expect(swap).toMatchObject({ returnedSerial: a.batterySerial });
      expect(['releasing', 'failed']).toContain(swap!.status);
      expect(await prisma.battery.findUnique({ where: { serial: a.batterySerial } })).toMatchObject({ status: 'charging', stationId: st.id });
      // Troca nova continua recusada na estação inativa.
      const b = await rideOn('minute');
      const refused = await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(b.token)).set('Idempotency-Key', randomUUID()).send(swapBody(b.rentalId)).expect(422);
      expect(refused.body.code).toBe('station-unavailable');
    } finally {
      await prisma.swapStation.update({ where: { id: st.id }, data: { active: true } });
    }
  });

  it('fix 1 (I1/I7): GET /rentals/current traz a troca aberta; encerrar e trocar de moto no meio dela → 409 swap-open', async () => {
    station.setAuto(false);
    const a = await rideOn('minute');
    const s1 = (await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send(swapBody(a.rentalId)).expect(201)).body;
    const cur = await http().get('/rentals/current').set(bearer(a.token)).expect(200);
    expect(cur).toSatisfyApiSpec();
    expect(cur.body.currentStationSwap).toMatchObject({ id: s1.id, status: 'opening_slot', rentalId: a.rentalId });

    const end = await http().post(`/rentals/${a.rentalId}/end`).set(bearer(a.token)).send({ returnPhotoObjectKey: `returns/${a.rentalId}/x.jpg` }).expect(409);
    expect(end).toSatisfyApiSpec();
    expect(end.body.code).toBe('swap-open');
    const other = await freeVehicleInReturnZone(prisma);
    const swapBike = await http().post(`/rentals/${a.rentalId}/swap`).set(bearer(a.token)).send({ newVehicleId: other.id, reason: 'Pneu furado' }).expect(409);
    expect(swapBike.body.code).toBe('swap-open');
    expect((await prisma.rental.findUnique({ where: { id: a.rentalId } }))!).toMatchObject({ status: 'active', vehicleId: a.vehicle.id });

    await http().post(`/swap-stations/${st.id}/swaps/${s1.id}/cancel`).set(bearer(a.token)).expect(200);
    expect((await http().get('/rentals/current').set(bearer(a.token)).expect(200)).body).not.toHaveProperty('currentStationSwap');
  });

  it('fix 2 (M-2/M-4): encerramento forçado cancela a troca sem devolução (rental_force_ended) e avisa a estação; devolução depois só entra no estoque', async () => {
    station.setAuto(false);
    const a = await rideOn('minute');
    const thing = stationThingName(st.id);
    const s1 = (await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send(swapBody(a.rentalId)).expect(201)).body;
    await station.emit(thing, { type: 'slot_opened', swapId: s1.id, slotNumber: 4, ts: new Date().toISOString() });
    await http().post(`/rentals/${a.rentalId}/force-end`).set(bearer(admin)).send({ reason: 'Cliente sem bateria no celular' }).expect(200);
    const row = await prisma.stationSwap.findUniqueOrThrow({ where: { id: s1.id } });
    expect(row).toMatchObject({ status: 'canceled', endReason: 'rental_force_ended' });
    expect(station.sent.find((x) => x.command.swapId === s1.id && x.command.action === 'abort_swap')?.command).toMatchObject({ slotNumber: 4 });
    await station.emit(thing, { type: 'battery_returned', swapId: s1.id, serial: a.batterySerial, pct: 21, ts: new Date().toISOString() });
    expect(await prisma.stationSwap.findUniqueOrThrow({ where: { id: s1.id } })).toMatchObject({ status: 'canceled', returnedSerial: a.batterySerial });
    expect(await prisma.battery.findUnique({ where: { serial: a.batterySerial } })).toMatchObject({ status: 'charging', stationId: st.id });
    expect(station.sent.filter((x) => x.command.swapId === s1.id && x.command.action === 'release_battery')).toEqual([]);
  });

  it('fix 2 (I-1): cancelou, o aluguel foi encerrado e a bateria chegou depois → failed/return_after_close, sem liberar', async () => {
    station.setAuto(false);
    const a = await rideOn('minute');
    const thing = stationThingName(st.id);
    const s1 = (await http().post(`/swap-stations/${st.id}/swaps`).set(bearer(a.token)).set('Idempotency-Key', randomUUID()).send(swapBody(a.rentalId)).expect(201)).body;
    await http().post(`/swap-stations/${st.id}/swaps/${s1.id}/cancel`).set(bearer(a.token)).expect(200);
    await http().post(`/rentals/${a.rentalId}/force-end`).set(bearer(admin)).send({ reason: 'Fim do teste de devolução atrasada' }).expect(200);
    await station.emit(thing, { type: 'battery_returned', swapId: s1.id, serial: a.batterySerial, pct: 19, ts: new Date().toISOString() });
    expect(await prisma.stationSwap.findUniqueOrThrow({ where: { id: s1.id } })).toMatchObject({ status: 'failed', endReason: 'return_after_close', returnedSerial: a.batterySerial });
    expect(station.sent.filter((x) => x.command.swapId === s1.id && x.command.action === 'release_battery')).toEqual([]);
    const got = await http().get(`/swap-stations/${st.id}/swaps/${s1.id}`).set(bearer(a.token)).expect(200);
    expect(got).toSatisfyApiSpec();
  });

  it('fix 1 (I6): GET /swap-stations/{id}/qr só para admin, com o conteúdo do QR', async () => {
    const res = await http().get(`/swap-stations/${st.id}/qr`).set(bearer(admin)).expect(200);
    expect(res).toSatisfyApiSpec();
    expect(res.body).toEqual({ stationId: st.id, stationCode: code });
    const sup = await devToken(app, { sub: 'dev-suporte', email: 'suporte@volti.dev', groups: ['suporte'], pool: 'staff' });
    await http().get(`/swap-stations/${st.id}/qr`).set(bearer(sup)).expect(403);
    const c = await approvedCustomer(app, prisma, 'swap-qr');
    await http().get(`/swap-stations/${st.id}/qr`).set(bearer(c.token)).expect(403);
    expect((await http().get(`/swap-stations/${randomUUID()}/qr`).set(bearer(admin)).expect(404)).body.code).toBe('station-not-found');
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
