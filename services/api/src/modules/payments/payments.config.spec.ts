import { loadPaymentsConfig } from './payments.config';

describe('loadPaymentsConfig (fix round 1)', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it.each(['production', 'staging', undefined])('PAYMENT_PROVIDER ausente com NODE_ENV=%p → falha fechada (não cai no fake)', (nodeEnv) => {
    delete process.env.PAYMENT_PROVIDER;
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
    expect(() => loadPaymentsConfig()).toThrow(/PAYMENT_PROVIDER/);
  });

  it.each(['development', 'test'])('PAYMENT_PROVIDER ausente com NODE_ENV=%s → fake', (nodeEnv) => {
    delete process.env.PAYMENT_PROVIDER;
    process.env.NODE_ENV = nodeEnv;
    expect(loadPaymentsConfig().provider).toBe('fake');
  });

  it('valor explícito vale em qualquer ambiente; valor inválido → erro', () => {
    process.env.NODE_ENV = 'production';
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    expect(loadPaymentsConfig().provider).toBe('mercadopago');
    process.env.PAYMENT_PROVIDER = 'stripe';
    expect(() => loadPaymentsConfig()).toThrow(/PAYMENT_PROVIDER inválido/);
  });

  it('fix round 4: prazo da análise no gateway (PAYMENT_REVIEW_MAX_DAYS): padrão 7 dias, configurável', () => {
    process.env.PAYMENT_PROVIDER = 'fake';
    delete process.env.PAYMENT_REVIEW_MAX_DAYS;
    expect(loadPaymentsConfig().reviewMaxDays).toBe(7);
    process.env.PAYMENT_REVIEW_MAX_DAYS = '3';
    expect(loadPaymentsConfig().reviewMaxDays).toBe(3);
  });

  it('tolerância do webhook: padrão 300 s, configurável', () => {
    process.env.PAYMENT_PROVIDER = 'fake';
    delete process.env.MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS;
    expect(loadPaymentsConfig().webhookToleranceSeconds).toBe(300);
    process.env.MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS = '120';
    expect(loadPaymentsConfig().webhookToleranceSeconds).toBe(120);
  });
});
