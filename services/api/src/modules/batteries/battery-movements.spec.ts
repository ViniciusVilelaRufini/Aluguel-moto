import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { depotsLeavingCharged, movement, recordMovements } from './battery-movements';

const ACTOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPOT = 'd0000000-0000-4000-8000-0000000000d1';
const STATION = 'e0000000-0000-4000-8000-0000000000e1';

describe('movimentação de bateria', () => {
  it('movement: destino primeiro, depois a origem (galpão, estação, moto)', () => {
    const prev = { id: 'b1', status: 'charged' as const, depotId: DEPOT, stationId: null, vehicleId: null };
    expect(movement(prev, { status: 'in_van' }, ACTOR)).toEqual({
      batteryId: 'b1', fromStatus: 'charged', toStatus: 'in_van', depotId: DEPOT, stationId: null, vehicleId: null, actorId: ACTOR, reason: null,
    });
    expect(movement({ ...prev, status: 'in_van', depotId: null }, { status: 'in_station', stationId: STATION }, ACTOR, 'abastecer')).toMatchObject({
      fromStatus: 'in_van', toStatus: 'in_station', stationId: STATION, depotId: null, reason: 'abastecer',
    });
  });

  it('movement sem origem = cadastro (fromStatus nulo); exige o id da bateria', () => {
    expect(movement(null, { status: 'charging', depotId: DEPOT }, ACTOR, null, 'b2')).toMatchObject({ batteryId: 'b2', fromStatus: null, toStatus: 'charging', depotId: DEPOT });
    expect(() => movement(null, { status: 'charging' }, ACTOR)).toThrow();
  });

  it('recordMovements grava todas numa chamada; lista vazia não toca no banco', async () => {
    const tx = mockDeep<PrismaClient>();
    await recordMovements(tx as any, []);
    expect(tx.batteryMovement.createMany).not.toHaveBeenCalled();
    const items = [movement(null, { status: 'charged', depotId: DEPOT }, ACTOR, null, 'b1'), movement(null, { status: 'charging', depotId: DEPOT }, ACTOR, null, 'b2')];
    await recordMovements(tx as any, items);
    expect(tx.batteryMovement.createMany).toHaveBeenCalledWith({ data: items });
  });

  it('depotsLeavingCharged: só saídas de `charged` com galpão, sem repetir', () => {
    const base = { id: 'b', status: 'charged' as const, depotId: DEPOT, stationId: null, vehicleId: null };
    const out = depotsLeavingCharged([
      movement(base, { status: 'in_van' }, ACTOR),
      movement({ ...base, id: 'c' }, { status: 'defective' }, ACTOR),
      movement({ ...base, id: 'd', status: 'charging' }, { status: 'charged' }, ACTOR),
      movement({ ...base, id: 'e', depotId: null }, { status: 'in_van' }, ACTOR),
    ]);
    expect(out).toEqual([DEPOT]);
  });
});
