export type EnvName = 'dev' | 'prod';

export interface EnvConfig {
  name: EnvName;
  region: 'sa-east-1';
  availabilityZones: string[];
  natGateways: number;
  dbInstanceClass: string;
  dbAllocatedGb: number;
  dbMaxAllocatedGb: number;
  dbMultiAz: boolean;
  dbBackupDays: number;
  dbDeletionProtection: boolean;
  redisNodeType: string;
  redisNodes: number;
  apiCpu: number;
  apiMemoryMiB: number;
  apiMinTasks: number;
  apiMaxTasks: number;
  apiCpuTargetPercent: number;
  paymentProvider: 'fake' | 'mercadopago';
  logRetentionDays: number;
  dlqRetentionDays: number;
  budgetUsd: number;
  cloudFrontPriceClass: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
  /** true: resources are destroyed with the stack where safe; false: retained. */
  disposable: boolean;
}

const AZS = ['sa-east-1a', 'sa-east-1b'];

export const CONFIGS: Record<EnvName, EnvConfig> = {
  dev: {
    name: 'dev',
    region: 'sa-east-1',
    availabilityZones: AZS,
    natGateways: 1,
    dbInstanceClass: 't4g.micro',
    dbAllocatedGb: 20,
    dbMaxAllocatedGb: 50,
    dbMultiAz: false,
    dbBackupDays: 7,
    dbDeletionProtection: false,
    redisNodeType: 'cache.t4g.micro',
    redisNodes: 1,
    apiCpu: 256,
    apiMemoryMiB: 512,
    apiMinTasks: 1,
    apiMaxTasks: 2,
    apiCpuTargetPercent: 60,
    paymentProvider: 'fake',
    logRetentionDays: 14,
    dlqRetentionDays: 14,
    budgetUsd: 100,
    cloudFrontPriceClass: 'PriceClass_100',
    disposable: true,
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
    paymentProvider: 'mercadopago',
    logRetentionDays: 90,
    dlqRetentionDays: 14,
    budgetUsd: 1500,
    cloudFrontPriceClass: 'PriceClass_200',
    disposable: false,
  },
};

export function getConfig(name: string): EnvConfig {
  if (name !== 'dev' && name !== 'prod') {
    throw new Error(`Invalid env "${name}": use -c env=dev or -c env=prod`);
  }
  return CONFIGS[name];
}

/** Clearly fake ARNs so synth works offline; pass the real ones with -c at deploy time. */
export const FAKE_CERTIFICATE_ARN =
  'arn:aws:acm:sa-east-1:000000000000:certificate/00000000-0000-0000-0000-000000000000';
export const FAKE_ADMIN_CERTIFICATE_ARN =
  'arn:aws:acm:us-east-1:000000000000:certificate/00000000-0000-0000-0000-000000000000';
