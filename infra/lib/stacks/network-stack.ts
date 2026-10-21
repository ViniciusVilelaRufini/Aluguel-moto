import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { publishParam } from '../ssm';

export interface NetworkStackProps extends StackProps {
  cfg: EnvConfig;
}

export class NetworkStack extends Stack {
  public readonly vpc: ec2.Vpc;
  private readonly fixedAzs: string[];

  /** Overridden so the Vpc construct never triggers the AZ context lookup (needs credentials). */
  override get availabilityZones(): string[] {
    return this.fixedAzs;
  }

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);
    const { cfg } = props;
    this.fixedAzs = cfg.availabilityZones;

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `volti-${cfg.name}`,
      ipAddresses: ec2.IpAddresses.cidr('10.20.0.0/16'),
      // Fixed AZs avoid the AZ context lookup, so synth works without credentials.
      availabilityZones: cfg.availabilityZones,
      natGateways: cfg.natGateways,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 22 },
      ],
      // Gateway endpoint is free and keeps S3 traffic off the NAT gateway.
      gatewayEndpoints: { S3: { service: ec2.GatewayVpcEndpointAwsService.S3 } },
    });

    publishParam(this, cfg.name, 'vpc/id', this.vpc.vpcId);
  }
}
