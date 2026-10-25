import { Annotations, Duration, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as dlm from 'aws-cdk-lib/aws-dlm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { AdminWebStack } from './admin-web-stack';
import { AuthStack } from './auth-stack';

/** Cost-allocation tag on every resource of the single profile (the account also runs another project). */
export const SINGLE_TAG = { key: 'Projeto', value: 'Volti' } as const;
/** Tag of the volumes snapshotted daily by Data Lifecycle Manager. */
export const BACKUP_TAG = { key: 'volti-backup', value: 'daily' } as const;
/** Read-only GitHub deploy key (private part), created by hand in CloudShell; never by CDK. */
export const DEPLOY_KEY_PARAM = '/volti/dev/github-deploy-key';
/** Non-secret configuration written by this stack, one parameter per API variable (read by deploy/single/render-env.sh). */
export const CONFIG_PREFIX = '/volti/dev/config';
/** Secrets generated on the instance at first boot (SecureString, aws/ssm key) or pasted by hand. */
export const SECRETS_PREFIX = '/volti/dev/secrets';
export const DEFAULT_REPO = 'git@github.com:ViniciusVilelaRufini/Aluguel-moto.git';
export const DEFAULT_BRANCH = 'feat/galpao';
const REPO_DIR = '/opt/volti/src';
// GitHub's published SSH host key (docs.github.com, "GitHub's SSH key fingerprints"): no trust-on-first-use ssh-keyscan.
const GITHUB_HOST_KEY = 'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl';
const COMPOSE_VERSION = 'v2.29.7';
const BUILDX_VERSION = 'v0.17.1';

export interface SingleDevStackProps extends StackProps {
  cfg: EnvConfig;
  auth: AuthStack;
  /** Panel bucket + distribution: the instance builds apps/admin and publishes it (deploy/single/admin.sh). */
  adminWeb: AdminWebStack;
  /** https origin of the admin panel (CloudFront or admin.<domain>): CORS of the API and of the catalog bucket. */
  adminOrigin: string;
  repoUrl: string;
  branch: string;
  instanceType: string;
  rootVolumeGb: number;
  /** api.<domain> when -c domainName is given; otherwise the instance answers on <public-ip>.sslip.io (render-env.sh). */
  apiDomainName?: string;
  /** Default VPC: looked up (CloudShell has credentials) unless vpcId + subnetId are given (offline synth / tests). */
  vpcId?: string;
  subnetId?: string;
  budgetEmail?: string;
}

/**
 * Dev on ONE EC2 instance (lacunas T20, docs/decisoes.md): Docker Compose with the API, PostgreSQL 16 + PostGIS, Redis,
 * Mosquitto (IOT_MODE=local) and Caddy (automatic HTTPS). Managed and nearly free: S3 for uploads, Cognito (auth stack),
 * the panel on S3 + CloudFront (admin-web stack), parameters in SSM. No NAT, ALB, RDS, ElastiCache, Kinesis or WAF.
 */
export class SingleDevStack extends Stack {
  public readonly instance: ec2.Instance;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly buckets: Record<'KYC' | 'RETURN_PHOTOS' | 'REPORTS' | 'ATTACHMENTS' | 'CATALOG', s3.Bucket>;
  public readonly updateDocumentName = 'volti-dev-update';
  public readonly seedDocumentName = 'volti-dev-seed';
  public readonly adminDocumentName = 'volti-dev-admin';

  constructor(scope: Construct, id: string, props: SingleDevStackProps) {
    super(scope, id, props);
    const { cfg, auth } = props;
    if (cfg.name !== 'dev') throw new Error('profile=single é só para env=dev.');

    const vpc =
      props.vpcId && props.subnetId
        ? ec2.Vpc.fromVpcAttributes(this, 'DefaultVpc', {
            vpcId: props.vpcId,
            availabilityZones: [`${this.region}a`],
            publicSubnetIds: [props.subnetId],
          })
        : ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    // S3 (uploads). SSE-S3: no customer KMS key (US$ 1/month each). The instance role is the only reader/writer.
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
      vpc,
      securityGroupName: 'volti-dev-single',
      description: 'Volti dev single instance: HTTP/HTTPS only (Caddy); no SSH, access via SSM',
      allowAllOutbound: true,
    });
    this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP (ACME challenge and redirect to HTTPS)');
    this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS (Caddy -> API)');

    const role = new iam.Role(this, 'InstanceRole', {
      roleName: `volti-dev-single-${this.region}`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
    });
    this.grantInstance(role, auth);
    // Panel publishing from the instance: write the site bucket and invalidate the distribution.
    props.adminWeb.bucket.grantReadWrite(role);
    props.adminWeb.bucket.grantDelete(role);
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cloudfront:CreateInvalidation'],
        resources: [`arn:aws:cloudfront::${this.account}:distribution/${props.adminWeb.distribution.distributionId}`],
      }),
    );

    const userData = ec2.UserData.forLinux();
    userData.addCommands(...this.bootScript(props));

    this.instance = new ec2.Instance(this, 'Instance', {
      instanceName: 'volti-dev-single',
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      associatePublicIpAddress: true,
      instanceType: new ec2.InstanceType(props.instanceType),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({ cpuType: ec2.AmazonLinuxCpuType.ARM_64 }),
      securityGroup: this.securityGroup,
      role,
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
    this.configParams(props);
    this.documents();
    this.budget(props.budgetEmail);
  }

  private grantInstance(role: iam.Role, auth: AuthStack): void {
    for (const b of Object.values(this.buckets)) b.grantReadWrite(role);
    const param = (name: string) => `arn:aws:ssm:${this.region}:${this.account}:parameter${name}`;
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DeployKey',
        actions: ['ssm:GetParameter'],
        resources: [param(DEPLOY_KEY_PARAM)],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ReadConfigAndSecrets',
        actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
        resources: [param(CONFIG_PREFIX), param(`${CONFIG_PREFIX}/*`), param(SECRETS_PREFIX), param(`${SECRETS_PREFIX}/*`)],
      }),
    );
    // Secrets are generated on the instance at first boot (CloudFormation cannot create SecureString parameters).
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CreateGeneratedSecrets',
        actions: ['ssm:PutParameter', 'ssm:AddTagsToResource'],
        resources: [param(`${SECRETS_PREFIX}/*`)],
      }),
    );
    // SecureString with the AWS-managed aws/ssm key: only through SSM and only for these parameters (encryption context).
    const viaSsm = { 'kms:ViaService': `ssm.${this.region}.amazonaws.com` };
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DecryptVoltiParameters',
        actions: ['kms:Decrypt'],
        resources: [`arn:aws:kms:${this.region}:${this.account}:key/*`],
        conditions: {
          StringEquals: viaSsm,
          StringLike: { 'kms:EncryptionContext:PARAMETER_ARN': [param(DEPLOY_KEY_PARAM), param(`${SECRETS_PREFIX}/*`)] },
        },
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EncryptGeneratedSecrets',
        actions: ['kms:Encrypt', 'kms:GenerateDataKey'],
        resources: [`arn:aws:kms:${this.region}:${this.account}:key/*`],
        conditions: { StringEquals: viaSsm, StringLike: { 'kms:EncryptionContext:PARAMETER_ARN': [param(`${SECRETS_PREFIX}/*`)] } },
      }),
    );
    // Same Cognito actions as the ECS task role (QA-04/QA-07, M7).
    role.addToPolicy(
      new iam.PolicyStatement({
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
        actions: ['cognito-idp:AdminDeleteUser', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminUserGlobalSignOut', 'cognito-idp:AdminGetUser'],
        resources: [auth.customerPool.userPoolArn],
      }),
    );
  }

  /** First boot only (user data). Nothing secret here: the deploy key and the secrets come from SSM at run time. */
  private bootScript(props: SingleDevStackProps): string[] {
    const arch = 'aarch64';
    return [
      'set -euo pipefail',
      'exec > >(tee -a /var/log/volti-boot.log) 2>&1',
      'dnf install -y docker git openssl',
      'mkdir -p /usr/local/lib/docker/cli-plugins',
      `curl -fsSL https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${arch} -o /usr/local/lib/docker/cli-plugins/docker-compose`,
      `curl -fsSL https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-arm64 -o /usr/local/lib/docker/cli-plugins/docker-buildx`,
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/lib/docker/cli-plugins/docker-buildx',
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
      `VOLTI_DEPLOY_KEY_PARAM=${DEPLOY_KEY_PARAM}`,
      `VOLTI_REPO_DIR=${REPO_DIR}`,
      'EOF',
      'install -d -m 700 /root/.ssh',
      `echo '${GITHUB_HOST_KEY}' > /root/.ssh/known_hosts`,
      `aws ssm get-parameter --region ${this.region} --name ${DEPLOY_KEY_PARAM} --with-decryption --query Parameter.Value --output text > /root/.ssh/volti_deploy`,
      'chmod 600 /root/.ssh/volti_deploy',
      `if [ ! -d ${REPO_DIR}/.git ]; then GIT_SSH_COMMAND='ssh -i /root/.ssh/volti_deploy -o IdentitiesOnly=yes' git clone --depth 1 --branch ${props.branch} ${props.repoUrl} ${REPO_DIR}; fi`,
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
            name: 'daily-0600utc',
            createRule: { interval: 24, intervalUnit: 'HOURS', times: ['06:00'] },
            retainRule: { count: 3 },
            copyTags: true,
            tagsToAdd: [{ key: SINGLE_TAG.key, value: SINGLE_TAG.value }],
          },
        ],
      },
    });
  }

  /** One String parameter per API variable (non-secret). render-env.sh turns /volti/dev/config/* into the .env of Compose. */
  private configParams(props: SingleDevStackProps): void {
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
      // '-' = no domain: render-env.sh uses <public-ip>.sslip.io (SSM String parameters cannot be empty).
      API_DOMAIN: props.apiDomainName ?? '-',
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
    for (const [name, value] of Object.entries(values)) {
      new ssm.StringParameter(this, `Config${name}`, { parameterName: `${CONFIG_PREFIX}/${name}`, stringValue: value });
    }
  }

  /** SSM Run Command documents: one click in the console (Run Command → volti-dev-update, target the instance). */
  private documents(): void {
    const doc = (id: string, name: string, description: string, script: string) =>
      new ssm.CfnDocument(this, id, {
        name,
        documentType: 'Command',
        documentFormat: 'JSON',
        updateMethod: 'NewVersion',
        content: {
          schemaVersion: '2.2',
          description,
          mainSteps: [
            {
              action: 'aws:runShellScript',
              name: 'run',
              inputs: { timeoutSeconds: '3600', runCommand: [`bash ${REPO_DIR}/deploy/single/${script}`] },
            },
          ],
        },
      });
    doc('UpdateDocument', this.updateDocumentName, 'Volti dev: git pull, rebuild the API image, prisma migrate deploy, restart', 'update.sh');
    doc('SeedDocument', this.seedDocumentName, 'Volti dev: idempotent seed (run once after the first update)', 'seed.sh');
    doc('AdminDocument', this.adminDocumentName, 'Volti dev: build the admin panel and publish it to S3 + CloudFront', 'admin.sh');
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
