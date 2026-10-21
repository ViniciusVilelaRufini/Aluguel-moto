import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { publishParam } from '../ssm';

export const STAFF_GROUPS = ['admin', 'operacao', 'financeiro', 'suporte', 'campo'] as const;

export interface AuthStackProps extends StackProps {
  cfg: EnvConfig;
}

export class AuthStack extends Stack {
  public readonly customerPool: cognito.UserPool;
  public readonly customerClient: cognito.UserPoolClient;
  public readonly staffPool: cognito.UserPool;
  public readonly staffClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);
    const { cfg } = props;
    const removalPolicy = cfg.disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;
    const password: cognito.PasswordPolicy = {
      minLength: 10,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: false,
    };

    // Customers: self sign-up, MFA optional (not enforced).
    this.customerPool = new cognito.UserPool(this, 'CustomerPool', {
      userPoolName: `volti-${cfg.name}-customers`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      passwordPolicy: password,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      deletionProtection: !cfg.disposable,
      removalPolicy,
    });
    this.customerClient = this.customerPool.addClient('CustomerApp', {
      userPoolClientName: `volti-${cfg.name}-customer-app`,
      generateSecret: false,
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });

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
    this.staffClient = this.staffPool.addClient('AdminPanel', {
      userPoolClientName: `volti-${cfg.name}-admin-panel`,
      generateSecret: false,
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(1),
    });
    for (const group of STAFF_GROUPS) {
      new cognito.CfnUserPoolGroup(this, `Group-${group}`, {
        userPoolId: this.staffPool.userPoolId,
        groupName: group,
        description: `Volti staff group ${group}`,
      });
    }

    publishParam(this, cfg.name, 'cognito/customer-pool-id', this.customerPool.userPoolId);
    publishParam(this, cfg.name, 'cognito/customer-client-id', this.customerClient.userPoolClientId);
    publishParam(this, cfg.name, 'cognito/staff-pool-id', this.staffPool.userPoolId);
    publishParam(this, cfg.name, 'cognito/staff-client-id', this.staffClient.userPoolClientId);
  }
}
