import { isValidTelemetry, type DeviceEventMessage, type DeviceEventType, type TelemetryMessage } from './contract';
import type { TraccarEvent, TraccarPosition } from './traccar/types';
import { knotsToKmh, rssiToSignal, voltageToPct, type BatteryModel } from './units';

/** Estado por moto mantido pela ponte (só a moto: nada do cliente). */
export interface DeviceMemory {
  /** Último bit de corte (`attributes.blocked`). Leia SEMPRE por `currentBlocked(mem)`, nunca direto. */
  blocked?: boolean;
  ignition?: boolean;
  signal?: number;
  batteryPct?: number;
  /** `true` entre `markReconnected` e o primeiro `attributes.blocked` recebido: o bit de corte é desconhecido. */
  awaitingStatus?: boolean;
  /** `fixTime` (ms) da última telemetria publicada: só sai telemetria mais nova. */
  lastFixTime?: number;
  /** Última posição válida publicada: base da segunda guarda do corte e do `reported.velocidade_kmh`. */
  last?: { fixTime: number; speedKmh: number; lat: number; lng: number };
  /** Onde a moto estava quando o corte foi visto (deslocamento > 20 m travada → `movimento_sem_aluguel`). */
  lockAnchor?: { lat: number; lng: number };
}

export const MOVED_WHILE_LOCKED_M = 20;

/**
 * Bit de corte ATUAL: `undefined` enquanto aguarda o primeiro status depois de uma (re)conexão.
 * Único jeito permitido de montar `reported.travada` / decidir `already_blocked` (nada de memória velha).
 */
export function currentBlocked(mem: DeviceMemory): boolean | undefined {
  return mem.awaitingStatus ? undefined : mem.blocked;
}

/**
 * A Task 9 chama quando o dispositivo (re)conecta no Traccar (`deviceOnline`/socket reaberto): esquece o bit de corte e
 * a âncora. Só um `attributes.blocked` recebido depois (heartbeat ou posição) volta a valer. Não muta a entrada.
 */
export function markReconnected(mem: DeviceMemory): DeviceMemory {
  return { ...mem, blocked: undefined, lockAnchor: undefined, awaitingStatus: true };
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/**
 * Tolerância de relógio do rastreador. Mesmo valor de MAX_CLOCK_SKEW_MS em services/api/src/modules/iot/live-state.store.ts
 * (copiado, não importado entre pacotes): fixTime além de agora + isto é não confiável.
 */
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

export type HeldReason = 'awaiting_status' | 'awaiting_battery';

/**
 * Posição do Traccar → telemetria do contrato (spec §6.2). Todo atributo conhecido atualiza a memória (inclusive de heartbeat);
 * só posição válida, não `outdated` e com `fixTime` mais novo que a última publicada vira telemetria.
 * - `now` (ms) é o relógio de ingestão. `fixTime` > now + MAX_CLOCK_SKEW_MS = `invalid`: não grava `last`/ordem; a
 *   frescura usa min(fixTime, now) (`last.fixTime`).
 * - Posição mais nova e inutilizável (inválida, outdated, relógio ou velocidade fora do contrato) limpa `last`: velocidade
 *   desconhecida = em movimento (`cutRefusal` → no_position/stale).
 * - Retenção: sem bit de corte atual (`currentBlocked` indefinido, ex.: após reconectar) ou sem bateria conhecida, não sai
 *   telemetria (`telemetry: null`, `held`) — um `travada: false` ou `bateria_pct: 0` por falta de dado enganaria a API.
 *   A memória (last, ignição, sinal, bateria) atualiza mesmo assim.
 * O `reported.travada` deve usar `currentBlocked` e só ser publicado quando for boolean.
 */
export function applyPosition(
  p: TraccarPosition,
  mem: DeviceMemory,
  battery: BatteryModel,
  now: number = Date.now(),
): { telemetry: TelemetryMessage | null; invalid: boolean; movedWhileLocked: boolean; held?: HeldReason; memory: DeviceMemory } {
  const next: DeviceMemory = { ...mem };
  const a = p.attributes ?? {};
  if (typeof a.blocked === 'boolean') {
    next.blocked = a.blocked;
    next.awaitingStatus = false;
  }
  if (typeof a.ignition === 'boolean') next.ignition = a.ignition;
  if (typeof a.rssi === 'number') next.signal = rssiToSignal(a.rssi);
  if (typeof a.power === 'number') {
    const pct = voltageToPct(a.power, battery);
    if (pct !== null) next.batteryPct = pct;
  }
  const blocked = currentBlocked(next);
  if (blocked !== true) next.lockAnchor = undefined;
  const none = { telemetry: null, invalid: false, movedWhileLocked: false, memory: next };
  const fixTime = Date.parse(p.fixTime);
  const newer = !Number.isFinite(fixTime) || next.lastFixTime === undefined || fixTime > next.lastFixTime;
  if (!p.valid || p.outdated || !Number.isFinite(fixTime)) {
    if (newer) next.last = undefined;
    return none;
  }
  if (fixTime > now + MAX_CLOCK_SKEW_MS) {
    next.last = undefined;
    return { ...none, invalid: true };
  }
  if (!newer) return none;
  const speedKmh = knotsToKmh(p.speed);
  const telemetry: TelemetryMessage = {
    lat: p.latitude,
    lng: p.longitude,
    velocidade_kmh: speedKmh,
    bateria_pct: next.batteryPct ?? 0,
    travada: blocked ?? false,
    ignicao: next.ignition ?? false,
    sinal: next.signal ?? 0,
    timestamp: new Date(fixTime).toISOString(),
  };
  if (!isValidTelemetry(telemetry)) {
    next.last = undefined;
    return { ...none, invalid: true };
  }
  next.lastFixTime = fixTime;
  next.last = { fixTime: Math.min(fixTime, now), speedKmh, lat: p.latitude, lng: p.longitude };
  let movedWhileLocked = false;
  if (blocked === true) {
    const here = { lat: p.latitude, lng: p.longitude };
    if (!next.lockAnchor) next.lockAnchor = here;
    else if (haversineM(next.lockAnchor, here) > MOVED_WHILE_LOCKED_M) {
      movedWhileLocked = true;
      next.lockAnchor = here;
    }
  }
  if (blocked === undefined) return { ...none, held: 'awaiting_status', memory: next };
  if (next.batteryPct === undefined) return { ...none, movedWhileLocked, held: 'awaiting_battery', memory: next };
  return { telemetry, invalid: false, movedWhileLocked, memory: next };
}

const ALARMS: Record<string, DeviceEventType> = {
  powerCut: 'violacao',
  lowBattery: 'bateria_critica',
  lowPower: 'bateria_critica',
  vibration: 'movimento_sem_aluguel',
};

/** Alarme do Traccar → eventos do contrato (spec §6.3). `vibration` só com o corte ativo; sem correspondência → nada. */
export function toDeviceEvents(e: TraccarEvent, mem: DeviceMemory, now: number): DeviceEventMessage[] {
  if (e.type !== 'alarm') return [];
  const at = Date.parse(e.eventTime);
  const timestamp = new Date(Number.isFinite(at) ? at : now).toISOString();
  const tipos = new Set<DeviceEventType>();
  for (const alarm of String(e.attributes?.alarm ?? '').split(',')) {
    const tipo = ALARMS[alarm.trim()];
    if (!tipo || (tipo === 'movimento_sem_aluguel' && currentBlocked(mem) !== true)) continue;
    tipos.add(tipo);
  }
  return [...tipos].map((tipo) => ({ tipo, timestamp }));
}
