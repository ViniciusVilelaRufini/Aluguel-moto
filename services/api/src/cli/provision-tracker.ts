/**
 * Regras de banco do provisionamento de rastreadores (usadas por `scripts/provision-tracker.ts` e `provision-gt06.ts`), extraídas
 * para teste.
 */
import type { Prisma } from '@prisma/client';
import { hasOpenRental } from '../common/vehicle-in-use';

/**
 * Reprovisionar troca o modo de controle (`speed_control` ↔ `relay_only`) e o caminho dos comandos: com aluguel aberto, um lock
 * de fim de aluguel ou de cerca poderia seguir o fluxo errado. Recusa antes de qualquer escrita (AWS, Traccar ou banco).
 */
export async function assertNoOpenRental(tx: Pick<Prisma.TransactionClient, 'rental'>, vehicle: { id: string; code: string }): Promise<void> {
  if (await hasOpenRental(tx, vehicle.id)) {
    throw new Error(`A moto ${vehicle.code} está com um aluguel aberto; reprovisione o rastreador com a moto fora de aluguel.`);
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
 * desvinculado **antes** do upsert. Reconfere o aluguel aberto dentro da transação.
 */
export async function linkMqttTracker(tx: Pick<Prisma.TransactionClient, 'vehicle' | 'tracker' | 'rental'>, link: MqttTrackerLink): Promise<void> {
  const { vehicle, thingName, imei, certificateArn } = link;
  await assertNoOpenRental(tx, vehicle);
  if (vehicle.thingName !== thingName) await tx.vehicle.update({ where: { id: vehicle.id }, data: { thingName } });
  await tx.tracker.updateMany({ where: { vehicleId: vehicle.id, NOT: { thingName } }, data: { vehicleId: null } });
  await tx.tracker.upsert({
    where: { thingName },
    create: { thingName, vehicleId: vehicle.id, imei, certificateArn, controlMode: 'speed_control', protocol: null },
    update: { vehicleId: vehicle.id, imei: imei ?? undefined, certificateArn: certificateArn ?? undefined, controlMode: 'speed_control', protocol: null },
  });
}
