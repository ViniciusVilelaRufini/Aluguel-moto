import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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

/** Rule SQL for station events: the API reads the station thing from the `thing` field (station-gateways.ts). */
export const STATION_EVENTS_SQL = "SELECT *, topic(2) AS thing FROM 'estacoes/+/eventos'";

/**
 * The IoT rule SQS action cannot target FIFO queues (no MessageGroupId), so a tiny Lambda forwards each station event to the
 * FIFO queue with MessageGroupId = station thing. Deduplication is content based on the queue. Logs no payload.
 */
export const STATION_FORWARDER = `
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

    const sqlTail = 'topic(2) AS thingName, timestamp() AS ingestedAt';
    new iot.CfnTopicRule(this, 'TelemetryRule', {
      ruleName: `volti_${env}_telemetry`,
      topicRulePayload: {
        sql: `SELECT *, ${sqlTail} FROM 'motos/+/telemetria'`,
        awsIotSqlVersion: '2016-03-23',
        ruleDisabled: false,
        actions: [{ sqs: { queueUrl: messaging.telemetry.queue.queueUrl, roleArn: sqsRole.roleArn, useBase64: false } }],
        errorAction,
      },
    });
    // Tracker events go to the telemetry queue: the API (AwsIotTransport) tells them apart by the `tipo` field and turns them
    // into alerts with vehicle, rental and position (a thingName → vehicleId lookup that IoT SQL cannot do). The `alertas`
    // queue keeps the CreateAlertInput format for producers other than the trackers.
    new iot.CfnTopicRule(this, 'DeviceEventsRule', {
      ruleName: `volti_${env}_device_events`,
      topicRulePayload: {
        sql: `SELECT *, ${sqlTail} FROM 'motos/+/eventos'`,
        awsIotSqlVersion: '2016-03-23',
        ruleDisabled: false,
        actions: [{ sqs: { queueUrl: messaging.telemetry.queue.queueUrl, roleArn: sqsRole.roleArn, useBase64: false } }],
        errorAction,
      },
    });

    // Station events → Lambda → stations FIFO queue.
    const stationForwarderLogs = new logs.LogGroup(this, 'StationForwarderLogs', {
      retention: cfg.logRetentionDays as logs.RetentionDays,
    });
    this.stationForwarder = new lambda.Function(this, 'StationForwarder', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(STATION_FORWARDER),
      environment: { QUEUE_URL: messaging.stations.queue.queueUrl },
      logGroup: stationForwarderLogs,
      timeout: Duration.seconds(10),
    });
    messaging.stations.queue.grantSendMessages(this.stationForwarder);
    const stationRule = new iot.CfnTopicRule(this, 'StationEventsRule', {
      ruleName: `volti_${env}_station_events`,
      topicRulePayload: {
        sql: STATION_EVENTS_SQL,
        awsIotSqlVersion: '2016-03-23',
        ruleDisabled: false,
        actions: [{ lambda: { functionArn: this.stationForwarder.functionArn } }],
        errorAction,
      },
    });
    this.stationForwarder.addPermission('InvokeFromIot', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      sourceArn: stationRule.attrArn,
    });

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
}
