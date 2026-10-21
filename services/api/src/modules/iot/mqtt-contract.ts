import type { DeviceEventType } from '../../common/events';
import { MAX_SPEED_KMH } from '../../common/enums';
import type { ReportedState } from './shadow-transport';

/**
 * Contrato MQTT (`packages/contracts/mqtt.md` e `packages/contracts/schemas/*.schema.json`).
 * Validação sem dependências, espelhando os JSON Schemas.
 */
export const TOPICS = {
  telemetry: (t: string) => `motos/${t}/telemetria`,
  events: (t: string) => `motos/${t}/eventos`,
  commands: (t: string) => `motos/${t}/comandos`,
  shadowUpdate: (t: string) => `$aws/things/${t}/shadow/update`,
  shadowAccepted: (t: string) => `$aws/things/${t}/shadow/update/accepted`,
  shadowRejected: (t: string) => `$aws/things/${t}/shadow/update/rejected`,
  shadowDelta: (t: string) => `$aws/things/${t}/shadow/update/delta`,
  shadowDocuments: (t: string) => `$aws/things/${t}/shadow/update/documents`,
  shadowGet: (t: string) => `$aws/things/${t}/shadow/get`,
  shadowGetAccepted: (t: string) => `$aws/things/${t}/shadow/get/accepted`,
  presenceConnected: (t: string) => `$aws/events/presence/connected/${t}`,
  presenceDisconnected: (t: string) => `$aws/events/presence/disconnected/${t}`,
} as const;

/** Filtros assinados pelo servidor no modo local. */
export const SERVER_SUBSCRIPTIONS = [
  'motos/+/telemetria',
  'motos/+/eventos',
  '$aws/things/+/shadow/update',
  '$aws/things/+/shadow/get',
  '$aws/events/presence/+/+',
];

export function thingFromTopic(topic: string): string | null {
  const parts = topic.split('/');
  if (parts[0] === 'motos' && parts.length === 3) return parts[1] || null;
  if (parts[0] === '$aws' && parts[1] === 'things' && parts.length >= 4) return parts[2] || null;
  if (parts[0] === '$aws' && parts[1] === 'events' && parts[2] === 'presence' && parts.length === 5) return parts[4] || null;
  return null;
}

export interface TelemetryMessage {
  lat: number;
  lng: number;
  velocidade_kmh: number;
  bateria_pct: number;
  travada: boolean;
  ignicao: boolean;
  sinal: number;
  timestamp: string;
}

export interface DeviceEventMessage {
  tipo: DeviceEventType;
  timestamp: string;
}

export const DEVICE_EVENT_TYPES: DeviceEventType[] = ['queda', 'violacao', 'bateria_critica', 'movimento_sem_aluguel'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isIso = (v: unknown): v is string => typeof v === 'string' && v.length >= 10 && !Number.isNaN(Date.parse(v));

export function parseTelemetry(raw: unknown): TelemetryMessage | null {
  if (!isObj(raw)) return null;
  const { lat, lng, velocidade_kmh, bateria_pct, travada, ignicao, sinal, timestamp } = raw;
  if (!isNum(lat, -90, 90) || !isNum(lng, -180, 180)) return null;
  if (!isNum(velocidade_kmh, 0, 200) || !isNum(bateria_pct, 0, 100)) return null;
  if (!isBool(travada) || !isBool(ignicao)) return null;
  if (!isNum(sinal, 0, 5) || !Number.isInteger(sinal)) return null;
  if (!isIso(timestamp)) return null;
  return { lat, lng, velocidade_kmh, bateria_pct, travada, ignicao, sinal, timestamp };
}

export function parseDeviceEvent(raw: unknown): DeviceEventMessage | null {
  if (!isObj(raw)) return null;
  const { tipo, timestamp } = raw;
  if (typeof tipo !== 'string' || !DEVICE_EVENT_TYPES.includes(tipo as DeviceEventType) || !isIso(timestamp)) return null;
  return { tipo: tipo as DeviceEventType, timestamp };
}

/** Campos conhecidos e válidos de um bloco `reported` (campos inválidos são descartados). */
export function sanitizeReported(r: Record<string, unknown>): ReportedState {
  const out: ReportedState = {};
  if (isBool(r.travada)) out.travada = r.travada;
  if (isNum(r.limite_kmh, 0, MAX_SPEED_KMH) && Number.isInteger(r.limite_kmh)) out.limite_kmh = r.limite_kmh;
  if (isBool(r.modo_roubada)) out.modo_roubada = r.modo_roubada;
  if (typeof r.firmware === 'string' && r.firmware.length <= 64) out.firmware = r.firmware;
  if (isNum(r.velocidade_kmh, 0, 200)) out.velocidade_kmh = r.velocidade_kmh;
  return out;
}

/** `{ state: { reported: {...} } }` publicado pelo rastreador em `shadow/update`. `null` se não houver `reported`. */
export function parseReported(raw: unknown): ReportedState | null {
  if (!isObj(raw) || !isObj(raw.state) || !isObj(raw.state.reported)) return null;
  return sanitizeReported(raw.state.reported);
}
