import { stacksFor, templateOf } from './helpers';

describe('NetworkStack', () => {
  it('dev has no NAT gateway, prod has 2', () => {
    templateOf(stacksFor('dev').network).resourceCountIs('AWS::EC2::NatGateway', 0);
    templateOf(stacksFor('prod').network).resourceCountIs('AWS::EC2::NatGateway', 2);
  });

  it('uses 2 AZs with public and private subnets (4 subnets)', () => {
    templateOf(stacksFor('dev').network).resourceCountIs('AWS::EC2::Subnet', 4);
    templateOf(stacksFor('prod').network).resourceCountIs('AWS::EC2::Subnet', 4);
  });

  it('publishes vpc/id to SSM under /volti/<env>/', () => {
    templateOf(stacksFor('dev').network).hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/volti/dev/vpc/id',
    });
  });
});

describe('tags', () => {
  it.each(['dev', 'prod'] as const)('every taggable resource carries projeto and ambiente (%s)', (env) => {
    const s = stacksFor(env);
    const expected = expect.arrayContaining([
      { Key: 'ambiente', Value: env },
      { Key: 'projeto', Value: 'volti' },
    ]);
    const checks: [any, string][] = [
      [s.network, 'AWS::EC2::VPC'],
      ...(env === 'prod' ? ([[s.network, 'AWS::EC2::NatGateway']] as [any, string][]) : []),
      [s.data, 'AWS::RDS::DBInstance'],
      [s.data, 'AWS::S3::Bucket'],
      [s.data, 'AWS::ElastiCache::ReplicationGroup'],
      [s.auth, 'AWS::Cognito::UserPool'],
      [s.messaging, 'AWS::SQS::Queue'],
      [s.api, 'AWS::ECS::Cluster'],
      [s.api, 'AWS::ElasticLoadBalancingV2::LoadBalancer'],
      [s.adminWeb, 'AWS::S3::Bucket'],
      [s.adminWeb, 'AWS::CloudFront::Distribution'],
      ...(s.waf ? ([[s.waf, 'AWS::WAFv2::WebACL']] as [any, string][]) : []),
    ];
    for (const [stack, type] of checks) {
      const resources = templateOf(stack).findResources(type);
      expect(Object.keys(resources).length).toBeGreaterThan(0);
      for (const r of Object.values(resources) as any[]) {
        const tags = r.Properties.Tags ?? r.Properties.UserPoolTags;
        if (Array.isArray(tags)) expect(tags).toEqual(expected); else expect(tags).toEqual({ ambiente: env, projeto: 'volti' });
      }
    }
  });
});
