/**
 * Regras de banco do provisionamento de rastreadores (usadas por `scripts/provision-tracker.ts` e `provision-gt06.ts`), extraídas
 * para teste.
 */
import type { Prisma } from '@prisma/client';
import { hasOpenRental } from '../common/vehicle-in-use';
import { lockVehicleTrackerChange, pendingLockOn, vehicleInUseReason } from '../modules/trackers/install-guards';
import { isStockable, stockThingName } from '../modules/trackers/trackers.mapper';
import { IoRedisStore, type RedisStore } from '../redis/redis-store';

const openRentalError = (code: string) => new Error(`A moto ${code} está com um aluguel aberto; reprovisione o rastreador com a moto fora de aluguel.`);

/**
 * Reprovisionar troca o modo de controle (`speed_control` ↔ `relay_only`) e o caminho dos comandos: com aluguel aberto, um lock
 * de fim de aluguel ou de cerca poderia seguir o fluxo errado. Recusa antes de qualquer escrita (AWS, Traccar ou banco).
 */
export async function assertNoOpenRental(tx: Pick<Prisma.TransactionClient, 'rental'>, vehicle: { id: string; code: string }): Promise<void> {
  if (await hasOpenRental(tx, vehicle.id)) throw openRentalError(vehicle.code);
}

/**
 * N4: reserva ativa ou em entrega (`IN_USE_RESERVATION_STATUSES`) também prende a moto — o desbloqueio da retirada/entrega
 * seguiria o caminho do modo antigo. Recusa como o aluguel aberto.
 */
export async function assertVehicleFreeForProvisioning(tx: Pick<Prisma.TransactionClient, 'rental' | 'reservation'>, vehicle: { id: string; code: string }): Promise<void> {
  // Mesma regra do painel (`install-guards.ts`): aluguel aberto primeiro, depois reserva ativa/em entrega.
  const inUse = await vehicleInUseReason(tx, vehicle.id);
  if (inUse === 'rental') throw openRentalError(vehicle.code);
  if (inUse === 'reservation') {
    throw new Error(`A moto ${vehicle.code} tem uma reserva ativa ou em entrega; reprovisione o rastreador com a moto livre.`);
  }
}

/**
 * N5: trava em andamento na API para o thing (rampa `speed_control` em `iot:safe-lock:*` ou trava só relé em
 * `iot:relay-lock:*`, estado ou só a entrada do índice — órfã à espera da varredura). Trocar o modo no meio deixaria a trava
 * do modo antigo escrever no shadow da moto já no modo novo (ex.: a rampa terminando com `travada: false` numa moto só relé).
 * Erro de leitura propaga (falha fechada).
 */
export async function assertNoPendingLock(redis: Pick<RedisStore, 'exists' | 'hgetall'>, thingName: string): Promise<void> {
  const pending = await pendingLockOn(redis, [thingName]);
  if (pending) throw new Error(`A moto ${thingName} tem uma trava em andamento na API (${pending.kind}); espere a trava terminar antes de reprovisionar o rastreador.`);
}

/** Prazo do PING ao Redis da API no provisionamento. */
export const PROVISION_REDIS_TIMEOUT_MS = 5_000;

/**
 * Redis da API (`REDIS_URL`) para o `assertNoPendingLock`. Falha fechada: sem `REDIS_URL`, com `memory` (estado só dentro do
 * processo da API, invisível aqui) ou sem PONG no prazo → erro, e o provisionamento não segue.
 */
export async function connectProvisioningRedis(
  env: Record<string, string | undefined>,
  factory: (url: string) => RedisStore = (url) => new IoRedisStore(url),
  timeoutMs = PROVISION_REDIS_TIMEOUT_MS,
): Promise<RedisStore> {
  const url = env.REDIS_URL?.trim();
  if (!url) throw new Error('REDIS_URL ausente: o provisionamento precisa ler o Redis da API para conferir travas em andamento.');
  if (url === 'memory') throw new Error('REDIS_URL=memory: as travas em andamento ficam só na memória da API e não podem ser conferidas; use o Redis da API.');
  const redis = factory(url);
  let timer: NodeJS.Timeout | undefined;
  const ok = await Promise.race([
    redis.ping().catch(() => false),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    }),
  ]);
  clearTimeout(timer);
  if (!ok) {
    await redis.close().catch(() => undefined);
    throw new Error('Redis inacessível (REDIS_URL): não dá para conferir travas em andamento; provisionamento recusado.');
  }
  return redis;
}

/**
 * Desvincula o rastreador antigo da moto (outro thingName) antes de ligar o novo (`Tracker.vehicleId` é único). M5: um GT06 do
 * estoque (relay_only, IMEI, sem certificado) volta ao estoque como `gt06-<IMEI>` — com o `moto-NNNN` antigo ele continuaria
 * "dono" do thingName e a ponte o trataria como a moto. Os demais (MQTT) só perdem a moto.
 */
export async function unlinkPreviousTracker(tx: Pick<Prisma.TransactionClient, 'tracker'>, vehicleId: string, keepThingName: string): Promise<void> {
  const previous = await tx.tracker.findMany({ where: { vehicleId, NOT: { thingName: keepThingName } }, select: { id: true, controlMode: true, imei: true, certificateArn: true } });
  for (const t of previous) {
    await tx.tracker.update({ where: { id: t.id }, data: isStockable(t) ? { thingName: stockThingName(t.imei), vehicleId: null } : { vehicleId: null } });
  }
}

export interface MqttTrackerLink {
  vehicle: { id: string; code: string; thingName: string | null };
  thingName: string;
  imei?: string;
  certificateArn?: string;
}

/**
 * Vincula um rastreador MQTT (`speed_control`, sem protocolo de ponte) à moto, dentro da transação. Um ex-GT06 reprovisionado como
 * MQTT volta a `speed_control`/`protocol: null`. `Tracker.vehicleId` é único: o rastreador antigo da moto (outro thingName) é
 * desvinculado **antes** do upsert. Reconfere o aluguel aberto e a reserva ativa/em entrega dentro da transação.
 */
export async function linkMqttTracker(tx: Pick<Prisma.TransactionClient, 'vehicle' | 'tracker' | 'rental' | 'reservation' | '$queryRaw'>, link: MqttTrackerLink): Promise<void> {
  const { vehicle, thingName, imei, certificateArn } = link;
  // Serializa com instalar/trocar/remover pelo painel e o PATCH do thingName da mesma moto.
  await lockVehicleTrackerChange(tx, vehicle.id);
  await assertVehicleFreeForProvisioning(tx, vehicle);
  if (vehicle.thingName !== thingName) await tx.vehicle.update({ where: { id: vehicle.id }, data: { thingName } });
  await unlinkPreviousTracker(tx, vehicle.id, thingName);
  await tx.tracker.upsert({
    where: { thingName },
    create: { thingName, vehicleId: vehicle.id, imei, certificateArn, controlMode: 'speed_control', protocol: null },
    update: { vehicleId: vehicle.id, imei: imei ?? undefined, certificateArn: certificateArn ?? undefined, controlMode: 'speed_control', protocol: null },
  });
}
