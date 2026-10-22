import { Match } from 'aws-cdk-lib/assertions';
import { stacksFor, templateOf } from './helpers';

const THING = '${iot:Connection.Thing.ThingName}';

describe('IotStack', () => {
  const t = () => templateOf(stacksFor('dev').iot);

  it('has the "moto" thing type', () => {
    t().hasResourceProperties('AWS::IoT::ThingType', { ThingTypeName: 'moto' });
  });

  it('policy has no wildcard Resource on Publish/Subscribe/Receive and scopes to the thing name', () => {
    const policies = Object.values(t().findResources('AWS::IoT::Policy')) as any[];
    expect(policies).toHaveLength(1);
    const doc = policies[0].Properties.PolicyDocument;
    const stmts: any[] = doc.Statement;
    const seen = new Set<string>();
    for (const s of stmts) {
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
    const all = JSON.stringify(doc);
    for (const topic of ['telemetria', 'eventos', 'comandos']) expect(all).toContain(`motos/${THING}/${topic}`);
    expect(all).toContain(`$aws/things/${THING}/shadow/update`);
    expect(all).toContain(`$aws/things/${THING}/shadow/get`);
  });

  it('rules route telemetry and events to SQS; presence events go to EventBridge via Lambda', () => {
    const rules = Object.values(t().findResources('AWS::IoT::TopicRule')) as any[];
    const sqlOf = (r: any) => r.Properties.TopicRulePayload.Sql as string;
    const action = (r: any) => r.Properties.TopicRulePayload.Actions[0];
    expect(rules.some((r) => /motos\/\+\/telemetria/.test(sqlOf(r)) && action(r).Sqs)).toBe(true);
    expect(rules.some((r) => /motos\/\+\/eventos/.test(sqlOf(r)) && action(r).Sqs)).toBe(true);
    expect(rules.some((r) => /\$aws\/events\/presence/.test(sqlOf(r)) && action(r).Lambda)).toBe(true);
    t().hasResourceProperties('AWS::Lambda::Function', { Runtime: Match.stringLikeRegexp('^nodejs') });
  });

  it('creates Amazon Location tracker and geofence collection and publishes SSM params', () => {
    t().resourceCountIs('AWS::Location::Tracker', 1);
    t().resourceCountIs('AWS::Location::GeofenceCollection', 1);
    for (const n of ['iot/endpoint', 'iot/thing-type', 'location/tracker-name', 'location/geofence-collection']) {
      t().hasResourceProperties('AWS::SSM::Parameter', { Name: `/volti/dev/${n}` });
    }
  });

  it('QA-16: iot:Connect requires the certificate to be attached to a thing', () => {
    const doc = (Object.values(t().findResources('AWS::IoT::Policy'))[0] as any).Properties.PolicyDocument;
    const connect = doc.Statement.find((s: any) => s.Action === 'iot:Connect');
    expect(connect.Condition).toEqual({ Bool: { 'iot:Connection.Thing.IsAttached': 'true' } });
  });
});
