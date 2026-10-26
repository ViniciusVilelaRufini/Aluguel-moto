/** Configuração lida das variáveis de ambiente (CLAUDE.md, "DESENVOLVIMENTO LOCAL"). Nenhum segredo no código. */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl?: string;
  redisUrl: string;
  authMode: 'dev' | 'cognito';
  devJwtSecret?: string;
  /**
   * `staffClientIds`: clients do pool interno aceitos (painel e app do operador). `COGNITO_STAFF_CLIENT_IDS` (vírgula) mais o
   * legado `COGNITO_STAFF_CLIENT_ID`; vazio = qualquer client do pool (só fora de produção faz sentido).
   */
  cognito: { region: string; customerPoolId?: string; staffPoolId?: string; customerClientId?: string; staffClientIds: string[] };
  storageMode: 'local' | 's3';
  s3: { endpoint?: string; region: string; accessKey?: string; secretKey?: string; publicEndpoint?: string };
  buckets: { kyc: string; returnPhotos: string; reports: string; attachments: string; catalog: string };
  queueMode: 'local' | 'sqs';
  sqs: { endpoint?: string; region: string; queueUrls: Record<string, string | undefined> };
  kycProvider: 'mock';
  pushMode: 'log' | 'fcm';
  /** `PUSH_MODE=fcm`: JSON da conta de serviço do Firebase (segredo injetado pelo ECS; nunca no código nem em log). */
  fcmServiceAccountJson?: string;
  trackRetentionDays: number;
  reservationTtlSeconds: number;
  jobsEnabled: boolean;
  publicShareBaseUrl: string;
  mercadoPagoWebhookSecret?: string;
  paymentProvider?: string;
  /** `ALLOW_FAKE_PAYMENTS=true`: libera o gateway fake com NODE_ENV=production (só o ambiente dev da infra). */
  allowFakePayments: boolean;
  /**
   * `ALLOW_TEST_HANDOVER=true`: registra os atalhos do app de teste — `POST /reservations/{id}/test-handover` (entrega simulada,
   * sem a equipe do galpão) e `POST /rentals/{id}/test-end` (encerrar fora do ponto verde). Em produção só junto com o
   * pagamento fake liberado (o ambiente dev da infra).
   */
  allowTestHandover: boolean;
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

/** Lista separada por vírgula (sem vazios nem repetidos), mais valores avulsos. */
const csv = (raw: string | undefined, ...extra: Array<string | undefined>): string[] => {
  const all = [...(raw ?? '').split(','), ...extra].map((v) => v?.trim() ?? '').filter((v) => v !== '');
  return [...new Set(all)];
};

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
      staffClientIds: csv(str('COGNITO_STAFF_CLIENT_IDS'), str('COGNITO_STAFF_CLIENT_ID')),
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
      // Contrato v2: fotos do catálogo de modelos.
      catalog: str('S3_BUCKET_CATALOG', 'catalogo')!,
    },
    queueMode: oneOf('QUEUE_MODE', ['local', 'sqs'] as const, 'local'),
    sqs: {
      endpoint: str('SQS_ENDPOINT'),
      region: str('AWS_REGION', 'sa-east-1')!,
      queueUrls: {
        telemetria: str('SQS_QUEUE_TELEMETRIA_URL'),
        'pagamentos-webhook': str('SQS_QUEUE_PAGAMENTOS_WEBHOOK_URL'),
        alertas: str('SQS_QUEUE_ALERTAS_URL'),
        estacoes: str('SQS_QUEUE_ESTACOES_URL'),
      },
    },
    kycProvider: 'mock',
    pushMode: oneOf('PUSH_MODE', ['log', 'fcm'] as const, 'log'),
    fcmServiceAccountJson: str('FCM_SERVICE_ACCOUNT_JSON'),
    trackRetentionDays: num('TRACK_RETENTION_DAYS', 90),
    reservationTtlSeconds: num('RESERVATION_TTL_SECONDS', 15 * 60),
    jobsEnabled: str('JOBS_ENABLED', 'true') !== 'false',
    // Produção: obrigatório (assertSafeConfig); fora dela, o padrão aponta para a página servida pela própria API local.
    publicShareBaseUrl: str('PUBLIC_SHARE_BASE_URL', str('NODE_ENV') === 'production' ? '' : 'http://localhost:3000/share')!,
    mercadoPagoWebhookSecret: str('MERCADOPAGO_WEBHOOK_SECRET'),
    paymentProvider: str('PAYMENT_PROVIDER'),
    allowFakePayments: str('ALLOW_FAKE_PAYMENTS') === 'true',
    allowTestHandover: str('ALLOW_TEST_HANDOVER') === 'true',
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
 * do Mercado Pago com o placeholder da infra (`CHANGE_ME`) deixaria qualquer um assinar webhooks. Lacunas T5: gateway de
 * pagamento fake (só com `ALLOW_FAKE_PAYMENTS=true`, o ambiente dev da infra), entrega simulada (`ALLOW_TEST_HANDOVER=true`,
 * só junto com o pagamento fake), `PUBLIC_SHARE_BASE_URL` (link do SOS) e a
 * credencial do FCM com `PUSH_MODE=fcm`.
 */
export function assertSafeConfig(
  cfg: Pick<AppConfig, 'nodeEnv' | 'authMode' | 'mercadoPagoWebhookSecret' | 'paymentProvider'> &
    Partial<Pick<AppConfig, 'allowFakePayments' | 'allowTestHandover' | 'publicShareBaseUrl' | 'pushMode' | 'fcmServiceAccountJson'>>,
): void {
  // Credencial do FCM inválida falha em qualquer ambiente (melhor que descobrir no primeiro push).
  if (cfg.pushMode === 'fcm') assertFcmServiceAccount(cfg.fcmServiceAccountJson);
  assertTestHandoverAllowed(cfg.nodeEnv, cfg.paymentProvider, cfg.allowTestHandover === true, cfg.allowFakePayments === true);
  if (cfg.nodeEnv !== 'production') return;
  if (cfg.authMode !== 'cognito') {
    throw new Error(`AUTH_MODE=${cfg.authMode} não é permitido com NODE_ENV=production (use AUTH_MODE=cognito).`);
  }
  if (cfg.mercadoPagoWebhookSecret && cfg.mercadoPagoWebhookSecret.trim().toUpperCase() === 'CHANGE_ME') {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET ainda com o placeholder CHANGE_ME: defina o segredo real no Secrets Manager.');
  }
  if (cfg.paymentProvider === 'mercadopago' && !cfg.mercadoPagoWebhookSecret?.trim()) {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET vazio com PAYMENT_PROVIDER=mercadopago: os webhooks não poderiam ser validados.');
  }
  assertFakePaymentsAllowed(cfg.nodeEnv, cfg.paymentProvider, cfg.allowFakePayments === true);
  if (cfg.publicShareBaseUrl !== undefined) {
    let url: URL | undefined;
    try {
      url = new URL(cfg.publicShareBaseUrl);
    } catch {
      url = undefined;
    }
    if (!url || url.protocol !== 'https:') {
      throw new Error('PUBLIC_SHARE_BASE_URL obrigatório em produção (URL https da página pública de localização compartilhada, ex.: https://api.exemplo.com.br/share).');
    }
  }
}

/**
 * Entrega simulada (sem a equipe do galpão) só onde o pagamento também é de mentira, em qualquer ambiente:
 * `ALLOW_TEST_HANDOVER=true` exige `PAYMENT_PROVIDER=fake` e, com NODE_ENV=production, também `ALLOW_FAKE_PAYMENTS=true`.
 */
export function assertTestHandoverAllowed(nodeEnv: string | undefined, provider: string | undefined, enabled: boolean, allowFake: boolean): void {
  if (!enabled) return;
  if (provider !== 'fake') {
    throw new Error('ALLOW_TEST_HANDOVER=true exige PAYMENT_PROVIDER=fake (a entrega simulada só existe sem pagamento real).');
  }
  if (nodeEnv === 'production' && !allowFake) {
    throw new Error('ALLOW_TEST_HANDOVER=true com NODE_ENV=production exige ALLOW_FAKE_PAYMENTS=true (só no ambiente dev, sem clientes reais).');
  }
}

/** `PAYMENT_PROVIDER=fake` com NODE_ENV=production: só com a liberação explícita `ALLOW_FAKE_PAYMENTS=true`. */
export function assertFakePaymentsAllowed(nodeEnv: string | undefined, provider: string | undefined, allowFake: boolean): void {
  if (nodeEnv !== 'production' || provider !== 'fake' || allowFake) return;
  throw new Error(
    'PAYMENT_PROVIDER=fake não é permitido com NODE_ENV=production: use mercadopago (ou ALLOW_FAKE_PAYMENTS=true só no ambiente dev, sem clientes reais).',
  );
}

/** Conta de serviço do Firebase: JSON com `project_id`, `client_email` e `private_key` (o conteúdo nunca vai para a mensagem). */
export function assertFcmServiceAccount(raw: string | undefined): void {
  if (!raw?.trim()) throw new Error('PUSH_MODE=fcm exige FCM_SERVICE_ACCOUNT_JSON (conta de serviço do Firebase, via Secrets Manager).');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON não é um JSON válido.');
  }
  const p = parsed as Record<string, unknown> | null;
  if (!p || typeof p !== 'object' || !['project_id', 'client_email', 'private_key'].every((k) => typeof p[k] === 'string' && (p[k] as string) !== '')) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON incompleto: faltam project_id, client_email ou private_key.');
  }
}
