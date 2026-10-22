import request from 'supertest';
import { createHarness, customerToken, Harness } from '../../../test/helpers/http-harness';
import { LgpdController } from './lgpd.controller';
import { LgpdService } from './lgpd.service';

/** QA-13: a exportação (todos os dados pessoais do titular) não pode ficar em cache de proxy/navegador. */
describe('LgpdController (QA-13)', () => {
  let h: Harness;
  const lgpd = { export: jest.fn().mockResolvedValue({ generatedAt: new Date().toISOString() }), getConsents: jest.fn().mockResolvedValue({}) };

  beforeAll(async () => {
    h = await createHarness({ controllers: [LgpdController], providers: [{ provide: LgpdService, useValue: lgpd }] });
  });
  afterAll(() => h.app.close());

  it('GET /lgpd/export → Cache-Control: no-store', async () => {
    const res = await request(h.app.getHttpServer()).get('/lgpd/export').set('Authorization', `Bearer ${await customerToken()}`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('GET /lgpd/consents → Cache-Control: no-store', async () => {
    const res = await request(h.app.getHttpServer()).get('/lgpd/consents').set('Authorization', `Bearer ${await customerToken()}`);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
