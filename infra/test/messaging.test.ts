import { stacksFor, templateOf } from './helpers';

describe('MessagingStack', () => {
  const t = () => templateOf(stacksFor('dev').messaging);
  const queues = () => t().findResources('AWS::SQS::Queue') as Record<string, any>;

  it('has 4 main queues each with a RedrivePolicy pointing to a DLQ', () => {
    const all = queues();
    const main = Object.entries(all).filter(([, q]) => q.Properties.RedrivePolicy);
    expect(main).toHaveLength(4);
    for (const [, q] of main) {
      const dlqLogicalId = q.Properties.RedrivePolicy.deadLetterTargetArn['Fn::GetAtt'][0];
      expect(all[dlqLogicalId]).toBeDefined();
      expect(all[dlqLogicalId].Properties.RedrivePolicy).toBeUndefined();
      expect(all[dlqLogicalId].Properties.FifoQueue).toEqual(q.Properties.FifoQueue);
      expect(q.Properties.RedrivePolicy.maxReceiveCount).toBeGreaterThan(0);
    }
    expect(Object.keys(all)).toHaveLength(8);
  });

  it('stations queue is FIFO (.fifo, content-based dedup) with a FIFO DLQ', () => {
    const all = queues();
    const [, q] = Object.entries(all).find(([id]) => id.startsWith('StationsQueue'))!;
    expect(q.Properties.QueueName).toBe('volti-dev-stations.fifo');
    expect(q.Properties.FifoQueue).toBe(true);
    expect(q.Properties.ContentBasedDeduplication).toBe(true);
    const dlq = all[q.Properties.RedrivePolicy.deadLetterTargetArn['Fn::GetAtt'][0]];
    expect(dlq.Properties.QueueName).toBe('volti-dev-stations-dlq.fifo');
    expect(dlq.Properties.FifoQueue).toBe(true);
    const others = Object.entries(all).filter(([id]) => !id.startsWith('Stations'));
    for (const [, o] of others) expect(o.Properties.FifoQueue).toBeUndefined();
  });

  it('queues are encrypted and publish URLs to SSM', () => {
    for (const q of Object.values(queues())) {
      expect(q.Properties.SqsManagedSseEnabled).toBe(true);
    }
    for (const n of ['telemetry-url', 'payments-webhook-url', 'alerts-url', 'stations-url']) {
      t().hasResourceProperties('AWS::SSM::Parameter', { Name: `/volti/dev/sqs/${n}` });
    }
  });

  it('EventBridge rule delivers tracker presence to the telemetry queue as { thingName, presence, timestamp }', () => {
    const rules = Object.values(t().findResources('AWS::Events::Rule')) as any[];
    expect(rules).toHaveLength(1);
    const r = rules[0].Properties;
    expect(r.EventPattern).toEqual({
      source: ['volti.iot'],
      'detail-type': ['iot.presence'],
      detail: { thingName: [{ prefix: 'moto-' }], eventType: ['connected', 'disconnected'] },
    });
    expect(JSON.stringify(r.EventBusName)).toMatch(/Bus/);
    const target = r.Targets[0];
    expect(JSON.stringify(target.Arn)).toMatch(/TelemetryQueue/);
    expect(target.InputTransformer.InputPathsMap).toEqual({
      'detail-thingName': '$.detail.thingName',
      'detail-eventType': '$.detail.eventType',
      'detail-timestamp': '$.detail.timestamp',
    });
    expect(target.InputTransformer.InputTemplate).toBe('{"thingName":<detail-thingName>,"presence":<detail-eventType>,"timestamp":<detail-timestamp>}');
    // The queue policy lets only this rule send.
    const policies = Object.values(t().findResources('AWS::SQS::QueuePolicy')) as any[];
    const stmt = policies.flatMap((p) => p.Properties.PolicyDocument.Statement).find((s: any) => s.Principal?.Service === 'events.amazonaws.com');
    expect(stmt.Action).toContain('sqs:SendMessage');
    expect(JSON.stringify(stmt.Condition)).toMatch(/PresenceToTelemetry/);
  });
});
