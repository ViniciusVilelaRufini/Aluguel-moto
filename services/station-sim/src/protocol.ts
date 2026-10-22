/**
 * Contrato MQTT das estações (`packages/contracts/mqtt.md`, "Estações de troca"; schemas `estacao-*.schema.json`).
 * thing = `station-{stationId}`; comandos em `estacoes/{thing}/comandos`, eventos em `estacoes/{thing}/eventos`.
 */
export const COMMANDS_FILTER = 'estacoes/+/comandos';
export const eventsTopic = (thing: string) => `estacoes/${thing}/eventos`;

export type Action = 'open_slot' | 'release_battery';
export type EventType = 'slot_opened' | 'battery_returned' | 'slot_closed' | 'battery_released';

export interface StationCommand {
  commandId: string;
  swapId: string;
  action: Action;
  expectedSerial?: string;
  serialHint?: string;
}

export interface StationEvent {
  type: EventType;
  swapId: string;
  slotNumber?: number;
  serial?: string;
  pct?: number;
  ts: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SERIAL = /^[A-Za-z0-9._-]{1,64}$/;

/** `estacoes/station-<uuid>/comandos` → `station-<uuid>`; outros tópicos → null. */
export function thingFromCommandTopic(topic: string): string | null {
  const parts = topic.split('/');
  if (parts.length !== 3 || parts[0] !== 'estacoes' || parts[2] !== 'comandos') return null;
  return /^station-[0-9a-f-]{36}$/i.test(parts[1]) ? parts[1] : null;
}

export const stationIdOf = (thing: string) => thing.slice('station-'.length).toLowerCase();

export function parseCommand(raw: unknown): StationCommand | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { commandId, swapId, action, expectedSerial, serialHint } = raw as Record<string, unknown>;
  if (typeof commandId !== 'string' || !commandId || commandId.length > 80) return null;
  if (typeof swapId !== 'string' || !UUID.test(swapId)) return null;
  if (action !== 'open_slot' && action !== 'release_battery') return null;
  const cmd: StationCommand = { commandId, swapId: swapId.toLowerCase(), action };
  if (typeof expectedSerial === 'string' && SERIAL.test(expectedSerial)) cmd.expectedSerial = expectedSerial;
  if (typeof serialHint === 'string' && SERIAL.test(serialHint)) cmd.serialHint = serialHint;
  return cmd;
}
