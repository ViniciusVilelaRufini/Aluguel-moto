import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { buildBridgePolicyDocument, GT06_PORT, TRACCAR_IMAGE, TRACCAR_WEB_PORT } from '../lib/stacks/traccar-stack';
import { createVoltiApp } from '../lib/volti-app';
import { stacksFor } from './helpers';

const envOf = (c: any): Record<string, unknown> => Object.fromEntries((c.Environment ?? []).map((e: any) => [e.Name, e.Value]));

describe('TraccarStack (proposta, opt-in por -c gt06Things)', () => {
  const s = createVoltiApp({ envName: 'dev', traccar: { gt06Things: ['moto-0901', 'moto-0902'], openGt06: true } });
  const t = Template.fromStack(s.traccar!);
  const tasks = () => Object.values(t.findResources('AWS::ECS::TaskDefinition')) as any[];
  const container = (name: string) => tasks().map((td) => td.Properties.ContainerDefinitions[0]).find((c: any) => c.Name === name);

  it('não existe sem gt06Things: dev e prod de hoje intactos', () => {
    expect(stacksFor('dev').traccar).toBeUndefined();
    expect(stacksFor('prod').traccar).toBeUndefined();
  });

  it('NLB internet-facing só com TCP 5023; a REST 8082 nunca passa pelo NLB', () => {
    t.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', { Type: 'network', Scheme: 'internet-facing' });
    const listeners = Object.values(t.findResources('AWS::ElasticLoadBalancingV2::Listener')) as any[];
    expect(listeners.map((l) => [l.Properties.Port, l.Properties.Protocol])).toEqual([[GT06_PORT, 'TCP']]);
  });

  it('8082 só a partir do security group da ponte; sem faixa da APN, 5023 aberta (bancada) e health check pela VPC', () => {
    const rules = Object.values(t.findResources('AWS::EC2::SecurityGroupIngress')) as any[];
    const web = rules.filter((r) => r.Properties.FromPort === TRACCAR_WEB_PORT);
    expect(web).toHaveLength(1);
    expect(web[0].Properties.SourceSecurityGroupId).toBeDefined();
    const inline = (Object.values(t.findResources('AWS::EC2::SecurityGroup')) as any[]).flatMap((sg) => sg.Properties.SecurityGroupIngress ?? []);
    expect(inline.some((r: any) => r.FromPort === TRACCAR_WEB_PORT)).toBe(false);
    expect(inline.filter((r: any) => r.FromPort === GT06_PORT).map((r: any) => r.CidrIp)).toContain('0.0.0.0/0');
  });

  it('com apnCidrs, a 5023 só dessas faixas (além da VPC para o health check)', () => {
    const withApn = createVoltiApp({ envName: 'dev', traccar: { gt06Things: ['moto-0901'], apnCidrs: ['10.200.0.0/16'] } });
    const inline = (Object.values(Template.fromStack(withApn.traccar!).findResources('AWS::EC2::SecurityGroup')) as any[]).flatMap((sg) => sg.Properties.SecurityGroupIngress ?? []);
    const gt06 = inline.filter((r: any) => r.FromPort === GT06_PORT).map((r: any) => r.CidrIp);
    expect(gt06).toContain('10.200.0.0/16');
    expect(gt06).not.toContain('0.0.0.0/0');
  });

  it('Traccar: ARM64, imagem fixada, uma task por vez, banco traccar, senha só por segredo', () => {
    for (const td of tasks()) expect(td.Properties.RuntimePlatform).toEqual({ CpuArchitecture: 'ARM64', OperatingSystemFamily: 'LINUX' });
    const traccar = container('traccar');
    expect(traccar.Image).toBe(TRACCAR_IMAGE);
    expect(TRACCAR_IMAGE).not.toMatch(/:latest$/);
    expect(envOf(traccar)).toMatchObject({ DATABASE_USER: 'traccar', PROTOCOLS_ENABLE: 'gt06', GT06_PORT: '5023', CONFIG_USE_ENVIRONMENT_VARIABLES: 'true' });
    expect(JSON.stringify(envOf(traccar).DATABASE_URL)).toContain(':5432/traccar');
    expect(traccar.Secrets.map((x: any) => x.Name)).toEqual(['DATABASE_PASSWORD']);
    t.hasResourceProperties('AWS::ECS::Service', { ServiceName: 'volti-dev-traccar', DesiredCount: 0, DeploymentConfiguration: Match.objectLike({ MinimumHealthyPercent: 0, MaximumPercent: 100 }) });
  });

  it('ponte: IoT Core com certificado de serviço, Traccar pela rede interna, senhas e certificado só por segredo', () => {
    const bridge = container('bridge');
    expect(envOf(bridge)).toMatchObject({ IOT_MODE: 'aws', MQTT_CLIENT_ID: 'traccar-bridge-dev', TRACCAR_URL: 'http://traccar.traccar.volti-dev.internal:8082', TRACCAR_EMAIL: 'bridge@volti.local', DATABASE_USER: 'volti_bridge', DATABASE_SSL: 'require' });
    expect(bridge.Secrets.map((x: any) => x.Name).sort()).toEqual(['DATABASE_PASSWORD', 'MQTT_CERT_PEM', 'MQTT_KEY_PEM', 'TRACCAR_PASSWORD']);
    expect(Object.keys(envOf(bridge)).some((k) => /PASSWORD|PEM/.test(k))).toBe(false);
    t.hasResourceProperties('AWS::ECS::Service', { ServiceName: 'volti-dev-traccar-bridge', DesiredCount: 0 });
  });

  it('B-I3: container da ponte com health check do arquivo de vida (mesmo do Dockerfile): fila travada → task substituída', () => {
    expect(container('bridge').HealthCheck).toEqual({ Command: ['CMD', 'node', 'dist/healthcheck.js'], Interval: 30, Timeout: 10, Retries: 3, StartPeriod: 60 });
  });

  it('Dockerfile da ponte: base fixada por digest e HEALTHCHECK com o mesmo comando', () => {
    const df = readFileSync(join(__dirname, '..', '..', 'services', 'traccar-bridge', 'Dockerfile'), 'utf8');
    expect(df).toMatch(/^ARG NODE_IMAGE=node:24-alpine@sha256:[0-9a-f]{64}$/m);
    expect(df.match(/^FROM .*$/gm)).toEqual(['FROM ${NODE_IMAGE} AS base', 'FROM base AS build', 'FROM ${NODE_IMAGE} AS runtime']);
    expect(df).toContain('HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD ["node", "dist/healthcheck.js"]');
  });

  it('política IoT da ponte: só os things relay_only listados (sem curinga de thing)', () => {
    const doc = buildBridgePolicyDocument('sa-east-1', '000000000000', 'dev', ['moto-0901']);
    const all = doc.Statement.flatMap((st) => (Array.isArray(st.Resource) ? st.Resource : [st.Resource]));
    expect(all.every((r) => !r.includes('*') && !r.includes('+'))).toBe(true);
    expect(all).toContain('arn:aws:iot:sa-east-1:000000000000:client/traccar-bridge-dev');
    expect(all).toContain('arn:aws:iot:sa-east-1:000000000000:topic/$aws/things/moto-0901/shadow/update');
    expect(all).toContain('arn:aws:iot:sa-east-1:000000000000:topicfilter/$aws/things/moto-0901/shadow/update/delta');
    t.hasResourceProperties('AWS::IoT::Policy', { PolicyName: 'volti-dev-traccar-bridge-policy' });
  });

  it('Traccar >= 6.7.0 (noQueue: engineStop nunca fica na fila para moto em movimento)', () => {
    const tag = /^traccar\/traccar:(\d+)\.(\d+)/.exec(TRACCAR_IMAGE)!;
    const major = Number(tag[1]);
    const minor = Number(tag[2]);
    expect(major > 6 || (major === 6 && minor >= 7)).toBe(true);
  });

  it('5023 aberta exige reconhecimento: sem apnCidrs nem openGt06 lança; com openGt06 avisa; prod nunca abre', () => {
    expect(() => createVoltiApp({ envName: 'dev', traccar: { gt06Things: ['moto-0901'] } })).toThrow('openGt06');
    expect(() => createVoltiApp({ envName: 'prod', apiDomainName: 'api.volti.example', traccar: { gt06Things: ['moto-0901'], openGt06: true } })).toThrow('apnCidrs');
    Annotations.fromStack(s.traccar!).hasWarning('*', Match.stringLikeRegexp('5023'));
  });

  it('JDBC do Traccar exige SSL (rds.force_ssl)', () => {
    expect(JSON.stringify(envOf(container('traccar')).DATABASE_URL)).toContain('?sslmode=require');
  });

  it('traccarDesiredCount: padrão 0 nos dois serviços; >0 exige bridgeImageTag explícita (não latest)', () => {
    const base = { gt06Things: ['moto-0901'], openGt06: true };
    expect(() => createVoltiApp({ envName: 'dev', traccar: { ...base, desiredCount: 1 } })).toThrow('bridgeImageTag');
    expect(() => createVoltiApp({ envName: 'dev', traccar: { ...base, desiredCount: 1, bridgeImageTag: 'latest' } })).toThrow('bridgeImageTag');
    const on = Template.fromStack(createVoltiApp({ envName: 'dev', traccar: { ...base, desiredCount: 1, bridgeImageTag: 'abc1234' } }).traccar!);
    on.hasResourceProperties('AWS::ECS::Service', { ServiceName: 'volti-dev-traccar', DesiredCount: 1 });
    on.hasResourceProperties('AWS::ECS::Service', { ServiceName: 'volti-dev-traccar-bridge', DesiredCount: 1 });
  });

  it('validações: thing inválido; prod sem apnCidrs (GT06 sem TLS só por APN privada)', () => {
    expect(() => createVoltiApp({ envName: 'dev', traccar: { gt06Things: ['VLT-1'] } })).toThrow('gt06Things');
    expect(() => createVoltiApp({ envName: 'prod', apiDomainName: 'api.volti.example', traccar: { gt06Things: ['moto-0901'] } })).toThrow('apnCidrs');
  });
});
