import { createPool, DB_TIMEOUT_MS, PgRegistry, REGISTRY_SQL } from './registry';

describe('PgRegistry', () => {
  it('IMEI → thingName só de rastreadores relay_only com IMEI; lê só as colunas liberadas ao papel volti_bridge', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ imei: '860000000000901', thingName: 'moto-0901' }] });
    expect(await new PgRegistry(query).things()).toEqual(new Map([['860000000000901', 'moto-0901']]));
    expect(query).toHaveBeenCalledWith(REGISTRY_SQL);
    expect(REGISTRY_SQL).toBe(`SELECT "imei", "thingName" FROM "Tracker" WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL`);
  });
});

describe('createPool (B-I3: banco lento não trava a ponte)', () => {
  class FakePool {
    static last?: FakePool;
    readonly handlers: Record<string, (err: Error) => void> = {};
    constructor(readonly opts: Record<string, unknown>) {
      FakePool.last = this;
    }
    on(event: string, cb: (err: Error) => void): this {
      this.handlers[event] = cb;
      return this;
    }
  }

  it('prazos de conexão, consulta e statement; erro de cliente ocioso vira log (sem derrubar o processo)', () => {
    const logs: Array<Record<string, unknown>> = [];
    const log = { info: () => undefined, warn: () => undefined, error: (e: Record<string, unknown>) => void logs.push(e) };
    createPool({ connectionString: 'postgres://x' }, log, FakePool as never);
    const pool = FakePool.last!;
    expect(DB_TIMEOUT_MS).toBe(5_000);
    expect(pool.opts).toMatchObject({ connectionString: 'postgres://x', max: 2, connectionTimeoutMillis: 5_000, query_timeout: 5_000, statement_timeout: 5_000 });
    expect(typeof pool.handlers.error).toBe('function');
    expect(() => pool.handlers.error(new Error('Connection terminated unexpectedly'))).not.toThrow();
    expect(logs).toEqual([{ msg: 'db_pool_error', error: 'Connection terminated unexpectedly' }]);
  });
});
