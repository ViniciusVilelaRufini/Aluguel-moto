import { Annotations, Duration, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as dlm from 'aws-cdk-lib/aws-dlm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { AdminWebStack } from './admin-web-stack';
import { AuthStack } from './auth-stack';

/** Cost-allocation tag on every resource of the single profile (the account also runs another project). */
export const SINGLE_TAG = { key: 'Projeto', value: 'Volti' } as const;
/** Tag of the volumes snapshotted daily by Data Lifecycle Manager. */
export const BACKUP_TAG = { key: 'volti-backup', value: 'daily' } as const;
/** Every SSM parameter of this profile lives under this path; the instance role is denied any other parameter. */
export const PARAM_ROOT = '/volti/dev';
/** Read-only GitHub deploy key (private part), created by hand in CloudShell with --key-id alias/volti-dev; never by CDK. */
export const DEPLOY_KEY_PARAM = `${PARAM_ROOT}/github-deploy-key`;
/** Non-secret configuration written by this stack, one parameter per API variable (read by deploy/single/render-env.sh). */
export const CONFIG_PREFIX = `${PARAM_ROOT}/config`;
/** Secrets generated on the instance at first boot or pasted by hand (SecureString with the key alias/volti-dev). */
export const SECRETS_PREFIX = `${PARAM_ROOT}/secrets`;
/** Customer-managed key of every /volti/dev SecureString: only the instance role decrypts. */
export const KEY_ALIAS = 'alias/volti-dev';
export const DEFAULT_REPO = 'git@github.com:ViniciusVilelaRufini/Aluguel-moto.git';
export const DEFAULT_BRANCH = 'feat/galpao';
/** Public hosted zone of the account (belongs to ANOTHER project): the instance only UPSERTs the A record of apiDomain. */
export const DEFAULT_HOSTED_ZONE_ID = 'Z04583703P20295WCJ8TF';
export const DEFAULT_API_DOMAIN = 'api-volti-dev.prestarecondominios.com.br';
export const SCHEDULE_TIMEZONE = 'America/Sao_Paulo';
const REPO_DIR = '/opt/volti/src';
const AZ = 'sa-east-1a';
// GitHub's published SSH host key (docs.github.com, "GitHub's SSH key fingerprints"): no trust-on-first-use ssh-keyscan.
const GITHUB_HOST_KEY = 'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl';
// Pinned binaries (sha256 from the release pages: docker-compose-linux-aarch64.sha256 and buildx checksums.txt).
const COMPOSE = { version: 'v2.29.7', sha256: '6e9fbd5daa20dca5d7d89145081ae8155d68ef2928b497d9f85b54fe0f9dbb2c' };
const BUILDX = { version: 'v0.17.1', sha256: 'de05dccd47932eb9fd6e63781ab29d2b0b2c834bbdd19b51d7ea452b1fe378d3' };

export interface SingleDevStackProps extends StackProps {
  cfg: EnvConfig;
  auth: AuthStack;
  /** Panel bucket + distribution: the instance builds apps/admin and publishes it (deploy/single/admin.sh). */
  adminWeb: AdminWebStack;
  /** https origin of the admin panel (CloudFront default domain): CORS of the API and of the catalog bucket. */
  adminOrigin: string;
  repoUrl: string;
  branch: string;
  instanceType: string;
  rootVolumeGb: number;
  /**
   * Stable API name in a Route 53 zone the instance UPSERTs at every boot (A → current public IPv4, TTL 60). The stack never
   * owns the record (the zone is shared). Unset = fallback <public-ip>.sslip.io.
   */
  dns?: { hostedZoneId: string; apiDomain: string };
  /** EventBridge Scheduler: start 07:00 and stop 23:00 America/Sao_Paulo every day. */
  schedule: boolean;
  budgetEmail?: string;
}

/**
 * Dev on ONE EC2 instance (lacunas T20, docs/decisoes.md): Docker Compose with the API, PostgreSQL 16 + PostGIS, Redis,
 * Mosquitto (IOT_MODE=local) and Caddy (automatic HTTPS). Managed and nearly free: S3 for uploads, Cognito (auth stack),
 * the panel on S3 + CloudFront (admin-web stack), parameters in SSM. Own VPC (1 public subnet, no NAT), no ALB, RDS,
 * ElastiCache, Kinesis or WAF.
 */
export class SingleDevStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly instance: ec2.Instance;
  public readonly instanceRole: iam.Role;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly key: kms.Key;
  public readonly buckets: Record<'KYC' | 'RETURN_PHOTOS' | 'REPORTS' | 'ATTACHMENTS' | 'CATALOG', s3.Bucket>;
  public readonly updateDocumentName = 'volti-dev-update';
  public readonly seedDocumentName = 'volti-dev-seed';
  public readonly adminDocumentName = 'volti-dev-admin';

  /** Fixed AZ: no AZ context lookup, synth works offline and in CloudShell alike. */
  override get availabilityZones(): string[] {
    return [AZ];
  }

  constructor(scope: Construct, id: string, props: SingleDevStackProps) {
    super(scope, id, props);
    const { cfg } = props;
    if (cfg.name !== 'dev') throw new Error('profile=single é só para env=dev.');

    // Own VPC (isolated from the other project's default VPC): 1 AZ, 1 public subnet, internet gateway, no NAT, no endpoints.
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: 'volti-dev-single',
      ipAddresses: ec2.IpAddresses.cidr('10.40.0.0/24'),
      availabilityZones: [AZ],
      natGateways: 0,
      subnetConfiguration: [{ name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 26 }],
      // true would add a custom resource Lambda (an asset); the default SG is unused (the instance has its own).
      restrictDefaultSecurityGroup: false,
    });

    // S3 (uploads). SSE-S3. The instance role is the only reader/writer.
    const bucket = (key: string, suffix: string, extra: Partial<s3.BucketProps> = {}) =>
      new s3.Bucket(this, key, {
        bucketName: `volti-dev-${this.account}-single-${suffix}`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.RETAIN,
        lifecycleRules: [{ id: 'abort-multipart', abortIncompleteMultipartUploadAfter: Duration.days(7) }],
        ...extra,
      });
    this.buckets = {
      KYC: bucket('KycBucket', 'documentos-kyc', { versioned: true }),
      RETURN_PHOTOS: bucket('ReturnPhotosBucket', 'fotos-devolucao'),
      REPORTS: bucket('ReportsBucket', 'relatorios'),
      ATTACHMENTS: bucket('AttachmentsBucket', 'anexos'),
      CATALOG: bucket('CatalogBucket', 'catalogo', {
        cors: [
          {
            allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
            allowedOrigins: [props.adminOrigin, ...cfg.auth.adminExtraOrigins],
            allowedHeaders: ['content-type'],
            maxAge: 3000,
          },
        ],
      }),
    };

    // Only HTTP/HTTPS from the internet (Caddy). No SSH: shell access through SSM Session Manager.
    this.securityGroup = new ec2.SecurityGroup(this, 'InstanceSg', {
      vpc: this.vpc,
      securityGroupName: 'volti-dev-single',
      description: 'Volti dev single instance: HTTP/HTTPS only (Caddy); no SSH, access via SSM',
      allowAllOutbound: true,
    });
    this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP (ACME challenge and redirect to HTTPS)');
    this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS (Caddy -> API)');

    // No AWS managed policy: AmazonSSMManagedInstanceCore grants ssm:GetParameter(s) on every parameter of the account.
    this.instanceRole = new iam.Role(this, 'InstanceRole', {
      roleName: `volti-dev-single-${this.region}`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    this.key = this.createKey(this.instanceRole);
    this.grantInstance(this.instanceRole, props);

    const userData = ec2.UserData.forLinux();
    userData.addCommands(...this.bootScript(props));

    this.instance = new ec2.Instance(this, 'Instance', {
      instanceName: 'volti-dev-single',
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      associatePublicIpAddress: true,
      instanceType: new ec2.InstanceType(props.instanceType),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({ cpuType: ec2.AmazonLinuxCpuType.ARM_64 }),
      securityGroup: this.securityGroup,
      role: this.instanceRole,
      userData,
      // IMDSv2 only (session tokens required).
      httpTokens: ec2.HttpTokens.REQUIRED,
      httpEndpoint: true,
      // 2 hops: the API container (bridge network) reads the instance role credentials from IMDS for S3 and Cognito.
      httpPutResponseHopLimit: 2,
      propagateTagsToVolumeOnCreation: true,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(props.rootVolumeGb, { volumeType: ec2.EbsDeviceVolumeType.GP3, encrypted: true }),
        },
      ],
    });
    Tags.of(this.instance).add(BACKUP_TAG.key, BACKUP_TAG.value);

    this.backups();
    const params = this.configParams(props);
    // render-env.sh reads /volti/dev/config/* on the first boot: the parameters must exist before the instance starts.
    for (const p of params) this.instance.node.addDependency(p);
    this.documents();
    if (props.schedule) this.scheduleInstance();
    this.budget(props.budgetEmail);
  }

  private param(name: string): string {
    return `arn:aws:ssm:${this.region}:${this.account}:parameter${name}`;
  }

  /**
   * alias/volti-dev: the account root only administers the key (AWS requires a principal able to manage it; no Decrypt),
   * anyone in the account may encrypt through SSM (the owner creates the deploy key parameter in CloudShell), and only the
   * instance role decrypts (through SSM). Other principals of the shared account cannot read the SecureStrings.
   */
  private createKey(role: iam.Role): kms.Key {
    const root = new iam.AccountRootPrincipal();
    const viaSsm = { 'kms:ViaService': `ssm.${this.region}.amazonaws.com` };
    const policy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          sid: 'KeyAdministrationByAccount',
          principals: [root],
          actions: [
            'kms:Create*',
            'kms:Describe*',
            'kms:Enable*',
            'kms:List*',
            'kms:Put*',
            'kms:Update*',
            'kms:Revoke*',
            'kms:Disable*',
            'kms:Get*',
            'kms:Delete*',
            'kms:TagResource',
            'kms:UntagResource',
            'kms:ScheduleKeyDeletion',
            'kms:CancelKeyDeletion',
            'kms:RotateKeyOnDemand',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'EncryptThroughSsm',
          principals: [root],
          actions: ['kms:Encrypt', 'kms:GenerateDataKey'],
          resources: ['*'],
          conditions: { StringEquals: viaSsm },
        }),
        new iam.PolicyStatement({
          sid: 'DecryptOnlyInstanceRole',
          principals: [new iam.ArnPrincipal(role.roleArn)],
          actions: ['kms:Decrypt'],
          resources: ['*'],
          conditions: { StringEquals: viaSsm },
        }),
      ],
    });
    return new kms.Key(this, 'ParamsKey', {
      alias: KEY_ALIAS,
      description: 'Volti dev SecureString parameters (/volti/dev/*): only the instance role decrypts',
      enableKeyRotation: true,
      policy,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }

  private grantInstance(role: iam.Role, props: SingleDevStackProps): void {
    const { auth, adminWeb } = props;
    for (const b of Object.values(this.buckets)) b.grantReadWrite(role);
    // Panel publishing from the instance: write the site bucket and invalidate the distribution.
    adminWeb.bucket.grantReadWrite(role);
    adminWeb.bucket.grantDelete(role);
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'InvalidatePanel',
        actions: ['cloudfront:CreateInvalidation'],
        resources: [`arn:aws:cloudfront::${this.account}:distribution/${adminWeb.distribution.distributionId}`],
      }),
    );

    // SSM agent (Session Manager + Run Command), as documented for the agent; no parameter access here.
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SsmAgent',
        actions: [
          'ssm:UpdateInstanceInformation',
          'ssm:ListInstanceAssociations',
          'ssm:DescribeAssociation',
          'ssm:GetDocument',
          'ssm:DescribeDocument',
          'ssm:UpdateAssociationStatus',
          'ssm:UpdateInstanceAssociationStatus',
          'ssmmessages:CreateControlChannel',
          'ssmmessages:CreateDataChannel',
          'ssmmessages:OpenControlChannel',
          'ssmmessages:OpenDataChannel',
          'ec2messages:AcknowledgeMessage',
          'ec2messages:DeleteMessage',
          'ec2messages:FailMessage',
          'ec2messages:GetEndpoint',
          'ec2messages:GetMessages',
          'ec2messages:SendReply',
        ],
        resources: ['*'],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ReadVoltiParameters',
        actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
        resources: [
          this.param(DEPLOY_KEY_PARAM),
          this.param(CONFIG_PREFIX),
          this.param(`${CONFIG_PREFIX}/*`),
          this.param(SECRETS_PREFIX),
          this.param(`${SECRETS_PREFIX}/*`),
        ],
      }),
    );
    // Belt and braces: never any parameter outside /volti/dev, whatever else gets attached to the role.
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DenyOtherParameters',
        effect: iam.Effect.DENY,
        actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath', 'ssm:GetParameterHistory'],
        notResources: [this.param(PARAM_ROOT), this.param(`${PARAM_ROOT}/*`)],
      }),
    );
    // Secrets are generated on the instance at first boot (CloudFormation cannot create SecureString parameters); never
    // overwritten (ssm:Overwrite=false keeps DB_PASSWORD and the manual tokens safe from the instance).
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CreateGeneratedSecrets',
        actions: ['ssm:PutParameter'],
        resources: [this.param(`${SECRETS_PREFIX}/*`)],
        conditions: { StringEquals: { 'ssm:Overwrite': 'false' } },
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'TagGeneratedSecrets',
        actions: ['ssm:AddTagsToResource'],
        resources: [this.param(`${SECRETS_PREFIX}/*`)],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'UseParamsKey',
        actions: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey'],
        resources: [this.key.keyArn],
        conditions: { StringEquals: { 'kms:ViaService': `ssm.${this.region}.amazonaws.com` } },
      }),
    );
    // Route 53: only UPSERT of the A record of apiDomain in the shared zone (never another name, type or action).
    if (props.dns) {
      role.addToPolicy(
        new iam.PolicyStatement({
          sid: 'UpsertApiRecord',
          actions: ['route53:ChangeResourceRecordSets'],
          resources: [`arn:aws:route53:::hostedzone/${props.dns.hostedZoneId}`],
          conditions: {
            'ForAllValues:StringEquals': {
              'route53:ChangeResourceRecordSetsNormalizedRecordNames': [props.dns.apiDomain.toLowerCase()],
              'route53:ChangeResourceRecordSetsRecordTypes': ['A'],
              'route53:ChangeResourceRecordSetsActions': ['UPSERT'],
            },
          },
        }),
      );
      role.addToPolicy(new iam.PolicyStatement({ sid: 'WaitRecordChange', actions: ['route53:GetChange'], resources: ['arn:aws:route53:::change/*'] }));
    }
    // Same Cognito actions as the ECS task role (QA-04/QA-07, M7), plus creating test customers (volti-dev-admin document).
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CognitoStaff',
        actions: [
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminRemoveUserFromGroup',
          'cognito-idp:AdminEnableUser',
          'cognito-idp:AdminDisableUser',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminUserGlobalSignOut',
          'cognito-idp:AdminGetUser',
        ],
        resources: [auth.staffPool.userPoolArn],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CognitoCustomers',
        actions: [
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminDisableUser',
          'cognito-idp:AdminUserGlobalSignOut',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminCreateUser',
        ],
        resources: [auth.customerPool.userPoolArn],
      }),
    );
  }

  /** First boot only (user data). Nothing secret here: the deploy key and the secrets come from SSM at run time. */
  private bootScript(props: SingleDevStackProps): string[] {
    const plugins = '/usr/local/lib/docker/cli-plugins';
    return [
      'set -euo pipefail',
      'exec > >(tee -a /var/log/volti-boot.log) 2>&1',
      'dnf install -y docker git openssl',
      // Docker log rotation (the 25 GB disk is the only log store).
      'mkdir -p /etc/docker',
      `echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json`,
      `mkdir -p ${plugins}`,
      `curl -fsSL https://github.com/docker/compose/releases/download/${COMPOSE.version}/docker-compose-linux-aarch64 -o ${plugins}/docker-compose`,
      `curl -fsSL https://github.com/docker/buildx/releases/download/${BUILDX.version}/buildx-${BUILDX.version}.linux-arm64 -o ${plugins}/docker-buildx`,
      `echo '${COMPOSE.sha256}  ${plugins}/docker-compose' | sha256sum -c -`,
      `echo '${BUILDX.sha256}  ${plugins}/docker-buildx' | sha256sum -c -`,
      `chmod +x ${plugins}/docker-compose ${plugins}/docker-buildx`,
      'systemctl enable --now docker',
      // 2 GB of swap: building the API image and running Postgres + API on a 2 GB instance.
      'if [ ! -f /swapfile ]; then dd if=/dev/zero of=/swapfile bs=1M count=2048 && chmod 600 /swapfile && mkswap /swapfile; fi',
      'swapon /swapfile || true',
      "grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab",
      'mkdir -p /etc/volti /opt/volti',
      'cat > /etc/volti/instance.env <<EOF',
      `VOLTI_REPO=${props.repoUrl}`,
      `VOLTI_BRANCH=${props.branch}`,
      `VOLTI_REGION=${this.region}`,
      `VOLTI_CONFIG_PREFIX=${CONFIG_PREFIX}`,
      `VOLTI_SECRETS_PREFIX=${SECRETS_PREFIX}`,
      `VOLTI_KEY_ALIAS=${KEY_ALIAS}`,
      `VOLTI_DEPLOY_KEY_PARAM=${DEPLOY_KEY_PARAM}`,
      `VOLTI_REPO_DIR=${REPO_DIR}`,
      'EOF',
      'install -d -m 700 /root/.ssh',
      `echo '${GITHUB_HOST_KEY}' > /root/.ssh/known_hosts`,
      // The deploy key is created in CloudShell right after the deploy (it needs alias/volti-dev): wait up to 60 min for it.
      'for i in $(seq 1 180); do',
      `  if aws ssm get-parameter --region ${this.region} --name ${DEPLOY_KEY_PARAM} --with-decryption --query Parameter.Value --output text > /root/.ssh/volti_deploy 2>/dev/null; then break; fi`,
      `  echo "aguardando ${DEPLOY_KEY_PARAM} ($i/180)"; sleep 20`,
      'done',
      'test -s /root/.ssh/volti_deploy',
      'chmod 600 /root/.ssh/volti_deploy',
      `if [ ! -d ${REPO_DIR}/.git ]; then GIT_SSH_COMMAND='ssh -i /root/.ssh/volti_deploy -o IdentitiesOnly=yes' git clone --depth 1 --branch ${props.branch} ${props.repoUrl} ${REPO_DIR}; fi`,
      // Every boot (the schedule stops/starts the instance and the public IP changes): UPSERT the A record of apiDomain.
      'cat > /etc/systemd/system/volti-dns.service <<EOF',
      '[Unit]',
      'Description=Volti: A record of the API domain -> current public IPv4',
      'Wants=network-online.target',
      'After=network-online.target',
      '[Service]',
      'Type=oneshot',
      `ExecStart=/bin/bash ${REPO_DIR}/deploy/single/dns.sh`,
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      'systemctl daemon-reload',
      'systemctl enable volti-dns.service',
      `bash ${REPO_DIR}/deploy/single/dns.sh`,
      `bash ${REPO_DIR}/deploy/single/update.sh`,
    ];
  }

  /** Daily snapshot of the tagged root volume (Docker volumes: Postgres, Redis, Caddy certificates), keeping 3. */
  private backups(): void {
    const dlmRole = new iam.Role(this, 'DlmRole', {
      assumedBy: new iam.ServicePrincipal('dlm.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSDataLifecycleManagerServiceRole')],
    });
    new dlm.CfnLifecyclePolicy(this, 'DailySnapshots', {
      description: 'volti-dev daily EBS snapshot keep 3',
      state: 'ENABLED',
      executionRoleArn: dlmRole.roleArn,
      policyDetails: {
        policyType: 'EBS_SNAPSHOT_MANAGEMENT',
        resourceTypes: ['VOLUME'],
        targetTags: [{ key: BACKUP_TAG.key, value: BACKUP_TAG.value }],
        schedules: [
          {
            name: 'daily-1200utc',
            // 12:00 UTC = 09:00 in Sao Paulo, while the scheduled instance is running.
            createRule: { interval: 24, intervalUnit: 'HOURS', times: ['12:00'] },
            retainRule: { count: 3 },
            copyTags: true,
            tagsToAdd: [{ key: SINGLE_TAG.key, value: SINGLE_TAG.value }],
          },
        ],
      },
    });
  }

  /** One String parameter per API variable (non-secret). render-env.sh turns /volti/dev/config/* into the .env of Compose. */
  private configParams(props: SingleDevStackProps): ssm.StringParameter[] {
    const { auth, cfg } = props;
    const values: Record<string, string> = {
      AWS_REGION: this.region,
      COGNITO_REGION: this.region,
      COGNITO_CUSTOMER_POOL_ID: auth.customerPool.userPoolId,
      COGNITO_CUSTOMER_CLIENT_ID: auth.customerClient.userPoolClientId,
      COGNITO_STAFF_POOL_ID: auth.staffPool.userPoolId,
      COGNITO_STAFF_CLIENT_ID: auth.staffClient.userPoolClientId,
      COGNITO_STAFF_CLIENT_IDS: `${auth.staffClient.userPoolClientId},${auth.operatorClient.userPoolClientId}`,
      CORS_ORIGINS: props.adminOrigin,
      // '-' = none (SSM String parameters cannot be empty): render-env.sh falls back to <public-ip>.sslip.io.
      API_DOMAIN: props.dns?.apiDomain ?? '-',
      HOSTED_ZONE_ID: props.dns?.hostedZoneId ?? '-',
      S3_BUCKET_KYC: this.buckets.KYC.bucketName,
      S3_BUCKET_RETURN_PHOTOS: this.buckets.RETURN_PHOTOS.bucketName,
      S3_BUCKET_REPORTS: this.buckets.REPORTS.bucketName,
      S3_BUCKET_ATTACHMENTS: this.buckets.ATTACHMENTS.bucketName,
      S3_BUCKET_CATALOG: this.buckets.CATALOG.bucketName,
      // Panel build (deploy/single/admin.sh): Hosted UI of the staff pool, panel client, bucket and distribution.
      ADMIN_ORIGIN: props.adminOrigin,
      ADMIN_BUCKET: props.adminWeb.bucket.bucketName,
      ADMIN_DISTRIBUTION_ID: props.adminWeb.distribution.distributionId,
      ADMIN_COGNITO_DOMAIN: `${cfg.auth.staffDomainPrefix}.auth.${this.region}.amazoncognito.com`,
    };
    return Object.entries(values).map(
      ([name, value]) => new ssm.StringParameter(this, `Config${name}`, { parameterName: `${CONFIG_PREFIX}/${name}`, stringValue: value }),
    );
  }

  /** SSM Run Command documents: one click in the console (Run Command → document → the instance). */
  private documents(): void {
    const doc = (id: string, name: string, description: string, runCommand: string, parameters?: Record<string, unknown>) =>
      new ssm.CfnDocument(this, id, {
        name,
        documentType: 'Command',
        documentFormat: 'JSON',
        updateMethod: 'NewVersion',
        content: {
          schemaVersion: '2.2',
          description,
          ...(parameters ? { parameters } : {}),
          mainSteps: [{ action: 'aws:runShellScript', name: 'run', inputs: { timeoutSeconds: '3600', runCommand: [runCommand] } }],
        },
      });
    const script = (name: string) => `bash ${REPO_DIR}/deploy/single/${name}`;
    doc('UpdateDocument', this.updateDocumentName, 'Volti dev: git pull, rebuild the API image, prisma migrate deploy, restart', script('update.sh'));
    doc('SeedDocument', this.seedDocumentName, 'Volti dev: idempotent seed (run once after the first update)', script('seed.sh'));
    // The allowed values/pattern are enforced by SSM before the command runs (no shell injection through the parameters).
    doc(
      'AdminDocument',
      this.adminDocumentName,
      'Volti dev: publish the admin panel (build + S3 + CloudFront) or create a test customer in the customer pool',
      `${script('admin.sh')} {{action}} {{email}}`,
      {
        action: { type: 'String', allowedValues: ['publish-panel', 'create-customer'], default: 'publish-panel', description: 'What to do' },
        email: {
          type: 'String',
          default: '-',
          allowedPattern: '^(-|[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,180}\\.[A-Za-z]{2,24})$',
          description: 'E-mail of the test customer (create-customer)',
        },
      },
    );
  }

  /** EventBridge Scheduler: start at 07:00 and stop at 23:00 (America/Sao_Paulo), with a role limited to THIS instance. */
  private scheduleInstance(): void {
    const instanceArn = `arn:aws:ec2:${this.region}:${this.account}:instance/${this.instance.instanceId}`;
    const role = new iam.Role(this, 'SchedulerRole', {
      roleName: `volti-dev-single-scheduler-${this.region}`,
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com', {
        conditions: { StringEquals: { 'aws:SourceAccount': this.account } },
      }),
    });
    role.addToPolicy(new iam.PolicyStatement({ sid: 'StartStopThisInstance', actions: ['ec2:StartInstances', 'ec2:StopInstances'], resources: [instanceArn] }));
    const schedule = (id: string, name: string, cron: string, action: 'startInstances' | 'stopInstances') =>
      new scheduler.CfnSchedule(this, id, {
        name,
        description: `Volti dev: ${action} at ${cron} (${SCHEDULE_TIMEZONE})`,
        scheduleExpression: cron,
        scheduleExpressionTimezone: SCHEDULE_TIMEZONE,
        flexibleTimeWindow: { mode: 'OFF' },
        state: 'ENABLED',
        target: {
          arn: `arn:aws:scheduler:::aws-sdk:ec2:${action}`,
          roleArn: role.roleArn,
          input: JSON.stringify({ InstanceIds: [this.instance.instanceId] }),
          retryPolicy: { maximumRetryAttempts: 3 },
        },
      });
    schedule('StartSchedule', 'volti-dev-single-start', 'cron(0 7 * * ? *)', 'startInstances');
    schedule('StopSchedule', 'volti-dev-single-stop', 'cron(0 23 * * ? *)', 'stopInstances');
  }

  /** US$ 20/month for the cost-allocation tag Projeto=Volti only (never an account-wide budget: the account runs another project). */
  private budget(email?: string): void {
    if (!email) Annotations.of(this).addWarningV2('volti:budget-email', 'Sem -c budgetEmail: o orçamento é criado sem alertas por e-mail.');
    const notification = (threshold: number, type: 'ACTUAL' | 'FORECASTED'): budgets.CfnBudget.NotificationWithSubscribersProperty => ({
      notification: { notificationType: type, comparisonOperator: 'GREATER_THAN', threshold, thresholdType: 'PERCENTAGE' },
      subscribers: [{ subscriptionType: 'EMAIL', address: email! }],
    });
    new budgets.CfnBudget(this, 'Budget', {
      budget: {
        budgetName: 'volti-dev-single-monthly',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: 20, unit: 'USD' },
        costFilters: { TagKeyValue: [`user:${SINGLE_TAG.key}$${SINGLE_TAG.value}`] },
      },
      notificationsWithSubscribers: email
        ? [notification(50, 'ACTUAL'), notification(80, 'ACTUAL'), notification(100, 'ACTUAL'), notification(100, 'FORECASTED')]
        : undefined,
    });
  }
}
