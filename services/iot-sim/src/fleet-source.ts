import { Pool } from 'pg';
import type { LatLng } from './geo';
import { MAX_SPEED_KMH } from './model';

/** Uma moto cadastrada, como o rastreador dela deve começar (e onde ela "deveria" estar parada). */
export interface FleetVehicle {
  thingName: string;
  /** Galpão (moto livre/em manutenção no galpão) ou a última posição gravada. */
  position: LatLng;
  locked: boolean;
  limitKmh: number;
  batteryPct: number;
}

export interface FleetSource {
  load(): Promise<FleetVehicle[]>;
  close(): Promise<void>;
}

/** Linha da consulta (só leitura) da frota cadastrada. */
export interface FleetRow {
  thingName: string;
  status: string;
  lat: number;
  lng: number;
  locked: boolean;
  speedLimitKmh: number;
  batteryPct: number;
  depotLat: number | null;
  depotLng: number | null;
}

/** Só `SELECT`: o simulador nunca escreve no banco (a API grava o que o rastreador reporta). */
export const FLEET_SQL = `SELECT v."thingName", v."status"::text AS "status", v."lat", v."lng", v."locked", v."speedLimitKmh", v."batteryPct",
  d."lat" AS "depotLat", d."lng" AS "depotLng"
FROM "Vehicle" v LEFT JOIN "Depot" d ON d."id" = v."depotId"
LEFT JOIN "Tracker" t ON t."vehicleId" = v."id"
WHERE t."controlMode" IS DISTINCT FROM 'relay_only'
ORDER BY v."thingName"`;

/** Moto parada no galpão (disponível ou em manutenção): a posição é a do galpão. */
const AT_DEPOT_STATUSES = ['free', 'maintenance'];

const THING_NAME = /^[A-Za-z0-9_:-]{1,128}$/;

/** Onde o rastreador da moto está: no galpão, a posição do galpão; senão, a última gravada. Sem posição nenhuma → `null`. */
export function rowToVehicle(r: FleetRow): FleetVehicle | null {
  if (!THING_NAME.test(r.thingName)) return null;
  const atDepot = r.depotLat !== null && r.depotLng !== null && AT_DEPOT_STATUSES.includes(r.status);
  const position: LatLng = atDepot ? [Number(r.depotLat), Number(r.depotLng)] : [Number(r.lat), Number(r.lng)];
  if (!Number.isFinite(position[0]) || !Number.isFinite(position[1]) || (position[0] === 0 && position[1] === 0)) return null;
  const limit = Math.round(Number(r.speedLimitKmh));
  return {
    thingName: r.thingName,
    position,
    locked: r.locked !== false,
    // Contran 996/2023: o limite do rastreador nunca passa de 32 km/h.
    limitKmh: Number.isFinite(limit) ? Math.min(MAX_SPEED_KMH, Math.max(0, limit)) : MAX_SPEED_KMH,
    batteryPct: Math.min(100, Math.max(0, Math.round(Number(r.batteryPct) || 0))),
  };
}

export function rowsToFleet(rows: FleetRow[]): FleetVehicle[] {
  return rows.map(rowToVehicle).filter((v): v is FleetVehicle => v !== null);
}

/** Frota lida do Postgres da API (`DATABASE_URL`, credencial só por variável de ambiente). Uma conexão no máximo. */
export function postgresFleetSource(databaseUrl: string): FleetSource {
  const pool = new Pool({ connectionString: databaseUrl, max: 1, idleTimeoutMillis: 10_000, application_name: 'iot-sim' });
  return {
    async load() {
      const res = await pool.query<FleetRow>(FLEET_SQL);
      return rowsToFleet(res.rows);
    },
    close: () => pool.end(),
  };
}
