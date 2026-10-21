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
  imageTag: string;
  /** 0 on the first deploy (no image in ECR yet); set to >= 1 once an image is pushed. */
  desiredCount: number;
}

export const API_PORT = 3000;

export class ApiStack extends Stack {
  public readonly repository: ecr.Repository;
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly appSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { cfg, vpc, data, auth, messaging, iot, desiredCount } = props;
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
        secretStringTemplate: JSON.stringify({
          MERCADOPAGO_ACCESS_TOKEN: 'CHANGE_ME',
          MERCADOPAGO_WEBHOOK_SECRET: 'CHANGE_ME',
        }),
        generateStringKey: 'unused',
      },
    });

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
          AUTH_MODE: 'cognito',
          COGNITO_CUSTOMER_POOL_ID: auth.customerPool.userPoolId,
          COGNITO_CUSTOMER_CLIENT_ID: auth.customerClient.userPoolClientId,
          COGNITO_STAFF_POOL_ID: auth.staffPool.userPoolId,
          COGNITO_STAFF_CLIENT_ID: auth.staffClient.userPoolClientId,
          IOT_MODE: 'aws',
          GEOFENCE_MODE: 'aws',
          LOCATION_TRACKER_NAME: iot.trackerName,
          LOCATION_GEOFENCE_COLLECTION: iot.geofenceCollectionName,
          // QA-02: valores e nomes iguais aos do services/api/src/config/env.ts (antes: 'aws' caía na fila em processo e a telemetria do SQS nunca era lida).
          QUEUE_MODE: 'sqs',
          SQS_QUEUE_TELEMETRIA_URL: messaging.telemetry.queue.queueUrl,
          SQS_QUEUE_PAGAMENTOS_WEBHOOK_URL: messaging.paymentsWebhook.queue.queueUrl,
          SQS_QUEUE_ALERTAS_URL: messaging.alerts.queue.queueUrl,
          STORAGE_MODE: 's3',
          PAYMENT_PROVIDER: cfg.paymentProvider,
          INSURANCE_PROVIDER: 'mock',
          KYC_PROVIDER: 'mock',
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
        },
      },
    });

    (this.service.service.node.defaultChild as ecs.CfnService).desiredCount = desiredCount;

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
    messaging.telemetry.queue.grantConsumeMessages(role);
    messaging.alerts.queue.grantConsumeMessages(role);
    messaging.paymentsWebhook.queue.grantSendMessages(role);
    messaging.paymentsWebhook.queue.grantConsumeMessages(role);
    const arn = (suffix: string) => `arn:aws:${suffix}`;
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iot:Publish'],
        resources: [arn(`iot:${this.region}:${this.account}:topic/motos/*`), arn(`iot:${this.region}:${this.account}:topic/$aws/things/*/shadow/*`)],
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
        actions: ['cognito-idp:AdminGetUser', 'cognito-idp:AdminDeleteUser', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminUserGlobalSignOut'],
        resources: [auth.customerPool.userPoolArn, auth.staffPool.userPoolArn],
      }),
    );

    publishParam(this, env, 'api/load-balancer-dns', this.service.loadBalancer.loadBalancerDnsName);
    publishParam(this, env, 'api/ecr-repository', this.repository.repositoryUri);
  }
}
