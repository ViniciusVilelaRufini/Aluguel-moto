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
});
