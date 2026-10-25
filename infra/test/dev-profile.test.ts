import { Match, Template } from 'aws-cdk-lib/assertions';
import { getConfig } from '../lib/config';
import { STATION_DIRECT_FORWARDER } from '../lib/stacks/iot-stack';
import { createVoltiApp } from '../lib/volti-app';
import { stacksFor, templateOf } from './helpers';

/** Minimum-cost dev profile (lacunas T20, docs/decisoes.md): keeps the architecture, cuts the fixed costs. */
describe('dev profile (minimum cost)', () => {
  const dev = () => stacksFor('dev');
  // Service running (after the first image push): -c apiDesiredCount=1, plus the budget e-mail from context.
  const running = createVoltiApp({ envName: 'dev', apiDesiredCount: 1, budgetEmail: 'orcamento@example.com' });
  const resources = (t: Template, type: string) => Object.values(t.findResources(type)) as any[];

  it('VPC without NAT: public + isolated subnets, isolated ones with no default route, S3 gateway endpoint only', () => {
    const t = templateOf(dev().network);
    t.resourceCountIs('AWS::EC2::NatGateway', 0);
    t.resourceCountIs('AWS::EC2::EIP', 0);
    const subnets = resources(t, 'AWS::EC2::Subnet');
    expect(subnets).toHaveLength(4);
    const names = subnets.map((s) => s.Properties.Tags.find((x: any) => x.Key === 'aws-cdk:subnet-name').Value).sort();
    expect(names).toEqual(['isolated', 'isolated', 'public', 'public']);
    // Only the 2 public route tables have a default route (to the internet gateway).
    const routes = resources(t, 'AWS::EC2::Route');
    expect(routes).toHaveLength(2);
    for (const r of routes) {
      expect(r.Properties.GatewayId).toBeDefined();
      expect(r.Properties.NatGatewayId).toBeUndefined();
    }
    const endpoints = resources(t, 'AWS::EC2::VPCEndpoint');
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].Properties.VpcEndpointType ?? 'Gateway').toBe('Gateway');
    expect(JSON.stringify(endpoints[0].Properties.ServiceName)).toMatch(/s3/);
  });

  it('API: 1 task (min 1, max 2), 0.25 vCPU / 0.5 GB on Fargate Spot, public subnet with public IP, reachable only from the ALB', () => {
    const t = Template.fromStack(running.api);
    const svc = resources(t, 'AWS::ECS::Service')[0];
    expect(svc.Properties.DesiredCount).toBe(1);
    expect(svc.Properties.LaunchType).toBeUndefined();
    expect(svc.Properties.CapacityProviderStrategy).toEqual([{ CapacityProvider: 'FARGATE_SPOT', Weight: 1 }]);
    const net = svc.Properties.NetworkConfiguration.AwsvpcConfiguration;
    expect(net.AssignPublicIp).toBe('ENABLED');
    expect(JSON.stringify(net.Subnets)).toMatch(/publicSubnet1/);
    expect(JSON.stringify(net.Subnets)).not.toMatch(/isolated|private/i);
    // The service waits for the cluster's capacity provider association (FARGATE_SPOT).
    const assoc = Object.keys(t.findResources('AWS::ECS::ClusterCapacityProviderAssociations'));
    expect(assoc).toHaveLength(1);
    expect(svc.DependsOn).toEqual(expect.arrayContaining(assoc));
    t.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', { MinCapacity: 1, MaxCapacity: 2 });
    t.hasResourceProperties('AWS::ECS::TaskDefinition', { Cpu: '256', Memory: '512' });
    t.hasResourceProperties('AWS::ECS::Cluster', { ClusterSettings: [{ Name: 'containerInsights', Value: 'disabled' }] });

    // Task security group: no inline ingress; the single ingress rule comes from the ALB security group on the container port.
    const sgId = svc.Properties.NetworkConfiguration.AwsvpcConfiguration.SecurityGroups[0]['Fn::GetAtt'][0];
    expect(t.toJSON().Resources[sgId].Properties.SecurityGroupIngress).toBeUndefined();
    const ingress = resources(t, 'AWS::EC2::SecurityGroupIngress').filter((i) => i.Properties.GroupId['Fn::GetAtt']?.[0] === sgId);
    expect(ingress).toHaveLength(1);
    expect(ingress[0].Properties).toEqual(expect.objectContaining({ FromPort: 3000, ToPort: 3000, IpProtocol: 'tcp' }));
    expect(ingress[0].Properties.SourceSecurityGroupId['Fn::GetAtt'][0]).toMatch(/LBSecurityGroup/);
    expect(ingress[0].Properties.CidrIp).toBeUndefined();
  });

  it('ECR keeps 10 images in dev (30 in prod)', () => {
    const policy = (env: 'dev' | 'prod') => JSON.parse(resources(templateOf(stacksFor(env).api), 'AWS::ECR::Repository')[0].Properties.LifecyclePolicy.LifecyclePolicyText);
    expect(policy('dev').rules[0].selection.countNumber).toBe(10);
    expect(policy('prod').rules[0].selection.countNumber).toBe(30);
  });

  it('no WAF at all: no us-east-1 stack, no regional ACL, CloudFront without WebACLId', () => {
    expect(dev().waf).toBeUndefined();
    expect(dev().app.node.tryFindChild('volti-dev-waf')).toBeUndefined();
    templateOf(dev().api).resourceCountIs('AWS::WAFv2::WebACL', 0);
    templateOf(dev().api).resourceCountIs('AWS::WAFv2::WebACLAssociation', 0);
    templateOf(dev().adminWeb).hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({ WebACLId: Match.absent() }),
    });
  });

  it('no Kinesis: station events go rule → async Lambda → stations.fifo, failures to stations-forwarder-dlq', () => {
    const t = templateOf(dev().iot);
    t.resourceCountIs('AWS::Kinesis::Stream', 0);
    t.resourceCountIs('AWS::Lambda::EventSourceMapping', 0);
    expect(dev().iot.stationStream).toBeUndefined();
    const rule = resources(t, 'AWS::IoT::TopicRule').find((r) => r.Properties.RuleName === 'volti_dev_station_events').Properties.TopicRulePayload;
    expect(rule.Actions).toHaveLength(1);
    expect(JSON.stringify(rule.Actions[0].Lambda.FunctionArn)).toMatch(/StationForwarder/);
    expect(rule.ErrorAction.CloudwatchLogs).toBeDefined();
    const fwd = resources(t, 'AWS::Lambda::Function').find((f) => f.Properties.Environment?.Variables?.QUEUE_URL);
    expect(JSON.stringify(fwd.Properties.Environment.Variables.QUEUE_URL)).toMatch(/StationsQueue/);
    const cfg = resources(t, 'AWS::Lambda::EventInvokeConfig')[0].Properties;
    expect(cfg.MaximumRetryAttempts).toBe(2);
    expect(cfg.MaximumEventAgeInSeconds).toBe(3600);
    expect(JSON.stringify(cfg.DestinationConfig.OnFailure.Destination)).toMatch(/StationsForwarderDlq/);
    // IoT may invoke both the presence and the station forwarders.
    expect(resources(t, 'AWS::Lambda::Permission')).toHaveLength(2);
  });

  describe('direct station forwarder (inline code)', () => {
    const thing = 'station-5b0e7c1a-1111-4111-8111-111111111111';
    const run = (fail = false) => {
      const sent: any[] = [];
      const logs: string[] = [];
      class SQSClient {
        async send(cmd: { input: any }) {
          if (fail) throw Object.assign(new Error('throttled'), { name: 'ThrottlingException' });
          sent.push(cmd.input);
        }
      }
      class SendMessageCommand {
        constructor(public input: unknown) {}
      }
      const exp: { handler?: (e: unknown) => Promise<void> } = {};
      new Function('require', 'exports', 'process', 'console', STATION_DIRECT_FORWARDER)(
        () => ({ SQSClient, SendMessageCommand }),
        exp,
        { env: { QUEUE_URL: 'https://sqs/q.fifo' } },
        { log: (m: string) => logs.push(m) },
      );
      return { handler: exp.handler!, sent, logs };
    };

    it('sends the event with MessageGroupId = thing and drops events without a station thing (no payload in logs)', async () => {
      const { handler, sent, logs } = run();
      const ev = { type: 'battery_returned', serial: 'BAT-1', thing };
      await handler(ev);
      await handler({ type: 'x', thing: 'moto-0001', serial: 'BAT-2' });
      expect(sent).toEqual([{ QueueUrl: 'https://sqs/q.fifo', MessageBody: JSON.stringify(ev), MessageGroupId: thing }]);
      expect(logs.join(' ')).not.toMatch(/BAT-|moto-0001/);
    });

    it('throws when the send fails, so Lambda retries and then sends the event to the DLQ', async () => {
      await expect(run(true).handler({ type: 'slot_closed', thing })).rejects.toThrow('throttled');
    });
  });

  it('RDS db.t4g.micro single-AZ, 20 GB gp3 without autoscaling, 1-day backups, no Performance Insights / enhanced monitoring, snapshot on delete', () => {
    const t = templateOf(dev().data);
    const db = resources(t, 'AWS::RDS::DBInstance')[0];
    expect(db.Properties).toEqual(
      expect.objectContaining({
        DBInstanceClass: 'db.t4g.micro',
        MultiAZ: false,
        AllocatedStorage: '20',
        StorageType: 'gp3',
        BackupRetentionPeriod: 1,
        EnablePerformanceInsights: false,
        DeletionProtection: false,
        PubliclyAccessible: false,
      }),
    );
    expect(db.Properties.MaxAllocatedStorage).toBeUndefined();
    expect(db.Properties.MonitoringInterval).toBeUndefined();
    expect(db.DeletionPolicy).toBe('Snapshot');
    expect(JSON.stringify(resources(t, 'AWS::RDS::DBSubnetGroup')[0].Properties.SubnetIds)).toMatch(/isolatedSubnet1.*isolatedSubnet2/);
  });

  it('Redis cache.t4g.micro, a single node without replicas, in the isolated subnets', () => {
    const t = templateOf(dev().data);
    t.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      CacheNodeType: 'cache.t4g.micro',
      NumCacheClusters: 1,
      AutomaticFailoverEnabled: false,
      MultiAZEnabled: false,
    });
    expect(JSON.stringify(resources(t, 'AWS::ElastiCache::SubnetGroup')[0].Properties.SubnetIds)).toMatch(/isolatedSubnet1.*isolatedSubnet2/);
  });

  it('every log group keeps 3 days', () => {
    const s = dev();
    const groups = [s.api, s.iot].flatMap((stack) => resources(templateOf(stack), 'AWS::Logs::LogGroup'));
    expect(groups.length).toBeGreaterThanOrEqual(4);
    for (const g of groups) expect(g.Properties.RetentionInDays).toBe(3);
  });

  it('only the essential alarms: API 5xx and the 5 DLQs', () => {
    const names = resources(templateOf(dev().observability), 'AWS::CloudWatch::Alarm').map((a) => a.Properties.AlarmName).sort();
    expect(names).toEqual(
      ['Api5xx', 'AlertsDlq', 'PaymentsWebhookDlq', 'StationsDlq', 'StationsForwarderDlq', 'TelemetryDlq'].map((n) => `volti-dev-${n}`).sort(),
    );
  });

  it('budget US$ 20/month with alerts at 50/80/100% of actual spend (+100% forecast), e-mail from -c budgetEmail', () => {
    const budget = (t: Template) => resources(t, 'AWS::Budgets::Budget')[0].Properties;
    const b = budget(Template.fromStack(running.observability));
    expect(b.Budget.BudgetLimit).toEqual({ Amount: 20, Unit: 'USD' });
    // Shared account: only the resources tagged projeto=volti.
    expect(b.Budget.CostFilters).toEqual({ TagKeyValue: ['user:projeto$volti'] });
    expect(b.NotificationsWithSubscribers.map((n: any) => [n.Notification.NotificationType, n.Notification.Threshold])).toEqual([
      ['ACTUAL', 50],
      ['ACTUAL', 80],
      ['ACTUAL', 100],
      ['FORECASTED', 100],
    ]);
    for (const n of b.NotificationsWithSubscribers) expect(n.Subscribers).toEqual([{ SubscriptionType: 'EMAIL', Address: 'orcamento@example.com' }]);
    // Without an e-mail the alerts go to the SNS alarm topic (no address in code).
    const noEmail = budget(templateOf(dev().observability));
    expect(noEmail.NotificationsWithSubscribers[0].Subscribers[0].SubscriptionType).toBe('SNS');
  });

  it('apiRunSeed sets RUN_SEED in dev only; prod refuses it', () => {
    const env = (app: ReturnType<typeof createVoltiApp>) =>
      resources(Template.fromStack(app.api), 'AWS::ECS::TaskDefinition')[0].Properties.ContainerDefinitions[0].Environment as { Name: string; Value: unknown }[];
    expect(env(createVoltiApp({ envName: 'dev', apiRunSeed: true })).find((e) => e.Name === 'RUN_SEED')?.Value).toBe('true');
    expect(env(running).find((e) => e.Name === 'RUN_SEED')).toBeUndefined();
    expect(() => createVoltiApp({ envName: 'prod', apiDomainName: 'api.volti.example', apiRunSeed: true })).toThrow(/apiRunSeed/);
  });

  it('prod keeps the full profile', () => {
    const p = getConfig('prod');
    expect(p).toEqual(
      expect.objectContaining({
        natGateways: 2,
        wafEnabled: true,
        stationEventsTransport: 'kinesis',
        alarms: 'full',
        apiCapacityProvider: 'FARGATE',
        dbMultiAz: true,
        logRetentionDays: 90,
      }),
    );
    expect(p.dbPerformanceInsights).toBeUndefined();
  });
});
