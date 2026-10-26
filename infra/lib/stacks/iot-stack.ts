import { Stack, StackProps } from 'aws-cdk-lib';
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
import { MessagingStack } from './messaging-stack';

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

const PRESENCE_FORWARDER = `
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const client = new EventBridgeClient({});
// Forwards IoT lifecycle (presence) events to EventBridge. Logs nothing about the payload.
exports.handler = async (event) => {
  await client.send(new PutEventsCommand({
    Entries: [{
      EventBusName: process.env.EVENT_BUS_NAME,
      Source: 'volti.iot',
      DetailType: 'iot.presence',
      Detail: JSON.stringify({
        thingName: event.clientId,
        eventType: event.eventType,
        timestamp: event.timestamp,
      }),
    }],
  }));
};
`;

export class IotStack extends Stack {
  public readonly thingTypeName = 'moto';
  public readonly endpointParam: ssm.StringParameter;
  public readonly trackerName: string;
  public readonly geofenceCollectionName: string;

  constructor(scope: Construct, id: string, props: IotStackProps) {
    super(scope, id, props);
    const { cfg, messaging } = props;
    const env = cfg.name;

    new iot.CfnThingType(this, 'MotoThingType', { thingTypeName: this.thingTypeName });

    new iot.CfnPolicy(this, 'MotoPolicy', {
      policyName: `volti-${env}-moto-policy`,
      policyDocument: buildDevicePolicyDocument(this.region, this.account),
    });

    // Rules
    const ruleErrors = new logs.LogGroup(this, 'RuleErrors', {
      logGroupName: `/volti/${env}/iot/rule-errors`,
      retention: cfg.logRetentionDays as logs.RetentionDays,
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

    // IoT rules have no native EventBridge action, so a tiny Lambda forwards presence events to the bus.
    const forwarderLogs = new logs.LogGroup(this, 'PresenceForwarderLogs', {
      retention: cfg.logRetentionDays as logs.RetentionDays,
    });
    const forwarder = new lambda.Function(this, 'PresenceForwarder', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(PRESENCE_FORWARDER),
      environment: { EVENT_BUS_NAME: messaging.eventBus.eventBusName },
      logGroup: forwarderLogs,
    });
    messaging.eventBus.grantPutEventsTo(forwarder);
    const presenceRule = new iot.CfnTopicRule(this, 'PresenceRule', {
      ruleName: `volti_${env}_presence`,
      topicRulePayload: {
        sql: "SELECT * FROM '$aws/events/presence/+/+'",
        awsIotSqlVersion: '2016-03-23',
        ruleDisabled: false,
        actions: [{ lambda: { functionArn: forwarder.functionArn } }],
        errorAction,
      },
    });
    forwarder.addPermission('InvokeFromIot', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      sourceArn: presenceRule.attrArn,
    });

    // Amazon Location
    this.trackerName = `volti-${env}-tracker`;
    this.geofenceCollectionName = `volti-${env}-geofences`;
    new location.CfnTracker(this, 'Tracker', {
      trackerName: this.trackerName,
      description: 'Volti vehicle positions',
    });
    new location.CfnGeofenceCollection(this, 'Geofences', {
      collectionName: this.geofenceCollectionName,
      description: 'Volti zones',
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
    publishParam(this, env, 'location/tracker-name', this.trackerName);
    publishParam(this, env, 'location/geofence-collection', this.geofenceCollectionName);
  }
}
