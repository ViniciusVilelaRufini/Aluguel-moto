import { assertSafeConfig, loadConfig } from './env';

describe('assertSafeConfig', () => {
  const base = () => ({ ...loadConfig(), nodeEnv: 'production', authMode: 'cognito' as const, mercadoPagoWebhookSecret: 'um-segredo-de-verdade-0123456789' });

  it('QA-15: AUTH_MODE=dev com NODE_ENV=production → recusa subir', () => {
    expect(() => assertSafeConfig({ ...base(), authMode: 'dev' })).toThrow(/AUTH_MODE=dev/);
  });

  it('configuração de produção válida passa; fora de produção dev é permitido', () => {
    expect(() => assertSafeConfig(base())).not.toThrow();
    expect(() => assertSafeConfig({ ...base(), nodeEnv: 'development', authMode: 'dev' })).not.toThrow();
  });
});
