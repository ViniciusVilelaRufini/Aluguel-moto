import { EventEmitter2 } from '@nestjs/event-emitter';
import { CUSTOMER_ID } from '../../../test/helpers/http-harness';
import type { Principal } from '../auth/principal';
import { PaymentStateService } from './payment-state.service';
import { PaymentsService } from './payments.service';
import { FakePaymentProvider } from './provider/fake-payment-provider';
import { ProviderCustomersService } from './provider-customers.service';
import { createInMemoryPrisma } from './testing/in-memory-prisma';

/**
 * Auditoria run-4 (dispute-refund-partial-wallet-marked-full): a repetição de um estorno misto (cartão + carteira) que
 * caiu depois do pedido do gateway e antes da parte da carteira completa a carteira — sem passar do teto.
 */
describe('PaymentsService.refund — repetição completa a parte da carteira', () => {
  const admin: Principal = { pool: 'staff', sub: 'a', email: 'a@volti.com.br', groups: ['admin'], userId: '22222222-2222-4222-8222-222222222222', staffId: '22222222-2222-4222-8222-222222222222' };

  /** Bruto 6500: 5000 no cartão + 1500 da carteira; a queda deixou só o pedido do gateway (5000) registrado. */
  async function crashedAfterGateway(status: 'succeeded' | 'pending' = 'succeeded') {
    const db = createInMemoryPrisma();
    const provider = new FakePaymentProvider('segredo');
    const state = new PaymentStateService(db as any, new EventEmitter2());
    const customers = new ProviderCustomersService(db as any, provider);
    await db.customer.create({ data: { id: CUSTOMER_ID, cognitoSub: 's', email: 'c@example.com' } });
    const card = await customers.addCard(CUSTOMER_ID, 'tok_visa_4242', true);
    const charged = await provider.charge({ providerCustomerId: 'x', providerCardId: card.providerCardId, amountCents: 5000, description: 'x', idempotencyKey: 'c', externalReference: 'r' });
    const p = await db.payment.create({
      data: { customerId: CUSTOMER_ID, kind: 'rental', method: 'card', status: 'partially_refunded', amountCents: 6500, walletCents: 1500, refundedCents: 5000, providerPaymentId: charged.providerPaymentId },
    });
    await provider.refund({ providerPaymentId: charged.providerPaymentId, amountCents: 5000, idempotencyKey: `refund:${p.id}:dispute:d1` });
    await db.paymentRefund.create({
      data: {
        paymentId: p.id, idempotencyKey: `refund:${p.id}:dispute:d1`, amountCents: 5000, prevStatus: 'paid', prevRefundedCents: 0,
        newStatus: 'partially_refunded', newRefundedCents: 5000, status,
      },
    });
    const svc = new PaymentsService(db as any, { record: jest.fn() } as any, { publish: jest.fn() } as any, provider, customers, state, {} as any, {} as any);
    return { db, svc, p, provider };
  }

  it('mesma chave com valor explícito → credita os 1500 da carteira (chave :wallet) e fecha refunded/6500; repetir de novo não credita outra vez', async () => {
    const { db, svc, p, provider } = await crashedAfterGateway();
    expect(await svc.refund(admin, p.id, { amountCents: 6500, reason: 'Contestação' }, 'dispute:d1')).toMatchObject({ status: 'refunded', refundedCents: 6500 });
    expect(await db.walletEntry.findMany({ where: { paymentId: p.id } })).toEqual([expect.objectContaining({ type: 'refund', amountCents: 1500 })]);
    expect(await db.paymentRefund.findUnique({ where: { idempotencyKey: `refund:${p.id}:dispute:d1:wallet` } })).toMatchObject({ status: 'succeeded', amountCents: 1500 });
    await svc.refund(admin, p.id, { amountCents: 6500, reason: 'Contestação' }, 'dispute:d1');
    expect(await db.walletEntry.count({ where: { paymentId: p.id } })).toBe(1);
    expect(provider.operations('refund')).toBe(1);
  });

  it('mesma chave sem valor (estorno do restante) → o restante original vem do pedido gravado (6500 − 0)', async () => {
    const { db, svc, p } = await crashedAfterGateway();
    expect(await svc.refund(admin, p.id, { reason: 'Contestação' }, 'dispute:d1')).toMatchObject({ status: 'refunded', refundedCents: 6500 });
    expect(await db.walletEntry.count({ where: { paymentId: p.id } })).toBe(1);
  });

  it('gateway ainda pendente: completa a carteira como o fluxo original (a reconciliação cuida do gateway)', async () => {
    const { db, svc, p } = await crashedAfterGateway('pending');
    await svc.refund(admin, p.id, { amountCents: 6500, reason: 'Contestação' }, 'dispute:d1');
    expect(await db.walletEntry.count({ where: { paymentId: p.id } })).toBe(1);
  });

  it('teto revalidado com o pagamento atual: se a carteira já não cabe (estornado por outro caminho) → 409 e nenhum crédito', async () => {
    const { db, svc, p } = await crashedAfterGateway();
    await db.payment.update({ where: { id: p.id }, data: { refundedCents: 6000 } });
    await expect(svc.refund(admin, p.id, { amountCents: 6500, reason: 'Contestação' }, 'dispute:d1')).rejects.toMatchObject({ status: 409 });
    expect(await db.walletEntry.count({ where: { paymentId: p.id } })).toBe(0);
  });

  it('pedido só do gateway (sem parte da carteira) repete sem crédito', async () => {
    const { db, svc, p } = await crashedAfterGateway();
    await svc.refund(admin, p.id, { amountCents: 5000, reason: 'Contestação' }, 'dispute:d1');
    expect(await db.walletEntry.count({ where: { paymentId: p.id } })).toBe(0);
  });
});
