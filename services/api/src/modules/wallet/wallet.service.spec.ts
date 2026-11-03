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
  const events = new EventEmitter2();
  const state = new PaymentStateService(db as any, events);
  const customers = new ProviderCustomersService(db as any, provider);
  await db.customer.create({ data: { id: CUSTOMER, cognitoSub: 'sub', email: 'c@example.com' } });
  if (card) await customers.addCard(CUSTOMER, 'tok_visa_4242', true);
  const pkg = await db.minutePackage.create({ data: { name: '60 minutos', minutes: 60, priceCents: 3990 } });
  const audit = { record: jest.fn() };
  const queue = { publish: jest.fn(), subscribe: jest.fn() };
  const svc = new WalletService(db as any, audit as any, provider, state, customers, queue as any, { pixExpirationMinutes: 15, fakePixAutoConfirmSeconds: 0 });
  return { db, provider, svc, pkg, audit, events };
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

  it('auditoria run-4: recarga no cartão grava a transição para paid e o crédito na mesma transação', async () => {
    const { db, svc } = await setup();
    const txCalls: string[][] = [];
    const realTx = db.$transaction;
    db.$transaction = async (fn: any) => {
      const calls: string[] = [];
      txCalls.push(calls);
      const tracked = new Proxy(db, {
        get: (target: any, model: string) => {
          const delegate = target[model];
          if (!delegate || typeof delegate !== 'object') return delegate;
          return new Proxy(delegate, { get: (d: any, op: string) => (typeof d[op] === 'function' ? (args: any) => (calls.push(`${model}.${op}:${JSON.stringify(args?.data?.status ?? '')}`), d[op](args)) : d[op]) });
        },
      });
      return realTx(() => fn(tracked));
    };
    const t = await svc.topUp(CUSTOMER, { amountCents: 2000, method: 'card' });
    expect(t.status).toBe('paid');
    const credit = txCalls.find((c) => c.some((x) => x.startsWith('walletEntry.create')));
    expect(credit).toEqual(expect.arrayContaining(['payment.updateMany:"paid"', 'topUp.updateMany:"paid"']));
    expect(await db.walletEntry.count()).toBe(1);
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

describe('Auditoria run-4: reconciliador de recargas', () => {
  it('recarga pending com Payment paid credita; com Payment failed vira failed; Payment pending e recente ficam', async () => {
    const { db, svc } = await setup(false);
    const old = new Date(Date.now() - 10 * 60_000);
    const mk = async (status: 'paid' | 'failed' | 'pending', amountCents: number, updatedAt = old) => {
      const p = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'top_up', method: 'pix', status, amountCents } });
      const t = await db.topUp.create({ data: { customerId: CUSTOMER, status: 'pending', method: 'pix', amountCents, paymentId: p.id } });
      db.topUp.rows.find((r: any) => r.id === t.id)!.updatedAt = updatedAt;
      return t;
    };
    const paid = await mk('paid', 2000);
    const failed = await mk('failed', 3000);
    const waiting = await mk('pending', 4000);
    const fresh = await mk('paid', 5000, new Date());
    await svc.reconcileTopUps();
    await svc.reconcileTopUps();
    expect((await db.topUp.findUnique({ where: { id: paid.id } })).status).toBe('paid');
    expect((await db.topUp.findUnique({ where: { id: failed.id } })).status).toBe('failed');
    expect((await db.topUp.findUnique({ where: { id: waiting.id } })).status).toBe('pending');
    expect((await db.topUp.findUnique({ where: { id: fresh.id } })).status).toBe('pending');
    expect((await svc.get(CUSTOMER)).balanceCents).toBe(2000);
    expect(await db.walletEntry.count()).toBe(1);
  });

  it('revisão: Pix abandonado (Payment pending) não ocupa o lote — o filtro do status do Payment está na consulta', async () => {
    const { db, svc } = await setup(false);
    const old = new Date(Date.now() - 10 * 60_000);
    const mk = async (status: 'paid' | 'pending', createdAt: Date) => {
      const p = await db.payment.create({ data: { customerId: CUSTOMER, kind: 'top_up', method: 'pix', status, amountCents: 100 } });
      const t = await db.topUp.create({ data: { customerId: CUSTOMER, status: 'pending', method: 'pix', amountCents: 100, paymentId: p.id, createdAt } });
      db.topUp.rows.find((r: any) => r.id === t.id)!.updatedAt = old;
      return t;
    };
    for (let i = 0; i < 510; i++) await mk('pending', new Date(Date.now() - 2 * 86_400_000 + i));
    const paid = await mk('paid', new Date(Date.now() - 86_400_000));
    const raw = jest.spyOn(db, '$queryRaw');
    expect(await svc.reconcileTopUps()).toBe(1);
    expect((await db.topUp.findUnique({ where: { id: paid.id } })).status).toBe('paid');
    expect((raw.mock.calls[0][0] as unknown as string[]).join('?')).toContain(`p."status" IN ('paid', 'failed')`);
  });
});

describe('Auditoria run-4 onda 2: estorno de recarga tira o crédito da carteira', () => {
  const refundTo = async (db: InMemoryPrisma, paymentId: string, refundedCents: number, total: number) =>
    db.payment.update({ where: { id: paymentId }, data: { status: refundedCents >= total ? 'refunded' : 'partially_refunded', refundedCents } });

  it('recarga de 2000 estornada (parcial e depois total) → débitos incrementais idempotentes; saldo 0', async () => {
    const { db, svc } = await setup();
    const t = await svc.topUp(CUSTOMER, { amountCents: 2000, method: 'card' });
    await svc.onTopUpPayment(await refundTo(db, t.paymentId!, 500, 2000));
    expect((await svc.get(CUSTOMER)).balanceCents).toBe(1500);
    await svc.onTopUpPayment(await db.payment.findUnique({ where: { id: t.paymentId } }));
    expect((await svc.get(CUSTOMER)).balanceCents).toBe(1500);
    await svc.onTopUpPayment(await refundTo(db, t.paymentId!, 2000, 2000));
    await svc.onTopUpPayment(await db.payment.findUnique({ where: { id: t.paymentId } }));
    expect((await svc.get(CUSTOMER)).balanceCents).toBe(0);
    const debits = await db.walletEntry.findMany({ where: { paymentId: t.paymentId, amountCents: { lt: 0 } } });
    expect(debits.map((d: any) => d.amountCents)).toEqual([-500, -1500]);
    expect(debits.every((d: any) => d.type === 'top_up')).toBe(true);
  });

  it('crédito já gasto → debita só o saldo e avisa o financeiro (payment.needs-review)', async () => {
    const { db, svc, events } = await setup();
    const review = jest.fn();
    events.on('payment.needs-review', review);
    const t = await svc.topUp(CUSTOMER, { amountCents: 2000, method: 'card' });
    await db.walletEntry.create({ data: { customerId: CUSTOMER, type: 'rental_charge', amountCents: -1500, balanceAfterCents: 500, description: 'x' } });
    await svc.onTopUpPayment(await refundTo(db, t.paymentId!, 2000, 2000));
    expect((await svc.get(CUSTOMER)).balanceCents).toBe(0);
    expect(review).toHaveBeenCalledWith(expect.objectContaining({ paymentId: t.paymentId, reason: 'top_up_refund_exceeds_balance' }));
    await svc.onTopUpPayment(await db.payment.findUnique({ where: { id: t.paymentId } }));
    expect(review).toHaveBeenCalledTimes(1);
  });

  it('pacote de 60 min: estorno de metade tira 30 min; estorno total zera os minutos do pacote', async () => {
    const { db, svc, pkg } = await setup();
    const t = await svc.topUp(CUSTOMER, { packageId: pkg.id, method: 'card' });
    await svc.onTopUpPayment(await refundTo(db, t.paymentId!, 1995, 3990));
    expect((await svc.get(CUSTOMER)).minutesBalance).toBe(30);
    await svc.onTopUpPayment(await refundTo(db, t.paymentId!, 3990, 3990));
    expect(await svc.get(CUSTOMER)).toMatchObject({ minutesBalance: 0, balanceCents: 0 });
  });
});

