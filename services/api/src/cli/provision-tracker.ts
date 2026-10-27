/**
 * Regras de banco do provisionamento de rastreadores (usadas por `scripts/provision-tracker.ts` e `provision-gt06.ts`), extraídas
 * para teste.
 */
import type { Prisma } from '@prisma/client';
import { hasInUseReservation, hasOpenRental } from '../common/vehicle-in-use';
import { RELAY_LOCK_PREFIX } from '../modules/iot/relay-lock.store';
import { SAFE_LOCK_PREFIX } from '../modules/iot/safe-lock.store';
import { IoRedisStore, type RedisStore } from '../redis/redis-store';

/**
 * Reprovisionar troca o modo de controle (`speed_control` ↔ `relay_only`) e o caminho dos comandos: com aluguel aberto, um lock
 * de fim de aluguel ou de cerca poderia seguir o fluxo errado. Recusa antes de qualquer escrita (AWS, Traccar ou banco).
 */
export async function assertNoOpenRental(tx: Pick<Prisma.TransactionClient, 'rental'>, vehicle: { id: string; code: string }): Promise<void> {
  if (await hasOpenRental(tx, vehicle.id)) {
    throw new Error(`A moto ${vehicle.code} está com um aluguel aberto; reprovisione o rastreador com a moto fora de aluguel.`);
  }
}

/**
 * N4: reserva ativa ou em entrega (`IN_USE_RESERVATION_STATUSES`) também prende a moto — o desbloqueio da retirada/entrega
 * seguiria o caminho do modo antigo. Recusa como o aluguel aberto.
 */
export async function assertVehicleFreeForProvisioning(tx: Pick<Prisma.TransactionClient, 'rental' | 'reservation'>, vehicle: { id: string; code: string }): Promise<void> {
  await assertNoOpenRental(tx, vehicle);
  if (await hasInUseReservation(tx, vehicle.id)) {
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
  for (const [prefix, what] of [
    [SAFE_LOCK_PREFIX, 'rampa de bloqueio speed_control'],
    [RELAY_LOCK_PREFIX, 'trava só relé'],
  ] as const) {
    const pending = (await redis.exists(`${prefix}:${thingName}`)) || (await redis.hgetall(`${prefix}:index`))[thingName] !== undefined;
    if (pending) {
      throw new Error(`A moto ${thingName} tem uma trava em andamento na API (${what}); espere a trava terminar antes de reprovisionar o rastreador.`);
    }
  }
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
export async function linkMqttTracker(tx: Pick<Prisma.TransactionClient, 'vehicle' | 'tracker' | 'rental' | 'reservation'>, link: MqttTrackerLink): Promise<void> {
  const { vehicle, thingName, imei, certificateArn } = link;
  await assertVehicleFreeForProvisioning(tx, vehicle);
  if (vehicle.thingName !== thingName) await tx.vehicle.update({ where: { id: vehicle.id }, data: { thingName } });
  await tx.tracker.updateMany({ where: { vehicleId: vehicle.id, NOT: { thingName } }, data: { vehicleId: null } });
  await tx.tracker.upsert({
    where: { thingName },
    create: { thingName, vehicleId: vehicle.id, imei, certificateArn, controlMode: 'speed_control', protocol: null },
    update: { vehicleId: vehicle.id, imei: imei ?? undefined, certificateArn: certificateArn ?? undefined, controlMode: 'speed_control', protocol: null },
  });
}
