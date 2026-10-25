#!/usr/bin/env node
import { createSingleDevApp, createVoltiApp } from '../lib/volti-app';

// The CDK CLI passes "-c key=value" through CDK_CONTEXT_JSON. cdk.json defaults live in "context".
const ctx: Record<string, unknown> = JSON.parse(process.env.CDK_CONTEXT_JSON ?? '{}');
const get = (key: string): string | undefined => {
  const v = ctx[key];
  return v === undefined || v === null || v === '' ? undefined : String(v);
};

const domain = get('domainName');
const envName = get('env') ?? 'dev';
const profile = get('profile');
const overrides = {
  sesFromEmail: get('sesFromEmail'),
  sesVerifiedDomain: get('sesVerifiedDomain'),
  googleIdpSecretName: get('googleIdpSecretName'),
  appleIdpSecretName: get('appleIdpSecretName'),
  customerDomainPrefix: get('customerDomainPrefix'),
  staffDomainPrefix: get('staffDomainPrefix'),
  apiRateLimitPer5Min: get('apiRateLimitPer5Min') === undefined ? undefined : Number(get('apiRateLimitPer5Min')),
};

if (profile !== undefined && profile !== 'single') throw new Error(`profile inválido: "${profile}" (único valor aceito: single)`);
if (profile === 'single' && envName !== 'dev') throw new Error('profile=single só existe com env=dev.');

const { app } =
  profile === 'single'
    ? createSingleDevApp({
        account: get('account'),
        repoUrl: get('repoUrl'),
        branch: get('branch'),
        instanceType: get('instanceType'),
        rootVolumeGb: get('rootVolumeGb') === undefined ? undefined : Number(get('rootVolumeGb')),
        hostedZoneId: get('hostedZoneId'),
        apiDomain: get('apiDomain'),
        schedule: get('schedule') !== 'false',
        budgetEmail: get('budgetEmail'),
        overrides,
        outdir: process.env.CDK_OUTDIR,
      })
    : createVoltiApp({
        envName,
        account: get('account'),
        certificateArn: get('certificateArn'),
        apiImageTag: get('apiImageTag'),
        apiDesiredCount: get('apiDesiredCount') === undefined ? undefined : Number(get('apiDesiredCount')),
        adminDomainName: domain ? `admin.${domain}` : undefined,
        apiDomainName: domain ? `api.${domain}` : undefined,
        adminCertificateArn: get('adminCertificateArn'),
        alarmEmail: get('alarmEmail'),
        budgetEmail: get('budgetEmail'),
        apiRunSeed: get('apiRunSeed') === 'true',
        overrides,
        outdir: process.env.CDK_OUTDIR,
      });
app.synth();
