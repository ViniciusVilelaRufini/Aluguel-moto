import { existsSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Template } from 'aws-cdk-lib/assertions';
import { createSingleDevApp } from '../lib/volti-app';

/** `-c env=dev -c profile=single` (lacunas T20, docs/decisoes.md): one EC2 instance with Docker Compose. */
describe('profile=single (dev on one EC2 instance)', () => {
  const outdir = mkdtempSync(join(tmpdir(), 'volti-single-'));
  const s = createSingleDevApp({ budgetEmail: 'orcamento@example.com', outdir });
  const stacks = [s.adminWeb, s.auth, s.single];
  const t = Template.fromStack(s.single);
  const all = stacks.map((st) => Template.fromStack(st));
  const resources = (tpl: Template, type: string) => Object.values(tpl.findResources(type)) as any[];
  const instance = () => resources(t, 'AWS::EC2::Instance')[0].Properties;
  const userData = () => JSON.stringify(instance().UserData);
  const instanceLogicalId = Object.keys(t.findResources('AWS::EC2::Instance'))[0];
  const roleStatements = () => {
    const role = Object.entries(t.findResources('AWS::IAM::Role')).find(([, r]: any) => JSON.stringify(r.Properties.AssumeRolePolicyDocument).includes('ec2.amazonaws.com'))!;
    const policies = resources(t, 'AWS::IAM::Policy').filter((p) => JSON.stringify(p.Properties.Roles).includes(role[0]));
    return { role: role[1] as any, stmts: policies.flatMap((p) => p.Properties.PolicyDocument.Statement) as any[] };
  };
  const REPO = join(__dirname, '..', '..');

  it('creates exactly 3 stacks with names prefixed volti-dev-, bootstrapped with the "volti" qualifier', () => {
    expect(stacks.map((x) => x.stackName).sort()).toEqual(['volti-dev-admin-web', 'volti-dev-auth', 'volti-dev-single']);
    const assembly = s.app.synth();
    for (const st of assembly.stacks) expect(st.assumeRoleArn).toMatch(/cdk-volti-deploy-role/);
  });

  it('no Docker-built asset nor Lambda (deployable from CloudShell): only templates in the asset manifests', () => {
    const assembly = s.app.synth();
    for (const st of assembly.stacks) {
      const manifest = JSON.parse(readFileSync(join(assembly.directory, `${st.stackName}.assets.json`), 'utf8'));
      expect(manifest.dockerImages ?? {}).toEqual({});
      for (const f of Object.values(manifest.files ?? {}) as any[]) expect(f.source.path).toMatch(/^volti-dev-[a-z-]+\.template\.json$/);
    }
  });

  it('own VPC: 1 AZ, 1 public subnet, internet gateway, no NAT, no flow logs, no endpoints', () => {
    t.resourceCountIs('AWS::EC2::VPC', 1);
    t.hasResourceProperties('AWS::EC2::VPC', { CidrBlock: '10.40.0.0/24' });
    const subnets = resources(t, 'AWS::EC2::Subnet');
    expect(subnets).toHaveLength(1);
    expect(subnets[0].Properties.AvailabilityZone).toBe('sa-east-1a');
    expect(subnets[0].Properties.MapPublicIpOnLaunch).toBe(true);
    t.resourceCountIs('AWS::EC2::InternetGateway', 1);
    for (const type of ['AWS::EC2::NatGateway', 'AWS::EC2::FlowLog', 'AWS::EC2::VPCEndpoint', 'AWS::EC2::EIP']) t.resourceCountIs(type, 0);
    expect(JSON.stringify(instance().NetworkInterfaces[0].SubnetId)).toMatch(/Vpcpublic/);
  });

  it('one t4g.small Amazon Linux 2023 ARM instance: IMDSv2 required (2 hops for the containers), encrypted gp3 root, public IP, no SSH key', () => {
    t.resourceCountIs('AWS::EC2::Instance', 1);
    const p = instance();
    expect(p.InstanceType).toBe('t4g.small');
    expect(JSON.stringify(p.ImageId)).toMatch(/al2023.*arm64/);
    expect(p.MetadataOptions).toEqual({ HttpEndpoint: 'enabled', HttpTokens: 'required', HttpPutResponseHopLimit: 2 });
    expect(p.BlockDeviceMappings).toEqual([{ DeviceName: '/dev/xvda', Ebs: { Encrypted: true, VolumeSize: 25, VolumeType: 'gp3' } }]);
    expect(p.NetworkInterfaces[0].AssociatePublicIpAddress).toBe(true);
    expect(p.KeyName).toBeUndefined();
    // The instance waits for the /volti/dev/config parameters (render-env.sh reads them on the first boot).
    const deps = t.toJSON().Resources[instanceLogicalId].DependsOn as string[];
    expect(deps.filter((d) => d.startsWith('Config')).length).toBeGreaterThanOrEqual(15);
  });

  it('none of ALB, RDS, ElastiCache, NAT, ECS, Kinesis, WAF, SQS, Lambda, Secrets Manager, Route 53 records or alarms', () => {
    for (const tpl of all) {
      for (const type of [
        'AWS::ElasticLoadBalancingV2::LoadBalancer',
        'AWS::RDS::DBInstance',
        'AWS::ElastiCache::ReplicationGroup',
        'AWS::EC2::NatGateway',
        'AWS::ECS::Cluster',
        'AWS::Kinesis::Stream',
        'AWS::WAFv2::WebACL',
        'AWS::SQS::Queue',
        'AWS::Lambda::Function',
        'AWS::SecretsManager::Secret',
        'AWS::CloudWatch::Alarm',
        'AWS::Route53::RecordSet',
        'AWS::Route53::RecordSetGroup',
        'AWS::Route53::HostedZone',
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
    const types = [
      'AWS::EC2::VPC',
      'AWS::EC2::Subnet',
      'AWS::EC2::InternetGateway',
      'AWS::EC2::Instance',
      'AWS::EC2::SecurityGroup',
      'AWS::S3::Bucket',
      'AWS::IAM::Role',
      'AWS::KMS::Key',
      'AWS::DLM::LifecyclePolicy',
      'AWS::SSM::Parameter',
      'AWS::Cognito::UserPool',
      'AWS::CloudFront::Distribution',
    ];
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
    expect(checked).toBeGreaterThan(25);
    expect(s.single.tags.tagValues()).toEqual(expect.objectContaining({ Projeto: 'Volti' }));
  });

  it('S3 buckets for uploads (5, private, SSE-S3), names volti-dev-<account>-single-*', () => {
    const buckets = resources(t, 'AWS::S3::Bucket');
    expect(buckets).toHaveLength(5);
    for (const b of buckets) {
      expect(JSON.stringify(b.Properties.BucketName)).toMatch(/volti-dev-.*-single-/);
      expect(b.Properties.PublicAccessBlockConfiguration.RestrictPublicBuckets).toBe(true);
      expect(b.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm).toBe('AES256');
    }
  });

  it('instance role: no managed policies; SSM agent only; parameters only under /volti/dev with an explicit Deny elsewhere', () => {
    const { role, stmts } = roleStatements();
    expect(role.Properties.ManagedPolicyArns).toBeUndefined();
    const sid = (id: string) => stmts.find((x) => x.Sid === id);
    // SSM agent actions are the only wildcard-resource statement, and they grant no parameter or KMS access.
    const wildcard = stmts.filter((x) => x.Effect === 'Allow' && JSON.stringify(x.Resource) === '"*"');
    expect(wildcard.map((x) => x.Sid)).toEqual(['SsmAgent']);
    for (const a of sid('SsmAgent').Action as string[]) expect(a).toMatch(/^(ssm:(UpdateInstanceInformation|ListInstanceAssociations|DescribeAssociation|GetDocument|DescribeDocument|UpdateAssociationStatus|UpdateInstanceAssociationStatus)|ssmmessages:|ec2messages:)/);
    const read = sid('ReadVoltiParameters');
    for (const r of read.Resource) expect(JSON.stringify(r)).toMatch(/parameter\/volti\/dev/);
    const deny = sid('DenyOtherParameters');
    expect(deny.Effect).toBe('Deny');
    expect(deny.Action).toEqual(expect.arrayContaining(['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath']));
    expect(JSON.stringify(deny.NotResource)).toMatch(/parameter\/volti\/dev"/);
    expect(JSON.stringify(deny.NotResource)).toMatch(/parameter\/volti\/dev\/\*"/);
    const put = sid('CreateGeneratedSecrets');
    expect(put.Action).toBe('ssm:PutParameter');
    expect(put.Condition).toBeUndefined();
    expect(JSON.stringify(put.Resource)).toMatch(/volti\/dev\/secrets\/\*/);
    // Never overwrite: explicit Deny when the request asks to overwrite (a request without the key only creates).
    const noOverwrite = sid('DenyOverwriteSecrets');
    expect(noOverwrite.Effect).toBe('Deny');
    expect(noOverwrite.Action).toBe('ssm:PutParameter');
    expect(noOverwrite.Condition).toEqual({ StringEquals: { 'ssm:Overwrite': 'true' } });
    // KMS: only the alias/volti-dev key, via SSM.
    const kms = sid('UseParamsKey');
    expect(JSON.stringify(kms.Resource)).toMatch(/ParamsKey/);
    expect(stmts.filter((x) => JSON.stringify(x.Action).includes('kms:')).map((x) => x.Sid)).toEqual(['UseParamsKey']);
    // No S3/SSM wildcard anywhere else.
    for (const st of stmts.filter((x) => x.Sid !== 'SsmAgent' && x.Effect === 'Allow')) expect(JSON.stringify(st.Resource)).not.toMatch(/"\*"/);
    // The stack never creates the deploy key nor any secret parameter.
    for (const p of resources(t, 'AWS::SSM::Parameter')) expect(p.Properties.Name).toMatch(/^\/volti\/dev\/config\//);
  });

  it('customer-managed key alias/volti-dev: root administers (no Decrypt), only the instance role decrypts', () => {
    t.hasResourceProperties('AWS::KMS::Alias', { AliasName: 'alias/volti-dev' });
    const key = resources(t, 'AWS::KMS::Key')[0];
    expect(key.Properties.EnableKeyRotation).toBe(true);
    expect(key.DeletionPolicy).toBe('Retain');
    const stmts = key.Properties.KeyPolicy.Statement as any[];
    const decrypters = stmts.filter((x) => JSON.stringify(x.Action).includes('kms:Decrypt') || JSON.stringify(x.Action) === '"kms:*"');
    expect(decrypters).toHaveLength(1);
    expect(JSON.stringify(decrypters[0].Principal)).toMatch(/InstanceRole/);
    expect(decrypters[0].Condition).toEqual({ StringEquals: { 'kms:ViaService': 'ssm.sa-east-1.amazonaws.com' } });
    const admin = stmts.find((x) => x.Sid === 'KeyAdministrationByAccount');
    expect(JSON.stringify(admin.Principal)).toMatch(/:root/);
    // No Decrypt and no way to grant it (CreateGrant, kms:Create*, kms:*); CreateAlias is listed explicitly.
    for (const forbidden of ['kms:Decrypt', 'kms:CreateGrant', 'kms:Create*', 'kms:*', 'kms:ReEncrypt*', 'kms:ReEncryptFrom']) {
      expect(admin.Action).not.toContain(forbidden);
    }
    for (const a of admin.Action as string[]) expect(a).not.toMatch(/\*/);
    expect(admin.Action).toContain('kms:CreateAlias');
    for (const st of stmts.filter((x) => JSON.stringify(x.Principal).includes(':root'))) {
      expect(JSON.stringify(st.Action)).not.toMatch(/CreateGrant|Decrypt|"kms:\*"|Create\*/);
    }
    const enc = stmts.find((x) => x.Sid === 'EncryptThroughSsm');
    expect(enc.Action.sort()).toEqual(['kms:Encrypt', 'kms:GenerateDataKey']);
    expect(enc.Condition).toEqual({ StringEquals: { 'kms:ViaService': 'ssm.sa-east-1.amazonaws.com' } });
  });

  it('Route 53: only UPSERT of the A record of apiDomain in the shared zone, plus GetChange; the stack owns no record', () => {
    const { stmts } = roleStatements();
    const upsert = stmts.find((x) => x.Sid === 'UpsertApiRecord');
    expect(upsert).toEqual({
      Sid: 'UpsertApiRecord',
      Effect: 'Allow',
      Action: 'route53:ChangeResourceRecordSets',
      Resource: 'arn:aws:route53:::hostedzone/Z04583703P20295WCJ8TF',
      Condition: {
        'ForAllValues:StringEquals': {
          'route53:ChangeResourceRecordSetsNormalizedRecordNames': ['api-volti-dev.prestarecondominios.com.br'],
          'route53:ChangeResourceRecordSetsRecordTypes': ['A'],
          'route53:ChangeResourceRecordSetsActions': ['UPSERT'],
        },
      },
    });
    expect(stmts.find((x) => x.Sid === 'WaitRecordChange')).toEqual(
      expect.objectContaining({ Action: 'route53:GetChange', Resource: 'arn:aws:route53:::change/*' }),
    );
    expect(stmts.filter((x) => JSON.stringify(x.Action).includes('route53:')).map((x) => x.Sid).sort()).toEqual(['UpsertApiRecord', 'WaitRecordChange']);
    for (const tpl of all) tpl.resourceCountIs('AWS::Route53::RecordSet', 0);
    // Without a domain: no Route 53 permission at all (fallback <ip>.sslip.io).
    const noDns = createSingleDevApp({ apiDomain: '-' });
    const json = JSON.stringify(Template.fromStack(noDns.single).toJSON());
    expect(json).not.toMatch(/route53:/);
    expect(() => createSingleDevApp({ apiDomain: 'bad domain' })).toThrow(/apiDomain/);
  });

  it('DNS lifecycle: current IP at boot, parked at 192.0.2.1 on shutdown (ExecStop while the network is up)', () => {
    const ud = userData();
    expect(ud).toContain('volti-dns.service');
    expect(ud).toContain('Wants=network-online.target');
    expect(ud).toContain('After=network-online.target');
    expect(ud).toContain('RemainAfterExit=yes');
    expect(ud).toContain('ExecStart=/bin/bash /opt/volti/src/deploy/single/dns.sh up');
    expect(ud).toContain('ExecStop=/bin/bash /opt/volti/src/deploy/single/dns.sh down');
    expect(ud).toContain('systemctl enable --now volti-dns.service');
    // The record is set before the first update.sh (the unit starts before it in the user data).
    expect(ud.indexOf('systemctl enable --now volti-dns.service')).toBeLessThan(ud.indexOf('deploy/single/update.sh'));
    const dns = readFileSync(join(REPO, 'deploy', 'single', 'dns.sh'), 'utf8');
    expect(dns).toMatch(/"Action":"UPSERT"/);
    expect(dns).toMatch(/"Type":"A","TTL":60/);
    expect(dns).toMatch(/PARKED_IP=192\.0\.2\.1/);
    expect(dns).not.toMatch(/"DELETE"|"CREATE"/);
    const names = resources(t, 'AWS::SSM::Parameter').map((p) => p.Properties);
    expect(names.find((p) => p.Name === '/volti/dev/config/API_DOMAIN').Value).toBe('api-volti-dev.prestarecondominios.com.br');
    expect(names.find((p) => p.Name === '/volti/dev/config/HOSTED_ZONE_ID').Value).toBe('Z04583703P20295WCJ8TF');
  });

  it('EventBridge Scheduler: start 07:00 and stop 23:00 America/Sao_Paulo, role limited to THIS instance', () => {
    const schedules = resources(t, 'AWS::Scheduler::Schedule').map((x) => x.Properties);
    expect(schedules.map((x) => [x.Name, x.ScheduleExpression, x.ScheduleExpressionTimezone, x.Target.Arn]).sort()).toEqual([
      ['volti-dev-single-start', 'cron(0 7 * * ? *)', 'America/Sao_Paulo', 'arn:aws:scheduler:::aws-sdk:ec2:startInstances'],
      ['volti-dev-single-stop', 'cron(0 23 * * ? *)', 'America/Sao_Paulo', 'arn:aws:scheduler:::aws-sdk:ec2:stopInstances'],
    ]);
    for (const x of schedules) expect(JSON.stringify(x.Target.Input)).toContain(instanceLogicalId);
    const roleId = schedules[0].Target.RoleArn['Fn::GetAtt'][0];
    const role = t.toJSON().Resources[roleId];
    expect(JSON.stringify(role.Properties.AssumeRolePolicyDocument)).toMatch(/scheduler\.amazonaws\.com/);
    expect(role.Properties.ManagedPolicyArns).toBeUndefined();
    const stmts = resources(t, 'AWS::IAM::Policy')
      .filter((p) => JSON.stringify(p.Properties.Roles).includes(roleId))
      .flatMap((p) => p.Properties.PolicyDocument.Statement);
    expect(stmts).toHaveLength(1);
    expect(stmts[0].Action).toEqual(['ec2:StartInstances', 'ec2:StopInstances']);
    const resource = JSON.stringify(stmts[0].Resource);
    expect(resource).toMatch(/:instance\//);
    expect(resource).toContain(instanceLogicalId);
    expect(resource).not.toMatch(/instance\/\*/);
    // -c schedule=false: no schedules nor scheduler role.
    Template.fromStack(createSingleDevApp({ schedule: false }).single).resourceCountIs('AWS::Scheduler::Schedule', 0);
  });

  it('config parameters for the API (Cognito, buckets, CORS, panel, DNS) and nothing secret', () => {
    const names = resources(t, 'AWS::SSM::Parameter').map((p) => p.Properties.Name.replace('/volti/dev/config/', ''));
    expect(names).toEqual(
      expect.arrayContaining(['COGNITO_CUSTOMER_POOL_ID', 'COGNITO_STAFF_CLIENT_IDS', 'S3_BUCKET_KYC', 'S3_BUCKET_CATALOG', 'CORS_ORIGINS', 'API_DOMAIN', 'HOSTED_ZONE_ID', 'ADMIN_BUCKET', 'ADMIN_DISTRIBUTION_ID']),
    );
    expect(names.join(' ')).not.toMatch(/SECRET|PASSWORD|TOKEN/);
  });

  it('user data: pinned binaries (sha256), Docker log rotation, waits for the deploy key, clones and runs update.sh; no secret inside', () => {
    const ud = userData();
    expect(ud).toContain('git@github.com:ViniciusVilelaRufini/Aluguel-moto.git');
    expect(ud).toContain('--branch feat/galpao');
    expect(ud).toContain('--name /volti/dev/github-deploy-key --with-decryption');
    expect(ud).toContain('/opt/volti/src/deploy/single/update.sh');
    expect(ud).toContain('github.com ssh-ed25519');
    expect(ud.match(/sha256sum -c -/g)).toHaveLength(2);
    expect(ud).toContain('max-size');
    expect(ud).toContain('VOLTI_KEY_ALIAS=alias/volti-dev');
    expect(ud).not.toMatch(/PRIVATE KEY|password=|ssh-keyscan/i);
    const other = createSingleDevApp({ branch: 'main', instanceType: 't4g.medium', rootVolumeGb: 30 });
    const p = (Object.values(Template.fromStack(other.single).findResources('AWS::EC2::Instance'))[0] as any).Properties;
    expect(JSON.stringify(p.UserData)).toContain('--branch main');
    expect(p.InstanceType).toBe('t4g.medium');
    expect(p.BlockDeviceMappings[0].Ebs.VolumeSize).toBe(30);
  });

  it('daily EBS snapshot by Data Lifecycle Manager while the instance runs, keeping 3', () => {
    const policy = resources(t, 'AWS::DLM::LifecyclePolicy')[0].Properties.PolicyDetails;
    expect(policy.TargetTags).toEqual([{ Key: 'volti-backup', Value: 'daily' }]);
    expect(policy.Schedules[0].RetainRule).toEqual({ Count: 3 });
    expect(policy.Schedules[0].CreateRule).toEqual({ Interval: 24, IntervalUnit: 'HOURS', Times: ['12:00'] });
    expect(instance().Tags).toEqual(expect.arrayContaining([{ Key: 'volti-backup', Value: 'daily' }]));
  });

  it('SSM Run Command documents: update, seed and admin (panel or test customer, parameters validated by SSM)', () => {
    const byName = Object.fromEntries(resources(t, 'AWS::SSM::Document').map((d) => [d.Properties.Name, d.Properties]));
    expect(Object.keys(byName).sort()).toEqual(['volti-dev-admin', 'volti-dev-seed', 'volti-dev-update']);
    expect(byName['volti-dev-update'].Content.mainSteps[0].inputs.runCommand).toEqual(['bash /opt/volti/src/deploy/single/update.sh']);
    expect(byName['volti-dev-seed'].Content.mainSteps[0].inputs.runCommand).toEqual(['bash /opt/volti/src/deploy/single/seed.sh']);
    const admin = byName['volti-dev-admin'].Content;
    expect(admin.mainSteps[0].inputs.runCommand).toEqual(['bash /opt/volti/src/deploy/single/admin.sh {{action}} {{email}}']);
    expect(admin.parameters.action.allowedValues).toEqual(['publish-panel', 'create-customer']);
    const pattern = new RegExp(admin.parameters.email.allowedPattern);
    expect(pattern.test('cliente.teste@exemplo.com')).toBe(true);
    expect(pattern.test('-')).toBe(true);
    for (const bad of ['a@b.com; rm -rf /', '$(id)@x.com', 'a b@c.com', '`x`@y.com']) expect(pattern.test(bad)).toBe(false);
  });

  it('customer pool in the shared account: no self sign-up, no SMS (no SNS role), e-mail recovery', () => {
    const auth = Template.fromStack(s.auth);
    const pool = resources(auth, 'AWS::Cognito::UserPool').find((p) => p.Properties.UserPoolName === 'volti-dev-customers').Properties;
    expect(pool.AdminCreateUserConfig.AllowAdminCreateUserOnly).toBe(true);
    expect(pool.SmsConfiguration).toBeUndefined();
    expect(pool.Policies.SignInPolicy.AllowedFirstAuthFactors).not.toContain('SMS_OTP');
    expect(pool.AutoVerifiedAttributes).toEqual(['email']);
    expect(JSON.stringify(auth.toJSON())).not.toMatch(/sns:Publish/);
    const login = (tpl: Template) => resources(tpl, 'AWS::SSM::Parameter').find((p) => p.Properties.Name === '/volti/dev/config/CUSTOMER_LOGIN').Properties.Value;
    expect(login(t)).toBe('password');
    // With the verified DOMAIN identity voltz.prestarecondominios.com.br: e-mail OTP, sender "Volti (dev)".
    const ses = createSingleDevApp({ overrides: { sesFromEmail: 'nao-responda@voltz.prestarecondominios.com.br' } });
    const sesPool = resources(Template.fromStack(ses.auth), 'AWS::Cognito::UserPool').find((p) => p.Properties.UserPoolName === 'volti-dev-customers');
    expect(sesPool.Properties.Policies.SignInPolicy.AllowedFirstAuthFactors).toContain('EMAIL_OTP');
    expect(sesPool.Properties.EmailConfiguration.EmailSendingAccount).toBe('DEVELOPER');
    // RFC 5322: the display name with parentheses is quoted by the CDK.
    expect(sesPool.Properties.EmailConfiguration.From).toBe('"Volti (dev)" <nao-responda@voltz.prestarecondominios.com.br>');
    expect(JSON.stringify(sesPool.Properties.EmailConfiguration.SourceArn)).toMatch(/:identity\/voltz\.prestarecondominios\.com\.br"/);
    expect(login(Template.fromStack(ses.single))).toBe('email-otp');
    expect(() => createSingleDevApp({ overrides: { sesFromEmail: 'x@outro.com', sesVerifiedDomain: 'voltz.prestarecondominios.com.br' } })).toThrow(/sesFromEmail/);
    // The instance may create test customers in the customer pool only.
    const { stmts } = roleStatements();
    const create = stmts.filter((x) => JSON.stringify(x.Action).includes('cognito-idp:AdminCreateUser'));
    expect(create.map((x) => x.Sid)).toEqual(['CognitoCustomers']);
    expect(create[0].Action).toContain('cognito-idp:AdminSetUserPassword');
  });

  it('customerSignup=open: self sign-up by phone and e-mail, SMS OTP through an SNS role in sa-east-1; staff pool untouched', () => {
    const open = createSingleDevApp({ customerSignup: 'open' });
    const auth = Template.fromStack(open.auth);
    const pool = resources(auth, 'AWS::Cognito::UserPool').find((p) => p.Properties.UserPoolName === 'volti-dev-customers').Properties;
    expect(pool.AdminCreateUserConfig.AllowAdminCreateUserOnly).toBe(false);
    expect(pool.SmsConfiguration.SnsCallerArn).toBeDefined();
    expect(pool.SmsConfiguration.ExternalId).toBeDefined();
    expect(pool.SmsConfiguration.SnsRegion).toBe('sa-east-1');
    expect(pool.Policies.SignInPolicy.AllowedFirstAuthFactors).toEqual(expect.arrayContaining(['PASSWORD', 'SMS_OTP']));
    expect([...pool.AutoVerifiedAttributes].sort()).toEqual(['email', 'phone_number']);
    // PHONE_AND_EMAIL is the CDK default (no AccountRecoverySetting emitted); the closed pool pins e-mail only.
    expect(pool.AccountRecoverySetting).toBeUndefined();
    const staff = resources(auth, 'AWS::Cognito::UserPool').find((p) => p.Properties.UserPoolName === 'volti-dev-staff').Properties;
    expect(staff.AdminCreateUserConfig.AllowAdminCreateUserOnly).toBe(true);
    expect(staff.SmsConfiguration).toBeUndefined();
    // create-customer (volti-dev-admin) keeps working: CUSTOMER_LOGIN still follows SES only.
    const login = resources(Template.fromStack(open.single), 'AWS::SSM::Parameter').find((p) => p.Properties.Name === '/volti/dev/config/CUSTOMER_LOGIN').Properties.Value;
    expect(login).toBe('password');
    // explicit closed equals the default; anything else is refused.
    const closed = resources(Template.fromStack(createSingleDevApp({ customerSignup: 'closed' }).auth), 'AWS::Cognito::UserPool').find((p) => p.Properties.UserPoolName === 'volti-dev-customers').Properties;
    expect(closed.AdminCreateUserConfig.AllowAdminCreateUserOnly).toBe(true);
    expect(() => createSingleDevApp({ customerSignup: 'aberto' as any })).toThrow(/customerSignup/);
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

  it('panel on the CloudFront default domain (no alias/ACM, no WAF); the instance may publish it', () => {
    const cf = Template.fromStack(s.adminWeb);
    const dist = resources(cf, 'AWS::CloudFront::Distribution')[0].Properties.DistributionConfig;
    expect(dist.Aliases).toBeUndefined();
    expect(dist.ViewerCertificate).toBeUndefined();
    expect(dist.WebACLId).toBeUndefined();
    const { stmts } = roleStatements();
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
        'PUBLIC_SHARE_BASE_URL: https://${PUBLIC_HOST}/share',
      ]) {
        expect(c).toContain(needle);
      }
      // Caddy (80/443) e o Traccar do profile gt06 (5023 publicada; o security group só abre com -c gt06Port=true; REST só em 127.0.0.1).
      expect(c.match(/^\s+ports:/gm)).toHaveLength(2);
      expect(c).toContain('ports: ["5023:5023", "127.0.0.1:8082:8082"]');
      expect(file('postgis/Dockerfile')).toMatch(/postgresql-16-postgis-3/);
      expect(file('Caddyfile')).toMatch(/reverse_proxy api:3000/);
    });

    it('tracker simulator: iot-sim (profile sim) reads the fleet from Postgres, gets only the DB password, update.sh toggles it by IOT_SIM', () => {
      const c = file('compose.yml');
      const sim = c.slice(c.indexOf('\n  iot-sim:'), c.indexOf('\nvolumes:'));
      expect(sim).toContain('profiles: ["sim"]');
      expect(sim).toContain('SIM_FLEET_SOURCE: postgres');
      expect(sim).toContain('DATABASE_URL: postgresql://volti:${DB_PASSWORD}@postgres:5432/volti');
      expect(sim).toContain('MQTT_URL: mqtt://mosquitto:1883');
      expect(sim).not.toContain('env_file');
      expect(sim).not.toMatch(/ports:/);
      const update = file('update.sh');
      expect(update).toMatch(/\^IOT_SIM=/);
      expect(update).toMatch(/off\|false\|0\)/);
      expect(update).toMatch(/--profile sim/);
      expect(update).toMatch(/dc "\$\{sim\[@\]\}" "\$\{gt06\[@\]\}" up -d --remove-orphans/);
      // Data fix: idempotent (only rows that differ), never touches vehicles in use, dry-run rolls back.
      const fix = file('fix-depot-positions.sh');
      expect(fix).toMatch(/"status" IN \('free', 'maintenance'\)/);
      expect(fix).toMatch(/IS DISTINCT FROM d\."lat"/);
      expect(fix).toMatch(/--dry-run\) finish=ROLLBACK/);
      expect(fix).toMatch(/vehicle\.position_fix/);
    });

    it('scripts: migrations in update.sh, secrets with alias/volti-dev, safe .env values, admin.sh without sourcing the .env', () => {
      expect(file('update.sh')).toMatch(/prisma migrate deploy/);
      expect(file('seed.sh')).toMatch(/dist-seed\/prisma\/seed\.js/);
      const env = file('render-env.sh');
      expect(env).toMatch(/--type SecureString --key-id "\$VOLTI_KEY_ALIAS"/);
      expect(env).toMatch(/--no-overwrite/);
      expect(env).toMatch(/ParameterAlreadyExists/);
      expect(env).toMatch(/SAFE=/);
      const admin = file('admin.sh');
      expect(admin).not.toMatch(/^\s*(source|\.) \/opt\/volti\/\.env/m);
      expect(admin).toMatch(/create-customer/);
      // OTP pool: no invitation + random permanent password; password pool: Cognito sends the temporary password by e-mail.
      expect(admin).toMatch(/--message-action SUPPRESS[\s\S]*admin-set-user-password[\s\S]*--permanent/);
      expect(admin).toMatch(/--desired-delivery-mediums EMAIL/);
      const shell = file('cloudshell.md');
      expect(shell).toMatch(/sudo n 24/);
      expect(shell).toMatch(/--store-dir \/tmp\/pnpm-store/);
      expect(shell).toMatch(/--key-id alias\/volti-dev/);
      expect(shell).toMatch(/shred -u \/tmp\/volti_deploy/);
      expect(shell).not.toMatch(/create-default-vpc/);
      expect(existsSync(join(REPO, 'deploy', 'single', 'dns.sh'))).toBe(true);
    });
  });
});
