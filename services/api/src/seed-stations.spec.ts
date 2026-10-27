import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { alignStationBatteries, planStationBatteries, stationBatterySerial } from '../prisma/seed-stations';

const A = 'd0000000-0000-4000-8000-000000000001';
const B = 'd0000000-0000-4000-8000-000000000005';

describe('seed: estoque cadastrado das estações = contador availableBatteries (fix round 1 da Task 8.3)', () => {
  it('banco novo: cria as carregadas que faltam com séries determinísticas', () => {
    const plan = planStationBatteries([{ index: 0, id: A, availableBatteries: 3 }, { index: 4, id: B, availableBatteries: 0 }], new Map(), new Set());
    expect(plan.creates).toEqual([
      { serial: 'BT-S1001', stationId: A },
      { serial: 'BT-S1002', stationId: A },
      { serial: 'BT-S1003', stationId: A },
    ]);
    expect(plan.counters).toEqual([]);
  });

  it('banco já alinhado: nada muda (idempotente)', () => {
    const plan = planStationBatteries([{ index: 0, id: A, availableBatteries: 2 }], new Map([[A, 2]]), new Set(['BT-S1001', 'BT-S1002']));
    expect(plan).toEqual({ creates: [], counters: [] });
  });

  it('séries determinísticas já usadas (a bateria saiu da estação) são puladas, nunca movidas', () => {
    const plan = planStationBatteries([{ index: 0, id: A, availableBatteries: 3 }], new Map([[A, 1]]), new Set(['BT-S1001', 'BT-S1002']));
    expect(plan.creates).toEqual([{ serial: 'BT-S1003', stationId: A }, { serial: 'BT-S1004', stationId: A }]);
  });

  it('mais baterias cadastradas que o contador (ex.: Faria Lima 0 com 2): sobe o contador, sem apagar nem mover', () => {
    const plan = planStationBatteries([{ index: 4, id: B, availableBatteries: 0 }], new Map([[B, 2]]), new Set(['BT-S5001', 'BT-S5002']));
    expect(plan).toEqual({ creates: [], counters: [{ stationId: B, availableBatteries: 2 }] });
  });

  it('série no formato BT-S<estação><nnn>', () => {
    expect(stationBatterySerial(0, 1)).toBe('BT-S1001');
    expect(stationBatterySerial(3, 12)).toBe('BT-S4012');
  });

  it('alignStationBatteries lê o banco, cria só as que faltam e ajusta o contador; nunca apaga nem atualiza bateria', async () => {
    const prisma = mockDeep<PrismaClient>();
    prisma.swapStation.findMany.mockResolvedValue([{ id: A, availableBatteries: 2 }, { id: B, availableBatteries: 0 }] as any);
    (prisma.battery.groupBy as any).mockResolvedValue([{ stationId: B, _count: { _all: 2 } }]);
    prisma.battery.findMany.mockResolvedValue([{ serial: 'BT-S5001' }, { serial: 'BT-S5002' }] as any);
    await alignStationBatteries(prisma as any, [A, B]);
    expect(prisma.battery.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['stationId'], where: { stationId: { in: [A, B] }, status: 'in_station', chargePct: { gte: 90 } } }));
    expect(prisma.battery.createMany).toHaveBeenCalledWith({
      data: [
        { serial: 'BT-S1001', chargePct: 100, cycleCount: 0, status: 'in_station', stationId: A },
        { serial: 'BT-S1002', chargePct: 100, cycleCount: 0, status: 'in_station', stationId: A },
      ],
      skipDuplicates: true,
    });
    expect(prisma.swapStation.update).toHaveBeenCalledWith({ where: { id: B }, data: { availableBatteries: 2 } });
    expect(prisma.battery.update).not.toHaveBeenCalled();
    expect(prisma.battery.upsert).not.toHaveBeenCalled();
    expect(prisma.battery.deleteMany).not.toHaveBeenCalled();
  });
});
