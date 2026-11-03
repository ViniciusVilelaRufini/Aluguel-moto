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
    prisma.payment.findUnique.mockResolvedValue({ id: PAYMENT_ID, customerId: 'c', rentalId: 'r', kind: 'rental' } as any);
    prisma.paymentRefund.count.mockResolvedValue(0);
  });

  const claimWhere = { id: DISPUTE_ID, status: { in: ['open', 'under_review'] }, resolvedById: null };

  it('aceita com estorno: reivindica, delega ao pipeline com a chave da disputa e só então marca accepted', async () => {
    await service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 });
    const calls = prisma.dispute.updateMany.mock.calls.map((c) => c[0] as any);
    expect(calls[0]).toEqual({ where: claimWhere, data: { status: 'under_review', resolvedById: actor.userId } });
    expect(payments.refund).toHaveBeenCalledWith(actor, PAYMENT_ID, { amountCents: 500, reason: 'Cobrança indevida' }, `dispute:${DISPUTE_ID}`);
    expect(calls[1].where).toEqual({ id: DISPUTE_ID, status: 'under_review', resolvedById: actor.userId });
    expect(calls[1].data).toMatchObject({ status: 'accepted', refundAmountCents: 500 });
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('estorno recusado pelo pipeline: devolve o mesmo erro e reverte a reivindicação (disputa volta a open)', async () => {
    const err = new ProblemException(422, 'validation-error', 'Valor acima do disponível para estorno (100).');
    payments.refund.mockRejectedValue(err);
    await expect(service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 })).rejects.toBe(err);
    const calls = prisma.dispute.updateMany.mock.calls.map((c) => c[0] as any);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ where: { id: DISPUTE_ID, status: 'under_review', resolvedById: actor.userId }, data: { status: 'open', resolvedById: null } });
  });

  it('disputa sem pagamento + estorno → 422 sem reivindicar nem chamar o pipeline', async () => {
    prisma.dispute.findUnique.mockResolvedValue({ ...dispute, paymentId: null } as any);
    await expect(service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 })).rejects.toMatchObject({ status: 422 });
    expect(payments.refund).not.toHaveBeenCalled();
    expect(prisma.dispute.updateMany).not.toHaveBeenCalled();
  });

  it('reivindicação perdida (count 0) → 409 e nenhum estorno', async () => {
    prisma.dispute.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 })).rejects.toMatchObject({ status: 409 });
    expect(payments.refund).not.toHaveBeenCalled();
  });

  it('rejeitada não estorna', async () => {
    await service.resolveDispute(actor, DISPUTE_ID, { decision: 'rejected', resolution: 'Sem fundamento', refundAmountCents: 500 });
    expect(payments.refund).not.toHaveBeenCalled();
  });

  const concurrent = async (rejecter: Principal) => {
    let row = { status: 'open', resolvedById: null as string | null };
    prisma.dispute.updateMany.mockImplementation((async (args: any) => {
      const w = args.where;
      const okStatus = typeof w.status === 'string' ? row.status === w.status : w.status.in.includes(row.status);
      if (!okStatus || row.resolvedById !== w.resolvedById) return { count: 0 };
      row = { ...row, ...args.data };
      return { count: 1 };
    }) as any);
    let releaseRefund!: () => void;
    payments.refund.mockImplementation(() => new Promise((r) => { releaseRefund = () => r({ id: PAYMENT_ID }); }));
    const accept = service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 });
    await new Promise((r) => setImmediate(r));
    await expect(service.resolveDispute(rejecter, DISPUTE_ID, { decision: 'rejected', resolution: 'Sem fundamento' })).rejects.toMatchObject({ status: 409, detail: 'Esta contestação já está sendo resolvida.' });
    releaseRefund();
    await accept;
    expect(payments.refund).toHaveBeenCalledTimes(1);
    expect(row.status).toBe('accepted');
  };

  it('accept com estorno e reject concorrentes de pessoas diferentes: a rejeição leva 409 e há um único estorno', async () => {
    await concurrent({ ...actor, userId: 'staff-2', staffId: 'staff-2' } as Principal);
  });

  it('accept com estorno e reject concorrentes do MESMO ator (duplo clique/retry): um vence, um estorno, nunca rejected com estorno', async () => {
    await concurrent(actor);
  });
});

describe('auditoria run-4: contestação ligada ao pagamento do aluguel e estorno por tentativa', () => {
  const prisma = mockDeep<PrismaClient>();
  const audit = { record: jest.fn() };
  const payments = { refund: jest.fn() };
  const service = new SupportService(prisma as any, audit as any, {} as any, {} as any, {} as any, payments as any);
  const CUSTOMER = '11111111-1111-4111-8111-111111111111';
  const RENTAL = '66666666-6666-4666-8666-666666666666';
  const customer = { pool: 'customer', sub: 'c', email: 'c@x.com', groups: [], userId: CUSTOMER, customerId: CUSTOMER } as Principal;
  const dispute = { id: DISPUTE_ID, customerId: CUSTOMER, rentalId: RENTAL, paymentId: PAYMENT_ID, status: 'open', resolvedById: null };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as any).mockImplementation(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
    prisma.rental.findUnique.mockResolvedValue({ customerId: CUSTOMER, paymentId: null } as any);
    prisma.payment.findUnique.mockResolvedValue({ id: PAYMENT_ID, customerId: CUSTOMER, rentalId: RENTAL, kind: 'rental' } as any);
    prisma.dispute.findFirst.mockResolvedValue(null);
    prisma.dispute.create.mockImplementation((async (a: any) => ({ ...dispute, ...a.data, createdAt: new Date(), updatedAt: new Date() })) as any);
    prisma.dispute.findUnique.mockResolvedValue(dispute as any);
    prisma.dispute.updateMany.mockResolvedValue({ count: 1 });
    prisma.dispute.findUniqueOrThrow.mockResolvedValue({ ...dispute, status: 'accepted', createdAt: new Date(), updatedAt: new Date() } as any);
    prisma.paymentRefund.count.mockResolvedValue(0);
    payments.refund.mockResolvedValue({ id: PAYMENT_ID });
  });

  it('criar com pagamento de outro aluguel do mesmo cliente → 404 e nada gravado', async () => {
    prisma.payment.findUnique.mockResolvedValue({ id: PAYMENT_ID, customerId: CUSTOMER, rentalId: 'outro-aluguel', kind: 'rental' } as any);
    await expect(service.createDispute(customer, { rentalId: RENTAL, paymentId: PAYMENT_ID, reason: 'Cobrança indevida' })).rejects.toMatchObject({ status: 404 });
    expect(prisma.dispute.create).not.toHaveBeenCalled();
  });

  it('criar com pagamento que não é do aluguel (recarga/assinatura) → 404', async () => {
    prisma.payment.findUnique.mockResolvedValue({ id: PAYMENT_ID, customerId: CUSTOMER, rentalId: RENTAL, kind: 'top_up' } as any);
    await expect(service.createDispute(customer, { rentalId: RENTAL, paymentId: PAYMENT_ID, reason: 'Cobrança indevida' })).rejects.toMatchObject({ status: 404 });
  });

  it('criar com o pagamento do próprio aluguel → ok', async () => {
    await expect(service.createDispute(customer, { rentalId: RENTAL, paymentId: PAYMENT_ID, reason: 'Cobrança indevida' })).resolves.toMatchObject({ paymentId: PAYMENT_ID });
  });

  it('duas contestações abertas em corrida: o índice único parcial (P2002) vira 409', async () => {
    const { Prisma } = jest.requireActual('@prisma/client');
    prisma.dispute.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(service.createDispute(customer, { rentalId: RENTAL, reason: 'Cobrança indevida' }))
      .rejects.toMatchObject({ status: 409, detail: 'Já existe uma contestação aberta para este aluguel.' });
  });

  it('resolver: disputa antiga com pagamento de outro aluguel → 422 antes de reivindicar e sem estorno', async () => {
    prisma.payment.findUnique.mockResolvedValue({ id: PAYMENT_ID, customerId: CUSTOMER, rentalId: 'outro-aluguel', kind: 'rental' } as any);
    await expect(service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 }))
      .rejects.toMatchObject({ status: 422 });
    expect(prisma.dispute.updateMany).not.toHaveBeenCalled();
    expect(payments.refund).not.toHaveBeenCalled();
  });

  it('estorno recusado antes: nova tentativa usa chave nova (dispute:<id>:<n>), sem repetir o 422 da chave velha', async () => {
    prisma.paymentRefund.count.mockResolvedValue(1);
    await service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 });
    expect(payments.refund).toHaveBeenCalledWith(actor, PAYMENT_ID, { amountCents: 500, reason: 'Cobrança indevida' }, `dispute:${DISPUTE_ID}:2`);
    const where = (prisma.paymentRefund.count.mock.calls[0][0] as any).where;
    expect(where).toEqual({
      paymentId: PAYMENT_ID, status: 'rejected',
      OR: [{ idempotencyKey: `refund:${PAYMENT_ID}:dispute:${DISPUTE_ID}` }, { idempotencyKey: { startsWith: `refund:${PAYMENT_ID}:dispute:${DISPUTE_ID}:` } }],
    });
  });

  it('sem recusa anterior a chave continua dispute:<id> (idempotente para pedidos em aberto/concluídos)', async () => {
    await service.resolveDispute(actor, DISPUTE_ID, { decision: 'accepted', resolution: 'Cobrança indevida', refundAmountCents: 500 });
    expect(payments.refund.mock.calls[0][3]).toBe(`dispute:${DISPUTE_ID}`);
  });
});
