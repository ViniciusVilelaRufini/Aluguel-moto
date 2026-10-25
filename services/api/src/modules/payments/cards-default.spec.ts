import { EventEmitter2 } from '@nestjs/event-emitter';
import { CUSTOMER_ID } from '../../../test/helpers/http-harness';
import { PaymentStateService } from './payment-state.service';
import { PaymentsService } from './payments.service';
import { FakePaymentProvider } from './provider/fake-payment-provider';
import { ProviderCustomersService } from './provider-customers.service';
import { createInMemoryPrisma } from './testing/in-memory-prisma';

/** Task 30 (varredura E2E, item 12): cartão padrão — definir, promover ao remover e usar quando não há `cardId`. */
describe('Cartão padrão (Task 30)', () => {
  async function setup() {
    const db = createInMemoryPrisma();
    const provider = new FakePaymentProvider('segredo');
    const customers = new ProviderCustomersService(db as any, provider);
    const state = new PaymentStateService(db as any, new EventEmitter2());
    const svc = new PaymentsService(db as any, { record: jest.fn() } as any, { publish: jest.fn() } as any, provider, customers, state, {} as any, {} as any);
    await db.customer.create({ data: { id: CUSTOMER_ID, cognitoSub: 's', email: 'c@example.com' } });
    return { db, customers, svc };
  }
  const tick = () => new Promise((r) => setTimeout(r, 5));

  it('o primeiro cartão vira padrão; o segundo não', async () => {
    const { svc } = await setup();
    const a = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_visa_4242' } as any);
    const b = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_mastercard_5555' } as any);
    expect(a.isDefault).toBe(true);
    expect(b.isDefault).toBe(false);
  });

  it('PUT default: troca o padrão (só um padrão) e é idempotente', async () => {
    const { svc } = await setup();
    const a = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_visa_4242' } as any);
    const b = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_mastercard_5555' } as any);
    const res = await svc.setDefaultCard(CUSTOMER_ID, b.id);
    expect(res).toMatchObject({ id: b.id, isDefault: true });
    await svc.setDefaultCard(CUSTOMER_ID, b.id);
    const { items } = await svc.listCards(CUSTOMER_ID);
    expect(items.filter((c) => c.isDefault).map((c) => c.id)).toEqual([b.id]);
    expect(items.find((c) => c.id === a.id)?.isDefault).toBe(false);
  });

  it('PUT default: cartão de outro cliente ou removido → 404', async () => {
    const { db, svc } = await setup();
    const a = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_visa_4242' } as any);
    await expect(svc.setDefaultCard('99999999-9999-4999-8999-999999999999', a.id)).rejects.toMatchObject({ status: 404 });
    await db.paymentCard.update({ where: { id: a.id }, data: { deletedAt: new Date() } });
    await expect(svc.setDefaultCard(CUSTOMER_ID, a.id)).rejects.toMatchObject({ status: 404 });
  });

  it('remover o padrão promove o cartão ativo mais recente', async () => {
    const { svc } = await setup();
    const a = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_visa_4242' } as any);
    await tick();
    const b = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_mastercard_5555' } as any);
    await tick();
    const c = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_visa_1111' } as any);
    await svc.deleteCard(CUSTOMER_ID, a.id);
    const { items } = await svc.listCards(CUSTOMER_ID);
    expect(items.filter((x) => x.isDefault).map((x) => x.id)).toEqual([c.id]);
    expect(items.map((x) => x.id)).toEqual([b.id, c.id]);
  });

  it('remover um cartão que não é o padrão mantém o padrão', async () => {
    const { svc } = await setup();
    const a = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_visa_4242' } as any);
    const b = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_mastercard_5555' } as any);
    await svc.deleteCard(CUSTOMER_ID, b.id);
    const { items } = await svc.listCards(CUSTOMER_ID);
    expect(items).toEqual([expect.objectContaining({ id: a.id, isDefault: true })]);
  });

  it('sem cardId: usa o padrão; sem padrão marcado (dado antigo), o ativo mais recente; sem cartão, null', async () => {
    const { db, customers, svc } = await setup();
    expect(await customers.card(CUSTOMER_ID)).toBeNull();
    const a = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_visa_4242' } as any);
    await tick();
    const b = await svc.addCard(CUSTOMER_ID, { cardToken: 'tok_mastercard_5555' } as any);
    expect((await customers.card(CUSTOMER_ID))?.id).toBe(a.id);
    await db.paymentCard.updateMany({ where: { customerId: CUSTOMER_ID }, data: { isDefault: false } });
    expect((await customers.card(CUSTOMER_ID))?.id).toBe(b.id);
    expect((await customers.card(CUSTOMER_ID, a.id))?.id).toBe(a.id);
    expect(await customers.card(CUSTOMER_ID, '99999999-9999-4999-8999-999999999999')).toBeNull();
  });
});
