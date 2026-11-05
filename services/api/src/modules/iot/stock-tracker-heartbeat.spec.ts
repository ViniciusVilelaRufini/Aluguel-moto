import { Logger } from '@nestjs/common';
import { StockTrackerHeartbeat } from './stock-tracker-heartbeat';

const IMEI_THING = 'gt06-869890080273430';
const T0 = Date.parse('2026-11-05T12:00:00Z');

function setup() {
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const hb = new StockTrackerHeartbeat({ tracker: { updateMany } } as any);
  return { updateMany, hb };
}

describe('StockTrackerHeartbeat', () => {
  it('10 chamadas em 5 s gravam uma vez só', async () => {
    const { hb, updateMany } = setup();
    for (let i = 0; i < 10; i++) await hb.touch(IMEI_THING, T0 + i * 500);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({ where: { thingName: IMEI_THING, vehicleId: null }, data: { lastSeenAt: new Date(T0) } });
  });

  it('outra chamada após 16 s grava a segunda vez', async () => {
    const { hb, updateMany } = setup();
    await hb.touch(IMEI_THING, T0);
    await hb.touch(IMEI_THING, T0 + 16_000);
    expect(updateMany).toHaveBeenCalledTimes(2);
  });

  it('thingName de moto não grava', async () => {
    const { hb, updateMany } = setup();
    await hb.touch('moto-0059', T0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('erro de banco só gera log sem o IMEI e não propaga; a próxima tenta de novo', async () => {
    const { hb, updateMany } = setup();
    const err = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    updateMany.mockRejectedValueOnce(Object.assign(new Error('Invalid `updateMany()` where: { thingName: "gt06-869890080273430" }'), { code: 'P2025' }));
    await expect(hb.touch(IMEI_THING, T0)).resolves.toBeUndefined();
    expect(err).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(err.mock.calls)).not.toContain('869890080273430');
    expect(err.mock.calls[0][0]).toEqual({ msg: 'stock_heartbeat_failed', errorName: 'Error', errorCode: 'P2025' });
    await hb.touch(IMEI_THING, T0 + 1000);
    expect(updateMany).toHaveBeenCalledTimes(2);
    err.mockRestore();
  });
});
