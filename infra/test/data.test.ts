import { Match } from 'aws-cdk-lib/assertions';
import { stacksFor, templateOf } from './helpers';

describe.each(['dev', 'prod'] as const)('DataStack (%s)', (env) => {
  const t = () => templateOf(stacksFor(env).data);

  it('RDS is Postgres 16, encrypted, private, with >= 7 days of backups', () => {
    t().hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      EngineVersion: Match.stringLikeRegexp('^16'),
      StorageEncrypted: true,
      PubliclyAccessible: false,
      BackupRetentionPeriod: Match.anyValue(),
      KmsKeyId: Match.anyValue(),
    });
    const db = Object.values(t().findResources('AWS::RDS::DBInstance'))[0] as any;
    expect(db.Properties.BackupRetentionPeriod).toBeGreaterThanOrEqual(7);
  });

  it('all buckets block public access and are encrypted; KYC uses KMS', () => {
    const buckets = t().findResources('AWS::S3::Bucket');
    expect(Object.keys(buckets)).toHaveLength(3);
    for (const b of Object.values(buckets) as any[]) {
      expect(b.Properties.PublicAccessBlockConfiguration).toEqual({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      });
      expect(b.Properties.BucketEncryption.ServerSideEncryptionConfiguration).toHaveLength(1);
    }
    t().hasResourceProperties('AWS::S3::Bucket', {
      BucketName: Match.stringLikeRegexp('documentos-kyc'),
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          Match.objectLike({
            ServerSideEncryptionByDefault: { SSEAlgorithm: 'aws:kms', KMSMasterKeyID: Match.anyValue() },
          }),
        ],
      },
    });
    t().hasResourceProperties('AWS::S3::Bucket', { BucketName: Match.stringLikeRegexp('fotos-devolucao') });
    t().hasResourceProperties('AWS::S3::Bucket', { BucketName: Match.stringLikeRegexp('relatorios') });
  });

  it('buckets have lifecycle rules', () => {
    for (const b of Object.values(t().findResources('AWS::S3::Bucket')) as any[]) {
      expect(b.Properties.LifecycleConfiguration.Rules.length).toBeGreaterThan(0);
    }
  });

  it('Redis is encrypted at rest and in transit', () => {
    t().hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      Engine: 'redis',
      AtRestEncryptionEnabled: true,
      TransitEncryptionEnabled: true,
    });
  });

  it('publishes the SSM parameters', () => {
    for (const n of ['rds/endpoint', 'rds/secret-arn', 'redis/endpoint', 's3/kyc-bucket', 's3/return-photos-bucket', 's3/reports-bucket']) {
      t().hasResourceProperties('AWS::SSM::Parameter', { Name: `/volti/${env}/${n}` });
    }
  });
});
