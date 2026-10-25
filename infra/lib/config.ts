export type EnvName = 'dev' | 'prod';

export interface EnvConfig {
  name: EnvName;
  region: 'sa-east-1';
  availabilityZones: string[];
  /**
   * NAT gateways. 0 = minimum-cost profile (dev): the VPC has public + isolated subnets only, the API tasks run in the
   * public subnets with a public IP (security group open only to the ALB) and RDS/Redis sit in isolated subnets (no internet).
   */
  natGateways: number;
  dbInstanceClass: string;
  dbAllocatedGb: number;
  /** Storage autoscaling ceiling; unset = no autoscaling (the volume stays at dbAllocatedGb). */
  dbMaxAllocatedGb?: number;
  dbMultiAz: boolean;
  dbBackupDays: number;
  dbDeletionProtection: boolean;
  /** false = explicitly off (dev). Unset = CloudFormation default (off), template unchanged. */
  dbPerformanceInsights?: boolean;
  redisNodeType: string;
  redisNodes: number;
  apiCpu: number;
  apiMemoryMiB: number;
  apiMinTasks: number;
  apiMaxTasks: number;
  apiCpuTargetPercent: number;
  /** FARGATE_SPOT (dev): up to ~70% cheaper, task can be interrupted with 2 min notice and ECS starts another one. */
  apiCapacityProvider: 'FARGATE' | 'FARGATE_SPOT';
  /** Images kept in the ECR repository. */
  ecrMaxImages: number;
  paymentProvider: 'fake' | 'mercadopago';
  logRetentionDays: number;
  dlqRetentionDays: number;
  budgetUsd: number;
  /** Budget e-mail/SNS alerts on actual spend at these percentages (plus one at 100% of the forecast). */
  budgetAlertPercents: number[];
  /** Cost-allocation tag filter of the budget (dev: shared account, only the tagged resources). Unset = whole account. */
  budgetTagFilter?: string;
  /** 'essential' (dev): only API 5xx and DLQ alarms (inside the 10 free alarms). 'full': every alarm. */
  alarms: 'full' | 'essential';
  /** WAF on the ALB (regional) and on CloudFront (us-east-1 stack). Off in dev (US$ 5/ACL + US$ 1/rule per month). */
  wafEnabled: boolean;
  cloudFrontPriceClass: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
  /** true: resources are destroyed with the stack where safe; false: retained. */
  disposable: boolean;
  /** Regional WAF on the API ALB: requests per IP in 5 minutes before blocking. */
  apiRateLimitPer5Min: number;
  /** Alarm when RDS connections reach this (about 80% of max_connections for the instance class). */
  dbConnectionsAlarm: number;
  /** Alarm when the oldest message of the telemetry / stations queue is older than this. */
  telemetryQueueAgeAlarmSeconds: number;
  stationsQueueAgeAlarmSeconds: number;
  /** Amazon Location place index (reverse geocoding of the vehicle address; results are cached, hence IntendedUse=Storage). */
  placeIndexDataSource: 'Esri' | 'Here';
  /** Shards of the station events Kinesis stream (1 shard = 1,000 records/s; order is per station within a shard). */
  stationStreamShards: number;
  /**
   * Station events path. 'kinesis' (prod): ordered per station (rule → Kinesis → ordered Lambda → FIFO).
   * 'lambda' (dev, stations are simulated): rule → async Lambda → the same FIFO; order between two events of the same
   * station published close together is NOT guaranteed (parallel invocations, retries). Saves the shard (~US$ 22/month).
   */
  stationEventsTransport: 'kinesis' | 'lambda';
  auth: AuthConfig;
}

export interface SesConfig {
  /** Verified SES identity (e-mail or address in a verified domain). */
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  sesVerifiedDomain?: string;
  configurationSetName?: string;
}

export interface AuthConfig {
  /** Cognito prefix domains (<prefix>.auth.sa-east-1.amazoncognito.com); globally unique per region. */
  customerDomainPrefix: string;
  staffDomainPrefix: string;
  /** Customer app (Flutter) Hosted UI callback/logout. */
  customerCallbackUrls: string[];
  /** Field operator app (Flutter) Hosted UI callback/logout. */
  operatorCallbackUrls: string[];
  /** Admin panel origins besides the deployed one (e.g. local next dev). Callback = <origin>/auth/callback/, logout = <origin>/login/. */
  adminExtraOrigins: string[];
  /** SES for customer e-mails. Without it EMAIL_OTP stays off (Cognito requires SES for e-mail OTP) and e-mails use the Cognito default sender. */
  customerSes?: SesConfig;
  /** Region of the SNS used by Cognito to send SMS (SMS_OTP). */
  snsRegion: string;
  /** Secrets Manager names of the social IdPs. Unset = IdP not created. Google: {clientId, clientSecret}; Apple: {servicesId, teamId, keyId, privateKey}. */
  googleSecretName?: string;
  appleSecretName?: string;
}

const AZS = ['sa-east-1a', 'sa-east-1b'];

export const CONFIGS: Record<EnvName, EnvConfig> = {
  dev: {
    name: 'dev',
    region: 'sa-east-1',
    availabilityZones: AZS,
    // Minimum-cost profile (docs/decisoes.md): no NAT, no WAF, no Kinesis, Fargate Spot, essential alarms only.
    natGateways: 0,
    dbInstanceClass: 't4g.micro',
    dbAllocatedGb: 20,
    dbMultiAz: false,
    dbBackupDays: 1,
    dbDeletionProtection: false,
    dbPerformanceInsights: false,
    redisNodeType: 'cache.t4g.micro',
    redisNodes: 1,
    apiCpu: 256,
    apiMemoryMiB: 512,
    apiMinTasks: 1,
    apiMaxTasks: 2,
    apiCpuTargetPercent: 60,
    apiCapacityProvider: 'FARGATE_SPOT',
    ecrMaxImages: 10,
    paymentProvider: 'fake',
    logRetentionDays: 3,
    dlqRetentionDays: 14,
    budgetUsd: 20,
    budgetAlertPercents: [50, 80, 100],
    budgetTagFilter: 'user:projeto$volti',
    alarms: 'essential',
    wafEnabled: false,
    cloudFrontPriceClass: 'PriceClass_100',
    disposable: true,
    apiRateLimitPer5Min: 2000,
    // db.t4g.micro: max_connections ≈ 80 (1 GiB minus reserved memory / 9531392); alarm at ~80%.
    dbConnectionsAlarm: 65,
    telemetryQueueAgeAlarmSeconds: 120,
    stationsQueueAgeAlarmSeconds: 60,
    placeIndexDataSource: 'Esri',
    stationStreamShards: 1,
    stationEventsTransport: 'lambda',
    auth: {
      customerDomainPrefix: 'volti-dev-clientes',
      staffDomainPrefix: 'volti-dev-equipe',
      customerCallbackUrls: ['volti://auth/callback'],
      operatorCallbackUrls: ['br.com.volti.operador://callback'],
      adminExtraOrigins: ['http://localhost:3100'],
      snsRegion: 'sa-east-1',
    },
  },
  prod: {
    name: 'prod',
    region: 'sa-east-1',
    availabilityZones: AZS,
    natGateways: 2,
    dbInstanceClass: 't4g.medium',
    dbAllocatedGb: 100,
    dbMaxAllocatedGb: 500,
    dbMultiAz: true,
    dbBackupDays: 14,
    dbDeletionProtection: true,
    redisNodeType: 'cache.t4g.small',
    redisNodes: 2,
    apiCpu: 1024,
    apiMemoryMiB: 2048,
    apiMinTasks: 2,
    apiMaxTasks: 10,
    apiCpuTargetPercent: 60,
    apiCapacityProvider: 'FARGATE',
    ecrMaxImages: 30,
    paymentProvider: 'mercadopago',
    logRetentionDays: 90,
    dlqRetentionDays: 14,
    budgetUsd: 1500,
    budgetAlertPercents: [80, 100],
    alarms: 'full',
    wafEnabled: true,
    cloudFrontPriceClass: 'PriceClass_200',
    disposable: false,
    apiRateLimitPer5Min: 3000,
    dbConnectionsAlarm: 360,
    telemetryQueueAgeAlarmSeconds: 60,
    stationsQueueAgeAlarmSeconds: 30,
    placeIndexDataSource: 'Esri',
    stationStreamShards: 1,
    stationEventsTransport: 'kinesis',
    auth: {
      customerDomainPrefix: 'volti-clientes',
      staffDomainPrefix: 'volti-equipe',
      customerCallbackUrls: ['volti://auth/callback'],
      operatorCallbackUrls: ['br.com.volti.operador://callback'],
      adminExtraOrigins: [],
      snsRegion: 'sa-east-1',
    },
  },
};

/** Deploy-time values that only exist in the real account (passed with -c, never committed). */
export interface ConfigOverrides {
  sesFromEmail?: string;
  sesVerifiedDomain?: string;
  googleIdpSecretName?: string;
  appleIdpSecretName?: string;
  customerDomainPrefix?: string;
  staffDomainPrefix?: string;
  apiRateLimitPer5Min?: number;
}

export function getConfig(name: string, overrides: ConfigOverrides = {}): EnvConfig {
  if (name !== 'dev' && name !== 'prod') {
    throw new Error(`Invalid env "${name}": use -c env=dev or -c env=prod`);
  }
  const base = CONFIGS[name];
  const o = overrides;
  const auth: AuthConfig = {
    ...base.auth,
    customerDomainPrefix: o.customerDomainPrefix ?? base.auth.customerDomainPrefix,
    staffDomainPrefix: o.staffDomainPrefix ?? base.auth.staffDomainPrefix,
    customerSes: o.sesFromEmail ? { fromEmail: o.sesFromEmail, fromName: 'Volti', sesVerifiedDomain: o.sesVerifiedDomain } : base.auth.customerSes,
    googleSecretName: o.googleIdpSecretName ?? base.auth.googleSecretName,
    appleSecretName: o.appleIdpSecretName ?? base.auth.appleSecretName,
  };
  const rate = o.apiRateLimitPer5Min ?? base.apiRateLimitPer5Min;
  // WAF rate-based rules accept 10..2,000,000,000 per evaluation window.
  if (!Number.isInteger(rate) || rate < 10) throw new Error(`apiRateLimitPer5Min invalid: ${rate} (integer >= 10)`);
  return { ...base, apiRateLimitPer5Min: rate, auth };
}

/** Clearly fake ARNs so synth works offline; pass the real ones with -c at deploy time. */
export const FAKE_CERTIFICATE_ARN =
  'arn:aws:acm:sa-east-1:000000000000:certificate/00000000-0000-0000-0000-000000000000';
export const FAKE_ADMIN_CERTIFICATE_ARN =
  'arn:aws:acm:us-east-1:000000000000:certificate/00000000-0000-0000-0000-000000000000';
