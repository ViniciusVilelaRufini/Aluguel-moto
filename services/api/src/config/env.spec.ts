import { assertSafeConfig, loadConfig } from './env';

describe('assertSafeConfig', () => {
  const base = () => ({ ...loadConfig(), nodeEnv: 'production', authMode: 'cognito' as const, mercadoPagoWebhookSecret: 'um-segredo-de-verdade-0123456789' });

  it('QA-15: AUTH_MODE=dev com NODE_ENV=production → recusa subir', () => {
    expect(() => assertSafeConfig({ ...base(), authMode: 'dev' })).toThrow(/AUTH_MODE=dev/);
  });

  it('QA-19: segredo do webhook do Mercado Pago com o placeholder CHANGE_ME em produção → recusa subir', () => {
    expect(() => assertSafeConfig({ ...base(), mercadoPagoWebhookSecret: 'CHANGE_ME' })).toThrow(/MERCADOPAGO_WEBHOOK_SECRET/);
    expect(() => assertSafeConfig({ ...base(), mercadoPagoWebhookSecret: ' change_me ' })).toThrow(/MERCADOPAGO_WEBHOOK_SECRET/);
  });

  it('configuração de produção válida passa; fora de produção dev é permitido', () => {
    expect(() => assertSafeConfig(base())).not.toThrow();
    expect(() => assertSafeConfig({ ...base(), nodeEnv: 'development', authMode: 'dev', mercadoPagoWebhookSecret: 'CHANGE_ME' })).not.toThrow();
  });
});
