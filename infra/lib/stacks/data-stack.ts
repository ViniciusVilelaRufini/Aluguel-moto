import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { publishParam } from '../ssm';

export interface DataStackProps extends StackProps {
  cfg: EnvConfig;
  vpc: ec2.IVpc;
}

export class DataStack extends Stack {
  public readonly db: rds.DatabaseInstance;
  public readonly dbName = 'volti';
  public readonly redis: elasticache.CfnReplicationGroup;
  public readonly kycBucket: s3.Bucket;
  public readonly returnPhotosBucket: s3.Bucket;
  public readonly reportsBucket: s3.Bucket;
  public readonly attachmentsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);
    const { cfg, vpc } = props;
    const env = cfg.name;

    const dataKey = new kms.Key(this, 'DataKey', {
      alias: `alias/volti-${env}-data`,
      description: `Volti ${env} data encryption (RDS)`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const kycKey = new kms.Key(this, 'KycKey', {
      alias: `alias/volti-${env}-kyc`,
      description: `Volti ${env} KYC documents encryption`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // PostgreSQL 16. PostGIS needs only "CREATE EXTENSION postgis;" in the migration (no parameter change).
    const dbSg = new ec2.SecurityGroup(this, 'DbSg', { vpc, description: 'Volti Postgres', allowAllOutbound: false });
    dbSg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(5432), 'Postgres from inside the VPC');

    this.db = new rds.DatabaseInstance(this, 'Postgres', {
      instanceIdentifier: `volti-${env}`,
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      instanceType: new ec2.InstanceType(cfg.dbInstanceClass),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSg],
      publiclyAccessible: false,
      multiAz: cfg.dbMultiAz,
      allocatedStorage: cfg.dbAllocatedGb,
      maxAllocatedStorage: cfg.dbMaxAllocatedGb,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      storageEncryptionKey: dataKey,
      databaseName: this.dbName,
      credentials: rds.Credentials.fromGeneratedSecret('volti', { secretName: `volti/${env}/rds` }),
      backupRetention: Duration.days(cfg.dbBackupDays),
      deletionProtection: cfg.dbDeletionProtection,
      removalPolicy: cfg.disposable ? RemovalPolicy.SNAPSHOT : RemovalPolicy.RETAIN,
      autoMinorVersionUpgrade: true,
    });

    // Redis replication group: 1 node in dev, 2 with failover in prod.
    // In-transit encryption is on, so clients must use rediss://.
    const redisSg = new ec2.SecurityGroup(this, 'RedisSg', { vpc, description: 'Volti Redis', allowAllOutbound: false });
    redisSg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(6379), 'Redis from inside the VPC');
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnets', {
      description: `Volti ${env} Redis subnets`,
      subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
    });
    const ha = cfg.redisNodes > 1;
    this.redis = new elasticache.CfnReplicationGroup(this, 'Redis', {
      replicationGroupDescription: `Volti ${env} Redis`,
      engine: 'redis',
      engineVersion: '7.1',
      cacheNodeType: cfg.redisNodeType,
      numCacheClusters: cfg.redisNodes,
      automaticFailoverEnabled: ha,
      multiAzEnabled: ha,
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      cacheSubnetGroupName: subnetGroup.ref,
      securityGroupIds: [redisSg.securityGroupId],
      port: 6379,
      autoMinorVersionUpgrade: true,
    });

    const common = {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    };
    const name = (suffix: string) => `volti-${env}-${this.account}-${suffix}`;

    this.kycBucket = new s3.Bucket(this, 'KycBucket', {
      ...common,
      bucketName: name('documentos-kyc'),
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kycKey,
      bucketKeyEnabled: true,
      versioned: true,
      lifecycleRules: [
        {
          id: 'expire-old-versions',
          noncurrentVersionExpiration: Duration.days(90),
          abortIncompleteMultipartUploadAfter: Duration.days(7),
        },
      ],
    });
    this.returnPhotosBucket = new s3.Bucket(this, 'ReturnPhotosBucket', {
      ...common,
      bucketName: name('fotos-devolucao'),
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'tier-and-expire',
          transitions: [{ storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: Duration.days(90) }],
          expiration: Duration.days(365),
          abortIncompleteMultipartUploadAfter: Duration.days(7),
        },
      ],
    });
    this.reportsBucket = new s3.Bucket(this, 'ReportsBucket', {
      ...common,
      bucketName: name('relatorios'),
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'tier-and-expire',
          transitions: [{ storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: Duration.days(30) }],
          expiration: Duration.days(730),
          abortIncompleteMultipartUploadAfter: Duration.days(7),
        },
      ],
    });

    // QA-06: anexos de suporte e tarefas de campo (S3_BUCKET_ATTACHMENTS). Upload por URL pré-assinada; só a task da API acessa.
    this.attachmentsBucket = new s3.Bucket(this, 'AttachmentsBucket', {
      ...common,
      bucketName: name('anexos'),
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'tier-and-expire',
          transitions: [{ storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: Duration.days(90) }],
          expiration: Duration.days(365),
          abortIncompleteMultipartUploadAfter: Duration.days(7),
        },
      ],
    });

    publishParam(this, env, 'rds/endpoint', this.db.dbInstanceEndpointAddress);
    publishParam(this, env, 'rds/secret-arn', this.db.secret!.secretArn);
    publishParam(this, env, 'redis/endpoint', this.redis.attrPrimaryEndPointAddress);
    publishParam(this, env, 's3/kyc-bucket', this.kycBucket.bucketName);
    publishParam(this, env, 's3/return-photos-bucket', this.returnPhotosBucket.bucketName);
    publishParam(this, env, 's3/reports-bucket', this.reportsBucket.bucketName);
    publishParam(this, env, 's3/attachments-bucket', this.attachmentsBucket.bucketName);
  }
}
