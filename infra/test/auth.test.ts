import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { getConfig } from '../lib/config';
import { AuthStack } from '../lib/stacks/auth-stack';
import { stacksFor, templateOf } from './helpers';

const clients = (t: Template) => Object.values(t.findResources('AWS::Cognito::UserPoolClient')) as any[];
const clientNamed = (t: Template, suffix: string) => clients(t).find((c) => String(c.Properties.ClientName).endsWith(suffix));
const pool = (t: Template, name: string) =>
  Object.values(t.findResources('AWS::Cognito::UserPool')).find((p: any) => p.Properties.UserPoolName === name) as any;

/** Stand-alone AuthStack with deploy-time overrides (SES and social IdPs), no need to synth the whole app. */
function authWith(overrides: Parameters<typeof getConfig>[1]): Template {
  const app = new App();
  const stack = new AuthStack(app, 'auth', {
    env: { account: '000000000000', region: 'sa-east-1' },
    cfg: getConfig('dev', overrides),
    adminOrigin: 'https://admin.example.com',
  });
  return Template.fromStack(stack);
}

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
    const mfa = pool(t(), 'volti-dev-customers').Properties.MfaConfiguration;
    expect(mfa).not.toBe('ON');
  });

  it('publishes cognito SSM parameters and uses public clients (no secret)', () => {
    for (const n of [
      'customer-pool-id', 'customer-client-id', 'customer-domain',
      'staff-pool-id', 'staff-client-id', 'operator-client-id', 'staff-domain',
    ]) {
      t().hasResourceProperties('AWS::SSM::Parameter', { Name: `/volti/dev/cognito/${n}` });
    }
    t().resourceCountIs('AWS::Cognito::UserPoolClient', 3);
    for (const c of clients(t())) expect(c.Properties.GenerateSecret).toBe(false);
  });

  it('both pools have a Hosted UI domain from the environment config', () => {
    const domains = Object.values(t().findResources('AWS::Cognito::UserPoolDomain')).map((d: any) => d.Properties.Domain);
    expect(domains.sort()).toEqual(['volti-dev-clientes', 'volti-dev-equipe']);
    const prod = Object.values(templateOf(stacksFor('prod').auth).findResources('AWS::Cognito::UserPoolDomain')).map((d: any) => d.Properties.Domain);
    expect(prod.sort()).toEqual(['volti-clientes', 'volti-equipe']);
  });

  it('customer pool: passwordless USER_AUTH with SMS OTP (phone or e-mail as username), SNS role, Essentials plan', () => {
    const p = pool(t(), 'volti-dev-customers').Properties;
    expect(p.UserPoolTier).toBe('ESSENTIALS');
    expect(p.UsernameAttributes.sort()).toEqual(['email', 'phone_number']);
    expect(p.Policies.SignInPolicy.AllowedFirstAuthFactors.sort()).toEqual(['PASSWORD', 'SMS_OTP']);
    expect(p.SmsConfiguration.SnsRegion).toBe('sa-east-1');
    expect(JSON.stringify(p.SmsConfiguration.SnsCallerArn)).toMatch(/smsRole/);
    expect(p.SmsConfiguration.ExternalId).toBeTruthy();
    // Without SES the pool keeps Cognito's default sender and e-mail OTP stays off (Cognito requires SES for it).
    expect(p.EmailConfiguration?.EmailSendingAccount).not.toBe('DEVELOPER');
    const c = clientNamed(t(), 'customer-app').Properties;
    expect(c.ExplicitAuthFlows.sort()).toEqual(['ALLOW_REFRESH_TOKEN_AUTH', 'ALLOW_USER_AUTH']);
    expect(c.EnableTokenRevocation).toBe(true);
  });

  it('customer app without social IdPs: no Hosted UI at all (no way to sign up with a password around USER_AUTH)', () => {
    const c = clientNamed(t(), 'customer-app').Properties;
    expect(c.AllowedOAuthFlowsUserPoolClient).toBe(false);
    expect(c.AllowedOAuthFlows).toBeUndefined();
    expect(c.CallbackURLs).toBeUndefined();
    expect(c.SupportedIdentityProviders ?? []).not.toContain('COGNITO');
    t().resourceCountIs('AWS::Cognito::UserPoolIdentityProvider', 0);
  });

  it('admin panel client: callback <origin>/auth/callback/ for the deployed panel (and local dev in dev only)', () => {
    const c = clientNamed(t(), 'admin-panel').Properties;
    expect(c.AllowedOAuthFlows).toEqual(['code']);
    const cb = JSON.stringify(c.CallbackURLs);
    expect(cb).toMatch(/\/auth\/callback\//);
    expect(cb).toMatch(/ExportsOutput|admin/i); // the CloudFront (or custom) origin from the admin-web stack
    expect(c.CallbackURLs).toContain('http://localhost:3100/auth/callback');
    expect(c.LogoutURLs).toContain('http://localhost:3100/login/');
    const prod = clientNamed(templateOf(stacksFor('prod').auth), 'admin-panel').Properties;
    expect(JSON.stringify(prod.CallbackURLs)).not.toMatch(/localhost/);
    expect(JSON.stringify(prod.LogoutURLs)).not.toMatch(/localhost/);
  });

  it('operator app client: staff pool, code flow, its own scheme, only token refresh as explicit flow', () => {
    const c = clientNamed(t(), 'operator-app').Properties;
    expect(JSON.stringify(c.UserPoolId)).toMatch(/StaffPool/);
    expect(c.AllowedOAuthFlows).toEqual(['code']);
    expect(c.CallbackURLs).toEqual(['br.com.volti.operador://callback']);
    expect(c.LogoutURLs).toEqual(['br.com.volti.operador://callback']);
    expect(c.ExplicitAuthFlows).toEqual(['ALLOW_REFRESH_TOKEN_AUTH']);
  });

  it('with SES configured: e-mail OTP on and e-mails sent by SES (DEVELOPER)', () => {
    const at = authWith({ sesFromEmail: 'no-reply@volti.com.br', sesVerifiedDomain: 'volti.com.br' });
    const p = pool(at, 'volti-dev-customers').Properties;
    expect(p.Policies.SignInPolicy.AllowedFirstAuthFactors.sort()).toEqual(['EMAIL_OTP', 'PASSWORD', 'SMS_OTP']);
    expect(p.EmailConfiguration.EmailSendingAccount).toBe('DEVELOPER');
    expect(JSON.stringify(p.EmailConfiguration.SourceArn)).toMatch(/identity\/volti\.com\.br/);
  });

  it('Google and Apple IdPs only when their secret names are given, read from Secrets Manager (no literal credentials)', () => {
    const at = authWith({ googleIdpSecretName: 'volti/dev/idp-google', appleIdpSecretName: 'volti/dev/idp-apple' });
    const idps = Object.values(at.findResources('AWS::Cognito::UserPoolIdentityProvider')) as any[];
    expect(idps.map((i) => i.Properties.ProviderName).sort()).toEqual(['Google', 'SignInWithApple']);
    const google = idps.find((i) => i.Properties.ProviderName === 'Google').Properties.ProviderDetails;
    expect(JSON.stringify(google.client_id)).toContain('{{resolve:secretsmanager:volti/dev/idp-google:SecretString:clientId');
    expect(JSON.stringify(google.client_secret)).toContain('{{resolve:secretsmanager:volti/dev/idp-google:SecretString:clientSecret');
    const apple = idps.find((i) => i.Properties.ProviderName === 'SignInWithApple').Properties.ProviderDetails;
    expect(JSON.stringify(apple.private_key)).toContain('{{resolve:secretsmanager:volti/dev/idp-apple:SecretString:privateKey');
    const c = clientNamed(at, 'customer-app');
    // Hosted UI only for the social IdPs (COGNITO, i.e. username/password, is never offered there).
    expect(c.Properties.SupportedIdentityProviders.sort()).toEqual(['Google', 'SignInWithApple']);
    expect(c.Properties.AllowedOAuthFlows).toEqual(['code']);
    expect(c.Properties.AllowedOAuthScopes.sort()).toEqual(['email', 'openid', 'phone', 'profile']);
    expect(c.Properties.CallbackURLs).toEqual(['volti://auth/callback']);
    expect(c.Properties.LogoutURLs).toEqual(['volti://auth/callback']);
    expect(c.DependsOn.length).toBe(2);
    // Only one of them configured → only that one.
    const onlyApple = authWith({ appleIdpSecretName: 'volti/dev/idp-apple' });
    onlyApple.resourceCountIs('AWS::Cognito::UserPoolIdentityProvider', 1);
  });
});
