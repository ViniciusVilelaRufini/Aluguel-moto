import { createInMemoryPrisma, type InMemoryPrisma } from '../testing/in-memory-prisma';
import { receiptPaymentInfo } from './receipt-status';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const RENTAL = '88888888-8888-4888-8888-888888888888';

describe('receiptPaymentInfo — excedente do balcão e quitações parciais', () => {
  let db: InMemoryPrisma;
  beforeEach(() => {
    db = createInMemoryPrisma();
  });

  const info = async (paymentId: string, depositId: string | null = null) =>
    receiptPaymentInfo(db as any, { depositId }, await db.payment.findUnique({ where: { id: paymentId } }));
  const counterDebt = (amountCents: number, extra: Record<string, unknown> = {}) =>
    db.payment.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, kind: 'rental', method: 'counter_pix', status: 'pending', amountCents, ...extra } });
  const part = (settlesPaymentId: string, amountCents: number, status = 'paid') =>
    db.payment.create({ data: { customerId: CUSTOMER, kind: 'debt_settlement', method: 'cash', status, amountCents, settlesPaymentId } });

  it('excedente do balcão em aberto → pending com o valor a acertar no galpão (não processing)', async () => {
    const d = await counterDebt(4500);
    expect(await info(d.id)).toEqual({ status: 'pending', amountDueCents: 4500 });
  });

  it('excedente do balcão com quitação parcial → amountDueCents desconta as partes pagas (ignora as não pagas)', async () => {
    const d = await counterDebt(4500);
    await part(d.id, 2000);
    await part(d.id, 1000, 'failed');
    expect(await info(d.id)).toEqual({ status: 'pending', amountDueCents: 2500 });
  });

  it('excedente do balcão: a caução de balcão do aluguel não abate o saldo', async () => {
    const dep = await db.deposit.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, method: 'counter_pix', status: 'captured', amountCents: 5000, capturedCents: 1000, refundedCents: 0 } });
    const d = await counterDebt(4500, { depositId: dep.id });
    expect(await info(d.id, dep.id)).toMatchObject({ status: 'pending', amountDueCents: 4500 });
  });

  it('excedente do balcão quitado manualmente (debtSettledAt, ainda pending) → paid', async () => {
    const d = await counterDebt(4500, { debtSettledAt: new Date(), debtSettlement: 'manual' });
    expect(await info(d.id)).toEqual({ status: 'paid' });
  });

  it('pagamento pending do gateway (não balcão) continua processing', async () => {
    const p = await db.payment.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, kind: 'rental', method: 'card', status: 'pending', amountCents: 4500 } });
    expect(await info(p.id)).toEqual({ status: 'processing' });
  });

  it('dívida failed com quitação parcial no balcão → amountDueCents desconta as partes pagas', async () => {
    const p = await db.payment.create({ data: { customerId: CUSTOMER, rentalId: RENTAL, kind: 'rental', method: 'card', status: 'failed', amountCents: 7000, walletCents: 1000 } });
    await part(p.id, 2500);
    expect(await info(p.id)).toEqual({ status: 'pending', amountDueCents: 3500 });
  });
});
