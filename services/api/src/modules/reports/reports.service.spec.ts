import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { occupancyBuckets, ReportsService } from './reports.service';

function setup() {
  const prisma = mockDeep<PrismaClient>();
  (prisma.vehicle.groupBy as any).mockResolvedValue([]);
  (prisma.rental.groupBy as any).mockResolvedValue([]);
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

describe('ReportsService.dashboard — ocupação (painel de bancada, P1-7)', () => {
  it('conta as motos com aluguel em aberto (inclusive sem sinal), não só os status rented/paused', async () => {
    const { service, prisma } = setup();
    (prisma.vehicle.groupBy as any).mockResolvedValue([{ status: 'offline', _count: { _all: 1 } }, { status: 'free', _count: { _all: 3 } }]);
    (prisma.rental.groupBy as any).mockResolvedValue([{ vehicleId: 'v-offline' }]);
    const res = await service.dashboard(false);
    expect(res.occupancyPct).toBe(25);
    expect(((prisma.rental.groupBy as any).mock.calls[0][0] as any)).toMatchObject({ by: ['vehicleId'], where: { status: { in: ['active', 'paused', 'ending'] } } });
  });

  it('sem motos → 0', async () => {
    const { service } = setup();
    expect((await service.dashboard(false)).occupancyPct).toBe(0);
  });
});

describe('ReportsService.occupancy — ponderada pelo tempo (painel de bancada, L3)', () => {
  const NOW = new Date('2026-11-03T18:00:00.000Z');
  const FROM = '2026-10-27T18:00:00.000Z';
  const TO = NOW.toISOString();
  const bike = { createdAt: new Date('2026-01-01T00:00:00.000Z') };

  it('1 moto alugada ~1 h em 7 dias → ~0,6% (não 14%: um aluguel não ocupa o dia inteiro)', () => {
    const out = occupancyBuckets({
      from: new Date(FROM), to: NOW, now: NOW, groupBy: 'day', vehicles: [bike],
      rentals: [{ vehicleId: 'v1', startedAt: new Date('2026-11-02T13:00:00.000Z'), endedAt: new Date('2026-11-02T14:00:00.000Z') }],
    });
    expect(out.occupancyPct).toBe(0.6);
    const day = out.rows.find((r) => r.periodStart === '2026-11-02T03:00:00.000Z')!;
    expect(day).toMatchObject({ vehiclesTotal: 1, vehiclesRented: 0, occupancyPct: 4.2 });
    expect(out.rows.filter((r) => r.occupancyPct > 0)).toHaveLength(1);
  });

  it('aluguel em aberto conta até agora; o trecho futuro do período não conta; período cortado em from', () => {
    const out = occupancyBuckets({
      from: new Date('2026-11-03T15:00:00.000Z'), to: new Date('2026-11-04T03:00:00.000Z'), now: NOW, groupBy: 'day', vehicles: [bike, bike],
      rentals: [{ vehicleId: 'v1', startedAt: new Date('2026-11-03T12:00:00.000Z'), endedAt: null }],
    });
    // De 15:00 até agora (18:00): 1 de 2 motos alugada o tempo todo → 50%.
    expect(out.rows).toEqual([{ periodStart: '2026-11-03T03:00:00.000Z', vehiclesTotal: 2, vehiclesRented: 1, occupancyPct: 50 }]);
    expect(out.occupancyPct).toBe(50);
  });

  it('moto cadastrada no meio do período só conta a partir do cadastro', () => {
    const out = occupancyBuckets({
      from: new Date('2026-11-02T03:00:00.000Z'), to: new Date('2026-11-03T03:00:00.000Z'), now: NOW, groupBy: 'day',
      vehicles: [bike, { createdAt: new Date('2026-11-02T15:00:00.000Z') }],
      rentals: [{ vehicleId: 'v1', startedAt: new Date('2026-11-02T03:00:00.000Z'), endedAt: new Date('2026-11-03T03:00:00.000Z') }],
    });
    // 24 h alugadas ÷ (24 h + 12 h de frota) = 66,7%.
    expect(out.rows[0]).toMatchObject({ vehiclesTotal: 2, vehiclesRented: 1, occupancyPct: 66.7 });
  });

  it('semana começa na segunda 00:00 de São Paulo; mês no dia 1', () => {
    const w = occupancyBuckets({ from: new Date('2026-11-04T12:00:00.000Z'), to: new Date('2026-11-05T12:00:00.000Z'), now: NOW, groupBy: 'week', vehicles: [], rentals: [] });
    expect(w.rows.map((r) => r.periodStart)).toEqual(['2026-11-02T03:00:00.000Z']);
    const m = occupancyBuckets({ from: new Date('2026-10-15T12:00:00.000Z'), to: new Date('2026-11-02T12:00:00.000Z'), now: NOW, groupBy: 'month', vehicles: [], rentals: [] });
    expect(m.rows.map((r) => r.periodStart)).toEqual(['2026-10-01T03:00:00.000Z', '2026-11-01T03:00:00.000Z']);
    expect(m.occupancyPct).toBe(0);
  });

  it('occupancy() busca os aluguéis que cruzam o período e as motos, e devolve a ocupação do intervalo', async () => {
    const prisma = mockDeep<PrismaClient>();
    prisma.rental.findMany.mockResolvedValue([] as any);
    prisma.vehicle.findMany.mockResolvedValue([bike] as any);
    const out = await new ReportsService(prisma as any).occupancy(FROM, TO, 'day');
    expect(out).toMatchObject({ from: FROM, to: TO, groupBy: 'day', occupancyPct: 0 });
    expect((prisma.rental.findMany.mock.calls[0][0] as any).where).toEqual({
      startedAt: { lt: new Date(TO) }, OR: [{ endedAt: null }, { endedAt: { gt: new Date(FROM) } }],
    });
  });
});
