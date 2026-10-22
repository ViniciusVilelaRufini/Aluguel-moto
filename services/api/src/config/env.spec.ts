import { loadIotConfig } from '../modules/iot/iot-config';
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

describe('valores desconhecidos de modo (QA-02, resto da API)', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it.each([
    ['AUTH_MODE', 'aws'],
    ['QUEUE_MODE', 'aws'],
    ['STORAGE_MODE', 'aws'],
    ['PUSH_MODE', 'sns'],
  ])('%s=%s → recusa subir em vez de cair no modo local', (name, value) => {
    process.env[name] = value;
    expect(() => loadConfig()).toThrow(new RegExp(name));
  });

  it.each([
    ['IOT_MODE', 'iotcore'],
    ['GEOFENCE_MODE', 'location'],
  ])('%s=%s → recusa subir', (name, value) => {
    process.env[name] = value;
    expect(() => loadIotConfig()).toThrow(new RegExp(name));
  });
});
