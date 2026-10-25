import { Prisma, PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { BatteryStockService } from './battery-stock.service';

const DEPOT = 'd0000000-0000-4000-8000-0000000000d1';

function setup(opts: { min?: number | null; charged?: number; open?: boolean } = {}) {
  const prisma = mockDeep<PrismaClient>();
  prisma.depot.findUnique.mockResolvedValue({ id: DEPOT, name: 'Galpão Pinheiros', minChargedBatteries: opts.min === undefined ? 5 : opts.min } as any);
  prisma.battery.count.mockResolvedValue(opts.charged ?? 2);
  prisma.alert.findFirst.mockResolvedValue(opts.open ? ({ id: 'open' } as any) : null);
  const alerts = { create: jest.fn().mockResolvedValue({ id: 'novo' }) };
  return { service: new BatteryStockService(prisma as any, alerts as any), prisma, alerts };
}

describe('BatteryStockService — alerta battery_stock_low', () => {
  it('abaixo do mínimo e sem alerta aberto: cria um alerta do galpão (sem dedupe por moto)', async () => {
    const { service, prisma, alerts } = setup({ min: 5, charged: 2 });
    await service.check([DEPOT]);
    expect(prisma.battery.count).toHaveBeenCalledWith({ where: { depotId: DEPOT, status: 'charged' } });
    expect(alerts.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'battery_stock_low', priority: 'medium', depotId: DEPOT, message: expect.stringContaining('Galpão Pinheiros') }),
      { dedupe: false },
    );
  });

  it('deduplica: já existe um alerta aberto do galpão → não cria outro', async () => {
    const { service, prisma, alerts } = setup({ open: true });
    await service.check([DEPOT]);
    expect(prisma.alert.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { type: 'battery_stock_low', depotId: DEPOT, status: { not: 'resolved' } } }));
    expect(alerts.create).not.toHaveBeenCalled();
  });

  it('corrida: o índice único parcial recusa o segundo (P2002) e a checagem termina sem erro', async () => {
    const { service, alerts } = setup();
    alerts.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(service.check([DEPOT])).resolves.toBeUndefined();
  });

  it('sem mínimo (nulo ou 0) ou com estoque no mínimo: não cria', async () => {
    for (const o of [{ min: null }, { min: 0 }, { min: 5, charged: 5 }, { min: 5, charged: 9 }]) {
      const { service, alerts } = setup(o);
      await service.check([DEPOT]);
      expect(alerts.create).not.toHaveBeenCalled();
    }
  });

  it('galpão inexistente ou lista vazia: nada acontece', async () => {
    const { service, prisma, alerts } = setup();
    prisma.depot.findUnique.mockResolvedValue(null);
    await service.check([DEPOT]);
    await service.check([]);
    expect(alerts.create).not.toHaveBeenCalled();
  });

  it('evento interno (troca na tarefa ou na estação) dispara a mesma checagem e não propaga erro', async () => {
    const { service, prisma, alerts } = setup();
    await service.onChargedStockDecreased({ depotIds: [DEPOT] });
    expect(alerts.create).toHaveBeenCalledTimes(1);
    prisma.depot.findUnique.mockRejectedValue(new Error('banco fora'));
    await expect(service.onChargedStockDecreased({ depotIds: [DEPOT] })).resolves.toBeUndefined();
  });
});
