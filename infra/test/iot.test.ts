import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Match } from 'aws-cdk-lib/assertions';
import { PRESENCE_EVENT } from '../lib/stacks/messaging-stack';
import { PRESENCE_FORWARDER, STATION_EVENTS_SQL, STATION_FORWARDER, STATION_PARTITION_KEY } from '../lib/stacks/iot-stack';
import { stacksFor, templateOf } from './helpers';

const THING = '${iot:Connection.Thing.ThingName}';

/** Runs an inline Lambda source with a fake `require`, capturing what it sends to the AWS SDK. */
function runInline(code: string, env: Record<string, string>, sdk: Record<string, unknown>): { handler: (e: unknown) => Promise<void>; logs: string[] } {
  const exportsObj: { handler?: (e: unknown) => Promise<void> } = {};
  const logs: string[] = [];
  const fakeConsole = { log: (m: string) => logs.push(m) };
  new Function('require', 'exports', 'process', 'console', code)(() => sdk, exportsObj, { env }, fakeConsole);
  return { handler: exportsObj.handler!, logs };
}

describe('IotStack', () => {
  const t = () => templateOf(stacksFor('dev').iot);
  const policy = (name: string) =>
    (Object.values(t().findResources('AWS::IoT::Policy')).find((p: any) => p.Properties.PolicyName === name) as any).Properties.PolicyDocument;
  const rules = () => Object.values(t().findResources('AWS::IoT::TopicRule')) as any[];
  const rule = (name: string) => rules().find((r) => r.Properties.RuleName === name).Properties.TopicRulePayload;

  it('has the "moto" and "estacao" thing types', () => {
    t().hasResourceProperties('AWS::IoT::ThingType', { ThingTypeName: 'moto' });
    t().hasResourceProperties('AWS::IoT::ThingType', { ThingTypeName: 'estacao' });
    t().resourceCountIs('AWS::IoT::Policy', 2);
  });

  it.each(['volti-dev-moto-policy', 'volti-dev-estacao-policy'])('%s has no wildcard Resource on Publish/Subscribe/Receive and scopes to the thing name', (name) => {
    const doc = policy(name);
    const seen = new Set<string>();
    for (const s of doc.Statement as any[]) {
      const res: unknown[] = Array.isArray(s.Resource) ? s.Resource : [s.Resource];
      const actions: string[] = Array.isArray(s.Action) ? s.Action : [s.Action];
      for (const a of actions) {
        if (['iot:Publish', 'iot:Subscribe', 'iot:Receive'].includes(a)) {
          seen.add(a);
          expect(res.length).toBeGreaterThan(0);
          for (const r of res) {
            expect(r).not.toBe('*');
            expect(JSON.stringify(r)).toContain(THING);
          }
        }
      }
    }
    expect([...seen].sort()).toEqual(['iot:Publish', 'iot:Receive', 'iot:Subscribe']);
  });

  it('moto policy covers the tracker topics and its shadow', () => {
    const all = JSON.stringify(policy('volti-dev-moto-policy'));
    for (const topic of ['telemetria', 'eventos', 'comandos']) expect(all).toContain(`motos/${THING}/${topic}`);
    expect(all).toContain(`$aws/things/${THING}/shadow/update`);
    expect(all).toContain(`$aws/things/${THING}/shadow/get`);
    expect(all).not.toContain('estacoes/');
  });

  it('estacao policy: publish only its eventos, receive/subscribe only its comandos, no shadow, attached-thing connect', () => {
    const doc = policy('volti-dev-estacao-policy');
    const by = (a: string) => doc.Statement.find((s: any) => s.Action === a);
    expect(JSON.stringify(by('iot:Publish').Resource)).toContain(`topic/estacoes/${THING}/eventos`);
    expect(by('iot:Publish').Resource).toHaveLength(1);
    expect(by('iot:Receive').Resource).toHaveLength(1);
    expect(JSON.stringify(by('iot:Receive').Resource)).toContain(`topic/estacoes/${THING}/comandos`);
    expect(JSON.stringify(by('iot:Subscribe').Resource)).toContain(`topicfilter/estacoes/${THING}/comandos`);
    expect(by('iot:Connect').Condition).toEqual({ Bool: { 'iot:Connection.Thing.IsAttached': 'true' } });
    const all = JSON.stringify(doc);
    expect(all).not.toContain('shadow');
    expect(all).not.toContain('motos/');
  });

  it('telemetry and tracker events go to the telemetry queue (the API splits them by `tipo`); nothing goes raw to alertas', () => {
    for (const name of ['volti_dev_telemetry', 'volti_dev_device_events']) {
      const r = rule(name);
      expect(r.Sql).toMatch(/topic\(2\) AS thingName/);
      expect(JSON.stringify(r.Actions[0].Sqs.QueueUrl)).toMatch(/TelemetryQueue/);
      expect(r.ErrorAction.CloudwatchLogs).toBeDefined();
    }
    expect(rule('volti_dev_device_events').Sql).toMatch(/motos\/\+\/eventos/);
    expect(JSON.stringify(rules())).not.toMatch(/AlertsQueue/);
    const stmts = Object.values(t().findResources('AWS::IAM::Policy')).flatMap((p: any) => p.Properties.PolicyDocument.Statement) as any[];
    expect(JSON.stringify(stmts)).not.toMatch(/AlertsQueue/);
  });

  it('prod: station events keep per-station order: rule → Kinesis (partition key = thing) → ordered event source mapping → FIFO', () => {
    const t = () => templateOf(stacksFor('prod').iot);
    const r = (Object.values(t().findResources('AWS::IoT::TopicRule')) as any[]).find((x) => x.Properties.RuleName === 'volti_prod_station_events')
      .Properties.TopicRulePayload;
    expect(r.Sql).toBe(STATION_EVENTS_SQL);
    expect(r.Sql).toBe("SELECT *, topic(2) AS thing FROM 'estacoes/+/eventos'");
    expect(r.Actions).toHaveLength(1);
    expect(r.Actions[0].Lambda).toBeUndefined(); // the async Lambda action reorders (parallel invocations, late retries)
    expect(r.Actions[0].Kinesis.PartitionKey).toBe(STATION_PARTITION_KEY);
    expect(STATION_PARTITION_KEY).toBe('${topic(2)}');
    expect(JSON.stringify(r.Actions[0].Kinesis.StreamName)).toMatch(/StationEventsStream/);
    expect(r.ErrorAction.CloudwatchLogs).toBeDefined();
    t().hasResourceProperties('AWS::Kinesis::Stream', {
      Name: 'volti-prod-station-events',
      ShardCount: 1,
      RetentionPeriodHours: 24,
      StreamEncryption: { EncryptionType: 'KMS', KeyId: 'alias/aws/kinesis' },
    });
    const esm = Object.values(t().findResources('AWS::Lambda::EventSourceMapping')) as any[];
    expect(esm).toHaveLength(1);
    const m = esm[0].Properties;
    expect(JSON.stringify(m.EventSourceArn)).toMatch(/StationEventsStream/);
    expect(m.ParallelizationFactor).toBe(1);
    expect(m.BisectBatchOnFunctionError).toBe(false);
    expect(m.FunctionResponseTypes).toEqual(['ReportBatchItemFailures']);
    expect(m.StartingPosition).toBe('TRIM_HORIZON');
    expect(m.MaximumRetryAttempts).toBeGreaterThanOrEqual(10);
    expect(m.MaximumRecordAgeInSeconds).toBe(3600);
    // I2: what the forwarder cannot deliver goes to a DLQ (alarmed in observability).
    expect(JSON.stringify(m.DestinationConfig.OnFailure.Destination)).toMatch(/StationsForwarderDlq/);
    const fns = Object.values(t().findResources('AWS::Lambda::Function')) as any[];
    const fwd = fns.find((f) => f.Properties.Environment?.Variables?.QUEUE_URL);
    expect(JSON.stringify(fwd.Properties.Environment.Variables.QUEUE_URL)).toMatch(/StationsQueue/);
    // Only the IoT role writes to the stream; the forwarder sends to the FIFO and to its DLQ.
    const stmts = Object.values(t().findResources('AWS::IAM::Policy')).flatMap((p: any) => p.Properties.PolicyDocument.Statement) as any[];
    expect(stmts.some((s) => JSON.stringify(s.Action).includes('kinesis:PutRecord') && JSON.stringify(s.Resource).includes('StationEventsStream'))).toBe(true);
    expect(stmts.some((s) => JSON.stringify(s.Action).includes('sqs:SendMessage') && JSON.stringify(s.Resource).includes('StationsQueue'))).toBe(true);
    expect(stmts.some((s) => JSON.stringify(s.Action).includes('sqs:SendMessage') && JSON.stringify(s.Resource).includes('StationsForwarderDlq'))).toBe(true);
    // No IoT → Lambda permission for the stations path any more (only presence).
    const perms = Object.values(t().findResources('AWS::Lambda::Permission')) as any[];
    expect(perms).toHaveLength(1);
  });

  describe('station forwarder (Kinesis batch → FIFO)', () => {
    const thing = 'station-5b0e7c1a-1111-4111-8111-111111111111';
    const ev = (type: string, extra: Record<string, unknown> = {}) => ({ type, swapId: '5b0e7c1a-1111-4111-8111-111111111111', ts: '2026-10-22T15:00:22.000Z', thing, ...extra });
    const rec = (body: unknown, seq: string) => ({
      kinesis: { data: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)).toString('base64'), sequenceNumber: seq },
    });
    const forwarder = (failOn?: (input: any) => boolean) => {
      const sent: any[] = [];
      class SQSClient {
        async send(cmd: { input: any }) {
          if (failOn?.(cmd.input)) throw Object.assign(new Error('throttled'), { name: 'ThrottlingException' });
          sent.push(cmd.input);
        }
      }
      class SendMessageCommand {
        constructor(public input: unknown) {}
      }
      return { sent, ...runInline(STATION_FORWARDER, { QUEUE_URL: 'https://sqs/q.fifo' }, { SQSClient, SendMessageCommand }) };
    };

    it('sends the records in stream order with MessageGroupId = thing, skipping malformed ones without logging payloads', async () => {
      const { handler, sent, logs } = forwarder();
      const a = ev('slot_opened', { slotNumber: 3 });
      const b = ev('battery_returned', { serial: 'BAT-1', pct: 14 });
      const c = ev('slot_closed');
      const res = await handler({ Records: [rec(a, '1'), rec('{not json', '2'), rec({ type: 'x', thing: 'moto-0001' }, '3'), rec(b, '4'), rec(c, '5')] });
      expect(res).toEqual({ batchItemFailures: [] });
      expect(sent).toEqual([a, b, c].map((e) => ({ QueueUrl: 'https://sqs/q.fifo', MessageBody: JSON.stringify(e), MessageGroupId: thing })));
      expect(logs.join(' ')).not.toMatch(/swapId|slot_|BAT-1/);
    });

    it('stops at the first failed send and reports that record, so the retry resumes from it (never skipping ahead)', async () => {
      const { handler, sent } = forwarder((input) => JSON.parse(input.MessageBody).type === 'battery_returned');
      const res = await handler({ Records: [rec(ev('slot_opened', { slotNumber: 3 }), '1'), rec(ev('battery_returned', { serial: 'B', pct: 1 }), '2'), rec(ev('slot_closed'), '3')] });
      expect(res).toEqual({ batchItemFailures: [{ itemIdentifier: '2' }] });
      expect(sent.map((s) => JSON.parse(s.MessageBody).type)).toEqual(['slot_opened']); // slot_closed NOT sent before battery_returned
    });
  });

  it('presence forwarder puts the events with the source/detail-type the EventBridge rule matches', async () => {
    const sent: any[] = [];
    class EventBridgeClient {
      async send(cmd: { input: unknown }) {
        sent.push(cmd.input);
      }
    }
    class PutEventsCommand {
      constructor(public input: unknown) {}
    }
    const { handler } = runInline(PRESENCE_FORWARDER, { EVENT_BUS_NAME: 'volti-dev' }, { EventBridgeClient, PutEventsCommand });
    await handler({ clientId: 'moto-0001', eventType: 'disconnected', timestamp: 1730000000000, ipAddress: '1.2.3.4' });
    const entry = sent[0].Entries[0];
    expect(entry.Source).toBe(PRESENCE_EVENT.source);
    expect(entry.DetailType).toBe(PRESENCE_EVENT.detailType);
    expect(JSON.parse(entry.Detail)).toEqual({ thingName: 'moto-0001', eventType: 'disconnected', timestamp: 1730000000000 });
  });

  it('presence events still go to EventBridge via Lambda', () => {
    const r = rule('volti_dev_presence');
    expect(r.Sql).toMatch(/\$aws\/events\/presence/);
    expect(r.Actions[0].Lambda).toBeDefined();
    t().hasResourceProperties('AWS::Lambda::Function', { Runtime: Match.stringLikeRegexp('^nodejs') });
  });

  it('every rule error is counted by a metric filter (alarmed in observability)', () => {
    for (const r of rules()) expect(r.Properties.TopicRulePayload.ErrorAction.CloudwatchLogs).toBeDefined();
    t().hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterPattern: '',
      MetricTransformations: [Match.objectLike({ MetricNamespace: 'Volti/dev', MetricName: 'IotRuleErrors', MetricValue: '1' })],
    });
  });

  it('rules keep the thing identity (topic) apart from the device body (payload)', () => {
    const rules = Object.values(t().findResources('AWS::IoT::TopicRule')) as any[];
    const motoRules = rules.filter((r) => String(r.Properties.TopicRulePayload.Sql).includes("'motos/"));
    const sqls = motoRules.map((r) => r.Properties.TopicRulePayload.Sql as string);
    expect(sqls).toHaveLength(2);
    for (const leaf of ['telemetria', 'eventos']) {
      const sql = sqls.find((q) => q.includes(`'motos/+/${leaf}'`))!;
      expect(sql.startsWith('SELECT topic(2) AS thingName, topic(3) AS channel, timestamp() AS ingestedAt, {')).toBe(true);
      expect(sql).toContain('} AS payload FROM ');
      expect(sql).not.toContain('SELECT *');
    }
    expect(sqls.find((q) => q.includes("'motos/+/telemetria'"))).toContain("'velocidade_kmh': velocidade_kmh");
    expect(sqls.find((q) => q.includes("'motos/+/eventos'"))).toContain("'tipo': tipo");
    // eventos seguem pela fila de telemetria (mesmo caminho do modo local)
    const queues = motoRules.map((r) => JSON.stringify(r.Properties.TopicRulePayload.Actions[0].Sqs.QueueUrl));
    expect(new Set(queues).size).toBe(1);
  });

  it('rule projections match the MQTT contract schemas (telemetria/eventos properties)', () => {
    const schemaProps = (file: string) =>
      Object.keys(JSON.parse(readFileSync(join(__dirname, '..', '..', 'packages', 'contracts', 'schemas', file), 'utf8')).properties).sort();
    const rules = Object.values(t().findResources('AWS::IoT::TopicRule')) as any[];
    const projected = (leaf: string) => {
      const sql = rules.map((r) => String(r.Properties.TopicRulePayload.Sql)).find((q) => q.includes(`'motos/+/${leaf}'`))!;
      const body = /\{(.*)\} AS payload/.exec(sql)![1];
      return [...body.matchAll(/'(\w+)': (\w+)/g)].map((m) => {
        expect(m[2]).toBe(m[1]);
        return m[1];
      }).sort();
    };
    expect(projected('telemetria')).toEqual(schemaProps('telemetria.schema.json'));
    expect(projected('eventos')).toEqual(schemaProps('eventos.schema.json'));
  });

  it('creates Amazon Location tracker, geofence collection and place index (Storage) and publishes SSM params', () => {
    t().resourceCountIs('AWS::Location::Tracker', 1);
    t().resourceCountIs('AWS::Location::GeofenceCollection', 1);
    t().hasResourceProperties('AWS::Location::PlaceIndex', {
      IndexName: 'volti-dev-places',
      DataSource: 'Esri',
      DataSourceConfiguration: { IntendedUse: 'Storage' },
    });
    for (const n of ['iot/endpoint', 'iot/thing-type', 'iot/station-thing-type', 'location/tracker-name', 'location/geofence-collection', 'location/place-index']) {
      t().hasResourceProperties('AWS::SSM::Parameter', { Name: `/volti/dev/${n}` });
    }
  });

  it('QA-16: iot:Connect requires the certificate to be attached to a thing', () => {
    const connect = policy('volti-dev-moto-policy').Statement.find((s: any) => s.Action === 'iot:Connect');
    expect(connect.Condition).toEqual({ Bool: { 'iot:Connection.Thing.IsAttached': 'true' } });
  });
});
