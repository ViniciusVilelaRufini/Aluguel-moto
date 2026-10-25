import { existsSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Template } from 'aws-cdk-lib/assertions';
import { createSingleDevApp } from '../lib/volti-app';

/** `-c env=dev -c profile=single` (lacunas T20, docs/decisoes.md): one EC2 instance with Docker Compose. */
describe('profile=single (dev on one EC2 instance)', () => {
  const outdir = mkdtempSync(join(tmpdir(), 'volti-single-'));
  const s = createSingleDevApp({
    vpcId: 'vpc-0123456789abcdef0',
    subnetId: 'subnet-0123456789abcdef0',
    budgetEmail: 'orcamento@example.com',
    outdir,
  });
  const stacks = [s.adminWeb, s.auth, s.single];
  const t = Template.fromStack(s.single);
  const all = stacks.map((st) => Template.fromStack(st));
  const resources = (tpl: Template, type: string) => Object.values(tpl.findResources(type)) as any[];
  const instance = () => resources(t, 'AWS::EC2::Instance')[0].Properties;
  const userData = () => JSON.stringify(instance().UserData);
  const REPO = join(__dirname, '..', '..');

  it('creates exactly 3 stacks with names prefixed volti-dev-, bootstrapped with the "volti" qualifier', () => {
    expect(stacks.map((x) => x.stackName).sort()).toEqual(['volti-dev-admin-web', 'volti-dev-auth', 'volti-dev-single']);
    const assembly = s.app.synth();
    expect(assembly.stacks.map((x) => x.stackName).sort()).toEqual(['volti-dev-admin-web', 'volti-dev-auth', 'volti-dev-single']);
    for (const st of assembly.stacks) expect(st.assumeRoleArn).toMatch(/cdk-volti-deploy-role/);
  });

  it('no Docker-built asset (deployable from CloudShell): asset manifests list no docker images', () => {
    const assembly = s.app.synth();
    for (const st of assembly.stacks) {
      const manifest = JSON.parse(readFileSync(join(assembly.directory, `${st.stackName}.assets.json`), 'utf8'));
      expect(manifest.dockerImages ?? {}).toEqual({});
      // Only CloudFormation templates as file assets (no Lambda bundles, no custom resource providers).
      for (const f of Object.values(manifest.files ?? {}) as any[]) expect(f.source.path).toMatch(/^volti-dev-[a-z-]+\.template\.json$/);
    }
  });

  it('one t4g.small Amazon Linux 2023 ARM instance: IMDSv2 required (2 hops for the containers), encrypted gp3 root, public IP, no SSH key', () => {
    t.resourceCountIs('AWS::EC2::Instance', 1);
    const p = instance();
    expect(p.InstanceType).toBe('t4g.small');
    expect(JSON.stringify(p.ImageId)).toMatch(/al2023.*arm64/);
    expect(p.MetadataOptions).toEqual({ HttpEndpoint: 'enabled', HttpTokens: 'required', HttpPutResponseHopLimit: 2 });
    expect(p.BlockDeviceMappings).toEqual([{ DeviceName: '/dev/xvda', Ebs: { Encrypted: true, VolumeSize: 25, VolumeType: 'gp3' } }]);
    expect(p.NetworkInterfaces[0].AssociatePublicIpAddress).toBe(true);
    expect(p.NetworkInterfaces[0].SubnetId).toBe('subnet-0123456789abcdef0');
    expect(p.KeyName).toBeUndefined();
    expect(p.PropagateTagsToVolumeOnCreation).toBe(true);
  });

  it('none of ALB, RDS, ElastiCache, NAT, new VPC, ECS, Kinesis, WAF, SQS, Lambda, KMS keys or Secrets Manager', () => {
    for (const tpl of all) {
      for (const type of [
        'AWS::ElasticLoadBalancingV2::LoadBalancer',
        'AWS::RDS::DBInstance',
        'AWS::ElastiCache::ReplicationGroup',
        'AWS::EC2::NatGateway',
        'AWS::EC2::VPC',
        'AWS::EC2::EIP',
        'AWS::ECS::Cluster',
        'AWS::Kinesis::Stream',
        'AWS::WAFv2::WebACL',
        'AWS::SQS::Queue',
        'AWS::Lambda::Function',
        'AWS::KMS::Key',
        'AWS::SecretsManager::Secret',
        'AWS::CloudWatch::Alarm',
      ]) {
        tpl.resourceCountIs(type, 0);
      }
    }
  });

  it('security group: only 80 and 443 from anywhere (no 22)', () => {
    const sg = resources(t, 'AWS::EC2::SecurityGroup');
    expect(sg).toHaveLength(1);
    const ingress = sg[0].Properties.SecurityGroupIngress.map((r: any) => [r.IpProtocol, r.FromPort, r.ToPort, r.CidrIp]);
    expect(ingress.sort()).toEqual([
      ['tcp', 443, 443, '0.0.0.0/0'],
      ['tcp', 80, 80, '0.0.0.0/0'],
    ]);
    t.resourceCountIs('AWS::EC2::SecurityGroupIngress', 0);
  });

  it('every taggable resource carries Projeto=Volti (cost-allocation tag)', () => {
    const types = ['AWS::EC2::Instance', 'AWS::EC2::SecurityGroup', 'AWS::S3::Bucket', 'AWS::IAM::Role', 'AWS::DLM::LifecyclePolicy', 'AWS::SSM::Parameter', 'AWS::Cognito::UserPool', 'AWS::CloudFront::Distribution'];
    let checked = 0;
    for (const tpl of all) {
      for (const type of types) {
        for (const r of resources(tpl, type)) {
          const tags = r.Properties.Tags ?? r.Properties.UserPoolTags;
          if (Array.isArray(tags)) expect(tags).toEqual(expect.arrayContaining([{ Key: 'Projeto', Value: 'Volti' }]));
          else expect(tags).toEqual(expect.objectContaining({ Projeto: 'Volti' }));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
    // SSM documents are tagged through the stack tags (CloudFormation propagates them).
    expect(s.single.tags.tagValues()).toEqual(expect.objectContaining({ Projeto: 'Volti' }));
  });

  it('S3 buckets for uploads (5, private, SSE-S3), names prefixed volti-dev-', () => {
    const buckets = resources(t, 'AWS::S3::Bucket');
    expect(buckets).toHaveLength(5);
    for (const b of buckets) {
      expect(JSON.stringify(b.Properties.BucketName)).toMatch(/volti-dev-/);
      expect(b.Properties.PublicAccessBlockConfiguration.RestrictPublicBuckets).toBe(true);
      expect(b.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm).toBe('AES256');
    }
  });

  it('instance role: SSM Session Manager, deploy key read only for its parameter, KMS decrypt scoped to Volti parameters', () => {
    const role = resources(t, 'AWS::IAM::Role').find((r) => JSON.stringify(r.Properties.AssumeRolePolicyDocument).includes('ec2.amazonaws.com'));
    expect(JSON.stringify(role.Properties.ManagedPolicyArns)).toMatch(/AmazonSSMManagedInstanceCore/);
    const stmts = resources(t, 'AWS::IAM::Policy').flatMap((p) => p.Properties.PolicyDocument.Statement) as any[];
    const key = stmts.find((x) => x.Sid === 'DeployKey');
    expect(key.Action).toBe('ssm:GetParameter');
    expect(JSON.stringify(key.Resource)).toMatch(/parameter\/volti\/dev\/github-deploy-key"/);
    const decrypt = stmts.find((x) => x.Sid === 'DecryptVoltiParameters');
    expect(decrypt.Action).toBe('kms:Decrypt');
    expect(JSON.stringify(decrypt.Condition)).toMatch(/kms:ViaService/);
    expect(JSON.stringify(decrypt.Condition)).toMatch(/github-deploy-key/);
    expect(JSON.stringify(decrypt.Condition)).toMatch(/volti\/dev\/secrets\/\*/);
    const put = stmts.find((x) => x.Sid === 'CreateGeneratedSecrets');
    expect(JSON.stringify(put.Resource)).toMatch(/volti\/dev\/secrets\/\*/);
    expect(JSON.stringify(put.Resource)).not.toMatch(/github-deploy-key/);
    // No wildcard SSM or S3 access.
    for (const st of stmts) expect(JSON.stringify(st.Resource)).not.toMatch(/"\*"/);
    // The stack never creates the deploy key nor any secret parameter.
    for (const p of resources(t, 'AWS::SSM::Parameter')) expect(p.Properties.Name).toMatch(/^\/volti\/dev\/config\//);
  });

  it('config parameters for the API (Cognito, buckets, CORS, panel) and nothing secret', () => {
    const names = resources(t, 'AWS::SSM::Parameter').map((p) => p.Properties.Name.replace('/volti/dev/config/', ''));
    expect(names).toEqual(
      expect.arrayContaining([
        'COGNITO_CUSTOMER_POOL_ID',
        'COGNITO_STAFF_CLIENT_IDS',
        'S3_BUCKET_KYC',
        'S3_BUCKET_CATALOG',
        'CORS_ORIGINS',
        'API_DOMAIN',
        'ADMIN_BUCKET',
        'ADMIN_DISTRIBUTION_ID',
      ]),
    );
    expect(names.join(' ')).not.toMatch(/SECRET|PASSWORD|TOKEN/);
  });

  it('user data clones the configured repo/branch with the SSM deploy key and runs update.sh; no secret inside', () => {
    const ud = userData();
    expect(ud).toContain('git@github.com:ViniciusVilelaRufini/Aluguel-moto.git');
    expect(ud).toContain('--branch feat/galpao');
    expect(ud).toContain('--name /volti/dev/github-deploy-key --with-decryption');
    expect(ud).toContain('/opt/volti/src/deploy/single/update.sh');
    expect(ud).toContain('github.com ssh-ed25519');
    expect(ud).not.toMatch(/PRIVATE KEY|password=|ssh-keyscan/i);
    const other = createSingleDevApp({ vpcId: 'vpc-1', subnetId: 'subnet-1', branch: 'main', instanceType: 't4g.medium', rootVolumeGb: 30 });
    const p = (Object.values(Template.fromStack(other.single).findResources('AWS::EC2::Instance'))[0] as any).Properties;
    expect(JSON.stringify(p.UserData)).toContain('--branch main');
    expect(p.InstanceType).toBe('t4g.medium');
    expect(p.BlockDeviceMappings[0].Ebs.VolumeSize).toBe(30);
  });

  it('daily EBS snapshot by Data Lifecycle Manager, keeping 3, targeting the instance volume tag', () => {
    const policy = resources(t, 'AWS::DLM::LifecyclePolicy')[0].Properties.PolicyDetails;
    expect(policy.TargetTags).toEqual([{ Key: 'volti-backup', Value: 'daily' }]);
    expect(policy.Schedules[0].RetainRule).toEqual({ Count: 3 });
    expect(policy.Schedules[0].CreateRule.Interval).toBe(24);
    expect(instance().Tags).toEqual(expect.arrayContaining([{ Key: 'volti-backup', Value: 'daily' }]));
  });

  it('SSM Run Command documents for update, seed and the panel', () => {
    const docs = resources(t, 'AWS::SSM::Document');
    const byName = Object.fromEntries(docs.map((d) => [d.Properties.Name, d.Properties]));
    expect(Object.keys(byName).sort()).toEqual(['volti-dev-admin', 'volti-dev-seed', 'volti-dev-update']);
    expect(byName['volti-dev-update'].DocumentType).toBe('Command');
    expect(byName['volti-dev-update'].Content.mainSteps[0].inputs.runCommand).toEqual(['bash /opt/volti/src/deploy/single/update.sh']);
    expect(byName['volti-dev-seed'].Content.mainSteps[0].inputs.runCommand).toEqual(['bash /opt/volti/src/deploy/single/seed.sh']);
  });

  it('budget US$ 20/month ONLY for the tag Projeto=Volti (no account-wide budget), e-mail alerts at 50/80/100%', () => {
    const budgets = all.flatMap((tpl) => resources(tpl, 'AWS::Budgets::Budget'));
    expect(budgets).toHaveLength(1);
    const b = budgets[0].Properties;
    expect(b.Budget.BudgetLimit).toEqual({ Amount: 20, Unit: 'USD' });
    expect(b.Budget.CostFilters).toEqual({ TagKeyValue: ['user:Projeto$Volti'] });
    expect(b.NotificationsWithSubscribers.map((n: any) => [n.Notification.NotificationType, n.Notification.Threshold])).toEqual([
      ['ACTUAL', 50],
      ['ACTUAL', 80],
      ['ACTUAL', 100],
      ['FORECASTED', 100],
    ]);
    for (const n of b.NotificationsWithSubscribers) expect(n.Subscribers).toEqual([{ SubscriptionType: 'EMAIL', Address: 'orcamento@example.com' }]);
  });

  it('panel: S3 + CloudFront without WAF; the instance may publish it (bucket write + invalidation)', () => {
    const cf = Template.fromStack(s.adminWeb);
    cf.resourceCountIs('AWS::CloudFront::Distribution', 1);
    expect(JSON.stringify(resources(cf, 'AWS::CloudFront::Distribution')[0].Properties.DistributionConfig.WebACLId)).toBeUndefined();
    const stmts = resources(t, 'AWS::IAM::Policy').flatMap((p) => p.Properties.PolicyDocument.Statement) as any[];
    expect(stmts.some((x) => x.Action === 'cloudfront:CreateInvalidation')).toBe(true);
  });

  it('the seed is never automatic (only the volti-dev-seed document runs it)', () => {
    expect(userData()).not.toContain('seed.sh');
  });

  describe('repo files used by the instance (deploy/single)', () => {
    const file = (name: string) => readFileSync(join(REPO, 'deploy', 'single', name), 'utf8');

    it('compose runs API (production + Cognito + S3, local IoT/queue/geofence), PostGIS, Redis noeviction, Mosquitto and Caddy', () => {
      const c = file('compose.yml');
      for (const needle of [
        'NODE_ENV: production',
        'AUTH_MODE: cognito',
        'STORAGE_MODE: s3',
        'IOT_MODE: local',
        'QUEUE_MODE: local',
        'GEOFENCE_MODE: local',
        'ALLOW_FAKE_PAYMENTS: "true"',
        'dockerfile: services/api/Dockerfile',
        'build: ./postgis',
        'noeviction',
        'eclipse-mosquitto',
        'caddy:2',
        '"80:80", "443:443"',
      ]) {
        expect(c).toContain(needle);
      }
      // Only Caddy publishes ports.
      expect(c.match(/^\s+ports:/gm)).toHaveLength(1);
      expect(file('postgis/Dockerfile')).toMatch(/postgresql-16-postgis-3/);
      expect(file('Caddyfile')).toMatch(/reverse_proxy api:3000/);
    });

    it('update.sh pulls, renders the env from SSM, rebuilds and runs prisma migrate deploy; seed.sh runs the seed once', () => {
      const u = file('update.sh');
      expect(u).toMatch(/git fetch --depth 1 origin "\$VOLTI_BRANCH"/);
      expect(u).toMatch(/render-env\.sh/);
      expect(u).toMatch(/prisma migrate deploy/);
      expect(file('seed.sh')).toMatch(/dist-seed\/seed\.js/);
      expect(file('render-env.sh')).toMatch(/--type SecureString/);
      expect(existsSync(join(REPO, 'deploy', 'single', 'cloudshell.md'))).toBe(true);
      expect(existsSync(join(REPO, 'deploy', 'single', 'admin.sh'))).toBe(true);
    });
  });
});
