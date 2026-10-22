import type { StationCommand, StationEvent, StationEventType } from '../../ports/station-gateway.port';

/**
 * Contrato MQTT das estações de troca (`packages/contracts/mqtt.md`, "Estações de troca", e
 * `schemas/estacao-*.schema.json`). Mesmo padrão dos rastreadores (`motos/{thing}/comandos|eventos`): tópicos próprios
 * não podem ficar sob `$aws/` no IoT Core, então `estacoes/{thing}/...` com `thing = station-{stationId}`.
 */
export const STATION_TOPICS = {
  commands: (t: string) => `estacoes/${t}/comandos`,
  events: (t: string) => `estacoes/${t}/eventos`,
} as const;

export const STATION_SERVER_SUBSCRIPTIONS = ['estacoes/+/eventos'];

export function stationThingFromTopic(topic: string): string | null {
  const parts = topic.split('/');
  if (parts.length === 3 && parts[0] === 'estacoes' && parts[2] === 'eventos' && parts[1]) return parts[1];
  return null;
}

const EVENT_TYPES: StationEventType[] = ['slot_opened', 'battery_returned', 'slot_closed', 'battery_released'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SERIAL = /^[A-Za-z0-9._-]{1,64}$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isIso = (v: unknown): v is string => typeof v === 'string' && v.length >= 10 && !Number.isNaN(Date.parse(v));
const isInt = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Evento da estação validado (espelho do JSON Schema), ou `null`. */
export function parseStationEvent(raw: unknown): StationEvent | null {
  if (!isObj(raw)) return null;
  const { type, swapId, slotNumber, serial, pct, ts } = raw;
  if (typeof type !== 'string' || !EVENT_TYPES.includes(type as StationEventType)) return null;
  if (typeof swapId !== 'string' || !UUID.test(swapId) || !isIso(ts)) return null;
  const ev: StationEvent = { type: type as StationEventType, swapId: swapId.toLowerCase(), ts };
  if (type === 'slot_opened') {
    if (!isInt(slotNumber, 1, 999)) return null;
    ev.slotNumber = slotNumber;
  }
  if (type === 'battery_returned' || type === 'battery_released') {
    if (typeof serial !== 'string' || !SERIAL.test(serial)) return null;
    ev.serial = serial;
  }
  if (type === 'battery_returned') {
    if (!isInt(pct, 0, 100)) return null;
    ev.pct = pct;
  }
  return ev;
}

/** Payload publicado em `estacoes/{thing}/comandos` (sem campos ausentes). */
export function commandPayload(c: StationCommand): Record<string, unknown> {
  const out: Record<string, unknown> = { commandId: c.commandId, swapId: c.swapId, action: c.action, ts: new Date().toISOString() };
  if (c.expectedSerial) out.expectedSerial = c.expectedSerial;
  if (c.serialHint) out.serialHint = c.serialHint;
  return out;
}
