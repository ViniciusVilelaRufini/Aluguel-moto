import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PAYMENT_NEEDS_REVIEW } from '../src/modules/payments/payment-review';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { approvedCustomer, bootE2eApp, devToken } from './helpers/e2e-app';

/**
 * Task 14 das lacunas contra Postgres real: quitação da inadimplência (cliente e financeiro), saldo da carteira no
 * detalhe do cliente para quem ajusta, alerta `payment_needs_review` com escopo por perfil e exportação LGPD com o chat.
 */
describe('Lacunas T14 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: string;
  let financeiro: string;
  let operacao: string;
  let suporte: string;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    ({ app, prisma } = await bootE2eApp());
    admin = await devToken(app, { sub: 'dev-admin', email: 'admin@volti.dev', groups: ['admin'], pool: 'staff' });
    financeiro = await devToken(app, { sub: 'dev-fin-t14', email: 'fin-t14@volti.dev', groups: ['financeiro'], pool: 'staff' });
    operacao = await devToken(app, { sub: 'dev-ops-t14', email: 'ops-t14@volti.dev', groups: ['operacao'], pool: 'staff' });
    suporte = await devToken(app, { sub: 'dev-sup-t14', email: 'sup-t14@volti.dev', groups: ['suporte'], pool: 'staff' });
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  async function delinquentCustomer(tag: string, amountCents = 12000, captured?: number) {
    const c = await approvedCustomer(app, prisma, tag);
    await prisma.customer.update({ where: { id: c.customerId }, data: { delinquent: true } });
    const deposit = captured !== undefined ? await prisma.deposit.create({ data: { customerId: c.customerId, method: 'card', status: 'captured', amountCents: 5000, capturedCents: captured } }) : null;
    const debt = await prisma.payment.create({ data: { customerId: c.customerId, kind: 'rental', method: 'card', status: 'failed', amountCents, depositId: deposit?.id, failureReason: 'cc_rejected' } });
    return { ...c, debt };
  }

  it('cliente quita a dívida no cartão: saldo devedor (valor − garantia), flag limpa e aluguel liberado', async () => {
    const { token, customerId, debt } = await delinquentCustomer('t14-card', 12000, 5000);
    await http().post('/payments/cards').set(bearer(token)).set('Idempotency-Key', randomUUID()).send({ cardToken: 'tok_visa_4242', setDefault: true }).expect(201);

    const list = await http().get('/payments?status=failed').set(bearer(token)).expect(200);
    expect(list.body.items.find((p: any) => p.id === debt.id)).toMatchObject({ outstandingCents: 7000 });

    await http().post(`/payments/${debt.id}/retry`).set(bearer(token)).send({ method: 'card' }).expect(400); // Idempotency-Key obrigatória
    const res = await http().post(`/payments/${debt.id}/retry`).set(bearer(token)).set('Idempotency-Key', randomUUID()).send({ method: 'card' }).expect(201);
    expect(res.body).toMatchObject({ kind: 'debt_settlement', status: 'paid', amountCents: 7000, settlesPaymentId: debt.id });

    const after = await http().get(`/payments/${debt.id}`).set(bearer(token)).expect(200);
    expect(after.body).toMatchObject({ debtSettlement: 'payment', debtSettledAt: expect.any(String) });
    expect(after.body).not.toHaveProperty('outstandingCents');
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).delinquent).toBe(false);
    // Quitada: repetir → 409 debt-not-payable.
    const again = await http().post(`/payments/${debt.id}/retry`).set(bearer(token)).set('Idempotency-Key', randomUUID()).send({ method: 'card' }).expect(409);
    expect(again.body.type).toMatch(/debt-not-payable$/);
  });

  it('cliente quita por Pix: 201 pending com QR; outro cliente não acessa (404); staff não chama a rota (403)', async () => {
    const { token, debt } = await delinquentCustomer('t14-pix', 3000);
    const res = await http().post(`/payments/${debt.id}/retry`).set(bearer(token)).set('Idempotency-Key', randomUUID()).send({ method: 'pix' }).expect(201);
    expect(res.body).toMatchObject({ kind: 'debt_settlement', method: 'pix', status: 'pending', amountCents: 3000 });
    expect(res.body.pix.copyPaste).toBeTruthy();
    const other = await approvedCustomer(app, prisma, 't14-other');
    await http().post(`/payments/${debt.id}/retry`).set(bearer(other.token)).set('Idempotency-Key', randomUUID()).send({ method: 'pix' }).expect(404);
    await http().post(`/payments/${debt.id}/retry`).set(bearer(admin)).set('Idempotency-Key', randomUUID()).send({ method: 'pix' }).expect(403);
  });

  it('financeiro registra a quitação manual com motivo: flag limpa, AuditLog; suporte não pode', async () => {
    const { customerId, debt } = await delinquentCustomer('t14-manual', 3000);
    await http().post(`/customers/${customerId}/delinquency/clear`).set(bearer(suporte)).send({ reason: 'Pago' }).expect(403);
    await http().post(`/customers/${customerId}/delinquency/clear`).set(bearer(financeiro)).send({ reason: 'x' }).expect(400);

    const before = await http().get(`/customers/${customerId}`).set(bearer(financeiro)).expect(200);
    expect(before.body).toMatchObject({ delinquent: true, debtCents: 3000, walletBalanceCents: 0 });

    const res = await http().post(`/customers/${customerId}/delinquency/clear`).set(bearer(financeiro)).send({ reason: 'Transferência recebida em 20/10' }).expect(200);
    expect(res.body).toMatchObject({ id: customerId, delinquent: false, debtCents: 0 });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: debt.id } })).toMatchObject({ debtSettlement: 'manual' });
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: 'customer.delinquency_clear', entityId: customerId } });
    expect(log.reason).toBe('Transferência recebida em 20/10');
    expect(log.metadata).toMatchObject({ amountCents: 3000, paymentIds: [debt.id] });

    const twice = await http().post(`/customers/${customerId}/delinquency/clear`).set(bearer(financeiro)).send({ reason: 'De novo' }).expect(409);
    expect(twice.body.type).toMatch(/debt-not-payable$/);
  });

  it('QA-04: saldo da carteira no detalhe do cliente só para admin/financeiro (suporte não vê)', async () => {
    const { customerId } = await approvedCustomer(app, prisma, 't14-wallet');
    await http().post(`/customers/${customerId}/wallet/adjustments`).set(bearer(admin)).set('Idempotency-Key', randomUUID()).send({ amountCents: 2550, reason: 'Crédito QA' }).expect(201);
    const adm = await http().get(`/customers/${customerId}`).set(bearer(admin)).expect(200);
    expect(adm.body.walletBalanceCents).toBe(2550);
    const sup = await http().get(`/customers/${customerId}`).set(bearer(suporte)).expect(200);
    expect(sup.body).not.toHaveProperty('walletBalanceCents');
    expect(sup.body).not.toHaveProperty('debtCents');
  });

  it('payment.needs-review vira alerta payment_needs_review: financeiro vê e resolve; operação não vê', async () => {
    const { customerId } = await approvedCustomer(app, prisma, 't14-alert');
    const pay = await prisma.payment.create({ data: { customerId, kind: 'rental', method: 'card', status: 'pending', amountCents: 900 } });
    await app.get(EventEmitter2).emitAsync(PAYMENT_NEEDS_REVIEW, { paymentId: pay.id, reason: 'review_timeout' });
    await app.get(EventEmitter2).emitAsync(PAYMENT_NEEDS_REVIEW, { paymentId: pay.id, reason: 'review_timeout' });
    const rows = await prisma.alert.findMany({ where: { paymentId: pay.id } });
    expect(rows).toHaveLength(1);
    const alertId = rows[0].id;

    const fin = await http().get('/alerts?type=payment_needs_review&limit=100').set(bearer(financeiro)).expect(200);
    expect(fin.body.items.find((a: any) => a.id === alertId)).toMatchObject({ type: 'payment_needs_review', paymentId: pay.id, priority: 'high' });
    const finAll = await http().get('/alerts?limit=100').set(bearer(financeiro)).expect(200);
    expect(finAll.body.items.every((a: any) => a.type === 'payment_needs_review')).toBe(true);

    await http().get(`/alerts/${alertId}`).set(bearer(operacao)).expect(404);
    const ops = await http().get('/alerts?type=payment_needs_review&limit=100').set(bearer(operacao)).expect(200);
    expect(ops.body.items).toEqual([]);

    const resolved = await http().post(`/alerts/${alertId}/resolve`).set(bearer(financeiro)).send({ resolution: 'Estorno feito no painel do gateway' }).expect(200);
    expect(resolved.body.status).toBe('resolved');
  });

  it('LGPD: exportação inclui o chat; exclusão anonimiza mensagens e tira os anexos', async () => {
    const { token, customerId } = await approvedCustomer(app, prisma, 't14-lgpd');
    const conv = await prisma.supportConversation.create({ data: { customerId, subject: 'Cobrança errada' } });
    await prisma.supportMessage.create({ data: { conversationId: conv.id, authorType: 'customer', authorId: customerId, body: 'Moro na Rua X, 10', attachmentObjectKeys: [`support/${customerId}/a.jpg`] } });
    await prisma.supportMessage.create({ data: { conversationId: conv.id, authorType: 'staff', authorName: 'Ana Paula Lima', body: 'Vamos ver', attachmentObjectKeys: [] } });

    const exp = await http().get('/lgpd/export').set(bearer(token)).expect(200);
    const exported = exp.body.supportConversations.find((c: any) => c.id === conv.id);
    expect(exported.messages.map((m: any) => m.body)).toEqual(['Moro na Rua X, 10', 'Vamos ver']);
    expect(exported.messages[1].authorName).toBe('Ana');

    await http().delete('/lgpd/account').set(bearer(token)).expect(202);
    const msgs = await prisma.supportMessage.findMany({ where: { conversationId: conv.id } });
    expect(msgs.every((m) => !m.body.includes('Rua X') && m.attachmentObjectKeys.length === 0)).toBe(true);
    expect((await prisma.supportConversation.findUniqueOrThrow({ where: { id: conv.id } })).subject).toBe('Conversa removida');
  });

  it('QA-17: pagamento no painel traz o nome do cliente (só staff)', async () => {
    const { token, customerId } = await approvedCustomer(app, prisma, 't14-name');
    const p = await prisma.payment.create({ data: { customerId, kind: 'fee', method: 'card', status: 'paid', amountCents: 100 } });
    const staffView = await http().get(`/payments/${p.id}`).set(bearer(financeiro)).expect(200);
    expect(staffView.body.customerName).toBe('Cliente E2E');
    const own = await http().get(`/payments/${p.id}`).set(bearer(token)).expect(200);
    expect(own.body).not.toHaveProperty('customerName');
  });
});
