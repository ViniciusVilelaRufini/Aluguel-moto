import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as destinations from 'aws-cdk-lib/aws-lambda-destinations';
import * as sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as location from 'aws-cdk-lib/aws-location';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { publishParam } from '../ssm';
import { MessagingStack, PRESENCE_EVENT } from './messaging-stack';

/** IoT policy variable resolved by AWS IoT to the name of the thing that owns the certificate. */
export const THING_VAR = '${iot:Connection.Thing.ThingName}';

export interface IotStackProps extends StackProps {
  cfg: EnvConfig;
  messaging: MessagingStack;
}

/** Least-privilege device policy: each tracker only touches motos/<its thing>/... and its own shadow. */
export function buildDevicePolicyDocument(region: string, account: string): Record<string, unknown> {
  const arn = `arn:aws:iot:${region}:${account}`;
  const motos = (leaf: string) => `motos/${THING_VAR}/${leaf}`;
  const shadow = (leaf: string) => `$aws/things/${THING_VAR}/shadow/${leaf}`;

  const publishTopics = [motos('telemetria'), motos('eventos'), shadow('update'), shadow('get')];
  const receiveTopics = [
    motos('comandos'),
    shadow('update/accepted'),
    shadow('update/rejected'),
    shadow('update/delta'),
    shadow('update/documents'),
    shadow('get/accepted'),
    shadow('get/rejected'),
  ];

  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'iot:Connect',
        Resource: `${arn}:client/${THING_VAR}`,
        // QA-16: só conecta com certificado anexado a uma thing (o clientId sozinho não basta).
        Condition: { Bool: { 'iot:Connection.Thing.IsAttached': 'true' } },
      },
      { Effect: 'Allow', Action: 'iot:Publish', Resource: publishTopics.map((t) => `${arn}:topic/${t}`) },
      { Effect: 'Allow', Action: 'iot:Receive', Resource: receiveTopics.map((t) => `${arn}:topic/${t}`) },
      { Effect: 'Allow', Action: 'iot:Subscribe', Resource: receiveTopics.map((t) => `${arn}:topicfilter/${t}`) },
      {
        Effect: 'Allow',
        Action: ['iot:GetThingShadow', 'iot:UpdateThingShadow'],
        Resource: `${arn}:thing/${THING_VAR}`,
      },
    ],
  };
}

/** Least-privilege station policy: each swap station only publishes estacoes/<its thing>/eventos and receives .../comandos. No shadow. */
export function buildStationPolicyDocument(region: string, account: string): Record<string, unknown> {
  const arn = `arn:aws:iot:${region}:${account}`;
  const events = `estacoes/${THING_VAR}/eventos`;
  const commands = `estacoes/${THING_VAR}/comandos`;
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'iot:Connect',
        Resource: `${arn}:client/${THING_VAR}`,
        Condition: { Bool: { 'iot:Connection.Thing.IsAttached': 'true' } },
      },
      { Effect: 'Allow', Action: 'iot:Publish', Resource: [`${arn}:topic/${events}`] },
      { Effect: 'Allow', Action: 'iot:Receive', Resource: [`${arn}:topic/${commands}`] },
      { Effect: 'Allow', Action: 'iot:Subscribe', Resource: [`${arn}:topicfilter/${commands}`] },
    ],
  };
}

/** Station event fields projected by the rule (packages/contracts/schemas/estacao-eventos.schema.json properties). */
const STATION_EVENT_FIELDS = ['type', 'swapId', 'slotNumber', 'serial', 'pct', 'ts'];
/**
 * Rule SQL for station events. Same rule as the trackers (security audit): the identity (`thing`) comes ONLY from the topic,
 * and the station body is nested in `payload` with the contract fields — nothing the device sends shares the level of `thing`.
 * The API reads `thing` and `payload` (station-gateways.ts); the forwarders group the FIFO by `thing`.
 */
export const STATION_EVENTS_SQL = `SELECT topic(2) AS thing, {${STATION_EVENT_FIELDS.map((f) => `'${f}': ${f}`).join(', ')}} AS payload FROM 'estacoes/+/eventos'`;

/** Kinesis partition key of the station events: the station thing, so each station's events stay in one ordered shard sequence. */
export const STATION_PARTITION_KEY = '${topic(2)}';

/**
 * Ordered path for station events (the API relies on per-station order, station-swaps.service.ts):
 *   IoT rule (Kinesis action, partition key = thing) → Kinesis stream → this Lambda through an event source mapping
 *   (one batch per shard at a time, parallelization 1) → stations.fifo with MessageGroupId = thing.
 * The IoT SQS action cannot target FIFO queues and the IoT Lambda action is asynchronous (parallel invocations, retries
 * minutes later), so neither keeps order. Records are forwarded strictly in sequence; on the first failure the handler stops
 * and reports that record, so the mapping retries from it (blocking the shard, never skipping ahead). Records already sent
 * again on a retry are absorbed by the queue's content-based deduplication (5 min). Logs no payload.
 */
export const STATION_FORWARDER = `
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const client = new SQSClient({});
const THING = /^station-[0-9a-fA-F-]{36}$/;
const warn = (msg) => console.log(JSON.stringify({ level: 'warn', msg }));
exports.handler = async (event) => {
  for (const record of (event && event.Records) || []) {
    let body;
    try {
      body = JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString('utf8'));
    } catch (e) {
      warn('station_event_invalid_json');
      continue;
    }
    const thing = body && body.thing;
    if (typeof thing !== 'string' || !THING.test(thing)) {
      warn('station_event_without_thing');
      continue;
    }
    try {
      await client.send(new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: JSON.stringify(body),
        MessageGroupId: thing,
      }));
    } catch (err) {
      console.log(JSON.stringify({ level: 'error', msg: 'station_event_forward_failed', error: err && err.name }));
      return { batchItemFailures: [{ itemIdentifier: record.kinesis.sequenceNumber }] };
    }
  }
  return { batchItemFailures: [] };
};
`;

/**
 * Dev only (stationEventsTransport 'lambda', stations are simulated): the IoT rule invokes this Lambda asynchronously with
 * the rule output (`thing` from the topic + the contract fields nested in `payload`) and it sends it to stations.fifo with MessageGroupId = thing.
 * ORDER CAVEAT: async invocations run in parallel and are retried minutes later, so two events of the same station published
 * close together may reach the FIFO inverted. A failed send throws (Lambda retries, then the on-failure destination sends the
 * event to stations-forwarder-dlq). Logs no payload.
 */
export const STATION_DIRECT_FORWARDER = `
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const client = new SQSClient({});
const THING = /^station-[0-9a-fA-F-]{36}$/;
exports.handler = async (event) => {
  const thing = event && event.thing;
  if (typeof thing !== 'string' || !THING.test(thing)) {
    console.log(JSON.stringify({ level: 'warn', msg: 'station_event_without_thing' }));
    return;
  }
  await client.send(new SendMessageCommand({
    QueueUrl: process.env.QUEUE_URL,
    MessageBody: JSON.stringify(event),
    MessageGroupId: thing,
  }));
};
`;

export const PRESENCE_FORWARDER = `
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const client = new EventBridgeClient({});
// Forwards IoT lifecycle (presence) events to EventBridge. Logs nothing about the payload.
exports.handler = async (event) => {
  await client.send(new PutEventsCommand({
    Entries: [{
      EventBusName: process.env.EVENT_BUS_NAME,
      Source: '${PRESENCE_EVENT.source}',
      DetailType: '${PRESENCE_EVENT.detailType}',
      Detail: JSON.stringify({
        thingName: event.clientId,
        eventType: event.eventType,
        timestamp: event.timestamp,
      }),
    }],
  }));
};
`;

/** Metric (namespace Volti/<env>) counting every IoT rule error written by the error action. */
export const IOT_RULE_ERRORS_METRIC = 'IotRuleErrors';

export class IotStack extends Stack {
  public readonly thingTypeName = 'moto';
  public readonly stationThingTypeName = 'estacao';
  public readonly endpointParam: ssm.StringParameter;
  public readonly trackerName: string;
  public readonly geofenceCollectionName: string;
  public readonly placeIndexName: string;
  public readonly presenceForwarder: lambda.Function;
  public readonly stationForwarder: lambda.Function;
  /** Only with stationEventsTransport 'kinesis' (prod). */
  public readonly stationStream?: kinesis.Stream;

  constructor(scope: Construct, id: string, props: IotStackProps) {
    super(scope, id, props);
    const { cfg, messaging } = props;
    const env = cfg.name;

    new iot.CfnThingType(this, 'MotoThingType', { thingTypeName: this.thingTypeName });

    new iot.CfnPolicy(this, 'MotoPolicy', {
      policyName: `volti-${env}-moto-policy`,
      policyDocument: buildDevicePolicyDocument(this.region, this.account),
    });

    // Battery swap stations (thing station-<stationId>, provisioned by infra/scripts/provision-station.ts).
    new iot.CfnThingType(this, 'StationThingType', { thingTypeName: this.stationThingTypeName });
    new iot.CfnPolicy(this, 'StationPolicy', {
      policyName: `volti-${env}-estacao-policy`,
      policyDocument: buildStationPolicyDocument(this.region, this.account),
    });

    // Rules. Every rule has the same error action (log group + metric filter, alarmed in the observability stack).
    const ruleErrors = new logs.LogGroup(this, 'RuleErrors', {
      logGroupName: `/volti/${env}/iot/rule-errors`,
      retention: cfg.logRetentionDays as logs.RetentionDays,
    });
    ruleErrors.addMetricFilter('RuleErrorCount', {
      metricNamespace: `Volti/${env}`,
      metricName: IOT_RULE_ERRORS_METRIC,
      filterPattern: logs.FilterPattern.allEvents(),
      metricValue: '1',
      defaultValue: 0,
    });
    const errorRole = new iam.Role(this, 'RuleErrorRole', { assumedBy: new iam.ServicePrincipal('iot.amazonaws.com') });
    ruleErrors.grantWrite(errorRole);
    const errorAction = { cloudwatchLogs: { logGroupName: ruleErrors.logGroupName, roleArn: errorRole.roleArn } };

    const sqsRole = new iam.Role(this, 'RuleSqsRole', { assumedBy: new iam.ServicePrincipal('iot.amazonaws.com') });
    messaging.telemetry.queue.grantSendMessages(sqsRole);

    // A identidade da moto vem SÓ do tópico (thingName); o corpo do dispositivo vai aninhado em `payload`,
    // com os campos do contrato (packages/contracts/schemas) — nada que o dispositivo envie divide o nível de thingName.
    // Eventos seguem pela fila de telemetria (`channel` = topic(3) discrimina), o mesmo caminho do modo local.
    const projection = (fields: string[]) => `{${fields.map((f) => `'${f}': ${f}`).join(', ')}}`;
    const ruleSql = (leaf: string, fields: string[]) =>
      `SELECT topic(2) AS thingName, topic(3) AS channel, timestamp() AS ingestedAt, ${projection(fields)} AS payload FROM 'motos/+/${leaf}'`;
    const telemetryFields = ['lat', 'lng', 'velocidade_kmh', 'bateria_pct', 'travada', 'ignicao', 'sinal', 'timestamp'];
    const eventFields = ['tipo', 'timestamp'];
    const toTelemetryQueue = [{ sqs: { queueUrl: messaging.telemetry.queue.queueUrl, roleArn: sqsRole.roleArn, useBase64: false } }];
    new iot.CfnTopicRule(this, 'TelemetryRule', {
      ruleName: `volti_${env}_telemetry`,
      topicRulePayload: {
        sql: ruleSql('telemetria', telemetryFields),
        awsIotSqlVersion: '2016-03-23',
        ruleDisabled: false,
        actions: toTelemetryQueue,
        errorAction,
      },
    });
    // Tracker events go to the telemetry queue: the API (AwsIotTransport) tells them apart by the `tipo` field and turns them
    // into alerts with vehicle, rental and position (a thingName → vehicleId lookup that IoT SQL cannot do). The `alertas`
    // queue keeps the CreateAlertInput format for producers other than the trackers.
    new iot.CfnTopicRule(this, 'DeviceEventsRule', {
      ruleName: `volti_${env}_device_events`,
      topicRulePayload: {
        sql: ruleSql('eventos', eventFields),
        awsIotSqlVersion: '2016-03-23',
        ruleDisabled: false,
        actions: toTelemetryQueue,
        errorAction,
      },
    });

    if (cfg.stationEventsTransport === 'kinesis') {
      const ordered = this.createOrderedStationPath(cfg, messaging, errorAction);
      this.stationStream = ordered.stream;
      this.stationForwarder = ordered.forwarder;
    } else {
      this.stationForwarder = this.createDirectStationPath(cfg, messaging, errorAction);
    }

    // IoT rules have no native EventBridge action, so a tiny Lambda forwards presence events to the bus; an EventBridge
    // rule (messaging stack) delivers the trackers' ones to the telemetry queue.
    const forwarderLogs = new logs.LogGroup(this, 'PresenceForwarderLogs', {
      retention: cfg.logRetentionDays as logs.RetentionDays,
    });
    this.presenceForwarder = new lambda.Function(this, 'PresenceForwarder', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(PRESENCE_FORWARDER),
      environment: { EVENT_BUS_NAME: messaging.eventBus.eventBusName },
      logGroup: forwarderLogs,
    });
    messaging.eventBus.grantPutEventsTo(this.presenceForwarder);
    const presenceRule = new iot.CfnTopicRule(this, 'PresenceRule', {
      ruleName: `volti_${env}_presence`,
      topicRulePayload: {
        sql: "SELECT * FROM '$aws/events/presence/+/+'",
        awsIotSqlVersion: '2016-03-23',
        ruleDisabled: false,
        actions: [{ lambda: { functionArn: this.presenceForwarder.functionArn } }],
        errorAction,
      },
    });
    this.presenceForwarder.addPermission('InvokeFromIot', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      sourceArn: presenceRule.attrArn,
    });

    // Amazon Location
    this.trackerName = `volti-${env}-tracker`;
    this.geofenceCollectionName = `volti-${env}-geofences`;
    this.placeIndexName = `volti-${env}-places`;
    new location.CfnTracker(this, 'Tracker', {
      trackerName: this.trackerName,
      description: 'Volti vehicle positions',
    });
    new location.CfnGeofenceCollection(this, 'Geofences', {
      collectionName: this.geofenceCollectionName,
      description: 'Volti zones',
    });
    // Reverse geocoding of the vehicle address (GEOCODER_MODE=aws). The API caches results in Redis, hence IntendedUse=Storage.
    new location.CfnPlaceIndex(this, 'PlaceIndex', {
      indexName: this.placeIndexName,
      dataSource: cfg.placeIndexDataSource,
      dataSourceConfiguration: { intendedUse: 'Storage' },
      description: 'Volti vehicle address (reverse geocoding)',
    });

    // Account/region specific data endpoint.
    const endpoint = new cr.AwsCustomResource(this, 'IotEndpoint', {
      onUpdate: {
        service: 'Iot',
        action: 'describeEndpoint',
        parameters: { endpointType: 'iot:Data-ATS' },
        physicalResourceId: cr.PhysicalResourceId.fromResponse('endpointAddress'),
      },
      installLatestAwsSdk: false,
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE }),
    });

    this.endpointParam = publishParam(this, env, 'iot/endpoint', endpoint.getResponseField('endpointAddress'));
    publishParam(this, env, 'iot/thing-type', this.thingTypeName);
    publishParam(this, env, 'iot/station-thing-type', this.stationThingTypeName);
    publishParam(this, env, 'location/tracker-name', this.trackerName);
    publishParam(this, env, 'location/geofence-collection', this.geofenceCollectionName);
    publishParam(this, env, 'location/place-index', this.placeIndexName);
  }

  /** Prod: rule → Kinesis (partition key = thing) → Lambda (event source mapping, one batch per shard) → stations FIFO. See STATION_FORWARDER. */
  private createOrderedStationPath(
    cfg: EnvConfig,
    messaging: MessagingStack,
    errorAction: iot.CfnTopicRule.ActionProperty,
  ): { stream: kinesis.Stream; forwarder: lambda.Function } {
    const env = cfg.name;
    // Station events, ordered per station: rule → Kinesis (partition key = thing) → Lambda (event source mapping, one
    // batch per shard at a time) → stations FIFO queue (MessageGroupId = thing). See STATION_FORWARDER.
    const stream = new kinesis.Stream(this, 'StationEventsStream', {
      streamName: `volti-${env}-station-events`,
      streamMode: kinesis.StreamMode.PROVISIONED,
      shardCount: cfg.stationStreamShards,
      // 24 h (no extended-retention cost): the window to replay a record reported in the forwarder DLQ.
      retentionPeriod: Duration.hours(24),
      encryption: kinesis.StreamEncryption.MANAGED,
    });
    const kinesisRole = new iam.Role(this, 'RuleKinesisRole', { assumedBy: new iam.ServicePrincipal('iot.amazonaws.com') });
    stream.grantWrite(kinesisRole);
    new iot.CfnTopicRule(this, 'StationEventsRule', {
      ruleName: `volti_${env}_station_events`,
      topicRulePayload: {
        sql: STATION_EVENTS_SQL,
        awsIotSqlVersion: '2016-03-23',
        ruleDisabled: false,
        actions: [{ kinesis: { streamName: stream.streamName, partitionKey: STATION_PARTITION_KEY, roleArn: kinesisRole.roleArn } }],
        errorAction,
      },
    });

    const stationForwarderLogs = new logs.LogGroup(this, 'StationForwarderLogs', {
      retention: cfg.logRetentionDays as logs.RetentionDays,
    });
    const forwarder = new lambda.Function(this, 'StationForwarder', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(STATION_FORWARDER),
      environment: { QUEUE_URL: messaging.stations.queue.queueUrl },
      logGroup: stationForwarderLogs,
      timeout: Duration.seconds(30),
    });
    messaging.stations.queue.grantSendMessages(forwarder);
    forwarder.addEventSource(
      new sources.KinesisEventSource(stream, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 10,
        // Order: one concurrent batch per shard, retries from the failed record (never skipping ahead).
        parallelizationFactor: 1,
        bisectBatchOnError: false,
        reportBatchItemFailures: true,
        retryAttempts: 50,
        // Past this a swap has long timed out; the record goes to the DLQ (metadata: shard + sequence numbers).
        maxRecordAge: Duration.hours(1),
        onFailure: new sources.SqsDlq(messaging.stationsForwarderDlq),
      }),
    );
    return { stream, forwarder };
  }

  /** Dev: rule → async Lambda → stations FIFO (no Kinesis shard; order not guaranteed, see STATION_DIRECT_FORWARDER). */
  private createDirectStationPath(cfg: EnvConfig, messaging: MessagingStack, errorAction: iot.CfnTopicRule.ActionProperty): lambda.Function {
    const env = cfg.name;
    const logGroup = new logs.LogGroup(this, 'StationForwarderLogs', {
      retention: cfg.logRetentionDays as logs.RetentionDays,
    });
    const forwarder = new lambda.Function(this, 'StationForwarder', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(STATION_DIRECT_FORWARDER),
      environment: { QUEUE_URL: messaging.stations.queue.queueUrl },
      logGroup,
      timeout: Duration.seconds(30),
      retryAttempts: 2,
      maxEventAge: Duration.hours(1),
      onFailure: new destinations.SqsDestination(messaging.stationsForwarderDlq),
    });
    messaging.stations.queue.grantSendMessages(forwarder);
    const rule = new iot.CfnTopicRule(this, 'StationEventsRule', {
      ruleName: `volti_${env}_station_events`,
      topicRulePayload: {
        sql: STATION_EVENTS_SQL,
        awsIotSqlVersion: '2016-03-23',
        ruleDisabled: false,
        actions: [{ lambda: { functionArn: forwarder.functionArn } }],
        errorAction,
      },
    });
    forwarder.addPermission('InvokeFromIot', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      sourceArn: rule.attrArn,
    });
    return forwarder;
  }
}
