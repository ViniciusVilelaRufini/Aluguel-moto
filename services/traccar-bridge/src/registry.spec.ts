import { PgRegistry, REGISTRY_SQL } from './registry';

describe('PgRegistry', () => {
  it('IMEI → thingName só de rastreadores relay_only com IMEI; lê só as colunas liberadas ao papel volti_bridge', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ imei: '860000000000901', thingName: 'moto-0901' }] });
    expect(await new PgRegistry(query).things()).toEqual(new Map([['860000000000901', 'moto-0901']]));
    expect(query).toHaveBeenCalledWith(REGISTRY_SQL);
    expect(REGISTRY_SQL).toBe(`SELECT "imei", "thingName" FROM "Tracker" WHERE "controlMode" = 'relay_only' AND "imei" IS NOT NULL`);
  });
});
