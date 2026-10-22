import request from 'supertest';
import { createHarness } from '../../test/helpers/http-harness';
import { isAllowedOrigin } from './cors';

/** QA-10: CORS por lista de origens (CORS_ORIGINS), sem credenciais; nunca reflete origem arbitrária. */
describe('CORS', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('CORS_ORIGINS definido → só as origens da lista', () => {
    process.env.CORS_ORIGINS = 'https://painel.volti.com.br, https://admin.example';
    expect(isAllowedOrigin('https://painel.volti.com.br')).toBe(true);
    expect(isAllowedOrigin('https://admin.example')).toBe(true);
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(isAllowedOrigin('http://localhost:3100')).toBe(false);
  });

  it('sem CORS_ORIGINS: fora de produção só localhost; em produção nenhuma', () => {
    delete process.env.CORS_ORIGINS;
    process.env.NODE_ENV = 'development';
    expect(isAllowedOrigin('http://localhost:3100')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3100')).toBe(true);
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(isAllowedOrigin('http://localhost.evil.example')).toBe(false);
    process.env.NODE_ENV = 'production';
    expect(isAllowedOrigin('http://localhost:3100')).toBe(false);
  });

  it('preflight de origem estranha não recebe Access-Control-Allow-Origin; credenciais desligadas', async () => {
    process.env.CORS_ORIGINS = 'https://painel.volti.com.br';
    const h = await createHarness({ controllers: [] });
    const app = h.app.getHttpServer();
    const evil = await request(app).options('/x').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'GET');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    const ok = await request(app).options('/x').set('Origin', 'https://painel.volti.com.br').set('Access-Control-Request-Method', 'GET');
    expect(ok.headers['access-control-allow-origin']).toBe('https://painel.volti.com.br');
    expect(ok.headers['access-control-allow-credentials']).toBeUndefined();
    await h.app.close();
  });
});
