import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { publishParam } from '../ssm';
import { AuthStack } from './auth-stack';
import { DataStack } from './data-stack';
import { IotStack } from './iot-stack';
import { MessagingStack } from './messaging-stack';

export interface ApiStackProps extends StackProps {
  cfg: EnvConfig;
  vpc: ec2.IVpc;
  data: DataStack;
  auth: AuthStack;
  messaging: MessagingStack;
  iot: IotStack;
  certificateArn: string;
  /** Origem do painel admin (https://...), a única aceita em CORS_ORIGINS. */
  adminOrigin: string;
  imageTag: string;
  /** 0 on the first deploy (no image in ECR yet); set to >= 1 once an image is pushed. */
  desiredCount: number;
  /** API domain (e.g. api.volti.com.br) for the public SOS location-share link; unset = the ALB DNS name. */
  apiDomainName?: string;
}

export const API_PORT = 3000;

export class ApiStack extends Stack {
  public readonly repository: ecr.Repository;
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly appSecret: secretsmanager.Secret;
  /** Firebase service account JSON for PUSH_MODE=fcm (placeholder until pasted by hand). */
  public readonly fcmSecret: secretsmanager.Secret;
  /** HMAC keys the API refuses to start without in production (generated here, never typed by hand). */
  public readonly signingSecrets: Record<'STATION_QR_SECRET' | 'FRAUD_HASH_SECRET' | 'PICKUP_CODE_SECRET', secretsmanager.Secret>;
  /** Healthy tasks below which the alarm fires (0 while the service is deployed with 0 tasks). */
  public readonly minHealthyTasks: number;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { cfg, vpc, data, auth, messaging, iot, desiredCount } = props;
    // O link público do SOS vai para um contato de emergência: em prod, sem domínio (certificado) o link daria erro de TLS.
    if (cfg.name === 'prod' && !props.apiDomainName) throw new Error('prod exige -c domainName (PUBLIC_SHARE_BASE_URL = https://api.<domínio>/share).');
    const env = cfg.name;

    this.repository = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: `volti-${env}-api`,
      imageScanOnPush: true,
      removalPolicy: cfg.disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      emptyOnDelete: cfg.disposable,
      lifecycleRules: [{ maxImageCount: 30 }],
    });

    // Third-party secrets. Values are filled by hand after the first deploy (placeholders only here).
    this.appSecret = new secretsmanager.Secret(this, 'AppSecret', {
      secretName: `volti/${env}/app`,
      description: 'Volti API third-party credentials (fill after deploy)',
      generateSecretString: {
        // QA-19: o segredo do webhook nasce aleatório (nunca um valor conhecido). Só o access token precisa ser colado à mão.
        secretStringTemplate: JSON.stringify({ MERCADOPAGO_ACCESS_TOKEN: 'CHANGE_ME' }),
        generateStringKey: 'MERCADOPAGO_WEBHOOK_SECRET',
        passwordLength: 48,
        excludePunctuation: true,
      },
    });

    // FCM (push): the service account JSON is pasted by hand; while it is a placeholder PUSH_MODE stays 'log'.
    this.fcmSecret = new secretsmanager.Secret(this, 'FcmSecret', {
      secretName: `volti/${env}/fcm-service-account`,
      description: 'Firebase service account JSON (FCM_SERVICE_ACCOUNT_JSON); switch PUSH_MODE to fcm after filling it',
      generateSecretString: { passwordLength: 32, excludePunctuation: true },
      removalPolicy: cfg.disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    });

    // Signing keys. Rotating STATION_QR_SECRET invalidates every printed station QR (re-issue them); rotating
    // FRAUD_HASH_SECRET breaks matching of previously hashed CPFs; PICKUP_CODE_SECRET only voids open pickup codes.
    const signing = (key: string, name: string, description: string) =>
      new secretsmanager.Secret(this, key, {
        secretName: `volti/${env}/${name}`,
        description,
        generateSecretString: { passwordLength: 64, excludePunctuation: true },
        removalPolicy: cfg.disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      });
    this.signingSecrets = {
      STATION_QR_SECRET: signing('StationQrSecret', 'station-qr-secret', 'HMAC of the swap station QR codes'),
      FRAUD_HASH_SECRET: signing('FraudHashSecret', 'fraud-hash-secret', 'HMAC of the CPF for fraud prevention'),
      PICKUP_CODE_SECRET: signing('PickupCodeSecret', 'pickup-code-secret', 'HMAC of the depot pickup codes'),
    };

    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: `volti-${env}`,
      vpc,
      containerInsightsV2: cfg.disposable ? ecs.ContainerInsights.DISABLED : ecs.ContainerInsights.ENABLED,
    });

    const logGroup = new logs.LogGroup(this, 'ApiLogs', {
      logGroupName: `/volti/${env}/api`,
      retention: cfg.logRetentionDays as logs.RetentionDays,
      removalPolicy: cfg.disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    });

    const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn);

    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Api', {
      serviceName: `volti-${env}-api`,
      cluster,
      cpu: cfg.apiCpu,
      memoryLimitMiB: cfg.apiMemoryMiB,
      // The pattern rejects 0, so 1 here and the CFN property is overridden below.
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      publicLoadBalancer: true,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificate,
      sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS,
      redirectHTTP: true,
      circuitBreaker: { rollback: true },
      assignPublicIp: false,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(this.repository, props.imageTag),
        containerPort: API_PORT,
        logDriver: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'api' }),
        // Same variable names as .env.example, switched to the real AWS adapters.
        environment: {
          NODE_ENV: 'production',
          PORT: String(API_PORT),
          DB_HOST: data.db.dbInstanceEndpointAddress,
          DB_PORT: data.db.dbInstanceEndpointPort,
          DB_NAME: data.dbName,
          REDIS_URL: `rediss://${data.redis.attrPrimaryEndPointAddress}:${data.redis.attrPrimaryEndPointPort}`,
          S3_BUCKET_KYC: data.kycBucket.bucketName,
          S3_BUCKET_RETURN_PHOTOS: data.returnPhotosBucket.bucketName,
          S3_BUCKET_REPORTS: data.reportsBucket.bucketName,
          S3_BUCKET_ATTACHMENTS: data.attachmentsBucket.bucketName,
          S3_BUCKET_CATALOG: data.catalogBucket.bucketName,
          // The entrypoint (scripts/start.mjs) applies the Prisma migrations before starting (advisory lock: safe with N tasks).
          RUN_MIGRATIONS: 'true',
          // QA-10/QA-18: CORS só para o painel; a API está atrás do ALB (um salto de proxy).
          CORS_ORIGINS: props.adminOrigin,
          TRUST_PROXY: '1',
          AUTH_MODE: 'cognito',
          COGNITO_CUSTOMER_POOL_ID: auth.customerPool.userPoolId,
          COGNITO_CUSTOMER_CLIENT_ID: auth.customerClient.userPoolClientId,
          COGNITO_STAFF_POOL_ID: auth.staffPool.userPoolId,
          COGNITO_STAFF_CLIENT_ID: auth.staffClient.userPoolClientId,
          // Lacunas T5: o pool interno aceita o painel e o app do operador.
          COGNITO_STAFF_CLIENT_IDS: `${auth.staffClient.userPoolClientId},${auth.operatorClient.userPoolClientId}`,
          IOT_MODE: 'aws',
          GEOFENCE_MODE: 'aws',
          LOCATION_TRACKER_NAME: iot.trackerName,
          LOCATION_GEOFENCE_COLLECTION: iot.geofenceCollectionName,
          GEOCODER_MODE: 'aws',
          LOCATION_PLACE_INDEX: iot.placeIndexName,
          // QA-02: valores e nomes iguais aos do services/api/src/config/env.ts (antes: 'aws' caía na fila em processo e a telemetria do SQS nunca era lida).
          QUEUE_MODE: 'sqs',
          SQS_QUEUE_TELEMETRIA_URL: messaging.telemetry.queue.queueUrl,
          SQS_QUEUE_PAGAMENTOS_WEBHOOK_URL: messaging.paymentsWebhook.queue.queueUrl,
          SQS_QUEUE_ALERTAS_URL: messaging.alerts.queue.queueUrl,
          SQS_QUEUE_ESTACOES_URL: messaging.stations.queue.queueUrl,
          STORAGE_MODE: 's3',
          PAYMENT_PROVIDER: cfg.paymentProvider,
          // The API refuses PAYMENT_PROVIDER=fake with NODE_ENV=production unless explicitly allowed (dev only, no real customers).
          ...(cfg.paymentProvider === 'fake' ? { ALLOW_FAKE_PAYMENTS: 'true' } : {}),
          INSURANCE_PROVIDER: 'mock',
          INVOICE_ISSUER: 'mock',
          KYC_PROVIDER: 'mock',
          // 'fcm' once the FcmSecret holds the real Firebase service account (the API validates the JSON at startup).
          PUSH_MODE: 'log',
          TRACK_RETENTION_DAYS: '90',
          OUT_OF_AREA_LOCK_MINUTES: '5',
          AWS_REGION: cfg.region,
        },
        secrets: {
          DB_USER: ecs.Secret.fromSecretsManager(data.db.secret!, 'username'),
          DB_PASSWORD: ecs.Secret.fromSecretsManager(data.db.secret!, 'password'),
          IOT_ENDPOINT: ecs.Secret.fromSsmParameter(iot.endpointParam),
          MERCADOPAGO_ACCESS_TOKEN: ecs.Secret.fromSecretsManager(this.appSecret, 'MERCADOPAGO_ACCESS_TOKEN'),
          MERCADOPAGO_WEBHOOK_SECRET: ecs.Secret.fromSecretsManager(this.appSecret, 'MERCADOPAGO_WEBHOOK_SECRET'),
          STATION_QR_SECRET: ecs.Secret.fromSecretsManager(this.signingSecrets.STATION_QR_SECRET),
          FRAUD_HASH_SECRET: ecs.Secret.fromSecretsManager(this.signingSecrets.FRAUD_HASH_SECRET),
          PICKUP_CODE_SECRET: ecs.Secret.fromSecretsManager(this.signingSecrets.PICKUP_CODE_SECRET),
          FCM_SERVICE_ACCOUNT_JSON: ecs.Secret.fromSecretsManager(this.fcmSecret),
        },
      },
    });

    // Public SOS location-share page (served by the API at /share); required in production. Without a domain, the ALB DNS
    // (HTTPS works only once the certificate covers the name the link uses: set -c domainName).
    this.service.taskDefinition.defaultContainer!.addEnvironment(
      'PUBLIC_SHARE_BASE_URL',
      `https://${props.apiDomainName ?? this.service.loadBalancer.loadBalancerDnsName}/share`,
    );

    (this.service.service.node.defaultChild as ecs.CfnService).desiredCount = desiredCount;
    this.minHealthyTasks = desiredCount === 0 ? 0 : Math.min(cfg.apiMinTasks, desiredCount);

    this.service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: Duration.seconds(30),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });
    this.service.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

    this.service.service
      .autoScaleTaskCount({ minCapacity: desiredCount === 0 ? 0 : cfg.apiMinTasks, maxCapacity: cfg.apiMaxTasks })
      .scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: cfg.apiCpuTargetPercent,
        scaleInCooldown: Duration.minutes(5),
        scaleOutCooldown: Duration.minutes(1),
      });

    // Task role (least privilege).
    const role = this.service.taskDefinition.taskRole as iam.Role;
    data.kycBucket.grantReadWrite(role);
    data.returnPhotosBucket.grantReadWrite(role);
    data.reportsBucket.grantReadWrite(role);
    data.attachmentsBucket.grantReadWrite(role);
    data.catalogBucket.grantReadWrite(role);
    messaging.telemetry.queue.grantConsumeMessages(role);
    messaging.alerts.queue.grantConsumeMessages(role);
    messaging.stations.queue.grantConsumeMessages(role);
    messaging.paymentsWebhook.queue.grantSendMessages(role);
    messaging.paymentsWebhook.queue.grantConsumeMessages(role);
    const arn = (suffix: string) => `arn:aws:${suffix}`;
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iot:Publish'],
        // QA-16: só comandos e shadow; nunca telemetria/eventos (que são do rastreador ou da estação).
        resources: [
          arn(`iot:${this.region}:${this.account}:topic/motos/*/comandos`),
          arn(`iot:${this.region}:${this.account}:topic/estacoes/*/comandos`),
          arn(`iot:${this.region}:${this.account}:topic/$aws/things/*/shadow/update`),
          arn(`iot:${this.region}:${this.account}:topic/$aws/things/*/shadow/get`),
        ],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iot:GetThingShadow', 'iot:UpdateThingShadow'],
        resources: [arn(`iot:${this.region}:${this.account}:thing/*`)],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['geo:BatchUpdateDevicePosition', 'geo:GetDevicePosition', 'geo:ListDevicePositions', 'geo:BatchEvaluateGeofences'],
        resources: [arn(`geo:${this.region}:${this.account}:tracker/${iot.trackerName}`)],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['geo:PutGeofence', 'geo:BatchPutGeofence', 'geo:GetGeofence', 'geo:ListGeofences', 'geo:BatchDeleteGeofence'],
        resources: [arn(`geo:${this.region}:${this.account}:geofence-collection/${iot.geofenceCollectionName}`)],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['geo:SearchPlaceIndexForPosition'],
        resources: [arn(`geo:${this.region}:${this.account}:place-index/${iot.placeIndexName}`)],
      }),
    );
    // QA-04/QA-07: grupos e exclusão/bloqueio de identidades. Escopo: só os dois pools.
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminRemoveUserFromGroup',
          'cognito-idp:AdminEnableUser',
          'cognito-idp:AdminDisableUser',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminUserGlobalSignOut',
        ],
        resources: [auth.staffPool.userPoolArn],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminDeleteUser', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminUserGlobalSignOut'],
        resources: [auth.customerPool.userPoolArn],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminGetUser'],
        resources: [auth.customerPool.userPoolArn, auth.staffPool.userPoolArn],
      }),
    );

    // QA-18: WAF regional no ALB: limite por IP (por ambiente, em 5 minutos) e regras gerenciadas da AWS.
    const vis = (name: string) => ({ cloudWatchMetricsEnabled: true, sampledRequestsEnabled: true, metricName: name });
    const managed = (name: string, priority: number, countOnly: string[] = []): wafv2.CfnWebACL.RuleProperty => ({
      name,
      priority,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name,
          ruleActionOverrides: countOnly.length ? countOnly.map((rule) => ({ name: rule, actionToUse: { count: {} } })) : undefined,
        },
      },
      visibilityConfig: vis(`Api${name}`),
    });
    const albAcl = new wafv2.CfnWebACL(this, 'AlbAcl', {
      name: `volti-${env}-api`,
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: vis(`volti-${env}-api`),
      rules: [
        {
          name: 'RateLimitPerIp',
          priority: 10,
          action: { block: {} },
          statement: { rateBasedStatement: { limit: cfg.apiRateLimitPer5Min, aggregateKeyType: 'IP', evaluationWindowSec: 300 } },
          visibilityConfig: vis('ApiRateLimitPerIp'),
        },
        managed('AWSManagedRulesAmazonIpReputationList', 20),
        managed('AWSManagedRulesKnownBadInputsRuleSet', 30),
        // SizeRestrictions_BODY (8 KB) only counts: zone polygons from the panel are legitimately larger (Express caps at 100 KB).
        managed('AWSManagedRulesCommonRuleSet', 40, ['SizeRestrictions_BODY']),
      ],
    });
    new wafv2.CfnWebACLAssociation(this, 'AlbAclAssociation', {
      resourceArn: this.service.loadBalancer.loadBalancerArn,
      webAclArn: albAcl.attrArn,
    });

    publishParam(this, env, 'api/load-balancer-dns', this.service.loadBalancer.loadBalancerDnsName);
    publishParam(this, env, 'api/ecr-repository', this.repository.repositoryUri);
  }
}
