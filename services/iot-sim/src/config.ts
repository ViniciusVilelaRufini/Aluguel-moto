import { MAX_SPEED_KMH, type DeviceEventType } from './model';

const EVENT_TYPES: DeviceEventType[] = ['queda', 'violacao', 'bateria_critica', 'movimento_sem_aluguel'];

export interface Injection {
  thingName: string;
  type: DeviceEventType;
  atSec: number;
}

export type FleetSourceKind = 'routes' | 'postgres';

export interface SimConfig {
  mqttUrl: string;
  /**
   * `routes` (padrão): N motos `moto-0001`… rodando as rotas de demonstração. `postgres`: um rastreador por moto cadastrada
   * no banco da API (dev single), na posição dela, parado.
   */
  fleetSource: FleetSourceKind;
  /** Só com `fleetSource: 'postgres'` (só leitura). Nunca logado. */
  databaseUrl?: string;
  /** Releitura da frota (motos novas e motos levadas para outro lugar). */
  fleetRefreshSec: number;
  /** Moto travada e parada há pelo menos isso, com o cadastro em outro lugar (> 50 m) → foi levada; o rastreador vai junto. */
  relocateAfterSec: number;
  vehicles: number;
  firstVehicle: number;
  tickMs: number;
  /** Fração das motos que começa destravada e andando (demonstração do painel). */
  ridingRatio: number;
  rideOnUnlock: boolean;
  telemetryRidingMs: number;
  telemetryParkedMs: number;
  cruiseMinKmh: number;
  cruiseMaxKmh: number;
  /** Eventos aleatórios: média por moto por hora. */
  eventRates: Partial<Record<DeviceEventType, number>>;
  injections: Injection[];
  seed: number;
  /** Encerra depois de N segundos (0 = não encerra). */
  durationSec: number;
}

type Env = Record<string, string | undefined>;

function int(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const v = Number(raw);
  if (!Number.isInteger(v) || v < min || v > max) throw new Error(`${name} inválido: "${raw}" (inteiro de ${min} a ${max})`);
  return v;
}

function ratio(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0 || v > 1) throw new Error(`${name} inválido: "${raw}" (0 a 1)`);
  return v;
}

function eventType(raw: string): DeviceEventType {
  if (!EVENT_TYPES.includes(raw as DeviceEventType)) throw new Error(`Tipo de evento desconhecido: "${raw}" (use ${EVENT_TYPES.join(', ')})`);
  return raw as DeviceEventType;
}

export function thingNameOf(n: number): string {
  return `moto-${String(n).padStart(4, '0')}`;
}

export function loadConfig(env: Env = process.env): SimConfig {
  const eventRates: SimConfig['eventRates'] = {};
  for (const part of (env.SIM_EVENTS ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [k, v] = part.split('=');
    const rate = Number(v);
    if (!Number.isFinite(rate) || rate < 0) throw new Error(`SIM_EVENTS inválido: "${part}"`);
    eventRates[eventType(k.trim())] = rate;
  }
  const injections: Injection[] = [];
  for (const part of (env.SIM_INJECT ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^(moto-\d{4}):([a-z_]+)@(\d+)$/.exec(part);
    if (!m) throw new Error(`SIM_INJECT inválido: "${part}" (formato moto-0003:queda@30)`);
    injections.push({ thingName: m[1], type: eventType(m[2]), atSec: Number(m[3]) });
  }
  const fleetSource = (env.SIM_FLEET_SOURCE || 'routes') as FleetSourceKind;
  if (fleetSource !== 'routes' && fleetSource !== 'postgres') throw new Error(`SIM_FLEET_SOURCE inválido: "${fleetSource}" (routes ou postgres)`);
  const databaseUrl = env.DATABASE_URL || undefined;
  if (fleetSource === 'postgres' && !databaseUrl) throw new Error('SIM_FLEET_SOURCE=postgres exige DATABASE_URL');
  const cruiseMaxKmh = int(env, 'SIM_CRUISE_MAX_KMH', 26, 1, MAX_SPEED_KMH);
  const cruiseMinKmh = int(env, 'SIM_CRUISE_MIN_KMH', Math.min(14, cruiseMaxKmh), 1, cruiseMaxKmh);
  return {
    mqttUrl: env.MQTT_URL || 'mqtt://localhost:1883',
    fleetSource,
    databaseUrl: fleetSource === 'postgres' ? databaseUrl : undefined,
    fleetRefreshSec: int(env, 'SIM_FLEET_REFRESH_SEC', 60, 10, 3600),
    relocateAfterSec: int(env, 'SIM_RELOCATE_AFTER_SEC', 180, 30, 24 * 3600),
    vehicles: int(env, 'SIM_VEHICLES', 50, 1, 5000),
    firstVehicle: int(env, 'SIM_FIRST_VEHICLE', 1, 1, 9999),
    tickMs: int(env, 'SIM_TICK_MS', 1000, 100, 10_000),
    ridingRatio: ratio(env, 'SIM_RIDING_RATIO', 0.6),
    rideOnUnlock: (env.SIM_RIDE_ON_UNLOCK ?? 'true') !== 'false',
    telemetryRidingMs: int(env, 'SIM_TELEMETRY_RIDING_MS', 5000, 500, 600_000),
    telemetryParkedMs: int(env, 'SIM_TELEMETRY_PARKED_MS', 60_000, 500, 3_600_000),
    cruiseMinKmh,
    cruiseMaxKmh,
    eventRates,
    injections,
    seed: int(env, 'SIM_SEED', 42, 0, 2 ** 31),
    durationSec: int(env, 'SIM_DURATION_SEC', 0, 0, 7 * 24 * 3600),
  };
}
