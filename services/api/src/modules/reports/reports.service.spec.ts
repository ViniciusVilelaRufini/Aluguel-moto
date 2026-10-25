import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { ReportsService } from './reports.service';

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.vehicle.groupBy as any).mockResolvedValue([]);
  prisma.rental.count.mockResolvedValue(0);
  prisma.alert.count.mockResolvedValue(636);
  prisma.rental.aggregate.mockResolvedValue({ _sum: { costCents: 4395 } } as any);
  prisma.payment.aggregate.mockResolvedValue({ _sum: { amountCents: 24900 } } as any);
  return { service: new ReportsService(prisma as any), prisma };
}

describe('ReportsService.dashboard — receita do dia', () => {
  it('aluguéis encerrados + assinaturas pagas (mesma definição do Financeiro, Task 30); caução e recarga ficam de fora', async () => {
    const { service, prisma } = setup();
    const res = await service.dashboard(true);
    expect(res.revenueTodayCents).toBe(4395 + 24900);
    expect(res.openAlerts).toBe(636);
    expect(prisma.payment.aggregate).toHaveBeenCalledTimes(1);
    expect((prisma.payment.aggregate.mock.calls[0][0] as any).where).toMatchObject({ kind: 'subscription', status: { in: ['paid', 'partially_refunded', 'refunded'] } });
    expect(prisma.rental.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { in: ['ended', 'force_ended'] } }), _sum: { costCents: true } }),
    );
  });

  it('sem permissão de receita devolve 0 e nem consulta', async () => {
    const { service, prisma } = setup();
    expect((await service.dashboard(false)).revenueTodayCents).toBe(0);
    expect(prisma.rental.aggregate).not.toHaveBeenCalled();
    expect(prisma.payment.aggregate).not.toHaveBeenCalled();
  });
});

describe('ReportsService.finance — receita (Task 30)', () => {
  it('receita = aluguéis encerrados + assinaturas pagas no período; recargas à parte e fora do total', async () => {
    const prisma = mockDeep<PrismaClient>();
    (prisma.rental.groupBy as any).mockResolvedValue([{ planCode: 'day', _count: { _all: 2 }, _sum: { costCents: 18000 } }]);
    prisma.deposit.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { amountCents: null } } as any);
    prisma.customer.count.mockResolvedValue(0);
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.payment.aggregate.mockImplementation((async (args: any) => {
      if (args.where.kind === 'subscription') return { _sum: { amountCents: 24900 } };
      if (args.where.kind === 'top_up') return { _sum: { amountCents: 5990 } };
      return { _sum: { refundedCents: 0 } };
    }) as any);
    prisma.insurancePolicy.aggregate.mockResolvedValue({ _sum: { premiumCents: 0, payoutCents: 0 } } as any);
    const out = await new ReportsService(prisma as any).finance('2026-10-19T03:00:00.000Z', '2026-10-26T03:00:00.000Z');
    expect(out).toMatchObject({ rentalRevenueCents: 18000, subscriptionRevenueCents: 24900, totalRevenueCents: 42900, walletTopUpsCents: 5990 });
    const sub = prisma.payment.aggregate.mock.calls.map((c) => c[0] as any).find((a) => a.where.kind === 'subscription');
    expect(sub.where).toMatchObject({ status: { in: ['paid', 'partially_refunded', 'refunded'] }, createdAt: { gte: new Date('2026-10-19T03:00:00.000Z'), lt: new Date('2026-10-26T03:00:00.000Z') } });
  });
});
