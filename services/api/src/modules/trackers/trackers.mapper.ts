import type { Tracker } from '@prisma/client';
import { toSimCardSummary, type SimCardSummaryRow } from '../sim-cards/sim-cards.mapper';
import { trackerOnline } from '../vehicles/vehicles.mapper';

/** Modelos aceitos (`TrackerModel` do contrato). */
export const TRACKER_MODELS = ['J16'] as const;
export type TrackerModelValue = (typeof TRACKER_MODELS)[number];

/** Prefixo do thingName de rastreador no estoque; moto nenhuma pode usar (`PATCH`/`POST /vehicles` → 409). */
export const TRACKER_STOCK_PREFIX = 'gt06-';

/** Rastreador do estoque (sem moto) usa `gt06-<IMEI>` como thingName. */
export function stockThingName(imei: string): string {
  return `${TRACKER_STOCK_PREFIX}${imei}`;
}

/** Só os 4 últimos dígitos do IMEI (auditoria/logs). */
export const imeiLast4 = (imei: string) => imei.slice(-4);

/** Rastreador que aparece na lista e pode ser instalado/trocado/removido pelo painel: GT06 só relé, com IMEI, sem certificado MQTT. */
export function isStockable(t: Pick<Tracker, 'controlMode' | 'imei' | 'certificateArn'>): t is typeof t & { imei: string } {
  return t.controlMode === 'relay_only' && !!t.imei && !t.certificateArn;
}

/** Filtro Prisma equivalente a `isStockable`. */
export const STOCKABLE_WHERE = { controlMode: 'relay_only', imei: { not: null }, certificateArn: null } as const;

export const TRACKER_DEVICE_INCLUDE = {
  vehicle: { select: { id: true, code: true, online: true, lastSeenAt: true } },
  simCard: { select: { id: true, iccid: true, msisdn: true, carrier: true, apn: true, status: true } },
} as const;

export type TrackerDeviceRow = Pick<Tracker, 'id' | 'imei' | 'model' | 'vehicleId' | 'lastSeenAt' | 'createdAt'> & {
  vehicle: { id: string; code: string; online: boolean; lastSeenAt: Date | null } | null;
  simCard: SimCardSummaryRow | null;
};

/** `TrackerDevice` do contrato. Instalado: sinal da moto; estoque: `Tracker.lastSeenAt`; mesma janela (`onlineWindowMs`). */
export function toTrackerDevice(t: TrackerDeviceRow, now = Date.now()) {
  const vehicle = t.vehicleId ? t.vehicle : null;
  let online: boolean;
  let lastSeenAt: Date | null;
  if (vehicle) {
    online = trackerOnline(vehicle, now);
    lastSeenAt = vehicle.lastSeenAt;
  } else {
    lastSeenAt = t.lastSeenAt;
    // Mesma janela do instalado (`IOT_OFFLINE_AFTER_MS`, padrão 180 s); no estoque não há vigia de presença.
    online = trackerOnline({ online: true, lastSeenAt }, now);
  }
  return {
    id: t.id,
    imei: t.imei ?? '',
    model: (t.model ?? 'J16') as TrackerModelValue,
    installed: !!vehicle,
    vehicleId: vehicle?.id ?? null,
    vehicleCode: vehicle?.code ?? null,
    simCard: toSimCardSummary(t.simCard),
    online,
    lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  };
}
