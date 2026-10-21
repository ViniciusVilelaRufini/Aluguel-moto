import { stacksFor, templateOf } from './helpers';

describe('MessagingStack', () => {
  const t = () => templateOf(stacksFor('dev').messaging);

  it('has 3 main queues each with a RedrivePolicy pointing to a DLQ', () => {
    const queues = t().findResources('AWS::SQS::Queue') as Record<string, any>;
    const main = Object.entries(queues).filter(([, q]) => q.Properties.RedrivePolicy);
    expect(main).toHaveLength(3);
    for (const [, q] of main) {
      const dlqLogicalId = q.Properties.RedrivePolicy.deadLetterTargetArn['Fn::GetAtt'][0];
      expect(queues[dlqLogicalId]).toBeDefined();
      expect(queues[dlqLogicalId].Properties.RedrivePolicy).toBeUndefined();
      expect(q.Properties.RedrivePolicy.maxReceiveCount).toBeGreaterThan(0);
    }
    expect(Object.keys(queues)).toHaveLength(6);
  });

  it('queues are encrypted and publish URLs to SSM', () => {
    for (const q of Object.values(t().findResources('AWS::SQS::Queue')) as any[]) {
      expect(q.Properties.SqsManagedSseEnabled).toBe(true);
    }
    for (const n of ['telemetry-url', 'payments-webhook-url', 'alerts-url']) {
      t().hasResourceProperties('AWS::SSM::Parameter', { Name: `/volti/dev/sqs/${n}` });
    }
  });
});
