import { Match } from 'aws-cdk-lib/assertions';
import { stacksFor, templateOf } from './helpers';

describe('ObservabilityStack', () => {
  it('dev budget is 100 USD monthly', () => {
    templateOf(stacksFor('dev').observability).hasResourceProperties('AWS::Budgets::Budget', {
      Budget: Match.objectLike({
        BudgetType: 'COST',
        TimeUnit: 'MONTHLY',
        BudgetLimit: { Amount: 100, Unit: 'USD' },
      }),
    });
  });

  it('has alarms for API 5xx, DLQ messages and RDS CPU', () => {
    const t = templateOf(stacksFor('dev').observability);
    t.hasResourceProperties('AWS::CloudWatch::Alarm', { MetricName: 'HTTPCode_Target_5XX_Count' });
    t.hasResourceProperties('AWS::CloudWatch::Alarm', { MetricName: 'CPUUtilization', Namespace: 'AWS/RDS' });
    const dlq = Object.values(t.findResources('AWS::CloudWatch::Alarm')).filter(
      (a: any) => a.Properties.MetricName === 'ApproximateNumberOfMessagesVisible',
    );
    expect(dlq).toHaveLength(3);
  });

  it('API log groups have retention', () => {
    for (const env of ['dev', 'prod'] as const) {
      const logs = Object.values(templateOf(stacksFor(env).api).findResources('AWS::Logs::LogGroup')) as any[];
      expect(logs.length).toBeGreaterThan(0);
      for (const l of logs) expect(l.Properties.RetentionInDays).toBeGreaterThan(0);
    }
  });
});
