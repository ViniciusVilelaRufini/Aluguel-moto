import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type { Payment, PaymentRefund, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { pageArgs, toPage } from '../../common/pagination';
import { conflict, notFound, ProblemException, unprocessable } from '../../common/problem';
import { OBJECT_STORAGE, type ObjectStorage } from '../../ports/object-storage.port';
import { QUEUE_BUS, type QueueBus } from '../../ports/queue-bus.port';
import { receiptLinks } from './receipts/receipt-links';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isStaff, type Principal } from '../auth/principal';
import { toDeposit } from '../rentals/rentals.mapper';
import { appendWalletEntry } from '../wallet/wallet-ledger';
import { canTransition } from './payment-state';
import { PaymentStateService } from './payment-state.service';
import type { DebtPaymentDto, ListDepositsQuery, ListPaymentsQuery, MercadoPagoWebhookDto, PaymentCardCreateDto, RefundDto, SubscriptionCreateDto } from './payments.dto';
import { type PaymentExtras, toPayment, toPaymentCard } from './payments.mapper';
import { ProviderCustomersService } from './provider-customers.service';
import type { WebhookQueueMessage } from './provider/fake-pix-autoconfirm';
import { CardDeclinedError, PAYMENT_PROVIDER, type PaymentProvider, RefundRejectedError } from './provider/payment-provider';
import { SubscriptionsService } from './subscriptions.service';
import { DelinquencyService } from './delinquency.service';
import { ExclusiveJob, jobLockTtl } from '../../common/job-lock';

/** Repetições de um estorno sem resultado antes de pedir revisão manual. */
export const MAX_REFUND_ATTEMPTS = 10;

const range = (from?: string, to?: string) =>
  from || to ? { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } : undefined;

/** Endpoints de pagamento do contrato sobre o `PaymentProvider` (Task 5). */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(QUEUE_BUS) private readonly queue: QueueBus,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly customers: ProviderCustomersService,
    private readonly state: PaymentStateService,
    private readonly subscriptions: SubscriptionsService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Optional() private readonly delinquency?: DelinquencyService,
  ) {}

  /** Task 14: nome do cliente (só staff, QA-17) e saldo devedor das dívidas em aberto. */
  private async extras(user: Principal, rows: Payment[]): Promise<Map<string, PaymentExtras>> {
    const outstanding = (await this.delinquency?.outstandingMap(rows)) ?? new Map<string, number>();
    const names = new Map<string, string>();
    if (isStaff(user) && rows.length) {
      const customers = await this.prisma.customer.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.customerId))] } }, select: { id: true, name: true } });
      for (const c of customers) if (c.name) names.set(c.id, c.name);
    }
    return new Map(rows.map((r) => [r.id, { customerName: names.get(r.customerId), outstandingCents: outstanding.get(r.id) }]));
  }

  // ── cartões (só token do gateway) ──
  async listCards(customerId: string) {
    const cards = await this.prisma.paymentCard.findMany({ where: { customerId, deletedAt: null }, orderBy: { createdAt: 'asc' } });
    return { items: cards.map(toPaymentCard) };
  }

  async addCard(customerId: string, dto: PaymentCardCreateDto) {
    try {
      return toPaymentCard(await this.customers.addCard(customerId, dto.cardToken, dto.setDefault));
    } catch (err) {
      if (err instanceof CardDeclinedError) throw new ProblemException(402, 'payment-failed', 'Cartão recusado pelo emissor.');
      throw err;
    }
  }

  async deleteCard(customerId: string, id: string): Promise<void> {
    const card = await this.prisma.paymentCard.findUnique({ where: { id } });
    if (!card || card.customerId !== customerId || card.deletedAt) throw notFound('Cartão não encontrado.');
    const [held, sub] = await Promise.all([
      this.prisma.deposit.count({ where: { cardId: id, status: 'held' } }),
      this.prisma.subscription.count({ where: { cardId: id, status: 'active' } }),
    ]);
    if (held || sub) throw conflict('conflict', 'Este cartão tem caução retida ou assinatura ativa.');
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentCard.update({ where: { id }, data: { deletedAt: new Date(), isDefault: false } });
      // Task 30 (item 12): removido o padrão, o cartão ativo mais recente vira o padrão (nunca cartões sem padrão).
      if (!card.isDefault) return;
      const next = await tx.paymentCard.findFirst({ where: { customerId, deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      if (next) await tx.paymentCard.update({ where: { id: next.id }, data: { isDefault: true } });
    });
  }

  /** Task 30 (item 12): `PUT /payments/cards/{id}/default` — um padrão por cliente; repetir não muda nada. */
  async setDefaultCard(customerId: string, id: string) {
    const card = await this.prisma.paymentCard.findFirst({ where: { id, customerId, deletedAt: null } });
    if (!card) throw notFound('Cartão não encontrado.');
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.paymentCard.updateMany({ where: { customerId, isDefault: true, id: { not: id } }, data: { isDefault: false } });
      return tx.paymentCard.update({ where: { id }, data: { isDefault: true } });
    });
    return toPaymentCard(updated);
  }

  // ── cauções ──
  async listDeposits(q: ListDepositsQuery) {
    const where: Prisma.DepositWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.customerId) where.customerId = q.customerId;
    const rows = await this.prisma.deposit.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    return toPage(rows, q, toDeposit);
  }

  async getDeposit(user: Principal, id: string) {
    const d = await this.prisma.deposit.findUnique({ where: { id } });
    if (!d || (!isStaff(user) && d.customerId !== user.customerId)) throw notFound('Caução não encontrada.');
    return toDeposit(d);
  }

  // ── assinaturas ──
  listSubscriptions(customerId: string) {
    return this.subscriptions.list(customerId);
  }

  createSubscription(customerId: string, dto: SubscriptionCreateDto) {
    return this.subscriptions.create(customerId, dto);
  }

  cancelSubscription(customerId: string, id: string) {
    return this.subscriptions.cancel(customerId, id);
  }

  // ── pagamentos ──
  async listPayments(user: Principal, q: ListPaymentsQuery) {
    const where: Prisma.PaymentWhereInput = {};
    if (isStaff(user)) {
      if (q.customerId) where.customerId = q.customerId;
      if (q.rentalId) where.rentalId = q.rentalId;
    } else {
      where.customerId = user.customerId;
    }
    if (q.status) where.status = q.status as Prisma.PaymentWhereInput['status'];
    if (q.kind) where.kind = q.kind as Prisma.PaymentWhereInput['kind'];
    const createdAt = range(q.from, q.to);
    if (createdAt) where.createdAt = createdAt;
    const rows = await this.prisma.payment.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...pageArgs(q) });
    const links = await receiptLinks(this.prisma, this.storage, rows.map((r) => r.id));
    const extras = await this.extras(user, rows);
    return toPage(rows, q, (p: Payment) => toPayment(p, links.get(p.id), extras.get(p.id)));
  }

  async getPayment(user: Principal, id: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p || (!isStaff(user) && p.customerId !== user.customerId)) throw notFound('Pagamento não encontrado.');
    const links = await receiptLinks(this.prisma, this.storage, [p.id]);
    return toPayment(p, links.get(p.id), (await this.extras(user, [p])).get(p.id));
  }

  /** Task 14: o cliente quita a dívida de um pagamento `failed` (cartão na hora ou Pix). */
  async payDebt(user: Principal, id: string, dto: DebtPaymentDto) {
    if (!this.delinquency) throw new Error('DelinquencyService indisponível.');
    const p = await this.delinquency.payDebt(user.customerId!, id, dto);
    return toPayment(p);
  }

  /**
   * Estorno total ou parcial, seguro contra concorrência e contra resultado desconhecido do gateway:
   * 1. reserva o valor (update condicional por status e `refundedCents` lidos) e grava um `PaymentRefund` `claimed`
   *    na mesma transação (pela carteira: o lançamento entra junto e o pedido já nasce `succeeded`);
   * 2. chama o gateway com chave estável por pedido (`refund:<paymentId>:<Idempotency-Key>`);
   * 3. sucesso → `succeeded`; recusa definitiva (`RefundRejectedError`) → desfaz a reserva (`rejected`, 422);
   *    timeout/erro → mantém a reserva (`pending`) e o job `reconcileRefunds` resolve pelo estado no gateway.
   * Teto: valor capturado (caução capturada parcialmente) ou valor do pagamento.
   */
  async refund(actor: Principal, id: string, dto: RefundDto, idempotencyKey?: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw notFound('Pagamento não encontrado.');
    const key = `refund:${p.id}:${idempotencyKey ?? randomUUID()}`;
    // Mesma Idempotency-Key de um pedido já registrado: repete a resposta desse pedido (sem reservar nem chamar o gateway de novo).
    if (idempotencyKey) {
      const same = await this.prisma.paymentRefund.findUnique({ where: { idempotencyKey: key } });
      if (same) return this.replayRefund(same, p);
    }
    if (!canTransition(p.status, 'partially_refunded') && !canTransition(p.status, 'refunded')) {
      throw unprocessable('validation-error', 'Só é possível estornar pagamentos pagos ou capturados.');
    }
    // Task 16 (fix round 1): o pagamento do aluguel registra o bruto, com a parte da carteira em `walletCents`. O estorno
    // devolve primeiro a parte do gateway (cartão/Pix/caução capturada) e depois a da carteira (lançamento `refund` no
    // ledger). Pagamento só da carteira (`method: wallet`) inteiro é carteira.
    const captured = await this.prisma.paymentCapture.findUnique({ where: { paymentId: p.id } });
    const walletBase = p.method === 'wallet' ? p.amountCents : p.walletCents;
    const gatewayBase = p.method === 'wallet' ? 0 : (captured?.capturedCents ?? p.amountCents - p.walletCents);
    const base = gatewayBase + walletBase;
    const remaining = base - p.refundedCents;
    const amount = dto.amountCents ?? remaining;
    if (amount <= 0 || amount > remaining) throw unprocessable('validation-error', `Valor acima do disponível para estorno (${remaining}).`);
    // Gateway primeiro: o já estornado conta primeiro contra a parte do gateway.
    const gatewayLeft = Math.max(0, gatewayBase - p.refundedCents);
    const gatewayPart = Math.min(amount, gatewayLeft);
    const walletPart = amount - gatewayPart;
    if (gatewayPart > 0 && !p.providerPaymentId) throw unprocessable('validation-error', 'Pagamento sem registro no gateway para estornar.');

    // Um estorno em aberto por pagamento: sem isso, a reconciliação (que compara totais acumulados) confundiria pedidos.
    const open = await this.prisma.paymentRefund.findFirst({ where: { paymentId: p.id, status: { in: ['claimed', 'pending'] } } });
    if (open) throw conflict('conflict', 'Há um estorno deste pagamento aguardando confirmação do gateway. Tente de novo depois.');

    /** Reserva um pedido de estorno (com o lançamento na carteira quando é a parte da carteira). */
    const claim = async (read: Payment, part: number, viaWallet: boolean, recordKey: string) => {
      const refundedCents = read.refundedCents + part;
      const to = refundedCents >= base ? 'refunded' : 'partially_refunded';
      return this.prisma.$transaction(async (tx) => {
        if (!(await this.state.claimRefund(tx, read, to, refundedCents))) return null;
        if (viaWallet) {
          await appendWalletEntry(tx, { customerId: read.customerId, type: 'refund', amountCents: part, description: `Estorno: ${dto.reason}`, paymentId: read.id, rentalId: read.rentalId, createdById: actor.userId });
        }
        return tx.paymentRefund.create({
          data: {
            paymentId: read.id, idempotencyKey: recordKey, amountCents: part, prevStatus: read.status, prevRefundedCents: read.refundedCents,
            newStatus: to, newRefundedCents: refundedCents, status: viaWallet ? 'succeeded' : 'claimed', createdById: actor.userId,
          },
        });
      });
    };
    const raced = () => conflict('conflict', 'Outro estorno deste pagamento foi registrado ao mesmo tempo. Atualize e tente de novo.');

    let current = p;
    if (gatewayPart > 0) {
      const record = await claim(current, gatewayPart, false, key);
      if (!record) throw raced();
      const outcome = await this.callGatewayRefund(record);
      if (outcome === 'rejected') throw new ProblemException(422, 'payment-failed', 'O gateway recusou o estorno.');
      current = (await this.prisma.payment.findUnique({ where: { id } }))!;
    }
    if (walletPart > 0) {
      // A chave original fica com o pedido do gateway; a parte da carteira usa uma derivada (mesma repetição → mesma chave).
      const record = await claim(current, walletPart, true, gatewayPart > 0 ? `${key}:wallet` : key);
      if (!record) throw raced();
    }
    const updated = (await this.prisma.payment.findUnique({ where: { id } }))!;
    this.state.emitUpdated(updated);
    await this.audit.record({ actor, action: 'payment.refund', entityType: 'Payment', entityId: id, reason: dto.reason, metadata: { amountCents: amount } });
    return toPayment(updated);
  }

  /**
   * Repetição com a mesma chave: em aberto (`claimed`/`pending`) ou concluído → 200 com o estado atual do pagamento
   * (a reserva já vale; a reconciliação cuida do gateway); recusado → o mesmo 422; em revisão manual → 409.
   */
  private replayRefund(record: PaymentRefund, p: Payment) {
    if (record.status === 'rejected') throw new ProblemException(422, 'payment-failed', 'O gateway recusou o estorno.');
    if (record.status === 'needs_review') throw conflict('conflict', 'Este estorno está em revisão manual.');
    this.logger.log({ msg: 'refund_replayed', paymentId: p.id, refundId: record.id, status: record.status });
    return toPayment(p);
  }

  /** Chama o gateway para um pedido de estorno e grava o resultado. Desfaz a reserva só em recusa definitiva. */
  private async callGatewayRefund(record: PaymentRefund): Promise<'succeeded' | 'rejected' | 'pending'> {
    const p = (await this.prisma.payment.findUnique({ where: { id: record.paymentId } }))!;
    try {
      const r = await this.provider.refund({ providerPaymentId: p.providerPaymentId!, amountCents: record.amountCents, idempotencyKey: record.idempotencyKey });
      await this.prisma.paymentRefund.update({ where: { id: record.id }, data: { status: 'succeeded', providerRefundId: r.providerRefundId, attempts: { increment: 1 } } });
      return 'succeeded';
    } catch (err) {
      if (err instanceof RefundRejectedError) {
        await this.rollbackRefund(record, err.message);
        return 'rejected';
      }
      await this.prisma.paymentRefund.update({ where: { id: record.id }, data: { status: 'pending', attempts: { increment: 1 }, lastError: (err as Error).message.slice(0, 500) } });
      this.logger.warn({ msg: 'refund_outcome_unknown', paymentId: p.id, refundId: record.id, error: (err as Error).message });
      return 'pending';
    }
  }

  /** Desfaz a reserva só se o pagamento ainda estiver exatamente como este pedido deixou; senão, revisão manual. */
  private async rollbackRefund(record: PaymentRefund, reason: string): Promise<void> {
    const undone = await this.prisma.$transaction(async (tx) => {
      const res = await tx.payment.updateMany({
        where: { id: record.paymentId, status: record.newStatus as Payment['status'], refundedCents: record.newRefundedCents },
        data: { status: record.prevStatus as Payment['status'], refundedCents: record.prevRefundedCents },
      });
      await tx.paymentRefund.update({ where: { id: record.id }, data: { status: res.count === 1 ? 'rejected' : 'needs_review', lastError: reason.slice(0, 500) } });
      return res.count === 1;
    });
    if (undone) this.logger.warn({ msg: 'refund_rejected', paymentId: record.paymentId, refundId: record.id });
    else this.state.needsReview({ paymentId: record.paymentId, reason: 'refund_rollback_mismatch' }, { refundId: record.id });
  }

  @Interval('payments-refund-reconcile', 5 * 60_000)
  @ExclusiveJob('payments-refund-reconcile', jobLockTtl(5 * 60_000))
  async refundReconcileJob(): Promise<void> {
    if (process.env.JOBS_ENABLED === 'false') return;
    await this.reconcileRefunds(2 * 60_000).catch((err) => this.logger.error({ msg: 'refund_reconcile_failed', error: (err as Error).message }));
  }

  /**
   * Pedidos de estorno sem resultado (`claimed`: queda antes de chamar o gateway; `pending`: timeout/erro):
   * se o gateway já mostra o valor estornado → `succeeded`; senão repete com a mesma chave (idempotente).
   * Depois de `MAX_REFUND_ATTEMPTS`, `needs_review` (revisão manual).
   */
  async reconcileRefunds(olderThanMs: number): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const open = await this.prisma.paymentRefund.findMany({ where: { status: { in: ['claimed', 'pending'] }, updatedAt: { lte: cutoff } }, take: 50 });
    for (const rec of open) {
      try {
        const p = (await this.prisma.payment.findUnique({ where: { id: rec.paymentId } }))!;
        const pp = await this.provider.getPayment(p.providerPaymentId!);
        if ((pp.refundedCents ?? 0) >= rec.newRefundedCents) {
          await this.prisma.paymentRefund.update({ where: { id: rec.id }, data: { status: 'succeeded' } });
          continue;
        }
        if (rec.attempts >= MAX_REFUND_ATTEMPTS) {
          await this.prisma.paymentRefund.update({ where: { id: rec.id }, data: { status: 'needs_review' } });
          this.state.needsReview({ paymentId: rec.paymentId, reason: 'refund_attempts_exhausted' }, { refundId: rec.id });
          continue;
        }
        await this.callGatewayRefund(rec);
      } catch (err) {
        this.logger.warn({ msg: 'refund_reconcile_item_failed', refundId: rec.id, error: (err as Error).message });
      }
    }
  }

  // ── webhook ──
  async receiveWebhook(dto: MercadoPagoWebhookDto, headers: { signature?: string; requestId?: string }) {
    if (!this.provider.verifyWebhook({ signature: headers.signature, requestId: headers.requestId, dataId: dto.data.id })) {
      this.logger.warn({ msg: 'webhook_signature_invalid', type: dto.type });
      throw new ProblemException(401, 'webhook-signature-invalid', 'Assinatura do webhook inválida.');
    }
    const eventId = dto.id !== undefined ? String(dto.id) : `${dto.type}:${dto.action ?? ''}:${dto.data.id}`;
    const msg: WebhookQueueMessage = { provider: this.provider.name, eventId, type: dto.type, action: dto.action, dataId: dto.data.id };
    await this.queue.publish('pagamentos-webhook', msg, { dedupId: eventId });
    return { received: true };
  }
}
