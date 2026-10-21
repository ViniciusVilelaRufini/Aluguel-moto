import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { ApiStack } from './api-stack';
import { DataStack } from './data-stack';
import { MessagingStack } from './messaging-stack';

export interface ObservabilityStackProps extends StackProps {
  cfg: EnvConfig;
  api: ApiStack;
  data: DataStack;
  messaging: MessagingStack;
  alarmEmail?: string;
}

export class ObservabilityStack extends Stack {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);
    const { cfg, api, data, messaging, alarmEmail } = props;

    this.alarmTopic = new sns.Topic(this, 'Alarms', { topicName: `volti-${cfg.name}-alarms`, enforceSSL: true });
    if (alarmEmail) this.alarmTopic.addSubscription(new subs.EmailSubscription(alarmEmail));
    const action = new cwActions.SnsAction(this.alarmTopic);

    const alarm = (id: string, metric: cloudwatch.IMetric, threshold: number, evaluationPeriods: number, description: string) => {
      const a = new cloudwatch.Alarm(this, id, {
        alarmName: `volti-${cfg.name}-${id}`,
        alarmDescription: description,
        metric,
        threshold,
        evaluationPeriods,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      a.addAlarmAction(action);
      return a;
    };

    alarm(
      'Api5xx',
      api.service.loadBalancer.metrics.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT, {
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      10,
      2,
      'API is returning 5xx responses',
    );
    alarm('RdsCpu', data.db.metricCPUUtilization({ period: Duration.minutes(5) }), 80, 3, 'RDS CPU above 80%');
    const dlqs: [string, sqsLike][] = [
      ['TelemetryDlq', messaging.telemetry.dlq],
      ['PaymentsWebhookDlq', messaging.paymentsWebhook.dlq],
      ['AlertsDlq', messaging.alerts.dlq],
    ];
    for (const [name, dlq] of dlqs) {
      alarm(
        name,
        dlq.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(5), statistic: 'Maximum' }),
        1,
        1,
        'Messages in dead-letter queue',
      );
    }

    // Budget. Sends to the e-mail when given, otherwise to the alarm topic.
    this.alarmTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal('budgets.amazonaws.com')],
        actions: ['sns:Publish'],
        resources: [this.alarmTopic.topicArn],
      }),
    );
    const subscribers: budgets.CfnBudget.SubscriberProperty[] = alarmEmail
      ? [{ subscriptionType: 'EMAIL', address: alarmEmail }]
      : [{ subscriptionType: 'SNS', address: this.alarmTopic.topicArn }];
    const notification = (threshold: number, type: 'ACTUAL' | 'FORECASTED'): budgets.CfnBudget.NotificationWithSubscribersProperty => ({
      notification: {
        notificationType: type,
        comparisonOperator: 'GREATER_THAN',
        threshold,
        thresholdType: 'PERCENTAGE',
      },
      subscribers,
    });
    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: `volti-${cfg.name}-monthly`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: cfg.budgetUsd, unit: 'USD' },
      },
      notificationsWithSubscribers: [notification(80, 'ACTUAL'), notification(100, 'ACTUAL'), notification(100, 'FORECASTED')],
    });
  }
}

type sqsLike = { metricApproximateNumberOfMessagesVisible(o?: cloudwatch.MetricOptions): cloudwatch.Metric };
