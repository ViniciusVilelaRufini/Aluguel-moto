import { blocksAccountDeletion, counterDebtWhere, hasCounterDebt, hasOpenDebt, isOpenDebt, openDebtWhere } from './open-debt';
import { createInMemoryPrisma } from './testing/in-memory-prisma';

const C = '11111111-1111-4111-8111-111111111111';

describe('open-debt — débito do balcão', () => {
  it('pending de balcão é dívida; pending de cartão não', () => {
    expect(isOpenDebt({ kind: 'rental', status: 'pending', method: 'cash', debtSettledAt: null, failureReason: null } as any)).toBe(true);
    expect(isOpenDebt({ kind: 'rental', status: 'pending', method: 'counter_pix', debtSettledAt: null, failureReason: null } as any)).toBe(true);
    expect(isOpenDebt({ kind: 'rental', status: 'pending', method: 'card', debtSettledAt: null, failureReason: null } as any)).toBe(false);
    // Quitado, pago ou de outro tipo: não é dívida.
    expect(isOpenDebt({ kind: 'rental', status: 'pending', method: 'cash', debtSettledAt: new Date(), failureReason: null } as any)).toBe(false);
    expect(isOpenDebt({ kind: 'rental', status: 'paid', method: 'cash', debtSettledAt: null, failureReason: null } as any)).toBe(false);
    expect(isOpenDebt({ kind: 'deposit', status: 'pending', method: 'cash', debtSettledAt: null, failureReason: null } as any)).toBe(false);
    // A regra `failed` continua.
    expect(isOpenDebt({ kind: 'rental', status: 'failed', method: 'card', debtSettledAt: null, failureReason: 'cc_rejected' } as any)).toBe(true);
  });

  it('counterDebtWhere e openDebtWhere (consulta) batem com isOpenDebt', async () => {
    expect(counterDebtWhere(C)).toEqual({ customerId: C, kind: 'rental', status: 'pending', method: { in: ['counter_card', 'counter_pix', 'cash'] }, debtSettledAt: null });
    const db = createInMemoryPrisma();
    const rows = [
      { kind: 'rental', status: 'pending', method: 'cash' }, // dívida (balcão)
      { kind: 'rental', status: 'pending', method: 'card' }, // liquidação em curso no gateway
      { kind: 'rental', status: 'paid', method: 'counter_pix' }, // pré-pago
      { kind: 'rental', status: 'failed', method: 'card', failureReason: 'cc_rejected' }, // dívida (gateway)
      { kind: 'rental', status: 'pending', method: 'counter_card', debtSettledAt: new Date() }, // quitada
    ];
    const created = [];
    for (const r of rows) created.push(await db.payment.create({ data: { customerId: C, amountCents: 100, ...r } }));
    const found = await db.payment.findMany({ where: openDebtWhere(C) });
    expect(found.map((p: any) => p.id).sort()).toEqual([created[0].id, created[3].id].sort());
    expect(created.filter((p: any) => isOpenDebt(p)).map((p: any) => p.id).sort()).toEqual([created[0].id, created[3].id].sort());
    expect(await hasOpenDebt(db as any, C)).toBe(true);
    expect(await hasCounterDebt(db as any, C)).toBe(true);
    expect(await hasCounterDebt(db as any, 'outro')).toBe(false);
  });

  it('exclusão de conta: débito de balcão bloqueia (por hasOpenDebt); pending de cartão continua bloqueando', async () => {
    const db = createInMemoryPrisma();
    const counter = await db.payment.create({ data: { customerId: C, kind: 'rental', status: 'pending', method: 'cash', amountCents: 6000 } });
    expect(await blocksAccountDeletion(db as any, C)).toBe(true);
    await db.payment.update({ where: { id: counter.id }, data: { debtSettledAt: new Date(), debtSettlement: 'manual' } });
    // Quitado: o pending de balcão não bloqueia mais (não é liquidação no gateway).
    expect(await blocksAccountDeletion(db as any, C)).toBe(false);
    await db.payment.create({ data: { customerId: C, kind: 'rental', status: 'pending', method: 'card', amountCents: 6000 } });
    expect(await blocksAccountDeletion(db as any, C)).toBe(true);
  });
});
