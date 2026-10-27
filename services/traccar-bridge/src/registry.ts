import { Pool, type PoolConfig } from 'pg';
import type { PoolConfigLike } from './config';
import { silentLogger, type Logger } from './log';

/** Só SELECT nas colunas liberadas ao papel `volti_bridge` (deploy/single/gt06.sh init). */
export const REGISTRY_SQL = `SELECT "imei", "thingName" FROM "Tracker" WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL`;

/** Prazo de conexão, de consulta (cliente) e de statement (servidor) do registro: banco lento vira erro, não espera infinita. */
export const DB_TIMEOUT_MS = 5_000;

export type Query = (sql: string) => Promise<{ rows: Array<{ imei: string; thingName: string }> }>;

/** Mapa IMEI → thingName dos rastreadores só relé (spec §6.1); a ponte relê a cada `REGISTRY_REFRESH_MS`. */
export class PgRegistry {
  constructor(private readonly query: Query) {}

  async things(): Promise<Map<string, string>> {
    const { rows } = await this.query(REGISTRY_SQL);
    return new Map(rows.map((r) => [r.imei, r.thingName]));
  }
}

interface PoolLike {
  on(event: 'error', cb: (err: Error) => void): unknown;
}

/**
 * Pool com prazos (B-I3). `error` de cliente ocioso (banco reiniciado, rede caída) é só log: sem ouvinte o `pg` derrubaria o
 * processo com exceção não tratada.
 */
export function createPool<P extends PoolLike = Pool>(cfg: PoolConfigLike, log: Logger = silentLogger, PoolImpl: new (c: PoolConfig) => P = Pool as never): P {
  const pool = new PoolImpl({ ...cfg, max: 2, connectionTimeoutMillis: DB_TIMEOUT_MS, query_timeout: DB_TIMEOUT_MS, statement_timeout: DB_TIMEOUT_MS });
  pool.on('error', (err: Error) => log.error({ msg: 'db_pool_error', error: err.message }));
  return pool;
}

export function pgQuery(cfg: PoolConfigLike, log: Logger = silentLogger): Query {
  const pool = createPool(cfg, log);
  return (sql) => pool.query<{ imei: string; thingName: string }>(sql);
}
