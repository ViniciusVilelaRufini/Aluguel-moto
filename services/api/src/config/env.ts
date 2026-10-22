/** Configuração lida das variáveis de ambiente (CLAUDE.md, "DESENVOLVIMENTO LOCAL"). Nenhum segredo no código. */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl?: string;
  redisUrl: string;
  authMode: 'dev' | 'cognito';
  devJwtSecret?: string;
  cognito: { region: string; customerPoolId?: string; staffPoolId?: string; customerClientId?: string; staffClientId?: string };
  storageMode: 'local' | 's3';
  s3: { endpoint?: string; region: string; accessKey?: string; secretKey?: string; publicEndpoint?: string };
  buckets: { kyc: string; returnPhotos: string; reports: string; attachments: string };
  queueMode: 'local' | 'sqs';
  sqs: { endpoint?: string; region: string; queueUrls: Record<string, string | undefined> };
  kycProvider: 'mock';
  pushMode: 'log' | 'fcm';
  trackRetentionDays: number;
  reservationTtlSeconds: number;
  jobsEnabled: boolean;
  publicShareBaseUrl: string;
  mercadoPagoWebhookSecret?: string;
  stubPixAutoConfirmSeconds: number;
  version: string;
}

const str = (name: string, fallback?: string): string | undefined => {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
};
/** Modo escolhido por variável: valor fora da lista recusa subir (QA-02: `QUEUE_MODE=aws` caía em silêncio na fila local). */
export function oneOf<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  if (!(allowed as readonly string[]).includes(v)) throw new Error(`${name} inválido: ${v} (use ${allowed.join(' | ')}).`);
  return v as T;
}

const num = (name: string, fallback: number): number => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] !== '' && process.env[name] !== undefined ? v : fallback;
};

export function loadConfig(): AppConfig {
  const cfg: AppConfig = {
    nodeEnv: str('NODE_ENV', 'development')!,
    port: num('PORT', 3000),
    databaseUrl: str('DATABASE_URL'),
    redisUrl: str('REDIS_URL', 'redis://localhost:6379')!,
    authMode: oneOf('AUTH_MODE', ['dev', 'cognito'] as const, 'dev'),
    devJwtSecret: str('DEV_JWT_SECRET'),
    cognito: {
      region: str('COGNITO_REGION', str('AWS_REGION', 'sa-east-1'))!,
      customerPoolId: str('COGNITO_CUSTOMER_POOL_ID'),
      staffPoolId: str('COGNITO_STAFF_POOL_ID'),
      customerClientId: str('COGNITO_CUSTOMER_CLIENT_ID'),
      staffClientId: str('COGNITO_STAFF_CLIENT_ID'),
    },
    storageMode: oneOf('STORAGE_MODE', ['local', 's3'] as const, 'local'),
    s3: {
      endpoint: str('S3_ENDPOINT'),
      publicEndpoint: str('S3_PUBLIC_ENDPOINT'),
      region: str('AWS_REGION', 'sa-east-1')!,
      accessKey: str('S3_ACCESS_KEY'),
      secretKey: str('S3_SECRET_KEY'),
    },
    buckets: {
      kyc: str('S3_BUCKET_KYC', 'documentos-kyc')!,
      returnPhotos: str('S3_BUCKET_RETURN_PHOTOS', 'fotos-devolucao')!,
      reports: str('S3_BUCKET_REPORTS', 'relatorios')!,
      attachments: str('S3_BUCKET_ATTACHMENTS', 'anexos')!,
    },
    queueMode: oneOf('QUEUE_MODE', ['local', 'sqs'] as const, 'local'),
    sqs: {
      endpoint: str('SQS_ENDPOINT'),
      region: str('AWS_REGION', 'sa-east-1')!,
      queueUrls: {
        telemetria: str('SQS_QUEUE_TELEMETRIA_URL'),
        'pagamentos-webhook': str('SQS_QUEUE_PAGAMENTOS_WEBHOOK_URL'),
        alertas: str('SQS_QUEUE_ALERTAS_URL'),
      },
    },
    kycProvider: 'mock',
    pushMode: oneOf('PUSH_MODE', ['log', 'fcm'] as const, 'log'),
    trackRetentionDays: num('TRACK_RETENTION_DAYS', 90),
    reservationTtlSeconds: num('RESERVATION_TTL_SECONDS', 15 * 60),
    jobsEnabled: str('JOBS_ENABLED', 'true') !== 'false',
    publicShareBaseUrl: str('PUBLIC_SHARE_BASE_URL', 'http://localhost:3000/share')!,
    mercadoPagoWebhookSecret: str('MERCADOPAGO_WEBHOOK_SECRET'),
    stubPixAutoConfirmSeconds: num('STUB_PIX_AUTOCONFIRM_SECONDS', 10),
    version: str('APP_VERSION', '0.1.0')!,
  };
  assertSafeConfig(cfg);
  return cfg;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

/**
 * Recusa subir com configuração perigosa em produção (chamada no `loadConfig`, então vale para a API e para os módulos que
 * leem o ambiente). QA-15: `AUTH_MODE=dev` (emissor local `POST /dev/token`) nunca em produção. QA-19: o segredo do webhook
 * do Mercado Pago com o placeholder da infra (`CHANGE_ME`) deixaria qualquer um assinar webhooks.
 */
export function assertSafeConfig(cfg: Pick<AppConfig, 'nodeEnv' | 'authMode' | 'mercadoPagoWebhookSecret'>): void {
  if (cfg.nodeEnv !== 'production') return;
  if (cfg.authMode !== 'cognito') {
    throw new Error(`AUTH_MODE=${cfg.authMode} não é permitido com NODE_ENV=production (use AUTH_MODE=cognito).`);
  }
  if (cfg.mercadoPagoWebhookSecret && cfg.mercadoPagoWebhookSecret.trim().toUpperCase() === 'CHANGE_ME') {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET ainda com o placeholder CHANGE_ME: defina o segredo real no Secrets Manager.');
  }
}
