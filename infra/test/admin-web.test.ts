import { Match } from 'aws-cdk-lib/assertions';
import { SPA_REWRITE_FUNCTION_CODE } from '../lib/stacks/admin-web-stack';
import { stacksFor, templateOf } from './helpers';

describe('AdminWebStack', () => {
  const t = () => templateOf(stacksFor('dev').adminWeb);

  it('CloudFront uses OAC (no OAI); prod has a WebACLId, dev none (WAF off)', () => {
    t().resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    t().resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);
    t().hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({ WebACLId: Match.absent() }),
    });
    templateOf(stacksFor('prod').adminWeb).hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({ WebACLId: Match.anyValue() }),
    });
  });

  it('rewrites extensionless URIs to index.html with a viewer-request function and serves /404.html for misses', () => {
    t().resourceCountIs('AWS::CloudFront::Function', 1);
    t().hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({
          FunctionAssociations: [Match.objectLike({ EventType: 'viewer-request', FunctionARN: Match.anyValue() })],
        }),
        CustomErrorResponses: Match.arrayWith([Match.objectLike({ ErrorCode: 404, ResponsePagePath: '/404.html' })]),
      }),
    });
    // O código da função, executado localmente, cobre os casos de roteamento.
    const handler = new Function(`${SPA_REWRITE_FUNCTION_CODE}; return handler;`)() as (e: { request: { uri: string } }) => { uri: string };
    const rewrite = (uri: string) => handler({ request: { uri } }).uri;
    expect(rewrite('/')).toBe('/index.html');
    expect(rewrite('/fleet')).toBe('/fleet/index.html');
    expect(rewrite('/fleet/')).toBe('/fleet/index.html');
    expect(rewrite('/auth/callback')).toBe('/auth/callback/index.html');
    expect(rewrite('/_next/static/chunks/app.js')).toBe('/_next/static/chunks/app.js');
    expect(rewrite('/fonts/PlusJakartaSans-400.woff2')).toBe('/fonts/PlusJakartaSans-400.woff2');
    expect(rewrite('/404.html')).toBe('/404.html');
  });

  it('site bucket is private', () => {
    t().hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true },
    });
  });

  it('WAF is a CLOUDFRONT-scoped web ACL with managed rule groups in us-east-1', () => {
    expect(stacksFor('dev').waf).toBeUndefined();
    const waf = templateOf(stacksFor('prod').waf!);
    waf.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'CLOUDFRONT',
      Rules: Match.arrayWith([
        Match.objectLike({ Statement: { ManagedRuleGroupStatement: Match.objectLike({ VendorName: 'AWS' }) } }),
      ]),
    });
    expect(stacksFor('prod').waf!.region).toBe('us-east-1');
    expect(stacksFor('dev').adminWeb.region).toBe('sa-east-1');
  });

  it('publishes admin/distribution-domain', () => {
    t().hasResourceProperties('AWS::SSM::Parameter', { Name: '/volti/dev/admin/distribution-domain' });
  });
});
