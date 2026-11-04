import { toPayment } from './payments.mapper';

const STAFF = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-11-04T12:00:00Z');
const row = {
  id: 'p1', customerId: 'c1', rentalId: null, depositId: null, subscriptionId: null, kind: 'rental', method: 'counter_card', status: 'paid',
  amountCents: 5000, refundedCents: 0, walletCents: 0, cardLast4: null, failureReason: null, providerPaymentId: null, reference: 'NSU123',
  recordedById: STAFF, debtSettledAt: null, debtSettlement: null, settlesPaymentId: null, pix: null, createdAt: now, updatedAt: now,
} as any;

describe('toPayment — balcão', () => {
  it('cliente vê a referência mas não o atendente', () => {
    const out = toPayment(row);
    expect(out.reference).toBe('NSU123');
    expect(out).not.toHaveProperty('recordedBy');
  });

  it('staff vê o atendente', () => {
    expect(toPayment(row, undefined, { staff: true }).recordedBy).toBe(STAFF);
  });

  it('sem referência nem atendente, os campos somem', () => {
    const out = toPayment({ ...row, reference: null, recordedById: null }, undefined, { staff: true });
    expect(out).not.toHaveProperty('reference');
    expect(out).not.toHaveProperty('recordedBy');
  });
});
