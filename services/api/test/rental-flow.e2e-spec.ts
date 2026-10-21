import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { approvedCustomer, bootE2eApp, devToken, freeVehicleInReturnZone } from './helpers/e2e-app';

/**
 * Fluxo completo contra Postgres + Redis do compose:
 * POST /dev/token → POST /reservations → POST /rentals → pause → resume → return-photo → end → GET /rentals/{id}.
 */
describe('Fluxo do aluguel (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('reservar → iniciar → pausar → retomar → foto → encerrar: `ended` com costCents correto', async () => {
    const http = () => request(app.getHttpServer());
    const { token, customerId } = await approvedCustomer(app, prisma, 'flow');
    const auth = { Authorization: `Bearer ${token}` };
    const vehicle = await freeVehicleInReturnZone(prisma);

    // Reserva
    const reservation = await http().post('/reservations').set(auth).send({ vehicleId: vehicle.id }).expect(201);
    expect(reservation.body).toMatchObject({ vehicleId: vehicle.id, status: 'active' });
    expect((await prisma.vehicle.findUnique({ where: { id: vehicle.id } }))!.status).toBe('reserved');
    const again = await http().post('/reservations').set(auth).send({ vehicleId: vehicle.id }).expect(409);
    expect(again.body.type).toBe('https://api.volti.com.br/problems/reservation-already-active');

    // Início (idempotente)
    const key = randomUUID();
    const body = { vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' };
    const started = await http().post('/rentals').set(auth).set('Idempotency-Key', key).send(body).expect(201);
    expect(started.body.outcome).toBe('started');
    const rentalId: string = started.body.rental.id;
    const replay = await http().post('/rentals').set(auth).set('Idempotency-Key', key).send(body).expect(201);
    expect(replay.body).toEqual(started.body);
    expect(await prisma.rental.count({ where: { customerId } })).toBe(1);
    expect((await prisma.reservation.findUnique({ where: { id: reservation.body.id } }))!.status).toBe('converted');

    // Simula 10 minutos rodando (o preço é congelado no início; só o relógio muda).
    await prisma.rental.update({ where: { id: rentalId }, data: { startedAt: new Date(Date.now() - 10 * 60 * 1000) } });

    // Pausa e retomada
    const paused = await http().post(`/rentals/${rentalId}/pause`).set(auth).expect(200);
    expect(paused.body.status).toBe('paused');
    expect((await prisma.vehicle.findUnique({ where: { id: vehicle.id } }))!.status).toBe('paused');
    const resumed = await http().post(`/rentals/${rentalId}/resume`).set(auth).expect(200);
    expect(resumed.body.status).toBe('active');

    // Foto e encerramento (moto do seed está dentro de uma zona `return`)
    const photo = await http().post(`/rentals/${rentalId}/return-photo`).set(auth).send({ contentType: 'image/jpeg' }).expect(201);
    expect(photo.body).toMatchObject({ method: 'PUT' });
    // A URL pré-assinada funciona de verdade contra o MinIO do compose.
    const put = await fetch(photo.body.uploadUrl, { method: 'PUT', headers: photo.body.headers, body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
    expect(put.status).toBe(200);
    const ended = await http().post(`/rentals/${rentalId}/end`).set(auth).send({ returnPhotoObjectKey: photo.body.objectKey }).expect(200);
    expect(ended.body.status).toBe('ended');

    // Leitura final e valor
    const final = await http().get(`/rentals/${rentalId}`).set(auth).expect(200);
    expect(final.body.status).toBe('ended');
    const { elapsedSeconds, pausedSeconds, costCents } = final.body;
    const rideMinutes = Math.ceil((elapsedSeconds - pausedSeconds) / 60);
    const pauseMinutes = Math.ceil(pausedSeconds / 60);
    const expected = 300 + 79 * rideMinutes + 20 * pauseMinutes + 200; // desbloqueio + minutos + pausa + seguro basic
    expect(costCents).toBe(expected);
    expect(costCents).toBeGreaterThanOrEqual(1290);
    expect(final.body.breakdown.insuranceCents).toBe(200);

    // Liquidação única e moto liberada
    const payments = await prisma.payment.findMany({ where: { rentalId, kind: 'rental' } });
    expect(payments).toHaveLength(1);
    expect(payments[0].amountCents).toBe(costCents);
    expect((await prisma.vehicle.findUnique({ where: { id: vehicle.id } }))!.status).toBe('free');
    await http().post(`/rentals/${rentalId}/end`).set(auth).send({ returnPhotoObjectKey: photo.body.objectKey }).expect(409);
    expect(await prisma.payment.count({ where: { rentalId, kind: 'rental' } })).toBe(1);

    // Comandos gravados com AuditLog
    const audits = await prisma.auditLog.count({ where: { entityType: 'Vehicle', entityId: vehicle.id, createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } } });
    expect(audits).toBeGreaterThanOrEqual(4); // unlock, lock (pausa), unlock (retomada), lock (encerramento)
  });

  it('reserva expira pelo TTL do Redis e a moto volta a free', async () => {
    const http = () => request(app.getHttpServer());
    const { token } = await approvedCustomer(app, prisma, 'ttl');
    const vehicle = await freeVehicleInReturnZone(prisma);
    const res = await http().post('/reservations').set('Authorization', `Bearer ${token}`).send({ vehicleId: vehicle.id }).expect(201);
    // Encurta o TTL: expira a chave no Redis e deixa a varredura/keyspace liberar.
    await prisma.reservation.update({ where: { id: res.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const { ReservationsService } = await import('../src/modules/reservations/reservations.service');
    await app.get(ReservationsService).sweep();
    expect((await prisma.reservation.findUnique({ where: { id: res.body.id } }))!.status).toBe('expired');
    expect((await prisma.vehicle.findUnique({ where: { id: vehicle.id } }))!.status).toBe('free');
  });

  it('staff: token de cliente em rota de staff → 403; financeiro não envia comando → 403', async () => {
    const http = () => request(app.getHttpServer());
    const { token } = await approvedCustomer(app, prisma, 'auth');
    const vehicle = await freeVehicleInReturnZone(prisma);
    await http().get('/vehicles').set('Authorization', `Bearer ${token}`).expect(403);
    const fin = await devToken(app, { sub: 'dev-financeiro', email: 'financeiro@volti.dev', groups: ['financeiro'], pool: 'staff' });
    await http().post(`/vehicles/${vehicle.id}/commands`).set('Authorization', `Bearer ${fin}`).send({ type: 'horn', reason: 'teste e2e' }).expect(403);
    const op = await devToken(app, { sub: 'dev-operacao', email: 'operacao@volti.dev', groups: ['operacao'], pool: 'staff' });
    await http().post(`/vehicles/${vehicle.id}/commands`).set('Authorization', `Bearer ${op}`).send({ type: 'speed_limit', reason: 'teste e2e', speedLimitKmh: 33 }).expect(400);
    const ok = await http().post(`/vehicles/${vehicle.id}/commands`).set('Authorization', `Bearer ${op}`).send({ type: 'horn', reason: 'teste e2e' }).expect(202);
    expect(ok.body.status).toBe('confirmed');
  });

  it('TrackPoint (gravado pela Task 4): trajeto do aluguel, exportação LGPD e expiração leem a tabela corretamente', async () => {
    const http = () => request(app.getHttpServer());
    const { token, customerId } = await approvedCustomer(app, prisma, 'track');
    const vehicle = await prisma.vehicle.findFirstOrThrow({ where: { code: 'VLT-0059' } });
    const deposit = await prisma.deposit.create({ data: { customerId, method: 'card', status: 'captured', amountCents: 5000 } });
    const now = Date.now();
    const rental = await prisma.rental.create({
      data: {
        customerId, vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', status: 'ended', depositId: deposit.id, costCents: 500,
        priceSnapshot: { planCode: 'minute', unit: 'minute', unlockFeeCents: 300, unitPriceCents: 79, pausePerMinuteCents: 20, insurancePremiumCents: 200 },
        startedAt: new Date(now - 120_000), endRequestedAt: new Date(now - 60_000), endedAt: new Date(now - 60_000),
      },
    });
    const day = 86_400_000;
    await prisma.trackPoint.createMany({
      data: [
        { rentalId: rental.id, vehicleId: vehicle.id, lat: -23.56, lng: -46.69, speedKmh: 12, recordedAt: new Date(now - 110_000), expiresAt: new Date(now + 90 * day) },
        { rentalId: rental.id, vehicleId: vehicle.id, lat: -23.561, lng: -46.691, speedKmh: 15, recordedAt: new Date(now - 100_000), expiresAt: new Date(now + 90 * day) },
        { rentalId: rental.id, vehicleId: vehicle.id, lat: -23.562, lng: -46.692, speedKmh: 9, recordedAt: new Date(now - 91 * day), expiresAt: new Date(now - 1000) },
      ],
    });
    const track = await http().get(`/rentals/${rental.id}/track`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(track.body.points).toHaveLength(2);
    expect(track.body.points[0]).toEqual({ lat: -23.56, lng: -46.69, speedKmh: 12, recordedAt: new Date(now - 110_000).toISOString() });
    const exp = await http().get('/lgpd/export').set('Authorization', `Bearer ${token}`).expect(200);
    expect(exp.body.tracks).toEqual([expect.objectContaining({ rentalId: rental.id, points: expect.arrayContaining([expect.objectContaining({ speedKmh: 15 })]) })]);
    expect(exp.body.tracks[0].points).toHaveLength(2);
    const { LgpdService } = await import('../src/modules/lgpd/lgpd.service');
    expect(await app.get(LgpdService).purgeExpiredTracks()).toBeGreaterThanOrEqual(1);
    expect(await prisma.trackPoint.count({ where: { rentalId: rental.id } })).toBe(2);
  });
});
