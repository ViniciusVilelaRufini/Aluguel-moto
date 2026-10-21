import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { publishParam } from '../ssm';

export interface QueueWithDlq {
  queue: sqs.Queue;
  dlq: sqs.Queue;
}

export interface MessagingStackProps extends StackProps {
  cfg: EnvConfig;
}

export class MessagingStack extends Stack {
  public readonly telemetry: QueueWithDlq;
  public readonly paymentsWebhook: QueueWithDlq;
  public readonly alerts: QueueWithDlq;
  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: MessagingStackProps) {
    super(scope, id, props);
    const { cfg } = props;

    const make = (key: string, name: string, visibilitySeconds: number): QueueWithDlq => {
      const dlq = new sqs.Queue(this, `${key}Dlq`, {
        queueName: `volti-${cfg.name}-${name}-dlq`,
        retentionPeriod: Duration.days(cfg.dlqRetentionDays),
        encryption: sqs.QueueEncryption.SQS_MANAGED,
        enforceSSL: true,
      });
      const queue = new sqs.Queue(this, `${key}Queue`, {
        queueName: `volti-${cfg.name}-${name}`,
        visibilityTimeout: Duration.seconds(visibilitySeconds),
        retentionPeriod: Duration.days(4),
        encryption: sqs.QueueEncryption.SQS_MANAGED,
        enforceSSL: true,
        deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
      });
      return { queue, dlq };
    };

    this.telemetry = make('Telemetry', 'telemetry', 60);
    this.paymentsWebhook = make('PaymentsWebhook', 'payments-webhook', 120);
    this.alerts = make('Alerts', 'alerts', 60);

    this.eventBus = new events.EventBus(this, 'Bus', { eventBusName: `volti-${cfg.name}` });

    publishParam(this, cfg.name, 'sqs/telemetry-url', this.telemetry.queue.queueUrl);
    publishParam(this, cfg.name, 'sqs/payments-webhook-url', this.paymentsWebhook.queue.queueUrl);
    publishParam(this, cfg.name, 'sqs/alerts-url', this.alerts.queue.queueUrl);
  }
}
