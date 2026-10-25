import { Duration, RemovalPolicy, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { publishParam } from '../ssm';

export const STAFF_GROUPS = ['admin', 'operacao', 'financeiro', 'suporte', 'campo'] as const;

export interface AuthStackProps extends StackProps {
  cfg: EnvConfig;
  /** Deployed admin panel origin (https://...): Hosted UI callback <origin>/auth/callback/ and logout <origin>/login/. */
  adminOrigin: string;
  /**
   * profile=single (dev in a shared account), default: no self sign-up and no SMS (the SNS SMS quota/spend limit is per account).
   * Opt out with -c customerSignup=open (restrictedCustomers=false): phone/e-mail sign-up and SMS OTP through SNS.
   * Customers are created by the volti-dev-admin SSM document; e-mail OTP only with a verified SES identity (-c sesFromEmail).
   */
  restrictedCustomers?: boolean;
}

/** Admin panel Hosted UI URLs for one origin (the static export uses trailing slashes; both forms are registered). */
export function adminPanelUrls(origin: string): { callbacks: string[]; logouts: string[] } {
  return { callbacks: [`${origin}/auth/callback/`, `${origin}/auth/callback`], logouts: [`${origin}/login/`] };
}

export class AuthStack extends Stack {
  public readonly customerPool: cognito.UserPool;
  public readonly customerClient: cognito.UserPoolClient;
  public readonly customerDomain: cognito.UserPoolDomain;
  public readonly staffPool: cognito.UserPool;
  /** Admin panel client: the one the API accepts for the staff pool (COGNITO_STAFF_CLIENT_ID). */
  public readonly staffClient: cognito.UserPoolClient;
  public readonly operatorClient: cognito.UserPoolClient;
  public readonly staffDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);
    const { cfg } = props;
    const auth = cfg.auth;
    const removalPolicy = cfg.disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;
    const password: cognito.PasswordPolicy = {
      minLength: 10,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: false,
    };

    // Customers: passwordless (USER_AUTH with SMS_OTP, plus EMAIL_OTP when SES is configured), phone or e-mail as username,
    // MFA optional. Cognito always keeps PASSWORD as a first factor; the app client only enables USER_AUTH.
    const ses = auth.customerSes;
    const restricted = props.restrictedCustomers === true;
    this.customerPool = new cognito.UserPool(this, 'CustomerPool', {
      userPoolName: `volti-${cfg.name}-customers`,
      featurePlan: cognito.FeaturePlan.ESSENTIALS,
      selfSignUpEnabled: !restricted,
      signInAliases: { phone: true, email: true },
      autoVerify: restricted ? { email: true } : { phone: true, email: true },
      standardAttributes: { email: { required: false, mutable: true }, phoneNumber: { required: false, mutable: true } },
      signInPolicy: { allowedFirstAuthFactors: { password: true, smsOtp: !restricted, emailOtp: Boolean(ses) } },
      // SMS through SNS: the CDK creates the role Cognito assumes (with an external id); no credentials anywhere.
      ...(restricted ? { enableSmsRole: false } : { snsRegion: auth.snsRegion }),
      email: ses
        ? cognito.UserPoolEmail.withSES({
            fromEmail: ses.fromEmail,
            fromName: ses.fromName,
            replyTo: ses.replyTo,
            sesVerifiedDomain: ses.sesVerifiedDomain,
            configurationSetName: ses.configurationSetName,
            sesRegion: cfg.region,
          })
        : undefined,
      mfa: cognito.Mfa.OPTIONAL,
      // Cognito rejects an SMS configuration with optional MFA while SMS_MFA is off ("Can't turn off SMS_MFA when SMS
      // configuration is set"), so SMS stays an (opt-in) second factor whenever the SMS role exists.
      mfaSecondFactor: { sms: !restricted, otp: true },
      passwordPolicy: password,
      accountRecovery: restricted ? cognito.AccountRecovery.EMAIL_ONLY : cognito.AccountRecovery.PHONE_AND_EMAIL,
      deletionProtection: !cfg.disposable,
      removalPolicy,
    });
    this.customerDomain = this.customerPool.addDomain('CustomerDomain', { cognitoDomain: { domainPrefix: auth.customerDomainPrefix } });

    // Social IdPs only when their secret name is configured (values resolved by CloudFormation from Secrets Manager).
    // Hosted UI of the customer pool is only for the social IdPs: COGNITO (username/password) is never offered there, so the
    // Hosted UI cannot be used to sign up with a password around the passwordless flow (USER_AUTH goes through the API, not OAuth).
    const idps: cognito.UserPoolClientIdentityProvider[] = [];
    const idpConstructs: Construct[] = [];
    if (auth.googleSecretName) {
      const field = (f: string) => SecretValue.secretsManager(auth.googleSecretName!, { jsonField: f });
      idpConstructs.push(
        new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
          userPool: this.customerPool,
          clientId: field('clientId').unsafeUnwrap(),
          clientSecretValue: field('clientSecret'),
          scopes: ['openid', 'email', 'profile'],
          attributeMapping: { email: cognito.ProviderAttribute.GOOGLE_EMAIL, emailVerified: cognito.ProviderAttribute.GOOGLE_EMAIL_VERIFIED },
        }),
      );
      idps.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
    }
    if (auth.appleSecretName) {
      const field = (f: string) => SecretValue.secretsManager(auth.appleSecretName!, { jsonField: f });
      idpConstructs.push(
        new cognito.UserPoolIdentityProviderApple(this, 'Apple', {
          userPool: this.customerPool,
          clientId: field('servicesId').unsafeUnwrap(),
          teamId: field('teamId').unsafeUnwrap(),
          keyId: field('keyId').unsafeUnwrap(),
          privateKeyValue: field('privateKey'),
          scopes: ['email', 'name'],
          attributeMapping: { email: cognito.ProviderAttribute.APPLE_EMAIL, emailVerified: cognito.ProviderAttribute.APPLE_EMAIL_VERIFIED },
        }),
      );
      idps.push(cognito.UserPoolClientIdentityProvider.APPLE);
    }

    this.customerClient = this.customerPool.addClient('CustomerApp', {
      userPoolClientName: `volti-${cfg.name}-customer-app`,
      generateSecret: false,
      authFlows: { user: true },
      enableTokenRevocation: true,
      preventUserExistenceErrors: true,
      ...(idps.length
        ? {
            supportedIdentityProviders: idps,
            oAuth: {
              flows: { authorizationCodeGrant: true },
              scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PHONE, cognito.OAuthScope.PROFILE],
              callbackUrls: auth.customerCallbackUrls,
              logoutUrls: auth.customerCallbackUrls,
            },
          }
        : { disableOAuth: true, supportedIdentityProviders: [] }),
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });
    for (const idp of idpConstructs) this.customerClient.node.addDependency(idp);

    // Staff: users created by an admin only, MFA required (TOTP), 5 groups.
    this.staffPool = new cognito.UserPool(this, 'StaffPool', {
      userPoolName: `volti-${cfg.name}-staff`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: { sms: false, otp: true },
      passwordPolicy: { ...password, minLength: 12, requireSymbols: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      deletionProtection: !cfg.disposable,
      removalPolicy,
    });
    this.staffDomain = this.staffPool.addDomain('StaffDomain', { cognitoDomain: { domainPrefix: auth.staffDomainPrefix } });

    const staffScopes = [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE];
    const panel = [props.adminOrigin, ...auth.adminExtraOrigins].map(adminPanelUrls);
    this.staffClient = this.staffPool.addClient('AdminPanel', {
      userPoolClientName: `volti-${cfg.name}-admin-panel`,
      generateSecret: false,
      authFlows: { userSrp: true },
      enableTokenRevocation: true,
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: staffScopes,
        callbackUrls: panel.flatMap((p) => p.callbacks),
        logoutUrls: panel.flatMap((p) => p.logouts),
      },
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(1),
    });
    // Field operator app (Flutter, flutter_appauth): Hosted UI with code + PKCE, public client.
    this.operatorClient = this.staffPool.addClient('OperatorApp', {
      userPoolClientName: `volti-${cfg.name}-operator-app`,
      generateSecret: false,
      enableTokenRevocation: true,
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: staffScopes,
        callbackUrls: auth.operatorCallbackUrls,
        logoutUrls: auth.operatorCallbackUrls,
      },
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(7),
    });
    // Hosted UI only: no SRP/password flows on this client, just token refresh.
    (this.operatorClient.node.defaultChild as cognito.CfnUserPoolClient).explicitAuthFlows = ['ALLOW_REFRESH_TOKEN_AUTH'];
    for (const group of STAFF_GROUPS) {
      new cognito.CfnUserPoolGroup(this, `Group-${group}`, {
        userPoolId: this.staffPool.userPoolId,
        groupName: group,
        description: `Volti staff group ${group}`,
      });
    }

    const hostedUi = (prefix: string) => `${prefix}.auth.${this.region}.amazoncognito.com`;
    publishParam(this, cfg.name, 'cognito/customer-pool-id', this.customerPool.userPoolId);
    publishParam(this, cfg.name, 'cognito/customer-client-id', this.customerClient.userPoolClientId);
    publishParam(this, cfg.name, 'cognito/customer-domain', hostedUi(auth.customerDomainPrefix));
    publishParam(this, cfg.name, 'cognito/staff-pool-id', this.staffPool.userPoolId);
    publishParam(this, cfg.name, 'cognito/staff-client-id', this.staffClient.userPoolClientId);
    publishParam(this, cfg.name, 'cognito/operator-client-id', this.operatorClient.userPoolClientId);
    publishParam(this, cfg.name, 'cognito/staff-domain', hostedUi(auth.staffDomainPrefix));
  }
}
