import { Match } from 'aws-cdk-lib/assertions';
import { stacksFor, templateOf } from './helpers';

describe.each(['dev', 'prod'] as const)('DataStack (%s)', (env) => {
  const t = () => templateOf(stacksFor(env).data);

  it('RDS is Postgres 16, encrypted, private, with backups (prod >= 7 days, dev 1 day)', () => {
    t().hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      EngineVersion: Match.stringLikeRegexp('^16'),
      StorageEncrypted: true,
      PubliclyAccessible: false,
      BackupRetentionPeriod: Match.anyValue(),
      KmsKeyId: Match.anyValue(),
    });
    const db = Object.values(t().findResources('AWS::RDS::DBInstance'))[0] as any;
    expect(db.Properties.BackupRetentionPeriod).toBeGreaterThanOrEqual(env === 'prod' ? 7 : 1);
  });

  it('all buckets block public access and are encrypted; KYC uses KMS', () => {
    const buckets = t().findResources('AWS::S3::Bucket');
    expect(Object.keys(buckets)).toHaveLength(5);
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
    t().hasResourceProperties('AWS::S3::Bucket', { BucketName: Match.stringLikeRegexp('anexos') });
    t().hasResourceProperties('AWS::S3::Bucket', { BucketName: Match.stringLikeRegexp('catalogo') });
  });

  it('catalog bucket: CORS only for the admin panel origin (browser uploads by presigned URL), never *', () => {
    const catalog = Object.entries(t().findResources('AWS::S3::Bucket')).find(([id]) => id.startsWith('CatalogBucket'))![1] as any;
    const rules = catalog.Properties.CorsConfiguration.CorsRules;
    expect(rules).toHaveLength(1);
    expect(rules[0].AllowedMethods.sort()).toEqual(['GET', 'PUT']);
    const origins = JSON.stringify(rules[0].AllowedOrigins);
    expect(origins).not.toContain('*');
    expect(origins).toMatch(/https:\/\//);
    if (env === 'dev') expect(rules[0].AllowedOrigins).toContain('http://localhost:3100');
    else expect(origins).not.toMatch(/localhost/);
    // Only the other buckets stay without CORS.
    const withCors = Object.values(t().findResources('AWS::S3::Bucket')).filter((b: any) => b.Properties.CorsConfiguration);
    expect(withCors).toHaveLength(1);
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

  it('lacunas T5 (revisão I2): Redis com maxmemory-policy noeviction (estado de segurança sem TTL nunca é expulso)', () => {
    t().hasResourceProperties('AWS::ElastiCache::ParameterGroup', { CacheParameterGroupFamily: 'redis7', Properties: { 'maxmemory-policy': 'noeviction' } });
    const groups = t().findResources('AWS::ElastiCache::ParameterGroup');
    const [id] = Object.keys(groups);
    t().hasResourceProperties('AWS::ElastiCache::ReplicationGroup', { CacheParameterGroupName: { Ref: id } });
  });

  it('publishes the SSM parameters', () => {
    for (const n of ['rds/endpoint', 'rds/secret-arn', 'redis/endpoint', 's3/kyc-bucket', 's3/return-photos-bucket', 's3/reports-bucket', 's3/attachments-bucket', 's3/catalog-bucket']) {
      t().hasResourceProperties('AWS::SSM::Parameter', { Name: `/volti/${env}/${n}` });
    }
  });
});
