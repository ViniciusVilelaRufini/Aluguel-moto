import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClient, Prisma } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { PAYMENT_NEEDS_REVIEW, signalNeedsReview } from '../payments/payment-review';
import { AlertsListeners, paymentReviewMessage } from './alerts.listeners';
import { alertScope, AlertsService } from './alerts.service';

const staff = (...groups: string[]) => ({ pool: 'staff', userId: 'u', sub: 's', email: 'e@volti.com.br', groups }) as any;
const PAYMENT = '44444444-4444-4444-8444-444444444444';
const row = (over: Record<string, unknown> = {}) => ({
  id: 'a1', type: 'payment_needs_review', priority: 'high', status: 'open', vehicleId: null, rentalId: null, depotId: null, paymentId: PAYMENT,
  message: 'x', lat: null, lng: null, assigneeId: null, resolution: null, createdAt: new Date(), assignedAt: null, resolvedAt: null, ...over,
});

describe('alertScope (Task 14)', () => {
  it('admin e suporte veem tudo; financeiro só os financeiros; operação não vê os financeiros; operação+financeiro vê tudo', () => {
    expect(alertScope(staff('admin'))).toBeNull();
    expect(alertScope(staff('suporte'))).toBeNull();
    expect(alertScope(staff('financeiro'))).toEqual({ type: { in: ['payment_needs_review'] } });
    expect(alertScope(staff('operacao'))).toEqual({ type: { notIn: ['payment_needs_review'] } });
    expect(alertScope(staff('operacao', 'financeiro'))).toBeNull();
  });
});

describe('AlertsService — alerta de pagamento', () => {
  function setup() {
    const prisma = mockDeep<PrismaClient>();
    const events = new EventEmitter2();
    const emitted: unknown[] = [];
    events.on('alert.created', (e) => emitted.push(e));
    return { prisma, events, emitted, svc: new AlertsService(prisma as any, events) };
  }

  it('cria um alerta aberto por pagamento: repetição devolve o existente, sem novo evento', async () => {
    const { prisma, svc, emitted } = setup();
    prisma.alert.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(row() as any);
    prisma.alert.create.mockResolvedValue(row() as any);
    await svc.create({ type: 'payment_needs_review', priority: 'high', message: 'x', paymentId: PAYMENT }, { dedupe: false });
    const again = await svc.create({ type: 'payment_needs_review', priority: 'high', message: 'x', paymentId: PAYMENT }, { dedupe: false });
    expect(again.id).toBe('a1');
    expect(prisma.alert.create).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveLength(1);
  });

  it('corrida no índice parcial (P2002) devolve o alerta que ganhou', async () => {
    const { prisma, svc } = setup();
    prisma.alert.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(row({ id: 'winner' }) as any);
    prisma.alert.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    expect((await svc.create({ type: 'payment_needs_review', priority: 'high', message: 'x', paymentId: PAYMENT })).id).toBe('winner');
  });

  it('lista com o escopo do perfil e devolve paymentId; fora do escopo → 404', async () => {
    const { prisma, svc } = setup();
    prisma.alert.findMany.mockResolvedValue([row()] as any);
    const page = await svc.list({ limit: 20 } as any, staff('financeiro'));
    expect((prisma.alert.findMany.mock.calls[0][0] as any).where).toEqual({ type: { in: ['payment_needs_review'] } });
    expect(page.items[0]).toMatchObject({ type: 'payment_needs_review', paymentId: PAYMENT });

    await svc.list({ limit: 20, type: 'vehicle_offline' } as any, staff('operacao'));
    expect((prisma.alert.findMany.mock.calls[1][0] as any).where).toEqual({ type: { notIn: ['payment_needs_review'] }, AND: [{ type: 'vehicle_offline' }] });

    prisma.alert.findFirst.mockResolvedValue(null);
    await expect(svc.get('a1', staff('operacao'))).rejects.toMatchObject({ status: 404 });
    expect((prisma.alert.findFirst.mock.calls.at(-1)![0] as any).where).toEqual({ AND: [{ id: 'a1' }, { type: { notIn: ['payment_needs_review'] } }] });
  });
});

describe('AlertsListeners — payment.needs-review vira alerta (Task 14)', () => {
  it('cria payment_needs_review com paymentId, prioridade alta e texto pt-BR', async () => {
    const alerts = { create: jest.fn().mockResolvedValue({}) };
    const listeners = new AlertsListeners(alerts as any, {} as any, { subscribe: jest.fn() } as any, new EventEmitter2());
    await listeners.onPaymentNeedsReview({ paymentId: PAYMENT, rentalId: 'r1', reason: 'review_timeout' });
    expect(alerts.create).toHaveBeenCalledWith(
      { type: 'payment_needs_review', priority: 'high', message: 'Cobrança em análise no gateway além do prazo: revisar o pagamento.', paymentId: PAYMENT, rentalId: 'r1' },
      { dedupe: false },
    );
  });

  it('falha ao criar o alerta não propaga (quem sinalizou não pode cair)', async () => {
    const alerts = { create: jest.fn().mockRejectedValue(new Error('db fora')) };
    const listeners = new AlertsListeners(alerts as any, {} as any, { subscribe: jest.fn() } as any, new EventEmitter2());
    await expect(listeners.onPaymentNeedsReview({ paymentId: PAYMENT, reason: 'x' })).resolves.toBeUndefined();
  });

  it('textos por motivo', () => {
    expect(paymentReviewMessage('subscription_late_charge_refund_rejected')).toMatch(/assinatura/);
    expect(paymentReviewMessage('refund_attempts_exhausted')).toMatch(/Estorno/);
    expect(paymentReviewMessage('refund_rollback_mismatch')).toMatch(/Estorno/);
    expect(paymentReviewMessage('preauthorization_unexpected_status:refunded')).toMatch(/revisão manual/);
  });

  it('signalNeedsReview emite o evento consumido pelo listener', () => {
    const events = new EventEmitter2();
    const got: unknown[] = [];
    events.on(PAYMENT_NEEDS_REVIEW, (e) => got.push(e));
    signalNeedsReview({ error: jest.fn() } as any, events, { paymentId: PAYMENT, reason: 'x' });
    expect(got).toEqual([{ paymentId: PAYMENT, reason: 'x' }]);
  });
});
