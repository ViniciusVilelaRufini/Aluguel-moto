import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';
import { ProblemException } from '../../common/problem';
import type { Principal } from '../auth/principal';
import { SupportService } from './support.service';

const DISPUTE_ID = '44444444-4444-4444-8444-444444444444';
const PAYMENT_ID = '55555555-5555-4555-8555-555555555555';
const actor = { pool: 'staff', sub: 's', email: 's@volti.com.br', groups: ['suporte'], userId: 'staff-1', staffId: 'staff-1' } as Principal;

describe('SupportService.resolveDispute', () => {
  const prisma = mockDeep<PrismaClient>();
  const audit = { record: jest.fn() };
  const payments = { refund: jest.fn() };
  const service = new SupportService(prisma as any, audit as any, {} as any, {} as any, {} as any, payments as any);
  const dispute = { id: DISPUTE_ID, customerId: 'c', rentalId: 'r', paymentId: PAYMENT_ID, status: 'open', reason: 'x', description: null, resolution: null, refundAmountCents: null, resolvedById: null, resolvedAt: null, createdAt: new Date(), updatedAt: new Date() };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as any).mockImplementation(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
    prisma.dispute.findUnique.mockResolvedValue(dispute as any);
    prisma.dispute.updateMany.mockResolvedValue({ count: 1 });
    prisma.dispute.findUniqueOrThrow.mockResolvedValue({ ...dispute, status: 'accepted' } as any);
    payments.refund.mockResolvedValue({ id: PAYMENT_ID });
  });

  it('aceita com estorno: delega ao pipeline de pagamentos com a chave da disputa e só então marca a disputa', async () => {
    await service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 });
    expect(payments.refund).toHaveBeenCalledWith(actor, PAYMENT_ID, { amountCents: 500, reason: 'Cobrança indevida' }, `dispute:${DISPUTE_ID}`);
    expect(prisma.dispute.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DISPUTE_ID, status: { in: ['open', 'under_review'] } }, data: expect.objectContaining({ status: 'accepted', refundAmountCents: 500 }) }),
    );
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('estorno recusado pelo pipeline: devolve o mesmo erro e a disputa continua aberta', async () => {
    const err = new ProblemException(422, 'validation-error', 'Valor acima do disponível para estorno (100).');
    payments.refund.mockRejectedValue(err);
    await expect(service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 })).rejects.toBe(err);
    expect(prisma.dispute.updateMany).not.toHaveBeenCalled();
  });

  it('disputa sem pagamento + estorno → 422 sem chamar o pipeline', async () => {
    prisma.dispute.findUnique.mockResolvedValue({ ...dispute, paymentId: null } as any);
    await expect(service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 })).rejects.toMatchObject({ status: 422 });
    expect(payments.refund).not.toHaveBeenCalled();
  });

  it('corrida: outra decisão já fechou a disputa (update condicional count 0) → 409', async () => {
    prisma.dispute.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.resolveDispute(actor, DISPUTE_ID, { decision: 'rejected', resolution: 'Sem fundamento' })).rejects.toMatchObject({ status: 409 });
  });

  it('rejeitada não estorna', async () => {
    await service.resolveDispute(actor, DISPUTE_ID, { decision: 'rejected', resolution: 'Sem fundamento', refundAmountCents: 500 });
    expect(payments.refund).not.toHaveBeenCalled();
  });
});
