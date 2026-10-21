/**
 * Configuração da área de pagamentos lida do ambiente (nenhum segredo no código; na AWS os segredos vêm do Secrets Manager
 * injetados como variáveis no container).
 */
export interface PaymentsConfig {
  provider: 'fake' | 'mercadopago';
  mercadoPago: { accessToken?: string; webhookSecret?: string; baseUrl?: string };
  pixExpirationMinutes: number;
  fakePixAutoConfirmSeconds: number;
  insuranceProvider: 'mock';
  invoiceIssuer: 'mock';
  reportsBucket: string;
}

const env = (name: string): string | undefined => {
  const v = process.env[name];
  return v === undefined || v === '' ? undefined : v;
};
const int = (name: string, fallback: number): number => {
  const v = env(name);
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function loadPaymentsConfig(): PaymentsConfig {
  const provider = env('PAYMENT_PROVIDER') ?? 'fake';
  if (provider !== 'fake' && provider !== 'mercadopago') throw new Error(`PAYMENT_PROVIDER inválido: ${provider} (use fake ou mercadopago).`);
  const insurance = env('INSURANCE_PROVIDER') ?? 'mock';
  if (insurance !== 'mock') throw new Error(`INSURANCE_PROVIDER inválido: ${insurance} (só mock nesta versão).`);
  const invoice = env('INVOICE_ISSUER') ?? 'mock';
  if (invoice !== 'mock') throw new Error(`INVOICE_ISSUER inválido: ${invoice} (só mock nesta versão).`);
  return {
    provider,
    mercadoPago: { accessToken: env('MERCADOPAGO_ACCESS_TOKEN'), webhookSecret: env('MERCADOPAGO_WEBHOOK_SECRET'), baseUrl: env('MERCADOPAGO_API_BASE_URL') },
    pixExpirationMinutes: int('PIX_EXPIRATION_MINUTES', 15),
    // Nome antigo (Task 3) aceito como fallback.
    fakePixAutoConfirmSeconds: int('FAKE_PIX_AUTOCONFIRM_SECONDS', int('STUB_PIX_AUTOCONFIRM_SECONDS', 10)),
    insuranceProvider: 'mock',
    invoiceIssuer: 'mock',
    reportsBucket: env('S3_BUCKET_REPORTS') ?? 'relatorios',
  };
}

export const PAYMENTS_CONFIG = Symbol('PAYMENTS_CONFIG');
