/**
 * Provisionamento de rastreador GT06 só relé (spec GT06 §4): **sem** certificado nem thing no IoT Core. Marca o `Tracker` como
 * `relay_only`/`gt06` com o IMEI, vincula à moto (alinhando `Vehicle.thingName`) e cria o dispositivo no Traccar
 * (`POST /api/devices`, `uniqueId = IMEI`, nome = thingName — nada do cliente), dando acesso ao usuário da ponte.
 *
 *   node dist/cli/provision-gt06.js --vehicle VLT-0901 --thing moto-0901 --imei 860000000000901 [--dry-run]
 *   pnpm --filter api exec tsx scripts/provision-tracker.ts --protocol gt06 --vehicle VLT-0901 --thing moto-0901 --imei ...
 *
 * Modo de controle: a API guarda o modo por rastreador num cache de 60 s por processo (iot/tracker-mode.ts). Esta CLI roda em outro
 * processo e não o invalida: uma troca de modo vale em até 60 s; reprovisione com a moto fora de aluguel.
 *
 * Ambiente: DATABASE_URL; TRACCAR_URL (padrão http://localhost:8082); TRACCAR_ADMIN_EMAIL (padrão admin@volti.local);
 * TRACCAR_ADMIN_PASSWORD (obrigatória); TRACCAR_BRIDGE_EMAIL (opcional). Idempotente. Logs JSON com o IMEI mascarado.
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';

const IMEI = /^\d{15}$/;
const THING_NAME = /^moto-\d{4,}$/;
const VEHICLE_CODE = /^VLT-\d{4,}$/;

/** IMEI em log/erro: só os 4 últimos dígitos (spec §6.5). */
export function maskImei(imei: string): string {
  return imei.length <= 4 ? '****' : `${'*'.repeat(imei.length - 4)}${imei.slice(-4)}`;
}

export interface TraccarAdminApi {
  findDevice(uniqueId: string): Promise<{ id: number } | null>;
  createDevice(name: string, uniqueId: string): Promise<{ id: number }>;
  findUser(email: string): Promise<{ id: number } | null>;
  linkDevice(userId: number, deviceId: number): Promise<void>;
}

/** API REST do Traccar com o usuário administrador (Basic auth). Só rede interna (spec §6.5). */
export function traccarAdminApi(baseUrl: string, email: string, password: string, fetchImpl: typeof fetch = fetch): TraccarAdminApi {
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
      // 400 = vínculo já existe (idempotente).
      if (!res.ok && res.status !== 400) throw new Error(`Traccar vincular dispositivo: HTTP ${res.status}`);
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
}

type ProvisionPrisma = Pick<PrismaClient, 'vehicle' | 'tracker' | '$transaction'>;

export async function provisionGt06(
  deps: { prisma: ProvisionPrisma; traccar: TraccarAdminApi; log: (entry: Record<string, unknown>) => void },
  input: Gt06ProvisionInput,
): Promise<{ deviceId: number | null; created: boolean }> {
  const { vehicleCode, thingName, imei } = input;
  if (!VEHICLE_CODE.test(vehicleCode)) throw new Error('--vehicle VLT-0000 obrigatório');
  if (!THING_NAME.test(thingName)) throw new Error('--thing moto-0000 obrigatório');
  if (!IMEI.test(imei)) throw new Error('--imei deve ter 15 dígitos');
  const vehicle = await deps.prisma.vehicle.findUnique({ where: { code: vehicleCode }, select: { id: true, thingName: true } });
  if (!vehicle) throw new Error(`Moto ${vehicleCode} não encontrada (cadastre com POST /vehicles).`);
  const clash = await deps.prisma.vehicle.findFirst({ where: { thingName, NOT: { id: vehicle.id } }, select: { code: true } });
  if (clash) throw new Error(`thingName ${thingName} já pertence a ${clash.code}.`);
  const imeiOwner = await deps.prisma.tracker.findFirst({ where: { imei, NOT: { thingName } }, select: { thingName: true } });
  if (imeiOwner) throw new Error(`IMEI ${maskImei(imei)} já vinculado a ${imeiOwner.thingName}.`);

  const existing = await deps.traccar.findDevice(imei);
  deps.log({ msg: 'plan', protocol: 'gt06', thingName, vehicleCode, imei: maskImei(imei), traccarDevice: existing ? 'exists' : 'create', dryRun: !!input.dryRun });
  if (input.dryRun) return { deviceId: existing?.id ?? null, created: false };

  const device = existing ?? (await deps.traccar.createDevice(thingName, imei));
  if (input.bridgeEmail) {
    const user = await deps.traccar.findUser(input.bridgeEmail);
    if (!user) throw new Error(`Usuário da ponte ${input.bridgeEmail} não existe no Traccar (rode deploy/single/gt06.sh init).`);
    await deps.traccar.linkDevice(user.id, device.id);
  }
  await deps.prisma.$transaction(async (tx) => {
    if (vehicle.thingName !== thingName) await tx.vehicle.update({ where: { id: vehicle.id }, data: { thingName } });
    await tx.tracker.upsert({
      where: { thingName },
      create: { thingName, vehicleId: vehicle.id, imei, controlMode: 'relay_only', protocol: 'gt06' },
      update: { vehicleId: vehicle.id, imei, controlMode: 'relay_only', protocol: 'gt06', certificateArn: null },
    });
    // Um rastreador antigo da moto (outro thingName) é desvinculado.
    await tx.tracker.updateMany({ where: { vehicleId: vehicle.id, NOT: { thingName } }, data: { vehicleId: null } });
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
    options: { vehicle: { type: 'string' }, thing: { type: 'string' }, imei: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
  });
  const password = env.TRACCAR_ADMIN_PASSWORD;
  if (!password) throw new Error('TRACCAR_ADMIN_PASSWORD ausente');
  const traccar = traccarAdminApi(env.TRACCAR_URL || 'http://localhost:8082', env.TRACCAR_ADMIN_EMAIL || 'admin@volti.local', password);
  const prisma = new PrismaClient();
  try {
    await provisionGt06(
      { prisma, traccar, log },
      { vehicleCode: values.vehicle ?? '', thingName: values.thing ?? '', imei: values.imei ?? '', bridgeEmail: env.TRACCAR_BRIDGE_EMAIL || undefined, dryRun: values['dry-run'] },
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    log({ level: 'error', msg: 'provision_failed', error: (err as Error).message });
    process.exit(1);
  });
}
