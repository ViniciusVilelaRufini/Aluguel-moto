import { recordCounterClose } from './counter-close';
import { createInMemoryPrisma, type InMemoryPrisma } from './testing/in-memory-prisma';

const C = '11111111-1111-4111-8111-111111111111';
const R = '88888888-8888-4888-8888-888888888888';

async function seed(depositAmountCents: number) {
  const db: InMemoryPrisma = createInMemoryPrisma();
  const deposit = await db.deposit.create({ data: { customerId: C, method: 'cash', status: 'held', amountCents: depositAmountCents, refundedCents: 0 } });
  const prepaid = await db.payment.create({ data: { customerId: C, kind: 'rental', method: 'cash', status: 'paid', amountCents: 6000, rentalId: R, idempotencyKey: 'counter-checkout:h' } });
  await db.rental.create({ data: { id: R, customerId: C, vehicleId: 'v', planCode: 'day', coverage: 'basic', status: 'ended', depositId: deposit.id, paymentId: prepaid.id, priceSnapshot: {} } });
  return { db, deposit, prepaid };
}

describe('recordCounterClose', () => {
  it('resíduo > 0: débito pending de balcão (sem depositId) vira o pagamento do aluguel; repetir reaproveita pela chave', async () => {
    const { db, deposit, prepaid } = await seed(10000);
    const input = { rentalId: R, customerId: C, depositId: deposit.id, prepaidPaymentId: prepaid.id, residualCents: 6000, method: 'counter_pix' as const };
    const first = await recordCounterClose(db as any, input);
    const debt = await db.payment.findUnique({ where: { id: first.paymentId } });
    expect(debt).toMatchObject({ kind: 'rental', status: 'pending', method: 'counter_pix', amountCents: 6000, rentalId: R, customerId: C, idempotencyKey: `counter-excess:${R}`, depositId: null });
    expect((await db.rental.findUnique({ where: { id: R } })).paymentId).toBe(first.paymentId);
    const again = await recordCounterClose(db as any, input);
    expect(again.paymentId).toBe(first.paymentId);
    expect(await db.payment.count({ where: { idempotencyKey: `counter-excess:${R}` } })).toBe(1);
    // Caução com valor > 0 continua retida (acerto/devolução no galpão).
    expect((await db.deposit.findUnique({ where: { id: deposit.id } })).status).toBe('held');
  });

  it('resíduo 0: o pagamento do aluguel fica o pré-pago; caução de valor 0 vira released', async () => {
    const { db, deposit, prepaid } = await seed(0);
    const out = await recordCounterClose(db as any, { rentalId: R, customerId: C, depositId: deposit.id, prepaidPaymentId: prepaid.id, residualCents: 0, method: 'cash' });
    expect(out.paymentId).toBe(prepaid.id);
    expect((await db.rental.findUnique({ where: { id: R } })).paymentId).toBe(prepaid.id);
    expect(await db.payment.count({ where: { kind: 'rental' } })).toBe(1);
    expect((await db.deposit.findUnique({ where: { id: deposit.id } })).status).toBe('released');
  });

  it('recuo sem pré-pago (fix round 1): resíduo > 0 grava o débito; resíduo 0 não mexe no paymentId', async () => {
    const { db, deposit } = await seed(10000);
    await db.rental.update({ where: { id: R }, data: { paymentId: null } });
    const none = await recordCounterClose(db as any, { rentalId: R, customerId: C, depositId: deposit.id, prepaidPaymentId: null, residualCents: 0, method: 'cash' });
    expect(none.paymentId).toBeNull();
    expect((await db.rental.findUnique({ where: { id: R } })).paymentId).toBeNull();
    const out = await recordCounterClose(db as any, { rentalId: R, customerId: C, depositId: deposit.id, prepaidPaymentId: null, residualCents: 1500, method: 'cash' });
    expect(out.paymentId).toEqual(expect.any(String));
    expect((await db.rental.findUnique({ where: { id: R } })).paymentId).toBe(out.paymentId);
  });

  it('caução de cartão (não balcão) com valor 0 não é mexida', async () => {
    const { db, prepaid } = await seed(0);
    const card = await db.deposit.create({ data: { customerId: C, method: 'card', status: 'held', amountCents: 0, refundedCents: 0 } });
    await recordCounterClose(db as any, { rentalId: R, customerId: C, depositId: card.id, prepaidPaymentId: prepaid.id, residualCents: 0, method: 'cash' });
    expect((await db.deposit.findUnique({ where: { id: card.id } })).status).toBe('held');
  });
});

describe('recordCounterClose: inadimplência e repetição', () => {
  it('débito novo marca o cliente delinquent; resíduo 0 não marca', async () => {
    const { db, deposit, prepaid } = await seed(10000);
    await db.customer.create({ data: { id: C, cognitoSub: 'sub', email: 'c@example.com' } });
    await recordCounterClose(db as any, { rentalId: R, customerId: C, depositId: deposit.id, prepaidPaymentId: prepaid.id, residualCents: 0, method: 'cash' });
    expect((await db.customer.findUnique({ where: { id: C } })).delinquent).toBe(false);
    await recordCounterClose(db as any, { rentalId: R, customerId: C, depositId: deposit.id, prepaidPaymentId: prepaid.id, residualCents: 6000, method: 'cash' });
    expect((await db.customer.findUnique({ where: { id: C } })).delinquent).toBe(true);
  });

  it('repetir o fechamento não duplica débito, não religa a flag limpa e mantém o valor original', async () => {
    const { db, deposit, prepaid } = await seed(10000);
    await db.customer.create({ data: { id: C, cognitoSub: 'sub', email: 'c@example.com' } });
    const input = { rentalId: R, customerId: C, depositId: deposit.id, prepaidPaymentId: prepaid.id, residualCents: 6000, method: 'cash' as const };
    const first = await recordCounterClose(db as any, input);
    await db.customer.update({ where: { id: C }, data: { delinquent: false } });
    const again = await recordCounterClose(db as any, { ...input, residualCents: 9000, method: 'counter_pix' });
    expect(again.paymentId).toBe(first.paymentId);
    expect(await db.payment.count({ where: { kind: 'rental', status: 'pending' } })).toBe(1);
    expect(await db.payment.findUnique({ where: { id: first.paymentId } })).toMatchObject({ amountCents: 6000, method: 'cash' });
    expect((await db.customer.findUnique({ where: { id: C } })).delinquent).toBe(false);
    expect((await db.rental.findUnique({ where: { id: R } })).paymentId).toBe(first.paymentId);
  });
});
