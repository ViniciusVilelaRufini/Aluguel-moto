/**
 * Provisionamento de uma estação de troca de bateria no AWS IoT Core (análogo a services/api/scripts/provision-tracker.ts).
 *
 *   pnpm --filter infra exec ts-node scripts/provision-station.ts --station <stationId uuid> [--env dev] [--out ~/.volti/certs] [--dry-run]
 *
 *   1. CreateThing `station-<stationId>` (thing type `estacao`, atributo stationId) — o mesmo nome que a API usa
 *      (`stationThingName` em services/api/src/ports/station-gateway.port.ts);
 *   2. CreateKeysAndCertificate (X.509 ativo) — certificado e chave privada gravados em `--out/<thing>` (permissão 600), nunca no log;
 *   3. AttachPolicy `volti-<env>-estacao-policy` (só `estacoes/<thing>/eventos` e `estacoes/<thing>/comandos`);
 *   4. AttachThingPrincipal.
 *
 * Idempotente: thing existente é reaproveitada; se ela já tiver certificado anexado, nenhum certificado novo é emitido.
 * Não grava no banco: a estação (`SwapStation`) é cadastrada pela API e o QR é emitido com `pnpm --filter api stations:qr`.
 * Credenciais AWS vêm do ambiente (perfil/SSO/role); nada é guardado aqui.
 */
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  AttachPolicyCommand,
  AttachThingPrincipalCommand,
  CreateKeysAndCertificateCommand,
  CreateThingCommand,
  DeleteCertificateCommand,
  DescribeThingCommand,
  DetachPolicyCommand,
  IoTClient,
  ListThingPrincipalsCommand,
  ResourceNotFoundException,
  UpdateCertificateCommand,
} from '@aws-sdk/client-iot';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const STATION_THING_TYPE = 'estacao';

export interface StationPlan {
  stationId: string;
  thingName: string;
  policyName: string;
  env: string;
  outDir: string;
  dryRun: boolean;
}

/** Valida os argumentos e monta o plano (sem chamar a AWS). */
export function planFromArgs(argv: string[], defaults: { env?: string; home?: string } = {}): StationPlan {
  const { values } = parseArgs({
    args: argv,
    options: {
      station: { type: 'string' },
      env: { type: 'string', default: defaults.env ?? 'dev' },
      // Fora do repositório por padrão: a chave privada nunca deve ir para o git.
      out: { type: 'string', default: join(defaults.home ?? homedir(), '.volti', 'certs') },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const stationId = values.station?.toLowerCase();
  if (!stationId || !UUID.test(stationId)) throw new Error('--station <uuid da SwapStation> obrigatório');
  if (values.env !== 'dev' && values.env !== 'prod') throw new Error('--env deve ser dev ou prod');
  return {
    stationId,
    thingName: `station-${stationId}`,
    policyName: `volti-${values.env}-estacao-policy`,
    env: values.env,
    outDir: resolve(values.out!, `station-${stationId}`),
    dryRun: values['dry-run']!,
  };
}

function log(entry: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), script: 'provision-station', ...entry })}\n`);
}

export async function provision(iot: Pick<IoTClient, 'send'>, plan: StationPlan): Promise<{ certificateArn?: string; issued: boolean }> {
  const { thingName, policyName } = plan;
  let exists = true;
  try {
    await iot.send(new DescribeThingCommand({ thingName }));
  } catch (err) {
    if (err instanceof ResourceNotFoundException || (err as Error).name === 'ResourceNotFoundException') exists = false;
    else throw err;
  }
  const principals = exists ? ((await iot.send(new ListThingPrincipalsCommand({ thingName }))).principals ?? []) : [];
  log({ msg: 'plan', thingName, thingExists: exists, issueCertificate: principals.length === 0, policyName, dryRun: plan.dryRun });
  if (plan.dryRun) return { issued: false };
  if (!exists) {
    await iot.send(new CreateThingCommand({ thingName, thingTypeName: STATION_THING_TYPE, attributePayload: { attributes: { stationId: plan.stationId } } }));
    log({ msg: 'thing_created', thingName });
  }
  if (principals.length > 0) {
    log({ msg: 'certificate_already_attached', thingName });
    return { certificateArn: principals[0], issued: false };
  }

  const cert = await iot.send(new CreateKeysAndCertificateCommand({ setAsActive: true }));
  if (!cert.certificateArn || !cert.certificateId || !cert.certificatePem || !cert.keyPair?.PrivateKey) {
    throw new Error('Resposta incompleta do CreateKeysAndCertificate');
  }
  mkdirSync(plan.outDir, { recursive: true });
  for (const [file, content] of [
    ['certificate.pem.crt', cert.certificatePem],
    ['private.pem.key', cert.keyPair.PrivateKey],
    ['public.pem.key', cert.keyPair.PublicKey ?? ''],
  ] as const) {
    writeFileSync(join(plan.outDir, file), content, { mode: 0o600 });
    chmodSync(join(plan.outDir, file), 0o600);
  }
  log({ msg: 'certificate_issued', thingName, certificateId: cert.certificateId, dir: plan.outDir });
  try {
    await iot.send(new AttachPolicyCommand({ policyName, target: cert.certificateArn }));
    await iot.send(new AttachThingPrincipalCommand({ thingName, principal: cert.certificateArn }));
  } catch (err) {
    // Certificado ativo e solto não pode ficar para trás: desativa, desanexa e apaga.
    log({ level: 'error', msg: 'certificate_attach_failed', thingName, error: (err as Error).message });
    await iot.send(new DetachPolicyCommand({ policyName, target: cert.certificateArn })).catch(() => undefined);
    await iot.send(new UpdateCertificateCommand({ certificateId: cert.certificateId, newStatus: 'INACTIVE' })).catch(() => undefined);
    await iot.send(new DeleteCertificateCommand({ certificateId: cert.certificateId, forceDelete: true })).catch((e) =>
      log({ level: 'error', msg: 'certificate_cleanup_failed', certificateId: cert.certificateId, error: (e as Error).message }),
    );
    throw err;
  }
  log({ msg: 'certificate_attached', thingName, policyName });
  return { certificateArn: cert.certificateArn, issued: true };
}

if (require.main === module) {
  (async () => {
    const plan = planFromArgs(process.argv.slice(2), { env: process.env.VOLTI_ENV });
    await provision(new IoTClient({ region: process.env.AWS_REGION ?? 'sa-east-1' }), plan);
  })().catch((err) => {
    log({ level: 'error', msg: 'provision_failed', error: (err as Error).message });
    process.exit(1);
  });
}
