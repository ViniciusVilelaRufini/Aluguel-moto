import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvConfig } from '../config';
import { publishParam } from '../ssm';

/**
 * Viewer-request: o export estático do Next (trailingSlash) gera `rota/index.html`; o S3 não resolve diretórios,
 * então URIs sem extensão viram `<uri>/index.html` (e `/` vira `/index.html`). Arquivos com extensão passam direto.
 */
export const SPA_REWRITE_FUNCTION_CODE = `function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
  } else if (uri.split('/').pop().indexOf('.') === -1) {
    request.uri = uri + '/index.html';
  }
  return request;
}`;

export interface AdminWebStackProps extends StackProps {
  cfg: EnvConfig;
  webAclArn: string;
  /** Optional custom domain for the panel; needs adminCertificateArn (ACM in us-east-1). */
  adminDomainName?: string;
  adminCertificateArn?: string;
}

export class AdminWebStack extends Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: AdminWebStackProps) {
    super(scope, id, props);
    const { cfg } = props;

    this.bucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `volti-${cfg.name}-${this.account}-admin-web`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const rewrite = new cloudfront.Function(this, 'RewriteToIndexHtml', {
      comment: 'Reescreve rotas do export estatico para <rota>/index.html',
      code: cloudfront.FunctionCode.fromInline(SPA_REWRITE_FUNCTION_CODE),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    const custom = props.adminDomainName && props.adminCertificateArn;

    // Origin Access Control (not the legacy OAI): the bucket policy only trusts this distribution.
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `Volti ${cfg.name} admin panel`,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass[cfg.cloudFrontPriceClass.replace('PriceClass_', 'PRICE_CLASS_') as keyof typeof cloudfront.PriceClass],
      minimumProtocolVersion: custom ? cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021 : undefined,
      webAclId: props.webAclArn,
      domainNames: custom ? [props.adminDomainName!] : undefined,
      certificate: custom ? acm.Certificate.fromCertificateArn(this, 'AdminCert', props.adminCertificateArn!) : undefined,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [{ function: rewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      // Rota inexistente: o bucket privado devolve 403 (sem ListBucket) ou 404; ambos mostram a página 404 do Next.
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 404, responsePagePath: '/404.html' },
        { httpStatus: 404, responseHttpStatus: 404, responsePagePath: '/404.html' },
      ],
    });

    publishParam(this, cfg.name, 'admin/distribution-domain', this.distribution.distributionDomainName);
    publishParam(this, cfg.name, 'admin/site-bucket', this.bucket.bucketName);
  }
}
