import { Match, Template } from 'aws-cdk-lib/assertions';
import { createVoltiApp } from '../lib/volti-app';
import { stacksFor, templateOf } from './helpers';

const alarms = (t: Template) => Object.values(t.findResources('AWS::CloudWatch::Alarm')) as any[];
const named = (t: Template, env: string, id: string) => alarms(t).find((a) => a.Properties.AlarmName === `volti-${env}-${id}`)?.Properties;

describe('ObservabilityStack', () => {
  // Full alarm set: prod (dev keeps only the essential ones, see dev-profile.test.ts).
  const t = () => templateOf(stacksFor('prod').observability);

  it('prod budget is 1500 USD monthly (80/100% actual, 100% forecast)', () => {
    t().hasResourceProperties('AWS::Budgets::Budget', {
      Budget: Match.objectLike({
        BudgetType: 'COST',
        TimeUnit: 'MONTHLY',
        BudgetLimit: { Amount: 1500, Unit: 'USD' },
      }),
    });
    const b = Object.values(t().findResources('AWS::Budgets::Budget'))[0] as any;
    expect(b.Properties.NotificationsWithSubscribers.map((n: any) => [n.Notification.NotificationType, n.Notification.Threshold])).toEqual([
      ['ACTUAL', 80],
      ['ACTUAL', 100],
      ['FORECASTED', 100],
    ]);
  });

  it('has alarms for API 5xx, DLQ messages (5 queues) and RDS CPU', () => {
    t().hasResourceProperties('AWS::CloudWatch::Alarm', { MetricName: 'HTTPCode_Target_5XX_Count' });
    t().hasResourceProperties('AWS::CloudWatch::Alarm', { MetricName: 'CPUUtilization', Namespace: 'AWS/RDS' });
    const dlq = alarms(t()).filter((a) => a.Properties.MetricName === 'ApproximateNumberOfMessagesVisible');
    expect(dlq).toHaveLength(5);
    expect(named(t(), 'prod', 'StationsDlq')).toBeDefined();
    expect(JSON.stringify(named(t(), 'prod', 'StationsForwarderDlq').Dimensions)).toMatch(/StationsForwarderDlq/);
  });

  it('age of the oldest message on the telemetry and stations queues', () => {
    const tel = named(t(), 'prod', 'TelemetryQueueAge');
    const st = named(t(), 'prod', 'StationsQueueAge');
    for (const a of [tel, st]) {
      expect(a.MetricName).toBe('ApproximateAgeOfOldestMessage');
      expect(a.ComparisonOperator).toBe('GreaterThanOrEqualToThreshold');
      expect(a.AlarmActions).toHaveLength(1);
    }
    expect(JSON.stringify(tel.Dimensions)).toMatch(/TelemetryQueue/);
    expect(JSON.stringify(st.Dimensions)).toMatch(/StationsQueue/);
    expect(tel.Threshold).toBe(60);
    expect(st.Threshold).toBe(30);
  });

  it('IoT rule errors (metric filter) and forwarder Lambda errors', () => {
    const rule = named(t(), 'prod', 'IotRuleErrors');
    expect(rule).toEqual(expect.objectContaining({ Namespace: 'Volti/prod', MetricName: 'IotRuleErrors', Statistic: 'Sum', Threshold: 1 }));
    const iterator = named(t(), 'prod', 'StationStreamIteratorAge');
    expect(iterator).toEqual(expect.objectContaining({ Namespace: 'AWS/Lambda', MetricName: 'IteratorAge', Statistic: 'Maximum', Threshold: 30000 }));
    for (const id of ['StationForwarderErrors', 'PresenceForwarderErrors']) {
      const a = named(t(), 'prod', id);
      expect(a.Namespace).toBe('AWS/Lambda');
      expect(a.MetricName).toBe('Errors');
    }
  });

  it('healthy ECS tasks below the minimum: muted while the service runs 0 tasks', () => {
    const a = named(t(), 'prod', 'ApiHealthyTasks');
    expect(a.MetricName).toBe('HealthyHostCount');
    expect(a.Statistic).toBe('Minimum');
    expect(a.ComparisonOperator).toBe('LessThanThreshold');
    expect(a.TreatMissingData).toBe('breaching');
    expect(a.ActionsEnabled).toBe(false);
  });

  it('healthy ECS tasks alarm notifies once the service runs (threshold = min tasks)', () => {
    const app = createVoltiApp({ envName: 'prod', apiDesiredCount: 2, apiDomainName: 'api.volti.example' });
    const a = named(Template.fromStack(app.observability), 'prod', 'ApiHealthyTasks');
    expect(a.ActionsEnabled).toBe(true);
    expect(a.Threshold).toBe(2);
  });

  it('RDS free storage and connections', () => {
    const storage = named(t(), 'prod', 'RdsFreeStorage');
    expect(storage.MetricName).toBe('FreeStorageSpace');
    expect(storage.ComparisonOperator).toBe('LessThanThreshold');
    expect(storage.Threshold).toBe(10 * 1024 ** 3); // 10% of 100 GB
    const conns = named(t(), 'prod', 'RdsConnections');
    expect(conns.MetricName).toBe('DatabaseConnections');
    expect(conns.Threshold).toBe(360);
  });

  it('Redis memory per node (2 in prod; none in dev, essential alarms only)', () => {
    const redis = (env: 'dev' | 'prod') =>
      alarms(templateOf(stacksFor(env).observability)).filter((a) => a.Properties.MetricName === 'DatabaseMemoryUsagePercentage');
    expect(redis('dev')).toHaveLength(0);
    expect(redis('prod')).toHaveLength(2);
    const a = redis('prod')[1].Properties;
    expect(a.Namespace).toBe('AWS/ElastiCache');
    expect(a.Threshold).toBe(80);
    expect(JSON.stringify(a.Dimensions)).toMatch(/CacheClusterId.*-002|002/);
  });

  it('API log groups have retention', () => {
    for (const env of ['dev', 'prod'] as const) {
      const logs = Object.values(templateOf(stacksFor(env).api).findResources('AWS::Logs::LogGroup')) as any[];
      expect(logs.length).toBeGreaterThan(0);
      for (const l of logs) expect(l.Properties.RetentionInDays).toBeGreaterThan(0);
    }
  });
});
