import { App, Tags } from 'aws-cdk-lib';
import {
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
import { WafStack } from './stacks/waf-stack';

export interface VoltiAppOptions {
  envName: EnvName | string;
  /** AWS account id; synth uses a placeholder so no credentials are needed. */
  account?: string;
  /** ACM certificate (sa-east-1) for the ALB HTTPS listener. */
  certificateArn?: string;
  apiImageTag?: string;
  /** Optional admin panel domain, only applied together with adminCertificateArn (ACM in us-east-1). */
  adminDomainName?: string;
  adminCertificateArn?: string;
  alarmEmail?: string;
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
  waf: WafStack;
  adminWeb: AdminWebStack;
  observability: ObservabilityStack;
}

export function createVoltiApp(opts: VoltiAppOptions): VoltiStacks {
  const cfg = getConfig(opts.envName);
  const account = opts.account ?? '000000000000';
  const app = new App({ outdir: opts.outdir });
  const env = { account, region: cfg.region };
  const prefix = `volti-${cfg.name}`;
  const common = { env, terminationProtection: !cfg.disposable };

  const network = new NetworkStack(app, `${prefix}-network`, { ...common, cfg });
  const data = new DataStack(app, `${prefix}-data`, { ...common, cfg, vpc: network.vpc });
  const auth = new AuthStack(app, `${prefix}-auth`, { ...common, cfg });
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
    certificateArn: opts.certificateArn ?? FAKE_CERTIFICATE_ARN,
    imageTag: opts.apiImageTag ?? 'latest',
  });
  const waf = new WafStack(app, `${prefix}-waf`, {
    ...common,
    env: { account, region: 'us-east-1' },
    crossRegionReferences: true,
    cfg,
  });
  const adminWeb = new AdminWebStack(app, `${prefix}-admin-web`, {
    ...common,
    crossRegionReferences: true,
    cfg,
    webAclArn: waf.webAclArn,
    adminDomainName: opts.adminDomainName,
    adminCertificateArn: opts.adminCertificateArn,
  });
  const observability = new ObservabilityStack(app, `${prefix}-observability`, {
    ...common,
    cfg,
    api,
    data,
    messaging,
    alarmEmail: opts.alarmEmail,
  });

  Tags.of(app).add('projeto', 'volti');
  Tags.of(app).add('ambiente', cfg.name);

  return { app, network, data, auth, messaging, iot, api, waf, adminWeb, observability };
}
