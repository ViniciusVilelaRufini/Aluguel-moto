import { loadIotConfig } from '../modules/iot/iot-config';
import { assertSafeConfig, loadConfig } from './env';

describe('assertSafeConfig', () => {
  const base = () => ({
    ...loadConfig(),
    nodeEnv: 'production',
    authMode: 'cognito' as const,
    mercadoPagoWebhookSecret: 'um-segredo-de-verdade-0123456789',
    paymentProvider: 'mercadopago',
    publicShareBaseUrl: 'https://api.volti.example/share',
  });

  it('QA-15: AUTH_MODE=dev com NODE_ENV=production → recusa subir', () => {
    expect(() => assertSafeConfig({ ...base(), authMode: 'dev' })).toThrow(/AUTH_MODE=dev/);
  });

  it('QA-19: segredo do webhook do Mercado Pago com o placeholder CHANGE_ME em produção → recusa subir', () => {
    expect(() => assertSafeConfig({ ...base(), mercadoPagoWebhookSecret: 'CHANGE_ME' })).toThrow(/MERCADOPAGO_WEBHOOK_SECRET/);
    expect(() => assertSafeConfig({ ...base(), mercadoPagoWebhookSecret: ' change_me ' })).toThrow(/MERCADOPAGO_WEBHOOK_SECRET/);
  });

  it('fix round 1: PAYMENT_PROVIDER=mercadopago sem segredo do webhook em produção → recusa subir', () => {
    expect(() => assertSafeConfig({ ...base(), paymentProvider: 'mercadopago', mercadoPagoWebhookSecret: undefined })).toThrow(/MERCADOPAGO_WEBHOOK_SECRET/);
    expect(() => assertSafeConfig({ ...base(), paymentProvider: 'mercadopago', mercadoPagoWebhookSecret: '   ' })).toThrow(/MERCADOPAGO_WEBHOOK_SECRET/);
    expect(() => assertSafeConfig({ ...base(), paymentProvider: 'fake', allowFakePayments: true, mercadoPagoWebhookSecret: undefined })).not.toThrow();
  });

  it('configuração de produção válida passa; fora de produção dev é permitido', () => {
    expect(() => assertSafeConfig(base())).not.toThrow();
    expect(() => assertSafeConfig({ ...base(), nodeEnv: 'development', authMode: 'dev', mercadoPagoWebhookSecret: 'CHANGE_ME' })).not.toThrow();
  });
});

describe('assertSafeConfig — lacunas T5', () => {
  const base = () => ({
    ...loadConfig(),
    nodeEnv: 'production',
    authMode: 'cognito' as const,
    mercadoPagoWebhookSecret: 'um-segredo-de-verdade-0123456789',
    paymentProvider: 'mercadopago',
    publicShareBaseUrl: 'https://api.volti.example/share',
  });
  const account = JSON.stringify({ project_id: 'volti-teste', client_email: 'push@volti-teste.iam.gserviceaccount.com', private_key: 'chave-falsa' });

  it('PAYMENT_PROVIDER=fake em produção → recusa com erro claro; ALLOW_FAKE_PAYMENTS=true libera (ambiente dev da infra)', () => {
    expect(() => assertSafeConfig({ ...base(), paymentProvider: 'fake' })).toThrow(/PAYMENT_PROVIDER=fake não é permitido com NODE_ENV=production/);
    expect(() => assertSafeConfig({ ...base(), paymentProvider: 'fake', allowFakePayments: false })).toThrow(/ALLOW_FAKE_PAYMENTS/);
    expect(() => assertSafeConfig({ ...base(), paymentProvider: 'fake', allowFakePayments: true })).not.toThrow();
    expect(() => assertSafeConfig({ ...base(), nodeEnv: 'development', paymentProvider: 'fake' })).not.toThrow();
  });

  it('PUBLIC_SHARE_BASE_URL obrigatório (https) em produção', () => {
    expect(() => assertSafeConfig({ ...base(), publicShareBaseUrl: '' })).toThrow(/PUBLIC_SHARE_BASE_URL obrigatório/);
    expect(() => assertSafeConfig({ ...base(), publicShareBaseUrl: 'http://localhost:3000/share' })).toThrow(/PUBLIC_SHARE_BASE_URL/);
    expect(() => assertSafeConfig({ ...base(), nodeEnv: 'development', publicShareBaseUrl: 'http://localhost:3000/share' })).not.toThrow();
  });

  it('PUSH_MODE=fcm exige FCM_SERVICE_ACCOUNT_JSON completo (em qualquer ambiente), sem ecoar o conteúdo', () => {
    expect(() => assertSafeConfig({ ...base(), pushMode: 'fcm', fcmServiceAccountJson: undefined })).toThrow(/FCM_SERVICE_ACCOUNT_JSON/);
    expect(() => assertSafeConfig({ ...base(), nodeEnv: 'development', pushMode: 'fcm', fcmServiceAccountJson: '{nao-json' })).toThrow(/não é um JSON válido/);
    let message = '';
    try {
      assertSafeConfig({ ...base(), pushMode: 'fcm', fcmServiceAccountJson: JSON.stringify({ project_id: 'p', private_key: 'segredo-que-nao-pode-vazar' }) });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/incompleto/);
    expect(message).not.toMatch(/segredo-que-nao-pode-vazar/);
    expect(() => assertSafeConfig({ ...base(), pushMode: 'fcm', fcmServiceAccountJson: account })).not.toThrow();
  });

  it('NODE_ENV=production sem PUBLIC_SHARE_BASE_URL no ambiente → loadConfig recusa subir', () => {
    const saved = { ...process.env };
    try {
      Object.assign(process.env, { NODE_ENV: 'production', AUTH_MODE: 'cognito', PAYMENT_PROVIDER: 'mercadopago', MERCADOPAGO_WEBHOOK_SECRET: 'segredo-real-0123456789' });
      delete process.env.PUBLIC_SHARE_BASE_URL;
      expect(() => loadConfig()).toThrow(/PUBLIC_SHARE_BASE_URL/);
      process.env.PUBLIC_SHARE_BASE_URL = 'https://api.volti.example/share';
      expect(loadConfig().publicShareBaseUrl).toBe('https://api.volti.example/share');
    } finally {
      process.env = saved;
    }
  });

  it('COGNITO_STAFF_CLIENT_IDS (vírgula) + COGNITO_STAFF_CLIENT_ID legado → lista sem repetidos', () => {
    const saved = { ...process.env };
    try {
      process.env.COGNITO_STAFF_CLIENT_IDS = ' painel , operador,, painel ';
      process.env.COGNITO_STAFF_CLIENT_ID = 'legado';
      expect(loadConfig().cognito.staffClientIds).toEqual(['painel', 'operador', 'legado']);
      delete process.env.COGNITO_STAFF_CLIENT_IDS;
      delete process.env.COGNITO_STAFF_CLIENT_ID;
      expect(loadConfig().cognito.staffClientIds).toEqual([]);
    } finally {
      process.env = saved;
    }
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
