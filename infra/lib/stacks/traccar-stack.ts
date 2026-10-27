import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { DataStack } from './data-stack';
import { IotStack } from './iot-stack';
import { apiSubnetType } from './network-stack';

export const GT06_PORT = 5023;
export const TRACCAR_WEB_PORT = 8082;
/** Imagem oficial fixada (multi-arquitetura; arm64 conferido no plano GT06, Task 13 Step 1). */
export const TRACCAR_IMAGE = 'traccar/traccar:6.16.0-ubuntu';
const THING_NAME = /^moto-\d{4,}$/;

export interface TraccarStackProps extends StackProps {
  cfg: EnvConfig;
  vpc: ec2.IVpc;
  data: DataStack;
  iot: IotStack;
  /** thingNames `relay_only` que a ponte pode atualizar (a política IoT os enumera: J16 novo em prod exige deploy). */
  gt06Things: string[];
  /** Faixas da APN privada. Vazio = 5023 aberta (só bancada; prod recusa). */
  apnCidrs?: string[];
  bridgeImageTag?: string;
}

/** Política do certificado de serviço da ponte: telemetria/eventos e o shadow só dos things listados. */
export function buildBridgePolicyDocument(region: string, account: string, env: string, things: string[]) {
  const arn = (kind: 'client' | 'topic' | 'topicfilter', name: string) => `arn:aws:iot:${region}:${account}:${kind}/${name}`;
  return {
    Version: '2012-10-17',
    Statement: [
      { Effect: 'Allow', Action: 'iot:Connect', Resource: [arn('client', `traccar-bridge-${env}`)] },
      {
        Effect: 'Allow',
        Action: 'iot:Publish',
        Resource: things.flatMap((t) => [arn('topic', `motos/${t}/telemetria`), arn('topic', `motos/${t}/eventos`), arn('topic', `$aws/things/${t}/shadow/update`), arn('topic', `$aws/things/${t}/shadow/get`)]),
      },
      {
        Effect: 'Allow',
        Action: 'iot:Subscribe',
        Resource: things.flatMap((t) => [arn('topicfilter', `$aws/things/${t}/shadow/update/delta`), arn('topicfilter', `$aws/things/${t}/shadow/get/accepted`), arn('topicfilter', `motos/${t}/comandos`)]),
      },
      {
        Effect: 'Allow',
        Action: 'iot:Receive',
        Resource: things.flatMap((t) => [arn('topic', `$aws/things/${t}/shadow/update/delta`), arn('topic', `$aws/things/${t}/shadow/get/accepted`), arn('topic', `motos/${t}/comandos`)]),
      },
    ],
  };
}

/**
 * Proposta (spec GT06 §8; sem deploy validado): Traccar em uma task Fargate ARM64 atrás de um NLB TCP 5023 (o NLB preserva o
 * IP de origem; o security group restringe às faixas da APN), REST 8082 só para a ponte (Cloud Map), banco `traccar` no RDS
 * existente; a ponte em Fargate publica no IoT Core com certificado de serviço. Ações manuais do dono no infra/README.md.
 */
export class TraccarStack extends Stack {
  public readonly nlb: elbv2.NetworkLoadBalancer;
  public readonly traccarService: ecs.FargateService;
  public readonly bridgeService: ecs.FargateService;
  public readonly bridgeRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: TraccarStackProps) {
    super(scope, id, props);
    const { cfg, vpc, data } = props;
    const env = cfg.name;
    if (!props.gt06Things.length || props.gt06Things.some((t) => !THING_NAME.test(t))) throw new Error('gt06Things: informe os thingNames relay_only (moto-0000), separados por vírgula.');
    if (env === 'prod' && !props.apnCidrs?.length) throw new Error('prod exige apnCidrs: o GT06 não tem TLS e só entra por APN privada (spec GT06 §6.5).');
    const removal = cfg.disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;
    const subnetType = apiSubnetType(cfg);
    const assignPublicIp = subnetType === ec2.SubnetType.PUBLIC;
    const runtimePlatform = { cpuArchitecture: ecs.CpuArchitecture.ARM64, operatingSystemFamily: ecs.OperatingSystemFamily.LINUX };

    const cluster = new ecs.Cluster(this, 'Cluster', { clusterName: `volti-${env}-traccar`, vpc });
    const namespace = new servicediscovery.PrivateDnsNamespace(this, 'Namespace', { name: `traccar.volti-${env}.internal`, vpc });
    const logGroup = new logs.LogGroup(this, 'Logs', { logGroupName: `/volti/${env}/traccar`, retention: cfg.logRetentionDays as logs.RetentionDays, removalPolicy: removal });
    const secret = (key: string, name: string, description: string) =>
      new secretsmanager.Secret(this, key, { secretName: `volti/${env}/${name}`, description, generateSecretString: { passwordLength: 40, excludePunctuation: true }, removalPolicy: removal });
    const traccarDb = secret('TraccarDbSecret', 'traccar-db', 'Senha do papel traccar (database traccar no RDS)');
    secret('TraccarAdminSecret', 'traccar-admin', 'Senha de admin@volti.local no Traccar (provisionamento)');
    const bridgeUser = secret('BridgeUserSecret', 'traccar-bridge-user', 'Senha de bridge@volti.local no Traccar');
    const bridgeDb = secret('BridgeDbSecret', 'traccar-bridge-db', 'Senha do papel volti_bridge (SELECT em 3 colunas de "Tracker")');
    const bridgeCert = new secretsmanager.Secret(this, 'BridgeIotCert', {
      secretName: `volti/${env}/traccar-bridge-iot`,
      description: 'Certificado de serviço da ponte no IoT Core: colar certificatePem e privateKey (aws iot create-keys-and-certificate)',
      generateSecretString: { secretStringTemplate: JSON.stringify({ certificatePem: 'CHANGE_ME' }), generateStringKey: 'privateKey', excludePunctuation: true },
      removalPolicy: removal,
    });

    const traccarSg = new ec2.SecurityGroup(this, 'TraccarSg', { vpc, description: 'Traccar: GT06 5023 (APN via NLB), REST 8082 so da ponte', allowAllOutbound: true });
    const bridgeSg = new ec2.SecurityGroup(this, 'BridgeSg', { vpc, description: 'traccar-bridge', allowAllOutbound: true });
    const sources = props.apnCidrs?.length ? props.apnCidrs.map((c) => ec2.Peer.ipv4(c)) : [ec2.Peer.anyIpv4()];
    for (const p of sources) traccarSg.addIngressRule(p, ec2.Port.tcp(GT06_PORT), 'GT06 (o NLB preserva o IP de origem)');
    traccarSg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(GT06_PORT), 'Health check do NLB');
    traccarSg.addIngressRule(bridgeSg, ec2.Port.tcp(TRACCAR_WEB_PORT), 'REST/WebSocket do Traccar so para a ponte');

    const traccarTask = new ecs.FargateTaskDefinition(this, 'TraccarTask', { cpu: 512, memoryLimitMiB: 1024, runtimePlatform });
    traccarTask.addContainer('traccar', {
      image: ecs.ContainerImage.fromRegistry(TRACCAR_IMAGE),
      entryPoint: ['java', '-Xms256m', '-Xmx640m', '-Djava.net.preferIPv4Stack=true'],
      command: ['-jar', 'tracker-server.jar', 'conf/traccar.xml'],
      environment: {
        CONFIG_USE_ENVIRONMENT_VARIABLES: 'true',
        DATABASE_DRIVER: 'org.postgresql.Driver',
        DATABASE_URL: `jdbc:postgresql://${data.db.dbInstanceEndpointAddress}:5432/traccar`,
        DATABASE_USER: 'traccar',
        PROTOCOLS_ENABLE: 'gt06',
        GT06_PORT: String(GT06_PORT),
        WEB_PORT: String(TRACCAR_WEB_PORT),
      },
      secrets: { DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(traccarDb) },
      portMappings: [{ containerPort: GT06_PORT }, { containerPort: TRACCAR_WEB_PORT }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'traccar', logGroup }),
    });
    // Uma task por vez: duas dividiriam as conexões TCP dos rastreadores e os comandos.
    this.traccarService = new ecs.FargateService(this, 'Traccar', {
      serviceName: `volti-${env}-traccar`,
      cluster,
      taskDefinition: traccarTask,
      desiredCount: 0,
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      securityGroups: [traccarSg],
      assignPublicIp,
      vpcSubnets: { subnetType },
      cloudMapOptions: { name: 'traccar', cloudMapNamespace: namespace },
    });

    this.nlb = new elbv2.NetworkLoadBalancer(this, 'Gt06Nlb', { loadBalancerName: `volti-${env}-gt06`, vpc, internetFacing: true, vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC } });
    this.nlb.addListener('Gt06', { port: GT06_PORT, protocol: elbv2.Protocol.TCP }).addTargets('Traccar', {
      port: GT06_PORT,
      protocol: elbv2.Protocol.TCP,
      preserveClientIp: true,
      targets: [this.traccarService.loadBalancerTarget({ containerName: 'traccar', containerPort: GT06_PORT })],
      healthCheck: { protocol: elbv2.Protocol.TCP },
    });

    this.bridgeRepository = new ecr.Repository(this, 'BridgeRepo', {
      repositoryName: `volti-${env}-traccar-bridge`,
      imageScanOnPush: true,
      removalPolicy: removal,
      emptyOnDelete: cfg.disposable,
      lifecycleRules: [{ maxImageCount: cfg.ecrMaxImages }],
    });
    const bridgeTask = new ecs.FargateTaskDefinition(this, 'BridgeTask', { cpu: 256, memoryLimitMiB: 512, runtimePlatform });
    bridgeTask.addContainer('bridge', {
      image: ecs.ContainerImage.fromEcrRepository(this.bridgeRepository, props.bridgeImageTag ?? 'latest'),
      environment: {
        IOT_MODE: 'aws',
        IOT_ENDPOINT: props.iot.endpointParam.stringValue,
        MQTT_CLIENT_ID: `traccar-bridge-${env}`,
        TRACCAR_URL: `http://traccar.${namespace.namespaceName}:${TRACCAR_WEB_PORT}`,
        TRACCAR_EMAIL: 'bridge@volti.local',
        DATABASE_HOST: data.db.dbInstanceEndpointAddress,
        DATABASE_NAME: data.dbName,
        DATABASE_USER: 'volti_bridge',
        DATABASE_SSL: 'require',
        BATTERY_MODEL: '72v',
      },
      secrets: {
        TRACCAR_PASSWORD: ecs.Secret.fromSecretsManager(bridgeUser),
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(bridgeDb),
        MQTT_CERT_PEM: ecs.Secret.fromSecretsManager(bridgeCert, 'certificatePem'),
        MQTT_KEY_PEM: ecs.Secret.fromSecretsManager(bridgeCert, 'privateKey'),
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'bridge', logGroup }),
    });
    this.bridgeService = new ecs.FargateService(this, 'Bridge', {
      serviceName: `volti-${env}-traccar-bridge`,
      cluster,
      taskDefinition: bridgeTask,
      desiredCount: 0,
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      securityGroups: [bridgeSg],
      assignPublicIp,
      vpcSubnets: { subnetType },
    });

    new iot.CfnPolicy(this, 'BridgePolicy', { policyName: `volti-${env}-traccar-bridge-policy`, policyDocument: buildBridgePolicyDocument(this.region, this.account, env, props.gt06Things) });
  }
}
