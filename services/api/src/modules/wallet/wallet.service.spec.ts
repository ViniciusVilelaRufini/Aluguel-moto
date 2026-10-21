import { EventEmitter2 } from '@nestjs/event-emitter';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProblemException } from '../../common/problem';
import type { Principal } from '../auth/principal';
import { PaymentStateService } from '../payments/payment-state.service';
import { FakePaymentProvider } from '../payments/provider/fake-payment-provider';
import { ProviderCustomersService } from '../payments/provider-customers.service';
import { createInMemoryPrisma, type InMemoryPrisma } from '../payments/testing/in-memory-prisma';
import { WalletService } from './wallet.service';

const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const admin: Principal = { pool: 'staff', sub: 'a', email: 'a@volti.com.br', groups: ['financeiro'], userId: '22222222-2222-4222-8222-222222222222', staffId: '22222222-2222-4222-8222-222222222222' };

async function setup(card = true) {
  const db: InMemoryPrisma = createInMemoryPrisma();
  const provider = new FakePaymentProvider('s');
  const state = new PaymentStateService(db as any, new EventEmitter2());
  const customers = new ProviderCustomersService(db as any, provider);
  await db.customer.create({ data: { id: CUSTOMER, cognitoSub: 'sub', email: 'c@example.com' } });
  if (card) await customers.addCard(CUSTOMER, 'tok_visa_4242', true);
  const pkg = await db.minutePackage.create({ data: { name: '60 minutos', minutes: 60, priceCents: 3990 } });
  const audit = { record: jest.fn() };
  const queue = { publish: jest.fn(), subscribe: jest.fn() };
  const svc = new WalletService(db as any, audit as any, provider, state, customers, queue as any, { pixExpirationMinutes: 15, fakePixAutoConfirmSeconds: 0 });
  return { db, provider, svc, pkg, audit };
}

describe('WalletService (ledger somente inserção)', () => {
  it('saldo = soma do ledger (créditos e minutos)', async () => {
    const { db, svc } = await setup(false);
    await db.walletEntry.create({ data: { customerId: CUSTOMER, type: 'top_up', amountCents: 5000, balanceAfterCents: 5000, description: 'x' } });
    await db.walletEntry.create({ data: { customerId: CUSTOMER, type: 'rental_charge', amountCents: -1290, balanceAfterCents: 3710, description: 'x' } });
    await db.walletEntry.create({ data: { customerId: CUSTOMER, type: 'minute_package', amountCents: 0, minutes: 60, balanceAfterCents: 3710, description: 'x' } });
    expect(await svc.get(CUSTOMER)).toMatchObject({ balanceCents: 3710, minutesBalance: 60 });
  });

  it('recarga no cartão: cobra no gateway, Payment paid e um lançamento top_up', async () => {
    const { db, svc, provider } = await setup();
    const t = await svc.topUp(CUSTOMER, { amountCents: 2000, method: 'card' });
    expect(t).toMatchObject({ status: 'paid', amountCents: 2000 });
    expect(provider.operations('charge')).toBe(1);
    expect(await db.payment.findUnique({ where: { id: t.paymentId } })).toMatchObject({ kind: 'top_up', status: 'paid', providerPaymentId: expect.stringMatching(/^fake-pay-/) });
    const entries = await db.walletEntry.findMany({ where: { customerId: CUSTOMER } });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ type: 'top_up', amountCents: 2000, balanceAfterCents: 2000, paymentId: t.paymentId });
    expect((await svc.get(CUSTOMER)).balanceCents).toBe(2000);
  });

  it('pacote de minutos: lançamento minute_package com os minutos (sem crédito em reais)', async () => {
    const { svc, pkg } = await setup();
    await svc.topUp(CUSTOMER, { packageId: pkg.id, method: 'card' });
    expect(await svc.get(CUSTOMER)).toMatchObject({ balanceCents: 0, minutesBalance: 60 });
  });

  it('cobrança recusada → 402 payment-failed, sem lançamento, recarga failed', async () => {
    const { db, svc, provider } = await setup();
    provider.failNext('charge');
    const err = await svc.topUp(CUSTOMER, { amountCents: 2000, method: 'card' }).catch((e) => e);
    expect(err).toBeInstanceOf(ProblemException);
    expect(err.getStatus()).toBe(402);
    expect(err.slug).toBe('payment-failed');
    expect(await db.walletEntry.count()).toBe(0);
    expect((await db.topUp.findFirst({ where: { customerId: CUSTOMER } })).status).toBe('failed');
  });

  it('sem cartão → 402 card-not-found', async () => {
    const { svc } = await setup(false);
    await expect(svc.topUp(CUSTOMER, { amountCents: 2000, method: 'card' })).rejects.toMatchObject({ slug: 'card-not-found' });
  });

  it('recarga Pix: pendente com QR; saldo só muda quando o pagamento é confirmado (uma vez)', async () => {
    const { db, svc, provider } = await setup(false);
    const t = await svc.topUp(CUSTOMER, { amountCents: 2000, method: 'pix' });
    expect(t.status).toBe('pending');
    expect(t.pix?.copyPaste).toContain('br.gov.bcb.pix');
    expect((await svc.get(CUSTOMER)).balanceCents).toBe(0);
    const pay = await db.payment.findUnique({ where: { id: t.paymentId } });
    provider.simulatePixPaid(pay.providerPaymentId);
    const paid = await new PaymentStateService(db as any, new EventEmitter2()).transition(pay.id, 'paid');
    await svc.onTopUpPayment(paid);
    await svc.onTopUpPayment(paid);
    expect((await db.topUp.findUnique({ where: { id: t.id } })).status).toBe('paid');
    expect(await db.walletEntry.count()).toBe(1);
    expect((await svc.get(CUSTOMER)).balanceCents).toBe(2000);
  });

  it('ajuste do financeiro: lançamento adjustment + auditoria; zero → 422', async () => {
    const { db, svc, audit } = await setup(false);
    const e = await svc.adjust(admin, CUSTOMER, { amountCents: -500, reason: 'Correção' });
    expect(e).toMatchObject({ type: 'adjustment', amountCents: -500, balanceAfterCents: -500 });
    expect(audit.record).toHaveBeenCalled();
    expect(await db.walletEntry.count()).toBe(1);
    await expect(svc.adjust(admin, CUSTOMER, { amountCents: 0, reason: 'Nada' })).rejects.toMatchObject({ slug: 'validation-error' });
  });

  it('nenhum código da carteira/pagamentos edita ou apaga lançamento (ledger só inserção)', () => {
    const roots = [join(__dirname), join(__dirname, '..', 'payments')];
    const files = roots.flatMap((dir) => walk(dir)).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.includes('testing'));
    const offenders = files.filter((f) => /walletEntry\.(update|updateMany|upsert|delete|deleteMany)\b/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
}
