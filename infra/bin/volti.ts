#!/usr/bin/env node
import { createVoltiApp } from '../lib/volti-app';

// The CDK CLI passes "-c key=value" through CDK_CONTEXT_JSON. cdk.json defaults live in "context".
const ctx: Record<string, unknown> = JSON.parse(process.env.CDK_CONTEXT_JSON ?? '{}');
const get = (key: string): string | undefined => {
  const v = ctx[key];
  return v === undefined || v === null || v === '' ? undefined : String(v);
};

const domain = get('domainName');
const { app } = createVoltiApp({
  envName: get('env') ?? 'dev',
  account: get('account'),
  certificateArn: get('certificateArn'),
  apiImageTag: get('apiImageTag'),
  apiDesiredCount: get('apiDesiredCount') === undefined ? undefined : Number(get('apiDesiredCount')),
  adminDomainName: domain ? `admin.${domain}` : undefined,
  adminCertificateArn: get('adminCertificateArn'),
  alarmEmail: get('alarmEmail'),
  outdir: process.env.CDK_OUTDIR,
});
app.synth();
