import { Duration, Fn, Stack, StackProps } from 'aws-cdk-lib';
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
import { IOT_RULE_ERRORS_METRIC, IotStack } from './iot-stack';
import { MessagingStack } from './messaging-stack';

export interface ObservabilityStackProps extends StackProps {
  cfg: EnvConfig;
  api: ApiStack;
  data: DataStack;
  messaging: MessagingStack;
  iot: IotStack;
  alarmEmail?: string;
}

export class ObservabilityStack extends Stack {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);
    const { cfg, api, data, messaging, iot, alarmEmail } = props;

    this.alarmTopic = new sns.Topic(this, 'Alarms', { topicName: `volti-${cfg.name}-alarms`, enforceSSL: true });
    if (alarmEmail) this.alarmTopic.addSubscription(new subs.EmailSubscription(alarmEmail));
    const action = new cwActions.SnsAction(this.alarmTopic);

    const alarm = (
      id: string,
      metric: cloudwatch.IMetric,
      threshold: number,
      evaluationPeriods: number,
      description: string,
      opts: { comparisonOperator?: cloudwatch.ComparisonOperator; treatMissingData?: cloudwatch.TreatMissingData; actionsEnabled?: boolean } = {},
    ) => {
      const a = new cloudwatch.Alarm(this, id, {
        alarmName: `volti-${cfg.name}-${id}`,
        alarmDescription: description,
        metric,
        threshold,
        evaluationPeriods,
        comparisonOperator: opts.comparisonOperator ?? cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: opts.treatMissingData ?? cloudwatch.TreatMissingData.NOT_BREACHING,
        actionsEnabled: opts.actionsEnabled ?? true,
      });
      a.addAlarmAction(action);
      return a;
    };
    const below = cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;

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
      ['StationsDlq', messaging.stations.dlq],
      ['StationsForwarderDlq', messaging.stationsForwarderDlq],
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

    // Queue lag: the API is not keeping up (or is down) with tracker telemetry / station events.
    const oldest = (q: typeof messaging.telemetry.queue) =>
      q.metricApproximateAgeOfOldestMessage({ period: Duration.minutes(1), statistic: 'Maximum' });
    alarm('TelemetryQueueAge', oldest(messaging.telemetry.queue), cfg.telemetryQueueAgeAlarmSeconds, 3, 'Oldest telemetry message is too old (API consumers behind or down)');
    alarm('StationsQueueAge', oldest(messaging.stations.queue), cfg.stationsQueueAgeAlarmSeconds, 2, 'Oldest station event is too old (battery swaps will time out)');

    // IoT: rule errors (error action → log group → metric filter) and the forwarder Lambdas (async invocations the rule cannot see fail).
    alarm(
      'IotRuleErrors',
      new cloudwatch.Metric({ namespace: `Volti/${cfg.name}`, metricName: IOT_RULE_ERRORS_METRIC, period: Duration.minutes(5), statistic: 'Sum' }),
      1,
      1,
      'IoT rule actions are failing (see /volti/<env>/iot/rule-errors)',
    );
    // Station stream consumer falling behind (records waiting in Kinesis = station events not yet in the FIFO queue).
    alarm(
      'StationStreamIteratorAge',
      iot.stationForwarder.metric('IteratorAge', { period: Duration.minutes(1), statistic: 'Maximum' }),
      cfg.stationsQueueAgeAlarmSeconds * 1000,
      2,
      'Station events are waiting in the Kinesis stream (forwarder behind or failing)',
    );
    alarm('StationForwarderErrors', iot.stationForwarder.metricErrors({ period: Duration.minutes(5), statistic: 'Sum' }), 1, 1, 'Station events are not reaching the FIFO queue');
    alarm('PresenceForwarderErrors', iot.presenceForwarder.metricErrors({ period: Duration.minutes(5), statistic: 'Sum' }), 1, 1, 'Tracker presence events are not reaching EventBridge');

    // ECS: healthy tasks behind the ALB below the minimum. Missing data = no healthy target. Notifications stay off while the
    // service is deployed with 0 tasks (first deploy, before the image exists).
    alarm(
      'ApiHealthyTasks',
      api.service.targetGroup.metrics.healthyHostCount({ period: Duration.minutes(1), statistic: 'Minimum' }),
      Math.max(api.minHealthyTasks, 1),
      3,
      'Healthy API tasks below the minimum',
      { comparisonOperator: below, treatMissingData: cloudwatch.TreatMissingData.BREACHING, actionsEnabled: api.minHealthyTasks > 0 },
    );

    // RDS: free storage below 10% of the allocated size, and connections close to max_connections.
    alarm(
      'RdsFreeStorage',
      data.db.metricFreeStorageSpace({ period: Duration.minutes(5), statistic: 'Minimum' }),
      cfg.dbAllocatedGb * 0.1 * 1024 ** 3,
      2,
      'RDS free storage below 10% of the allocated size',
      { comparisonOperator: below },
    );
    alarm('RdsConnections', data.db.metricDatabaseConnections({ period: Duration.minutes(5), statistic: 'Maximum' }), cfg.dbConnectionsAlarm, 2, 'RDS connections close to max_connections');

    // Redis: memory of each node (member clusters of the replication group are <id>-001, <id>-002, ...).
    for (let i = 1; i <= cfg.redisNodes; i++) {
      const node = String(i).padStart(3, '0');
      alarm(
        `RedisMemory${node}`,
        new cloudwatch.Metric({
          namespace: 'AWS/ElastiCache',
          metricName: 'DatabaseMemoryUsagePercentage',
          dimensionsMap: { CacheClusterId: Fn.join('-', [data.redis.ref, node]) },
          period: Duration.minutes(5),
          statistic: 'Maximum',
        }),
        80,
        2,
        `Redis node ${node} memory above 80%`,
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
