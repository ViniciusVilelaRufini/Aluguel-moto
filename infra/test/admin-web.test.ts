import { Match } from 'aws-cdk-lib/assertions';
import { stacksFor, templateOf } from './helpers';

describe('AdminWebStack', () => {
  const t = () => templateOf(stacksFor('dev').adminWeb);

  it('CloudFront uses OAC (no OAI) and has a WebACLId', () => {
    t().resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    t().resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);
    t().hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({ WebACLId: Match.anyValue() }),
    });
  });

  it('site bucket is private', () => {
    t().hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true },
    });
  });

  it('WAF is a CLOUDFRONT-scoped web ACL with managed rule groups in us-east-1', () => {
    const waf = templateOf(stacksFor('dev').waf);
    waf.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'CLOUDFRONT',
      Rules: Match.arrayWith([
        Match.objectLike({ Statement: { ManagedRuleGroupStatement: Match.objectLike({ VendorName: 'AWS' }) } }),
      ]),
    });
    expect(stacksFor('dev').waf.region).toBe('us-east-1');
    expect(stacksFor('dev').adminWeb.region).toBe('sa-east-1');
  });

  it('publishes admin/distribution-domain', () => {
    t().hasResourceProperties('AWS::SSM::Parameter', { Name: '/volti/dev/admin/distribution-domain' });
  });
});
