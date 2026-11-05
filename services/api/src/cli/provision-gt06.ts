/**
 * Provisionamento de rastreador GT06 só relé (spec GT06 §4): **sem** certificado nem thing no IoT Core. Marca o `Tracker` como
 * `relay_only`/`gt06` com o IMEI, vincula à moto (alinhando `Vehicle.thingName`) e cria o dispositivo no Traccar
 * (`POST /api/devices`, `uniqueId = IMEI`, nome = thingName — nada do cliente), dando acesso ao usuário da ponte.
 *
 *   node dist/cli/provision-gt06.js --vehicle VLT-0901 --thing moto-0901 --imei 860000000000901 [--dry-run] [--certificate-revoked]
 *   pnpm --filter api exec tsx scripts/provision-tracker.ts --protocol gt06 --vehicle VLT-0901 --thing moto-0901 --imei ...
 *
 * Modo de controle: a API guarda o modo por rastreador num cache de 60 s por processo (iot/tracker-mode.ts). Esta CLI roda em outro
 * processo e não o invalida: uma troca de modo vale em até 60 s. Moto com aluguel aberto ou reserva ativa/em entrega é recusada
 * (reprovisione com a moto livre; reconferido dentro da transação), e também moto com trava em andamento no Redis da API.
 * Essas checagens de aluguel/reserva/trava são as mesmas da instalação pelo painel (`modules/trackers/install-guards.ts`).
 *
 * Ex-rastreador MQTT (Tracker com `certificateArn`): a CLI não fala com o IoT Core (sem dependência AWS) e recusa até o operador
 * revogar o certificado (comandos na mensagem de erro) e confirmar com `--certificate-revoked` — senão o certificado continuaria
 * ativo, ligado ao thing, sem registro no banco. Trocando o thingName da moto, o thing antigo também não pode ter trava em andamento.
 *
 * Ambiente: DATABASE_URL; REDIS_URL (o da API, obrigatória: inacessível = recusa); TRACCAR_URL (padrão http://localhost:8082); TRACCAR_ADMIN_EMAIL (padrão admin@volti.local);
 * TRACCAR_ADMIN_PASSWORD (obrigatória); TRACCAR_BRIDGE_EMAIL (opcional). Idempotente. Logs JSON com o IMEI mascarado.
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import type { RedisStore } from '../redis/redis-store';
import { lockVehicleTrackerChange } from '../modules/trackers/install-guards';
import { isStockThingName } from '../modules/iot/stock-tracker-heartbeat';
import { assertNoPendingLock, assertVehicleFreeForProvisioning, connectProvisioningRedis, unlinkPreviousTracker } from './provision-tracker';

const IMEI = /^\d{15}$/;
const THING_NAME = /^moto-\d{4,}$/;
const VEHICLE_CODE = /^VLT-\d{4,}$/;

/** IMEI em log/erro: só os 4 últimos dígitos (spec §6.5). */
export function maskImei(imei: string): string {
  return imei.length <= 4 ? '****' : `${'*'.repeat(imei.length - 4)}${imei.slice(-4)}`;
}

/** thingName em erro/log: o do estoque (`gt06-<IMEI>`) sai com o IMEI mascarado. */
export function maskThingName(thingName: string): string {
  return isStockThingName(thingName) ? `gt06-${maskImei(thingName.slice('gt06-'.length))}` : thingName;
}

export interface TraccarAdminApi {
  findDevice(uniqueId: string): Promise<{ id: number } | null>;
  createDevice(name: string, uniqueId: string): Promise<{ id: number }>;
  findUser(email: string): Promise<{ id: number } | null>;
  linkDevice(userId: number, deviceId: number): Promise<void>;
}

/** API REST do Traccar com o usuário administrador (Basic auth). Só rede interna (spec §6.5). */
export function traccarAdminApi(baseUrl: string, email: string, password: string, fetchImpl: typeof fetch = fetch, warn: (entry: Record<string, unknown>) => void = () => undefined): TraccarAdminApi {
  const authorization = `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
  const call = (method: string, path: string, body?: unknown) =>
    fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: authorization, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const ok = (res: Response, what: string): Response => {
    if (!res.ok) throw new Error(`Traccar ${what}: HTTP ${res.status}`);
    return res;
  };
  return {
    async findDevice(uniqueId) {
      const list = (await ok(await call('GET', `/api/devices?uniqueId=${encodeURIComponent(uniqueId)}`), 'listar dispositivos').json()) as Array<{ id: number }>;
      return list[0] ?? null;
    },
    async createDevice(name, uniqueId) {
      return (await ok(await call('POST', '/api/devices', { name, uniqueId }), 'criar dispositivo').json()) as { id: number };
    },
    async findUser(userEmail) {
      const list = (await ok(await call('GET', '/api/users'), 'listar usuários').json()) as Array<{ id: number; email: string }>;
      return list.find((u) => u.email.toLowerCase() === userEmail.toLowerCase()) ?? null;
    },
    async linkDevice(userId, deviceId) {
      const res = await call('POST', '/api/permissions', { userId, deviceId });
      // O Traccar responde 400 quando o vínculo usuário-dispositivo já existe (re-execução); mas 400 também pode ser outro erro
      // de validação, então tratamos como idempotente e deixamos um aviso (só o status) para quem investigar.
      if (res.status === 400) warn({ level: 'warn', msg: 'traccar_link_http_400', status: 400 });
      else if (!res.ok) throw new Error(`Traccar vincular dispositivo: HTTP ${res.status}`);
    },
  };
}

export interface Gt06ProvisionInput {
  vehicleCode: string;
  thingName: string;
  imei: string;
  /** Usuário (não admin) da ponte no Traccar, que passa a ver o dispositivo. Ausente = a ponte usa o admin (só local). */
  bridgeEmail?: string;
  dryRun?: boolean;
  /** `--certificate-revoked`: o operador confirma que revogou o certificado MQTT antigo no IoT Core. */
  certificateRevoked?: boolean;
}

/**
 * Recusa de reprovisionar um ex-rastreador MQTT: zerar `certificateArn` sem revogar deixaria o certificado ativo no IoT Core
 * (publicando como o thing) e sem rastro no banco. Mostra o ARN e os comandos para o operador.
 */
export function certificateStillActiveError(thingName: string, certificateArn: string): Error {
  const certificateId = certificateArn.split('/').pop() ?? certificateArn;
  return new Error(
    [
      `O rastreador ${thingName} ainda tem certificado MQTT registrado (${certificateArn}).`,
      'Revogue-o no IoT Core antes de reprovisionar como GT06:',
      `  aws iot detach-thing-principal --thing-name ${thingName} --principal ${certificateArn}`,
      `  aws iot detach-policy --policy-name volti-<env>-moto-policy --target ${certificateArn}`,
      `  aws iot update-certificate --certificate-id ${certificateId} --new-status REVOKED`,
      'Depois rode de novo com --certificate-revoked para confirmar.',
    ].join('\n'),
  );
}

type ProvisionPrisma = Pick<PrismaClient, 'vehicle' | 'tracker' | 'rental' | 'reservation' | '$transaction'>;

export async function provisionGt06(
  deps: { prisma: ProvisionPrisma; traccar: TraccarAdminApi; redis: Pick<RedisStore, 'exists' | 'hgetall'>; log: (entry: Record<string, unknown>) => void },
  input: Gt06ProvisionInput,
): Promise<{ deviceId: number | null; created: boolean }> {
  const { vehicleCode, thingName, imei } = input;
  if (!VEHICLE_CODE.test(vehicleCode)) throw new Error('--vehicle VLT-0000 obrigatório');
  if (!THING_NAME.test(thingName)) throw new Error('--thing moto-0000 obrigatório');
  if (!IMEI.test(imei)) throw new Error('--imei deve ter 15 dígitos');
  const vehicle = await deps.prisma.vehicle.findUnique({ where: { code: vehicleCode }, select: { id: true, thingName: true } });
  if (!vehicle) throw new Error(`Moto ${vehicleCode} não encontrada (cadastre com POST /vehicles).`);
  await assertVehicleFreeForProvisioning(deps.prisma, { id: vehicle.id, code: vehicleCode });
  // O thing antigo da moto (se for trocar) também não pode ter trava em andamento: ela ficaria órfã no thing velho.
  const things = vehicle.thingName && vehicle.thingName !== thingName ? [thingName, vehicle.thingName] : [thingName];
  for (const t of things) await assertNoPendingLock(deps.redis, t);
  const clash = await deps.prisma.vehicle.findFirst({ where: { thingName, NOT: { id: vehicle.id } }, select: { code: true } });
  if (clash) throw new Error(`thingName ${thingName} já pertence a ${clash.code}.`);
  const existingTracker = await deps.prisma.tracker.findUnique({ where: { thingName }, select: { vehicleId: true, certificateArn: true } });
  if (existingTracker?.vehicleId && existingTracker.vehicleId !== vehicle.id) throw new Error(`thingName ${thingName} já está ligado a outra moto.`);
  const certificateArn = existingTracker?.certificateArn ?? null;
  if (certificateArn && !input.certificateRevoked) throw certificateStillActiveError(thingName, certificateArn);
  const imeiOwner = await deps.prisma.tracker.findFirst({ where: { imei, NOT: { thingName } }, select: { thingName: true } });
  if (imeiOwner) throw new Error(`IMEI ${maskImei(imei)} já vinculado a ${maskThingName(imeiOwner.thingName)}.`);

  const existing = await deps.traccar.findDevice(imei);
  deps.log({ msg: 'plan', protocol: 'gt06', thingName, vehicleCode, imei: maskImei(imei), traccarDevice: existing ? 'exists' : 'create', dryRun: !!input.dryRun });
  if (input.dryRun) return { deviceId: existing?.id ?? null, created: false };

  const device = existing ?? (await deps.traccar.createDevice(thingName, imei));
  if (input.bridgeEmail) {
    const user = await deps.traccar.findUser(input.bridgeEmail);
    if (!user) throw new Error(`Usuário da ponte ${input.bridgeEmail} não existe no Traccar (rode deploy/single/gt06.sh init).`);
    await deps.traccar.linkDevice(user.id, device.id);
  }
  // Reconferida depois do Traccar (uma trava pode ter começado nesse meio-tempo) e logo antes da transação.
  for (const t of things) await assertNoPendingLock(deps.redis, t);
  // O ARN não é dado pessoal: fica no log como registro de que o operador confirmou a revogação.
  if (certificateArn) deps.log({ msg: 'certificate_revocation_confirmed', thingName, certificateArn });
  await deps.prisma.$transaction(async (tx) => {
    // Serializa com instalar/trocar/remover pelo painel e o PATCH do thingName da mesma moto.
    await lockVehicleTrackerChange(tx, vehicle.id);
    // Aluguel/reserva reconferidos dentro da transação (como o linkMqttTracker): podem ter aberto depois da checagem.
    await assertVehicleFreeForProvisioning(tx, { id: vehicle.id, code: vehicleCode });
    if (vehicle.thingName !== thingName) await tx.vehicle.update({ where: { id: vehicle.id }, data: { thingName } });
    // Tracker.vehicleId é único: desvincula o rastreador antigo da moto (outro thingName) ANTES de ligar este; um GT06 volta
    // ao estoque como gt06-<IMEI> (M5).
    await unlinkPreviousTracker(tx, vehicle.id, thingName);
    await tx.tracker.upsert({
      where: { thingName },
      create: { thingName, vehicleId: vehicle.id, imei, controlMode: 'relay_only', protocol: 'gt06' },
      update: { vehicleId: vehicle.id, imei, controlMode: 'relay_only', protocol: 'gt06', certificateArn: null },
    });
  });
  deps.log({ msg: 'tracker_linked', protocol: 'gt06', thingName, vehicleCode, traccarDevice: existing ? 'existing' : 'created' });
  return { deviceId: device.id, created: !existing };
}

function log(entry: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), script: 'provision-gt06', ...entry })}\n`);
}

export async function main(argv: string[] = process.argv.slice(2), env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      vehicle: { type: 'string' },
      thing: { type: 'string' },
      imei: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      'certificate-revoked': { type: 'boolean', default: false },
    },
  });
  const password = env.TRACCAR_ADMIN_PASSWORD;
  if (!password) throw new Error('TRACCAR_ADMIN_PASSWORD ausente');
  const traccar = traccarAdminApi(env.TRACCAR_URL || 'http://localhost:8082', env.TRACCAR_ADMIN_EMAIL || 'admin@volti.local', password, fetch, log);
  const redis = await connectProvisioningRedis(env);
  const prisma = new PrismaClient();
  try {
    await provisionGt06(
      { prisma, traccar, redis, log },
      { vehicleCode: values.vehicle ?? '', thingName: values.thing ?? '', imei: values.imei ?? '', bridgeEmail: env.TRACCAR_BRIDGE_EMAIL || undefined, dryRun: values['dry-run'], certificateRevoked: values['certificate-revoked'] },
    );
  } finally {
    await prisma.$disconnect();
    await redis.close().catch(() => undefined);
  }
}

if (require.main === module) {
  main().catch((err) => {
    log({ level: 'error', msg: 'provision_failed', error: (err as Error).message });
    process.exit(1);
  });
}
