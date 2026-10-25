import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { centsToBrl, ReportsService, toCsv } from './reports.service';

describe('CSV dos relatórios em pt-BR (QA-16)', () => {
  it('centavos → reais com vírgula, sem separador de milhar', () => {
    expect(centsToBrl(4395)).toBe('43,95');
    expect(centsToBrl(123456)).toBe('1234,56');
    expect(centsToBrl(5)).toBe('0,05');
    expect(centsToBrl(-1250)).toBe('-12,50');
    expect(centsToBrl(0)).toBe('0,00');
  });

  it('cabeçalho em português, BOM, plano pelo nome e datas no fuso de São Paulo', () => {
    const csv = toCsv(
      [{ periodStart: '2026-10-15T03:00:00.000Z', planCode: 'day', rentals: 2, netCents: 4395, note: 'a;b' }],
      [
        { key: 'periodStart', label: 'Início do período', format: 'date' },
        { key: 'planCode', label: 'Plano', format: 'plan' },
        { key: 'rentals', label: 'Aluguéis', format: 'int' },
        { key: 'netCents', label: 'Líquido (R$)', format: 'money' },
        { key: 'note', label: 'Obs' },
      ],
    );
    expect(csv.startsWith('﻿')).toBe(true);
    const [header, line] = csv.slice(1).trim().split('\n');
    expect(header).toBe('Início do período;Plano;Aluguéis;Líquido (R$);Obs');
    expect(line).toBe('15/10/2026;Diária;2;43,95;"a;b"');
  });

  it('agrupamento por hora mostra a hora local; dia só-data não recua', () => {
    const csv = toCsv([{ t: '2026-10-15T01:30:00.000Z', d: '2026-03-15' }], [
      { key: 't', label: 'T', format: 'datetime' },
      { key: 'd', label: 'D', format: 'date' },
    ]);
    expect(csv.slice(1).trim().split('\n')[1]).toBe('14/10/2026 22:30;15/03/2026');
  });
});

describe('Relatório financeiro — inadimplência (Task 14)', () => {
  it('soma o saldo devedor das dívidas em aberto (aluguel/assinatura failed sem quitação), não o valor cheio de qualquer falha', async () => {
    const prisma = mockDeep<PrismaClient>();
    (prisma.rental.groupBy as any).mockResolvedValue([]);
    prisma.deposit.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { amountCents: null } } as any);
    prisma.customer.count.mockResolvedValue(1);
    prisma.payment.aggregate.mockResolvedValue({ _sum: { refundedCents: 0, amountCents: 0 } } as any);
    prisma.insurancePolicy.aggregate.mockResolvedValue({ _sum: { premiumCents: 0, payoutCents: 0 } } as any);
    const failed = [{ id: 'p1', amountCents: 12000 }];
    prisma.payment.findMany.mockResolvedValue(failed as any);
    const delinquency = { outstandingMap: jest.fn().mockResolvedValue(new Map([['p1', 7000]])) };
    const out = await new ReportsService(prisma as any, delinquency as any).finance('2026-10-01T03:00:00.000Z', '2026-10-24T03:00:00.000Z');
    expect(out.delinquentAmountCents).toBe(7000);
    expect((prisma.payment.findMany.mock.calls[0][0] as any).where).toMatchObject({ status: 'failed', kind: { in: ['rental', 'subscription'] }, debtSettledAt: null });
  });

  it('dashboard conta só os alertas que o perfil vê', async () => {
    const prisma = mockDeep<PrismaClient>();
    (prisma.vehicle.groupBy as any).mockResolvedValue([]);
    prisma.rental.count.mockResolvedValue(0);
    prisma.alert.count.mockResolvedValue(3);
    await new ReportsService(prisma as any).dashboard(false, { type: { notIn: ['payment_needs_review'] } });
    expect(prisma.alert.count).toHaveBeenCalledWith({ where: { status: { not: 'resolved' }, type: { notIn: ['payment_needs_review'] } } });
  });
});
