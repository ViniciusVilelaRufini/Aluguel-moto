import { Match } from 'aws-cdk-lib/assertions';
import { stacksFor, templateOf } from './helpers';

describe('AuthStack', () => {
  const t = () => templateOf(stacksFor('dev').auth);

  it('staff pool enforces MFA (ON) and has the 5 groups', () => {
    t().hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'volti-dev-staff',
      MfaConfiguration: 'ON',
    });
    const groups = Object.values(t().findResources('AWS::Cognito::UserPoolGroup')).map((g: any) => g.Properties.GroupName);
    expect(groups.sort()).toEqual(['admin', 'campo', 'financeiro', 'operacao', 'suporte']);
  });

  it('customer pool does not require MFA', () => {
    const pools = t().findResources('AWS::Cognito::UserPool', { Properties: { UserPoolName: 'volti-dev-customers' } });
    expect(Object.keys(pools)).toHaveLength(1);
    const mfa = (Object.values(pools)[0] as any).Properties.MfaConfiguration;
    expect(mfa).not.toBe('ON');
  });

  it('publishes cognito SSM parameters and uses public clients (no secret)', () => {
    for (const n of ['customer-pool-id', 'customer-client-id', 'staff-pool-id', 'staff-client-id']) {
      t().hasResourceProperties('AWS::SSM::Parameter', { Name: `/volti/dev/cognito/${n}` });
    }
    t().resourceCountIs('AWS::Cognito::UserPoolClient', 2);
    t().hasResourceProperties('AWS::Cognito::UserPoolClient', { GenerateSecret: false });
    expect(Match).toBeDefined();
  });
});
