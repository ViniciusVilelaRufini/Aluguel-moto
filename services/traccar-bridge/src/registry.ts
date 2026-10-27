import { Pool } from 'pg';
import type { PoolConfigLike } from './config';

/** Só SELECT nas colunas liberadas ao papel `volti_bridge` (deploy/single/gt06.sh init). */
export const REGISTRY_SQL = `SELECT "imei", "thingName" FROM "Tracker" WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL`;

export type Query = (sql: string) => Promise<{ rows: Array<{ imei: string; thingName: string }> }>;

/** Mapa IMEI → thingName dos rastreadores só relé (spec §6.1); a ponte relê a cada `REGISTRY_REFRESH_MS`. */
export class PgRegistry {
  constructor(private readonly query: Query) {}

  async things(): Promise<Map<string, string>> {
    const { rows } = await this.query(REGISTRY_SQL);
    return new Map(rows.map((r) => [r.imei, r.thingName]));
  }
}

export function pgQuery(cfg: PoolConfigLike): Query {
  const pool = new Pool({ ...cfg, max: 2 });
  return (sql) => pool.query<{ imei: string; thingName: string }>(sql);
}
