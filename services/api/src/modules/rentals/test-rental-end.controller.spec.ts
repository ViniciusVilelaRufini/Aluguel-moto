import request from 'supertest';
import { createHarness, CUSTOMER_ID, customerToken, Harness, staffToken } from '../../../test/helpers/http-harness';
import { APP_CONFIG, loadConfig } from '../../config/env';
import { RentalEndService } from './rental-end.service';
import { TestRentalEndController } from './test-rental-end.controller';

const RENTAL_ID = '88888888-8888-4888-8888-888888888888';
const PHOTO_KEY = `returns/${RENTAL_ID}/foto.jpg`;

describe('POST /rentals/{id}/test-end (endRentalTest, ALLOW_TEST_HANDOVER)', () => {
  const ender = { end: jest.fn() };
  const cfg = { ...loadConfig(), allowTestHandover: true };
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness({
      controllers: [TestRentalEndController],
      providers: [{ provide: RentalEndService, useValue: ender }, { provide: APP_CONFIG, useValue: cfg }],
    });
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    ender.end.mockReset();
    cfg.allowTestHandover = true;
  });

  it('200: chama o encerramento normal com allowOutsideZone (o DTO público não ganha campo)', async () => {
    ender.end.mockResolvedValue({ status: 200, rental: { id: RENTAL_ID, status: 'ended' } });
    const res = await request(h.app.getHttpServer())
      .post(`/rentals/${RENTAL_ID}/test-end`)
      .set('Authorization', `Bearer ${await customerToken()}`)
      .send({ returnPhotoObjectKey: PHOTO_KEY });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: RENTAL_ID, status: 'ended' });
    expect(ender.end).toHaveBeenCalledWith(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY }, { allowOutsideZone: true });
  });

  it('202 ending quando a trava ainda não confirmou', async () => {
    ender.end.mockResolvedValue({ status: 202, rental: { id: RENTAL_ID, status: 'ending' } });
    const res = await request(h.app.getHttpServer())
      .post(`/rentals/${RENTAL_ID}/test-end`)
      .set('Authorization', `Bearer ${await customerToken()}`)
      .send({ returnPhotoObjectKey: PHOTO_KEY });
    expect(res.status).toBe(202);
    expect(res.body.status).toBe('ending');
  });

  it('campo extra no corpo (ex.: allowOutsideZone: false) é descartado pela validação; a opção vem só do controller', async () => {
    ender.end.mockResolvedValue({ status: 200, rental: { id: RENTAL_ID, status: 'ended' } });
    await request(h.app.getHttpServer())
      .post(`/rentals/${RENTAL_ID}/test-end`)
      .set('Authorization', `Bearer ${await customerToken()}`)
      .send({ returnPhotoObjectKey: PHOTO_KEY, allowOutsideZone: false });
    expect(ender.end).toHaveBeenCalledWith(CUSTOMER_ID, RENTAL_ID, { returnPhotoObjectKey: PHOTO_KEY }, { allowOutsideZone: true });
  });

  it('sem a foto no corpo → 400 e o serviço não é chamado', async () => {
    const res = await request(h.app.getHttpServer())
      .post(`/rentals/${RENTAL_ID}/test-end`)
      .set('Authorization', `Bearer ${await customerToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(ender.end).not.toHaveBeenCalled();
  });

  it('staff → 403 (só cliente)', async () => {
    const res = await request(h.app.getHttpServer())
      .post(`/rentals/${RENTAL_ID}/test-end`)
      .set('Authorization', `Bearer ${await staffToken(['admin'])}`)
      .send({ returnPhotoObjectKey: PHOTO_KEY });
    expect(res.status).toBe(403);
    expect(ender.end).not.toHaveBeenCalled();
  });

  it('defesa em profundidade: controller registrado por engano com a flag desligada em tempo de execução → 404, sem chamar o serviço', async () => {
    cfg.allowTestHandover = false;
    const res = await request(h.app.getHttpServer())
      .post(`/rentals/${RENTAL_ID}/test-end`)
      .set('Authorization', `Bearer ${await customerToken()}`)
      .send({ returnPhotoObjectKey: PHOTO_KEY });
    expect(res.status).toBe(404);
    expect(ender.end).not.toHaveBeenCalled();
  });
});
