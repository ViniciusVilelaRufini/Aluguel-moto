/**
 * Provisionamento de um rastreador novo (Task 4).
 *
 *   pnpm --filter api exec tsx scripts/provision-tracker.ts --vehicle VLT-0061 --thing moto-0061 --imei 860000000000061 [--env dev] [--out ~/.volti/certs] [--mode aws|local] [--dry-run]
 *
 * Modo aws (padrão quando IOT_MODE=aws):
 *   1. CreateThing (thing type `moto`, atributos imei/vehicle);
 *   2. CreateKeysAndCertificate (X.509 ativo) — certificado e chave privada gravados em `--out` (permissão 600), nunca no log;
 *   3. AttachPolicy `volti-<env>-moto-policy` (Task 2: só `motos/<thing>/*` e o próprio shadow);
 *   4. AttachThingPrincipal;
 *   5. grava/atualiza `Tracker` (thingName, IMEI, certificateArn) vinculado ao `Vehicle` e alinha `Vehicle.thingName`.
 * Modo local: só o passo 5 (o Mosquitto do compose aceita conexão anônima; o thingName é o clientId).
 *
 * Idempotente: thing existente é reaproveitado; um certificado novo só é emitido se o Tracker ainda não tiver um.
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
  UpdateCertificateCommand,
  IoTClient,
  ResourceNotFoundException,
} from '@aws-sdk/client-iot';
import { PrismaClient } from '@prisma/client';

const THING_NAME = /^moto-\d{4,}$/;
const VEHICLE_CODE = /^VLT-\d{4,}$/;

function log(entry: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), script: 'provision-tracker', ...entry })}\n`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      vehicle: { type: 'string' },
      thing: { type: 'string' },
      imei: { type: 'string' },
      env: { type: 'string', default: process.env.VOLTI_ENV ?? 'dev' },
      // Fora do repositório por padrão: a chave privada nunca deve ir para o git.
      out: { type: 'string', default: join(homedir(), '.volti', 'certs') },
      mode: { type: 'string', default: process.env.IOT_MODE === 'aws' ? 'aws' : 'local' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const vehicleCode = values.vehicle;
  const thingName = values.thing;
  if (!vehicleCode || !VEHICLE_CODE.test(vehicleCode)) throw new Error('--vehicle VLT-0000 obrigatório');
  if (!thingName || !THING_NAME.test(thingName)) throw new Error('--thing moto-0000 obrigatório');
  if (values.imei && !/^\d{15}$/.test(values.imei)) throw new Error('--imei deve ter 15 dígitos');
  const mode = values.mode === 'aws' ? 'aws' : 'local';
  const dryRun = values['dry-run'];

  const prisma = new PrismaClient();
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { code: vehicleCode }, include: { tracker: true } });
    if (!vehicle) throw new Error(`Moto ${vehicleCode} não encontrada (cadastre com POST /vehicles).`);
    const clash = await prisma.vehicle.findFirst({ where: { thingName, NOT: { id: vehicle.id } }, select: { code: true } });
    if (clash) throw new Error(`thingName ${thingName} já pertence a ${clash.code}.`);

    let certificateArn = vehicle.tracker?.thingName === thingName ? (vehicle.tracker.certificateArn ?? undefined) : undefined;

    if (mode === 'aws') {
      const iot = new IoTClient({ region: process.env.AWS_REGION ?? 'sa-east-1' });
      const policyName = `volti-${values.env}-moto-policy`;
      let exists = true;
      try {
        await iot.send(new DescribeThingCommand({ thingName }));
      } catch (err) {
        if (err instanceof ResourceNotFoundException) exists = false;
        else throw err;
      }
      log({ msg: 'plan', mode, thingName, vehicleCode, thingExists: exists, issueCertificate: !certificateArn, policyName, dryRun });
      if (dryRun) return;
      if (!exists) {
        await iot.send(
          new CreateThingCommand({ thingName, thingTypeName: 'moto', attributePayload: { attributes: { vehicle: vehicleCode, ...(values.imei ? { imei: values.imei } : {}) } } }),
        );
        log({ msg: 'thing_created', thingName });
      }
      if (!certificateArn) {
        const cert = await iot.send(new CreateKeysAndCertificateCommand({ setAsActive: true }));
        if (!cert.certificateArn || !cert.certificatePem || !cert.keyPair?.PrivateKey) throw new Error('Resposta incompleta do CreateKeysAndCertificate');
        certificateArn = cert.certificateArn;
        const dir = resolve(values.out!, thingName);
        mkdirSync(dir, { recursive: true });
        for (const [file, content] of [
          ['certificate.pem.crt', cert.certificatePem],
          ['private.pem.key', cert.keyPair.PrivateKey],
          ['public.pem.key', cert.keyPair.PublicKey ?? ''],
        ] as const) {
          writeFileSync(join(dir, file), content, { mode: 0o600 });
          chmodSync(join(dir, file), 0o600);
        }
        log({ msg: 'certificate_issued', thingName, certificateId: cert.certificateId, dir });
        try {
          await iot.send(new AttachPolicyCommand({ policyName, target: certificateArn }));
          await iot.send(new AttachThingPrincipalCommand({ thingName, principal: certificateArn }));
        } catch (err) {
          // Certificado ativo e solto não pode ficar para trás: desativa, desanexa e apaga.
          log({ level: 'error', msg: 'certificate_attach_failed', thingName, error: (err as Error).message });
          await iot.send(new DetachPolicyCommand({ policyName, target: certificateArn })).catch(() => undefined);
          await iot.send(new UpdateCertificateCommand({ certificateId: cert.certificateId, newStatus: 'INACTIVE' })).catch(() => undefined);
          await iot.send(new DeleteCertificateCommand({ certificateId: cert.certificateId, forceDelete: true })).catch((e) =>
            log({ level: 'error', msg: 'certificate_cleanup_failed', certificateId: cert.certificateId, error: (e as Error).message }),
          );
          throw err;
        }
        log({ msg: 'certificate_attached', thingName, policyName });
      }
    } else {
      log({ msg: 'plan', mode, thingName, vehicleCode, note: 'local: sem AWS; o Mosquitto aceita o thingName como clientId', dryRun });
      if (dryRun) return;
    }

    await prisma.$transaction(async (tx) => {
      if (vehicle.thingName !== thingName) await tx.vehicle.update({ where: { id: vehicle.id }, data: { thingName } });
      await tx.tracker.upsert({
        where: { thingName },
        create: { thingName, vehicleId: vehicle.id, imei: values.imei, certificateArn },
        update: { vehicleId: vehicle.id, imei: values.imei ?? undefined, certificateArn: certificateArn ?? undefined },
      });
      // Um rastreador antigo da moto (outro thingName) é desvinculado.
      await tx.tracker.updateMany({ where: { vehicleId: vehicle.id, NOT: { thingName } }, data: { vehicleId: null } });
    });
    log({ msg: 'tracker_linked', thingName, vehicleCode });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  log({ level: 'error', msg: 'provision_failed', error: (err as Error).message });
  process.exit(1);
});
