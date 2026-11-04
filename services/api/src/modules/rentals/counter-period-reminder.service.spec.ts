import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { loadConfig } from '../../config/env';
import { CounterPeriodReminderService } from './counter-period-reminder.service';

const C = '11111111-1111-4111-8111-111111111111';
const PREPAID_UNTIL = new Date('2026-11-05T15:30:00Z');
const NOW = new Date('2026-11-05T14:45:00Z');

function setup() {
  const prisma: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();
  const push = { sendToOwner: jest.fn().mockResolvedValue(undefined) };
  const svc = new CounterPeriodReminderService(prisma as any, push as any, loadConfig());
  prisma.rental.findMany.mockResolvedValue([{ id: 'r1', customerId: C, prepaidUntil: PREPAID_UNTIL }] as any);
  prisma.rental.updateMany.mockResolvedValue({ count: 1 });
  return { prisma, push, svc };
}

describe('CounterPeriodReminderService', () => {
  it('avisa uma vez, com a hora de São Paulo', async () => {
    const { prisma, push, svc } = setup();
    expect(await svc.remind(NOW)).toBe(1);
    expect(push.sendToOwner).toHaveBeenCalledWith(C, {
      title: 'Fim do período',
      body: 'Seu período termina às 12:30. O excedente é acertado no galpão.',
      data: { type: 'rental.prepaid_ending', rentalId: 'r1' },
    });
    const where = (prisma.rental.findMany.mock.calls[0][0] as any).where;
    expect(where).toMatchObject({ status: { in: ['active', 'paused', 'ending'] }, prepaidReminderSentAt: null, prepaidUntil: { gt: NOW, lte: new Date('2026-11-05T15:45:00Z') } });
    expect(prisma.rental.updateMany).toHaveBeenCalledWith({ where: { id: 'r1', prepaidReminderSentAt: null, status: { in: ['active', 'paused', 'ending'] } }, data: { prepaidReminderSentAt: NOW } });

    prisma.rental.updateMany.mockResolvedValue({ count: 0 });
    push.sendToOwner.mockClear();
    expect(await svc.remind(NOW)).toBe(0);
    expect(push.sendToOwner).not.toHaveBeenCalled();
  });

  it('falha no push não derruba o lote nem conta como enviado', async () => {
    const { push, svc } = setup();
    push.sendToOwner.mockRejectedValue(new Error('fcm fora'));
    expect(await svc.remind(NOW)).toBe(0);
  });

  it('job respeita JOBS_ENABLED', async () => {
    const { prisma, svc } = setup();
    (svc as any).cfg = { ...loadConfig(), jobsEnabled: false };
    await svc.remindJob();
    expect(prisma.rental.findMany).not.toHaveBeenCalled();
  });
});
