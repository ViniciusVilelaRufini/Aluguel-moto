import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { ReportsService } from './reports.service';

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.vehicle.groupBy as any).mockResolvedValue([]);
  prisma.rental.count.mockResolvedValue(0);
  prisma.alert.count.mockResolvedValue(636);
  prisma.rental.aggregate.mockResolvedValue({ _sum: { costCents: 4395 } } as any);
  return { service: new ReportsService(prisma as any), prisma };
}

describe('ReportsService.dashboard — receita do dia', () => {
  it('usa o custo dos aluguéis encerrados (mesma definição do Financeiro); caução e recarga ficam de fora', async () => {
    const { service, prisma } = setup();
    const res = await service.dashboard(true);
    expect(res.revenueTodayCents).toBe(4395);
    expect(res.openAlerts).toBe(636);
    expect(prisma.payment.aggregate).not.toHaveBeenCalled();
    expect(prisma.rental.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { in: ['ended', 'force_ended'] } }), _sum: { costCents: true } }),
    );
  });

  it('sem permissão de receita devolve 0 e nem consulta', async () => {
    const { service, prisma } = setup();
    expect((await service.dashboard(false)).revenueTodayCents).toBe(0);
    expect(prisma.rental.aggregate).not.toHaveBeenCalled();
  });
});
