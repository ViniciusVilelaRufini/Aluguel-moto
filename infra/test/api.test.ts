import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Match } from 'aws-cdk-lib/assertions';
import { stacksFor, templateOf } from './helpers';

describe('ApiStack', () => {
  const t = () => templateOf(stacksFor('dev').api);

  it('ALB has a 443 HTTPS listener with a certificate', () => {
    t().hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 443,
      Protocol: 'HTTPS',
      Certificates: [Match.objectLike({ CertificateArn: Match.anyValue() })],
    });
  });

  it('target group health check is /health', () => {
    t().hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', { HealthCheckPath: '/health' });
  });

  it('runs on Fargate with CPU auto scaling and secrets from Secrets Manager', () => {
    t().hasResourceProperties('AWS::ECS::Service', { LaunchType: 'FARGATE' });
    t().hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
      TargetTrackingScalingPolicyConfiguration: Match.objectLike({
        PredefinedMetricSpecification: { PredefinedMetricType: 'ECSServiceAverageCPUUtilization' },
      }),
    });
    const td = Object.values(t().findResources('AWS::ECS::TaskDefinition'))[0] as any;
    const c = td.Properties.ContainerDefinitions[0];
    expect(c.Secrets.length).toBeGreaterThan(0);
    expect(JSON.stringify(c.Environment)).not.toMatch(/password|secret_key/i);
  });

  it('first deploy is safe: service starts with 0 tasks and autoscaling min 0', () => {
    t().hasResourceProperties('AWS::ECS::Service', { DesiredCount: 0 });
    t().hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', { MinCapacity: 0 });
  });

  it('creates the ECR repository for the API image', () => {
    t().resourceCountIs('AWS::ECR::Repository', 1);
  });

  it('QA-06: the attachments bucket is wired into the container env and the task role', () => {
    const td = Object.values(t().findResources('AWS::ECS::TaskDefinition'))[0] as any;
    const c = td.Properties.ContainerDefinitions[0];
    const env = c.Environment.find((e: any) => e.Name === 'S3_BUCKET_ATTACHMENTS');
    expect(env).toBeDefined();
    expect(JSON.stringify(env.Value)).toMatch(/RefAttachmentsBucket/);
    const policies = JSON.stringify(Object.values(t().findResources('AWS::IAM::Policy')));
    expect(policies).toMatch(/AttachmentsBucket/);
  });

  it('QA-16: the task role publishes only to comandos and shadow update/get, never telemetria/eventos', () => {
    const stmts = Object.values(t().findResources('AWS::IAM::Policy')).flatMap((p: any) => p.Properties.PolicyDocument.Statement) as any[];
    const toList = (x: unknown) => (Array.isArray(x) ? x : [x]);
    const publish = stmts.filter((s) => toList(s.Action).includes('iot:Publish'));
    expect(publish).toHaveLength(1);
    const resources = toList(publish[0].Resource).map((r) => JSON.stringify(r));
    expect(resources).toHaveLength(3);
    expect(resources.some((r) => r.includes('topic/motos/*/comandos'))).toBe(true);
    expect(resources.some((r) => r.includes('shadow/update'))).toBe(true);
    expect(resources.some((r) => r.includes('shadow/get'))).toBe(true);
    for (const r of resources) {
      expect(r).not.toMatch(/telemetria|eventos/);
      expect(r).not.toMatch(/topic\/motos\/\*"/);
      expect(r).not.toMatch(/shadow\/\*"/);
    }
    const data = stmts.find((s) => toList(s.Action).includes('iot:GetThingShadow'));
    expect(toList(data.Action).sort()).toEqual(['iot:GetThingShadow', 'iot:UpdateThingShadow']);
  });

  it('QA-19: the Mercado Pago webhook secret is generated, never the literal CHANGE_ME', () => {
    const secret = Object.values(t().findResources('AWS::SecretsManager::Secret')).find((r: any) => r.Properties.Name === 'volti/dev/app') as any;
    const gen = secret.Properties.GenerateSecretString;
    expect(gen.GenerateStringKey).toBe('MERCADOPAGO_WEBHOOK_SECRET');
    expect(gen.PasswordLength).toBeGreaterThanOrEqual(32);
    expect(JSON.parse(gen.SecretStringTemplate)).not.toHaveProperty('MERCADOPAGO_WEBHOOK_SECRET');
  });

  describe('QA-02: container env and secrets match what services/api reads', () => {
    const container = () => {
      const td = Object.values(t().findResources('AWS::ECS::TaskDefinition'))[0] as any;
      return td.Properties.ContainerDefinitions[0];
    };
    const REQUIRED_ENV = [
      'NODE_ENV', 'PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'REDIS_URL',
      'S3_BUCKET_KYC', 'S3_BUCKET_RETURN_PHOTOS', 'S3_BUCKET_REPORTS', 'S3_BUCKET_ATTACHMENTS',
      'AUTH_MODE', 'COGNITO_CUSTOMER_POOL_ID', 'COGNITO_CUSTOMER_CLIENT_ID', 'COGNITO_STAFF_POOL_ID', 'COGNITO_STAFF_CLIENT_ID',
      'IOT_MODE', 'GEOFENCE_MODE', 'LOCATION_TRACKER_NAME', 'LOCATION_GEOFENCE_COLLECTION',
      'QUEUE_MODE', 'SQS_QUEUE_TELEMETRIA_URL', 'SQS_QUEUE_PAGAMENTOS_WEBHOOK_URL', 'SQS_QUEUE_ALERTAS_URL',
      'STORAGE_MODE', 'PAYMENT_PROVIDER', 'INSURANCE_PROVIDER', 'KYC_PROVIDER', 'PUSH_MODE',
      'TRACK_RETENTION_DAYS', 'OUT_OF_AREA_LOCK_MINUTES', 'AWS_REGION',
    ];
    const REQUIRED_SECRETS = ['DB_USER', 'DB_PASSWORD', 'IOT_ENDPOINT', 'MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET'];

    it('has exactly the expected env vars and secrets', () => {
      expect(container().Environment.map((e: any) => e.Name).sort()).toEqual([...REQUIRED_ENV].sort());
      expect(container().Secrets.map((e: any) => e.Name).sort()).toEqual([...REQUIRED_SECRETS].sort());
    });

    it('uses values the API understands', () => {
      const v = (n: string) => container().Environment.find((e: any) => e.Name === n).Value;
      expect(v('QUEUE_MODE')).toBe('sqs');
      expect(v('STORAGE_MODE')).toBe('s3');
      expect(v('AUTH_MODE')).toBe('cognito');
      expect(v('IOT_MODE')).toBe('aws');
      expect(v('GEOFENCE_MODE')).toBe('aws');
    });

    it('every name is read somewhere in services/api (src or scripts)', () => {
      const root = join(__dirname, '..', '..', 'services', 'api');
      const files: string[] = [];
      const walk = (d: string) => {
        for (const f of readdirSync(d)) {
          const p = join(d, f);
          if (statSync(p).isDirectory()) walk(p);
          else if (/\.(ts|mjs)$/.test(f) && !/\.spec\.ts$/.test(f)) files.push(p);
        }
      };
      walk(join(root, 'src'));
      walk(join(root, 'scripts'));
      const text = files.map((f) => readFileSync(f, 'utf8')).join(' ');
      for (const name of [...REQUIRED_ENV, ...REQUIRED_SECRETS]) expect({ name, found: text.includes(name) }).toEqual({ name, found: true });
    });
  });
});
