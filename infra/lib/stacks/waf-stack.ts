import { Stack, StackProps } from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';

export interface WafStackProps extends StackProps {
  cfg: EnvConfig;
}

/** CloudFront web ACLs must live in us-east-1, hence a separate stack in that region. */
export class WafStack extends Stack {
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);
    const { cfg } = props;

    const vis = (name: string) => ({ cloudWatchMetricsEnabled: true, sampledRequestsEnabled: true, metricName: name });
    const managed = (name: string, priority: number): wafv2.CfnWebACL.RuleProperty => ({
      name,
      priority,
      overrideAction: { none: {} },
      statement: { managedRuleGroupStatement: { vendorName: 'AWS', name } },
      visibilityConfig: vis(name),
    });

    const acl = new wafv2.CfnWebACL(this, 'AdminAcl', {
      name: `volti-${cfg.name}-admin`,
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: vis(`volti-${cfg.name}-admin`),
      rules: [
        managed('AWSManagedRulesCommonRuleSet', 10),
        managed('AWSManagedRulesKnownBadInputsRuleSet', 20),
        managed('AWSManagedRulesAmazonIpReputationList', 30),
        {
          name: 'RateLimitPerIp',
          priority: 40,
          action: { block: {} },
          statement: { rateBasedStatement: { limit: 2000, aggregateKeyType: 'IP' } },
          visibilityConfig: vis('RateLimitPerIp'),
        },
      ],
    });
    this.webAclArn = acl.attrArn;
  }
}
