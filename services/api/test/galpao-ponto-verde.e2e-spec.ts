import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { approvedCustomer, bootE2eApp, devToken, freeVehicleInReturnZone } from './helpers/e2e-app';

/**
 * Retirada em galpão (Task 7): moto do galpão devolvida em ponto verde fica `awaiting_pickup` com uma tarefa `collect`,
 * some da rua para o cliente, não pode ser alugada pelo `POST /rentals` e volta ao galpão quando o operador conclui o
 * recolhimento informando o `depotId`.
 */
describe('Devolução em ponto verde com recolhimento (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let campo: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    campo = await devToken(app, { sub: 'dev-campo', email: 'campo@volti.dev', groups: ['campo'], pool: 'staff' });
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  const nearbyIds = async (token: string) => {
    const res = await request(app.getHttpServer()).get('/vehicles/nearby?lat=-23.5614&lng=-46.6559&radiusM=300').set('Authorization', `Bearer ${token}`).expect(200);
    return res.body.items.map((v: { id: string }) => v.id) as string[];
  };

  it('ponto verde → awaiting_pickup + collect → operador recolhe ao galpão → free com depotId', async () => {
    const http = () => request(app.getHttpServer());
    const depot = await prisma.depot.findFirstOrThrow({ where: { active: true } });
    const { token } = await approvedCustomer(app, prisma, 'pv');
    const auth = { Authorization: `Bearer ${token}` };
    await http().post('/payments/cards').set(auth).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);

    // Moto de rua alugada; depois do início ela passa a ser do galpão (como a que sai pela entrega da Task 6).
    const vehicle = await freeVehicleInReturnZone(prisma);
    const started = await http().post('/rentals').set(auth).set('Idempotency-Key', randomUUID())
      .send({ vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' }).expect(201);
    const rentalId: string = started.body.rental.id;
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { depotId: depot.id } });

    const photo = await http().post(`/rentals/${rentalId}/return-photo`).set(auth).send({ contentType: 'image/jpeg' }).expect(201);
    await http().post(`/rentals/${rentalId}/end`).set(auth).send({ returnPhotoObjectKey: photo.body.objectKey }).expect(200);
    // A finalização também pode chegar pelo evento de travada: espera a liquidação para não ler estado intermediário.
    for (let i = 0; i < 100 && !(await prisma.payment.count({ where: { rentalId, kind: 'rental', status: { not: 'pending' } } })); i++) {
      await new Promise((r) => setTimeout(r, 50));
    }

    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } })).status).toBe('awaiting_pickup');
    const tasks = await prisma.fieldTask.findMany({ where: { vehicleId: vehicle.id, type: 'collect' } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ status: 'open', priority: 'medium', targetLat: -23.5614, targetLng: -46.6559 });

    // Finalizar de novo não cria outra tarefa.
    const { RentalEndService } = await import('../src/modules/rentals/rental-end.service');
    await app.get(RentalEndService).finalize(rentalId, 'ended');
    expect(await prisma.fieldTask.count({ where: { vehicleId: vehicle.id, type: 'collect' } })).toBe(1);

    // Fora da rua para o cliente e sem aluguel de rua; staff continua vendo.
    const other = await approvedCustomer(app, prisma, 'pv2');
    expect(await nearbyIds(other.token)).not.toContain(vehicle.id);
    expect(await nearbyIds(campo)).toContain(vehicle.id);
    const blocked = await http().post('/rentals').set('Authorization', `Bearer ${other.token}`).set('Idempotency-Key', randomUUID())
      .send({ vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.type).toBe('https://api.volti.com.br/problems/vehicle-unavailable');

    // Recolhimento: sem galpão → 422; com galpão → moto free, no galpão.
    await http().post(`/field-tasks/${tasks[0].id}/start`).set('Authorization', `Bearer ${campo}`).expect(200);
    const missing = await http().post(`/field-tasks/${tasks[0].id}/complete`).set('Authorization', `Bearer ${campo}`).send({});
    expect(missing.status).toBe(422);
    const done = await http().post(`/field-tasks/${tasks[0].id}/complete`).set('Authorization', `Bearer ${campo}`).send({ depotId: depot.id }).expect(200);
    expect(done.body).toMatchObject({ status: 'done', vehicleStatus: 'free' });
    const atDepot = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } });
    expect(atDepot).toMatchObject({ status: 'free', depotId: depot.id, lat: depot.lat, lng: depot.lng });

    // No galpão: continua fora do nearby do cliente (só sai pela entrega).
    const atDepotNearby = await http().get(`/vehicles/nearby?lat=${depot.lat}&lng=${depot.lng}&radiusM=300`).set('Authorization', `Bearer ${other.token}`).expect(200);
    expect(atDepotNearby.body.items.map((v: { id: string }) => v.id)).not.toContain(vehicle.id);
  });

  it('moto de rua (sem depotId) devolvida em ponto verde continua free, sem recolhimento', async () => {
    const http = () => request(app.getHttpServer());
    const { token } = await approvedCustomer(app, prisma, 'pv-rua');
    const auth = { Authorization: `Bearer ${token}` };
    await http().post('/payments/cards').set(auth).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242' }).expect(201);
    const vehicle = await freeVehicleInReturnZone(prisma);
    const started = await http().post('/rentals').set(auth).set('Idempotency-Key', randomUUID())
      .send({ vehicleId: vehicle.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' }).expect(201);
    const photo = await http().post(`/rentals/${started.body.rental.id}/return-photo`).set(auth).send({ contentType: 'image/jpeg' }).expect(201);
    await http().post(`/rentals/${started.body.rental.id}/end`).set(auth).send({ returnPhotoObjectKey: photo.body.objectKey }).expect(200);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } })).status).toBe('free');
    expect(await prisma.fieldTask.count({ where: { vehicleId: vehicle.id, type: 'collect' } })).toBe(0);
  });
});
