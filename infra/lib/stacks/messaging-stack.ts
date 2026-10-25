import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
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

/** Presence events put on the bus by the IoT presence forwarder (iot-stack). */
export const PRESENCE_EVENT = { source: 'volti.iot', detailType: 'iot.presence' } as const;

export class MessagingStack extends Stack {
  public readonly telemetry: QueueWithDlq;
  public readonly paymentsWebhook: QueueWithDlq;
  public readonly alerts: QueueWithDlq;
  /** FIFO (MessageGroupId = station thing): the API refuses a stations queue whose URL does not end in .fifo. */
  public readonly stations: QueueWithDlq;
  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: MessagingStackProps) {
    super(scope, id, props);
    const { cfg } = props;

    const make = (key: string, name: string, visibilitySeconds: number, fifo = false): QueueWithDlq => {
      const suffix = fifo ? '.fifo' : '';
      const fifoProps = fifo ? { fifo: true, contentBasedDeduplication: true } : {};
      const dlq = new sqs.Queue(this, `${key}Dlq`, {
        queueName: `volti-${cfg.name}-${name}-dlq${suffix}`,
        retentionPeriod: Duration.days(cfg.dlqRetentionDays),
        encryption: sqs.QueueEncryption.SQS_MANAGED,
        enforceSSL: true,
        ...fifoProps,
      });
      const queue = new sqs.Queue(this, `${key}Queue`, {
        queueName: `volti-${cfg.name}-${name}${suffix}`,
        visibilityTimeout: Duration.seconds(visibilitySeconds),
        retentionPeriod: Duration.days(4),
        encryption: sqs.QueueEncryption.SQS_MANAGED,
        enforceSSL: true,
        deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
        ...fifoProps,
      });
      return { queue, dlq };
    };

    this.telemetry = make('Telemetry', 'telemetry', 60);
    this.paymentsWebhook = make('PaymentsWebhook', 'payments-webhook', 120);
    this.alerts = make('Alerts', 'alerts', 60);
    // Content-based dedup also absorbs QoS 1 redeliveries of the same station event (same type, swapId and ts).
    this.stations = make('Stations', 'stations', 60, true);

    this.eventBus = new events.EventBus(this, 'Bus', { eventBusName: `volti-${cfg.name}` });

    // Presence of the trackers → telemetry queue, the one the API already consumes (AwsIotTransport), as
    // { thingName, presence: "connected" | "disconnected", timestamp } (docs/decisoes.md, IoT item 12). Stations are left out.
    new events.Rule(this, 'PresenceToTelemetry', {
      ruleName: `volti-${cfg.name}-presence-to-telemetry`,
      eventBus: this.eventBus,
      description: 'Tracker presence (IoT lifecycle) to the telemetry queue',
      eventPattern: {
        source: [PRESENCE_EVENT.source],
        detailType: [PRESENCE_EVENT.detailType],
        detail: { thingName: [{ prefix: 'moto-' }], eventType: ['connected', 'disconnected'] },
      },
      targets: [
        new targets.SqsQueue(this.telemetry.queue, {
          message: events.RuleTargetInput.fromObject({
            thingName: events.EventField.fromPath('$.detail.thingName'),
            presence: events.EventField.fromPath('$.detail.eventType'),
            timestamp: events.EventField.fromPath('$.detail.timestamp'),
          }),
        }),
      ],
    });

    publishParam(this, cfg.name, 'sqs/telemetry-url', this.telemetry.queue.queueUrl);
    publishParam(this, cfg.name, 'sqs/payments-webhook-url', this.paymentsWebhook.queue.queueUrl);
    publishParam(this, cfg.name, 'sqs/alerts-url', this.alerts.queue.queueUrl);
    publishParam(this, cfg.name, 'sqs/stations-url', this.stations.queue.queueUrl);
  }
}
