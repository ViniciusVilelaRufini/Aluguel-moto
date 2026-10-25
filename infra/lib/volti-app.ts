import { App, DefaultStackSynthesizer, Tags } from 'aws-cdk-lib';
import {
  ConfigOverrides,
  EnvName,
  FAKE_CERTIFICATE_ARN,
  getConfig,
} from './config';
import { AdminWebStack } from './stacks/admin-web-stack';
import { ApiStack } from './stacks/api-stack';
import { AuthStack } from './stacks/auth-stack';
import { DataStack } from './stacks/data-stack';
import { IotStack } from './stacks/iot-stack';
import { MessagingStack } from './stacks/messaging-stack';
import { NetworkStack } from './stacks/network-stack';
import { ObservabilityStack } from './stacks/observability-stack';
import {
  DEFAULT_API_DOMAIN,
  DEFAULT_BRANCH,
  DEFAULT_HOSTED_ZONE_ID,
  DEFAULT_REPO,
  SINGLE_TAG,
  SingleDevStack,
} from './stacks/single-dev-stack';
import { WafStack } from './stacks/waf-stack';

export interface VoltiAppOptions {
  envName: EnvName | string;
  /** AWS account id; synth uses a placeholder so no credentials are needed. */
  account?: string;
  /** ACM certificate (sa-east-1) for the ALB HTTPS listener. */
  certificateArn?: string;
  apiImageTag?: string;
  /** Fargate desired count. Default 0 so a fresh deploy never waits for a missing image. */
  apiDesiredCount?: number;
  /** Optional admin panel domain, only applied together with adminCertificateArn (ACM in us-east-1). */
  adminDomainName?: string;
  adminCertificateArn?: string;
  /** API domain (e.g. api.volti.com.br) used in the public SOS location-share link. */
  apiDomainName?: string;
  alarmEmail?: string;
  /** Budget alerts e-mail (falls back to alarmEmail). Never committed: -c budgetEmail=... */
  budgetEmail?: string;
  /** Dev only: RUN_SEED=true in the API task (idempotent seed after the migrations). */
  apiRunSeed?: boolean;
  /** Account-specific values (SES identity, IdP secret names, Cognito domain prefixes, WAF limit). */
  overrides?: ConfigOverrides;
  outdir?: string;
}

export interface VoltiStacks {
  app: App;
  network: NetworkStack;
  data: DataStack;
  auth: AuthStack;
  messaging: MessagingStack;
  iot: IotStack;
  api: ApiStack;
  /** Only when cfg.wafEnabled (not in dev). */
  waf?: WafStack;
  adminWeb: AdminWebStack;
  observability: ObservabilityStack;
}

export function createVoltiApp(opts: VoltiAppOptions): VoltiStacks {
  const cfg = getConfig(opts.envName, opts.overrides);
  const account = opts.account ?? '000000000000';
  const app = new App({ outdir: opts.outdir });
  const env = { account, region: cfg.region };
  const prefix = `volti-${cfg.name}`;
  const common = { env, terminationProtection: !cfg.disposable };

  const network = new NetworkStack(app, `${prefix}-network`, { ...common, cfg });
  const waf = cfg.wafEnabled
    ? new WafStack(app, `${prefix}-waf`, {
        ...common,
        env: { account, region: 'us-east-1' },
        crossRegionReferences: true,
        cfg,
      })
    : undefined;
  const adminWeb = new AdminWebStack(app, `${prefix}-admin-web`, {
    ...common,
    crossRegionReferences: true,
    cfg,
    webAclArn: waf?.webAclArn,
    adminDomainName: opts.adminDomainName,
    adminCertificateArn: opts.adminCertificateArn,
  });
  // The panel origin feeds the Cognito callbacks and the CORS of the catalog bucket (browser uploads).
  const data = new DataStack(app, `${prefix}-data`, { ...common, cfg, vpc: network.vpc, adminOrigin: adminWeb.origin });
  const auth = new AuthStack(app, `${prefix}-auth`, { ...common, cfg, adminOrigin: adminWeb.origin });
  const messaging = new MessagingStack(app, `${prefix}-messaging`, { ...common, cfg });
  const iot = new IotStack(app, `${prefix}-iot`, { ...common, cfg, messaging });
  const api = new ApiStack(app, `${prefix}-api`, {
    ...common,
    cfg,
    vpc: network.vpc,
    data,
    auth,
    messaging,
    iot,
    adminOrigin: adminWeb.origin,
    certificateArn: opts.certificateArn ?? FAKE_CERTIFICATE_ARN,
    imageTag: opts.apiImageTag ?? 'latest',
    desiredCount: opts.apiDesiredCount ?? 0,
    apiDomainName: opts.apiDomainName,
    runSeed: opts.apiRunSeed,
  });
  const observability = new ObservabilityStack(app, `${prefix}-observability`, {
    ...common,
    cfg,
    api,
    data,
    messaging,
    iot,
    alarmEmail: opts.alarmEmail,
    budgetEmail: opts.budgetEmail,
  });

  Tags.of(app).add('projeto', 'volti');
  Tags.of(app).add('ambiente', cfg.name);

  return { app, network, data, auth, messaging, iot, api, waf, adminWeb, observability };
}

export interface SingleDevAppOptions {
  /** AWS account id; synth uses a placeholder (no lookup, no credentials needed). */
  account?: string;
  repoUrl?: string;
  branch?: string;
  instanceType?: string;
  rootVolumeGb?: number;
  /** Route 53 zone (shared with another project) where the instance UPSERTs the A record of apiDomain at every boot. */
  hostedZoneId?: string;
  /** API name; '-' disables the DNS record (fallback <public-ip>.sslip.io). */
  apiDomain?: string;
  /** EventBridge Scheduler start 07:00 / stop 23:00 America/Sao_Paulo (default on). */
  schedule?: boolean;
  budgetEmail?: string;
  overrides?: ConfigOverrides;
  outdir?: string;
}

export interface SingleDevStacks {
  app: App;
  adminWeb: AdminWebStack;
  auth: AuthStack;
  single: SingleDevStack;
}

/** Bootstrap qualifier of the single profile: its own CDK toolkit stack (volti-cdk-toolkit), apart from the other project's. */
export const SINGLE_QUALIFIER = 'volti';

/**
 * `-c env=dev -c profile=single`: the cheapest dev (docs/decisoes.md). One EC2 instance with Docker Compose + S3, Cognito and
 * the panel on S3/CloudFront (default domain). No Docker-built asset (deployable from AWS CloudShell). Prod and the full dev
 * are untouched.
 */
export function createSingleDevApp(opts: SingleDevAppOptions): SingleDevStacks {
  const cfg = getConfig('dev', opts.overrides);
  const account = opts.account ?? '000000000000';
  const app = new App({ outdir: opts.outdir });
  const common = {
    env: { account, region: cfg.region },
    synthesizer: new DefaultStackSynthesizer({ qualifier: SINGLE_QUALIFIER }),
  };
  const apiDomain = opts.apiDomain ?? DEFAULT_API_DOMAIN;
  const hostedZoneId = opts.hostedZoneId ?? DEFAULT_HOSTED_ZONE_ID;
  const dns = apiDomain === '-' || hostedZoneId === '-' ? undefined : { hostedZoneId, apiDomain: apiDomain.toLowerCase() };
  if (dns && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(dns.apiDomain)) {
    throw new Error(`apiDomain inválido: ${dns.apiDomain}`);
  }
  if (dns && !/^Z[A-Z0-9]{5,31}$/.test(dns.hostedZoneId)) throw new Error(`hostedZoneId inválido: ${dns.hostedZoneId}`);

  // The panel stays on the CloudFront default domain (no custom domain / ACM).
  const adminWeb = new AdminWebStack(app, 'volti-dev-admin-web', { ...common, cfg });
  // Shared account: no self sign-up and no SMS in the customer pool (test customers come from the volti-dev-admin document).
  const auth = new AuthStack(app, 'volti-dev-auth', { ...common, cfg, adminOrigin: adminWeb.origin, restrictedCustomers: true });
  const single = new SingleDevStack(app, 'volti-dev-single', {
    ...common,
    cfg,
    auth,
    adminWeb,
    adminOrigin: adminWeb.origin,
    repoUrl: opts.repoUrl ?? DEFAULT_REPO,
    branch: opts.branch ?? DEFAULT_BRANCH,
    instanceType: opts.instanceType ?? 't4g.small',
    rootVolumeGb: opts.rootVolumeGb ?? 25,
    dns,
    schedule: opts.schedule ?? true,
    budgetEmail: opts.budgetEmail,
  });

  Tags.of(app).add(SINGLE_TAG.key, SINGLE_TAG.value);
  Tags.of(app).add('ambiente', 'dev');
  return { app, adminWeb, auth, single };
}
